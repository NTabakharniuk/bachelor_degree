import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

/**
 * PHOTO VALIDATION COMPONENT
 * 
 * Displays validation results from face-api.js analysis
 * Shows each requirement check with pass/fail status
 */
function PhotoValidation({ image, validationResult, loading, onReset }) {
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-8 mb-6">
        {/* Original Image */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Uploaded Photo
          </h3>
          <img
            src={image}
            alt="Uploaded"
            className="w-full rounded-lg border-2 border-gray-200 shadow-sm"
          />
        </div>

        {/* Validation Results */}
        <div className="flex flex-col justify-center">
          {loading ? (
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-800 mb-2">
                Validating Photo...
              </p>
              <p className="text-sm text-gray-600">
                Analyzing face and checking requirements
              </p>
              <div className="mt-4 text-left text-sm text-gray-600 max-w-xs mx-auto space-y-1">
                <p>• Detecting face position</p>
                <p>• Analyzing facial landmarks</p>
                <p>• Measuring face angles</p>
                <p>• Checking eye visibility</p>
                <p>• Validating head size ratio</p>
              </div>
            </div>
          ) : validationResult ? (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {validationResult.isValid ? '✓ Validation Passed' : '✗ Validation Failed'}
              </h3>
              <div className="space-y-2">
                {Object.entries(validationResult.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      check.passed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {check.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          check.passed ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {check.message}
                      </p>
                      {check.note && (
                        <p className="text-xs text-gray-600 mt-1">{check.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {validationResult.isValid ? (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-semibold text-center">
                    ✓ Photo meets all requirements!
                  </p>
                  <p className="text-sm text-blue-700 text-center mt-1">
                    Processing will begin automatically...
                  </p>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-semibold text-center mb-2">
                    Please upload a new photo that meets the requirements
                  </p>
                  <button
                    onClick={onReset}
                    className="w-full bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Upload New Photo
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PhotoValidation;