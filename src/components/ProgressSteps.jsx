import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * PROGRESS STEPS COMPONENT
 * 
 * Visual indicator of current step in the workflow
 */
function ProgressSteps({ currentStep }) {
  const steps = [
    { id: 'upload', label: 'Upload' },
    { id: 'validating', label: 'Validate' },
    { id: 'processing', label: 'Process' },
    { id: 'layout', label: 'Layout' },
  ];

  const getCurrentIndex = () => {
    return steps.findIndex(s => s.id === currentStep);
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isComplete
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive
                      ? 'bg-blue-600 border-blue-600 text-white scale-110'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <span className="font-bold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-sm mt-2 font-medium ${
                    isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-3 rounded transition-colors duration-300 ${
                    isComplete ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressSteps;