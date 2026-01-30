import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PHOTO PROCESSING COMPONENT
 * 
 * Displays processing status while photo is being:
 * - Cropped to optimal dimensions
 * - Background removed
 * - White background applied
 * - Resized to 3x4 cm at 300 DPI
 */
function PhotoProcessing({ loading }) {
  return (
    <div className="text-center py-12">
      <Loader2 className="w-20 h-20 text-blue-600 animate-spin mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-gray-800 mb-3">
        Processing Your Photo
      </h2>
      <p className="text-gray-600 mb-8">
        Preparing your document photo according to standards
      </p>

      <div className="max-w-md mx-auto">
        <div className="text-left space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-gray-700">Cropping to optimal dimensions (3:4 ratio)</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-gray-700">Removing background using AI</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-gray-700">Applying pure white background</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-gray-700">Resizing to 3×4 cm at 300 DPI</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-gray-700">Applying final adjustments</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-8">
        This may take 15-30 seconds depending on image size
      </p>
    </div>
  );
}

export default PhotoProcessing;
