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

    try {
      const result = await validatePhoto(imgData);
      setValidationResult(result);

      if (result.isValid) {
        // Move to processing state, then run processing
        setStep('processing');
        await handleProcessing(imgData, result.faceData);
      } else {
        // Keep user on the validation step so they can review failures
        setStep('validating');
      }
    } catch (err) {
      setError(`Validation failed: ${err.message}`);
      // Keep user on the validation step to show the error
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