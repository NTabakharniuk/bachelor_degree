import React, { useState, useRef } from 'react';
import PhotoUpload from './components/PhotoUpload';
import PhotoValidation from './components/PhotoValidation';
import PhotoProcessing from './components/PhotoProcessing';
import LayoutSelection from './components/LayoutSelection';
import ProgressSteps from './components/ProgressSteps';
import ErrorDisplay from './components/ErrorDisplay';
import { validatePhoto } from './utils/validation';
import { processPhoto } from './utils/processing';

const MODEL_URL = '/models';


/**
 * MAIN APPLICATION COMPONENT
 * 
 * Manages the entire workflow:
 * 1. Photo Upload
 * 2. Validation (face detection, requirements check)
 * 3. Processing (crop, background removal, resize)
 * 4. Layout Selection (A4, 10x15 cm)
 * 5. Download
 */
function App() {
  // Application state
  
  const [step, setStep] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle file upload
   * Validates file type and size before loading
   */
  const handleFileUpload = async (file) => {
    setError(null);

    // Validate file type
    if (!file.type.match('image/(jpeg|jpg|png)')) {
      setError('Please upload a JPG or PNG image');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setImageFile(file);

    // Load image data
    const reader = new FileReader();
    reader.onload = async (e) => {
      setImageData(e.target.result);
      setStep('validating');
      
      // Auto-start validation
      await handleValidation(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle photo validation
   * Uses face-api.js to detect and analyze face
   */
  const handleValidation = async (imgData) => {
    setLoading(true);
    setValidationResult(null);
    // Helper: create tighter crop around face so head occupies targetHeadRatio
    const createTightCrop = async (dataUrl, faceData, targetHeadRatio = 0.62) => {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });

      const targetRatio = 3 / 4;

      const faceHeight = faceData.height;
      let frameHeight = faceHeight / targetHeadRatio;
      frameHeight = Math.min(frameHeight, img.height);
      const frameWidth = Math.min(frameHeight * targetRatio, img.width);

      const faceCenterX = faceData.x + faceData.width / 2;
      const faceCenterY = faceData.y + faceData.height / 2;

      let cropX = faceCenterX - frameWidth / 2;
      // Default positioning slightly above center
      let cropY = faceCenterY - frameHeight * 0.4;

      // Enforce minimum top margin of 10mm (10/45 of frame height)
      const TOP_MARGIN_RATIO = 10 / 45;
      const requiredTopMarginPx = frameHeight * TOP_MARGIN_RATIO;
      const maxCropYToSatisfyTop = faceData.y - requiredTopMarginPx;
      if (cropY > maxCropYToSatisfyTop) cropY = maxCropYToSatisfyTop;

      if (cropX < 0) cropX = 0;
      if (cropY < 0) cropY = 0;
      if (cropX + frameWidth > img.width) cropX = img.width - frameWidth;
      if (cropY + frameHeight > img.height) cropY = img.height - frameHeight;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(frameWidth);
      canvas.height = Math.round(frameHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, cropX, cropY, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.95);
    };

    try {
      // First validation pass
      const result = await validatePhoto(imgData);
      setValidationResult(result);

      if (result.isValid) {
        setStep('processing');
        await handleProcessing(imgData, result.faceData);
        return;
      }

      // If failure is due to head too small, attempt auto-crop and re-validate once
      const headRatio = result.faceData && result.faceData.headSizeRatio;
      const minRatio = 32 / 45; // same threshold as validation (32 mm on 45 mm photo)
      const desiredHeadRatio = 0.75; // aim for mid-range head size after auto-crop

      if (headRatio && headRatio < minRatio) {
        try {
          const croppedData = await createTightCrop(imgData, result.faceData, desiredHeadRatio);
          // Re-run validation on cropped image
          const secondResult = await validatePhoto(croppedData);
          setValidationResult(secondResult);

          if (secondResult.isValid) {
            // update displayed image to cropped one and proceed
            setImageData(croppedData);
            setStep('processing');
            await handleProcessing(croppedData, secondResult.faceData);
            return;
          }
        } catch (cropErr) {
          console.warn('Auto-crop attempt failed:', cropErr);
        }
      }

      // If we reach here, validation failed (and auto-crop didn't fix it)
      setStep('validating');
    } catch (err) {
      setError(`Validation failed: ${err.message}`);
      setStep('validating');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle photo processing
   * Crops, removes background, resizes to 3x4 cm at 300 DPI
   */
  const handleProcessing = async (imgData, faceData) => {
    setLoading(true);

    try {
      const processed = await processPhoto(imgData, faceData);
      setProcessedImage(processed);
      setStep('layout');
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset application to initial state
   */
  const handleReset = () => {
    setStep('upload');
    setImageFile(null);
    setImageData(null);
    setValidationResult(null);
    setProcessedImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Document Photo Preparation System
          </h1>
          <p className="text-gray-600 text-lg">
            Automatic validation and processing of passport-style photos
          </p>
        </div>

        {/* Progress Steps */}
        <ProgressSteps currentStep={step} />

        {/* Error Display */}
        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {step === 'upload' && (
            <PhotoUpload onUpload={handleFileUpload} />
          )}

          {step === 'validating' && (
            <PhotoValidation
              image={imageData}
              validationResult={validationResult}
              loading={loading}
              onReset={handleReset}
            />
          )}

          {step === 'processing' && (
            <PhotoProcessing loading={loading} />
          )}

          {step === 'layout' && (
            <LayoutSelection
              originalImage={imageData}
              processedImage={processedImage}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="font-semibold">Bachelor's Thesis Project</p>
          <p className="mt-1">Document Photo Preparation System</p>
        </div>
      </div>
    </div>
  );
}

export default App;