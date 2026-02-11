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
    // Helper: crop around face so head occupies targetHeadRatio
    const createTightCrop = async (dataUrl, faceData, targetHeadRatio = 0.54) => {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });

      const targetRatio = 3 / 4;

      const faceHeight = faceData.height;
      let frameHeight = faceHeight / targetHeadRatio;
      let frameWidth = frameHeight * targetRatio;

      if (frameWidth > img.width) {
        frameWidth = img.width;
        frameHeight = frameWidth / targetRatio;
      }
      if (frameHeight > img.height) {
        frameHeight = img.height;
        frameWidth = frameHeight * targetRatio;
      }

      const faceCenterX = faceData.x + faceData.width / 2;
      const faceCenterY = faceData.y + faceData.height / 2;

      let cropX = faceCenterX - frameWidth / 2;

      // Vertical framing: keep headroom and extend downward for shoulders.
      // Ratios are relative to face box height.
      const topMarginRatio = 0.12; // 0.10–0.20 recommended
      const bottomMarginRatio = 0.90; // 0.80–1.20 recommended
      const topMarginPx = faceHeight * topMarginRatio;
      const bottomMarginPx = faceHeight * bottomMarginRatio;

      // Target: crop top is above face top by topMarginPx,
      // and crop bottom is below face bottom by bottomMarginPx.
      const desiredTop = faceData.y - topMarginPx;
      const desiredBottom = faceData.y + faceHeight + bottomMarginPx;

      // Place crop to favor shoulders while keeping headroom.
      // This keeps the face in the upper half.
      let cropY = desiredBottom - frameHeight;
      cropY = Math.min(cropY, desiredTop);

      // Ensure some horizontal margin around the face (helps keep shoulders)
      const SIDE_MARGIN_RATIO = 0.16;
      const requiredSideMarginPx = frameWidth * SIDE_MARGIN_RATIO;
      const minCropXForRightMargin = (faceData.x + faceData.width) + requiredSideMarginPx - frameWidth;
      const maxCropXForLeftMargin = faceData.x - requiredSideMarginPx;
      cropX = Math.max(cropX, minCropXForRightMargin);
      cropX = Math.min(cropX, maxCropXForLeftMargin);

      // Enforce minimum top margin of 10mm (10/45 of frame height)
      const TOP_MARGIN_RATIO = 10 / 45;
      const requiredTopMarginPx = frameHeight * TOP_MARGIN_RATIO;
      const maxCropYToSatisfyTop = faceData.y - requiredTopMarginPx;
      if (cropY > maxCropYToSatisfyTop) cropY = maxCropYToSatisfyTop;

      // If landmarks are available, keep bottom near chin to avoid hoods
      const jaw = faceData.landmarks && faceData.landmarks.getJawOutline
        ? faceData.landmarks.getJawOutline()
        : null;
      if (jaw && jaw.length) {
        const chinY = jaw.reduce((max, pt) => (pt.y > max ? pt.y : max), -Infinity);
        const neckAllowance = faceHeight * 1.0;
        const maxCropYToKeepNeck = chinY + neckAllowance - frameHeight;
        if (cropY > maxCropYToKeepNeck) cropY = maxCropYToKeepNeck;
      }

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
      const TARGET_HEAD_RATIO = 0.54;
      const MIN_HEAD_RATIO = 0.54;
      const MAX_HEAD_RATIO = 0.68;
      const MAX_ATTEMPTS = 2;

      let currentData = imgData;
      let result = await validatePhoto(currentData);

      // If no face, we cannot auto-crop
      if (!result.faceData) {
        setValidationResult(result);
        setStep('validating');
        return;
      }

      // Try to auto-crop up to MAX_ATTEMPTS to hit the required head ratio
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const headRatio = result.faceData && result.faceData.headSizeRatio;
        if (headRatio && headRatio >= MIN_HEAD_RATIO && headRatio <= MAX_HEAD_RATIO) {
          break;
        }

        currentData = await createTightCrop(currentData, result.faceData, TARGET_HEAD_RATIO);
        setImageData(currentData);
        result = await validatePhoto(currentData);

        if (!result.faceData) {
          break;
        }
      }

      setValidationResult(result);

      if (result.isValid) {
        setStep('processing');
        await handleProcessing(currentData, result.faceData);
        return;
      }

      // If we reach here, validation failed even after auto-crop
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
