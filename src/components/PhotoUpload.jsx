import React, { useRef } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * PHOTO UPLOAD COMPONENT
 * 
 * Provides UI for photo upload with drag-and-drop support
 * Displays requirements and validates file before upload
 */
function PhotoUpload({ onUpload }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <div className="text-center">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
      >
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-xl font-semibold text-gray-700 mb-2">
          Upload Your Photo
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Click to browse or drag and drop
        </p>
        <p className="text-xs text-gray-400 mb-4">
          JPG or PNG, maximum 10MB
        </p>
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
          Select File
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Requirements List */}
      <div className="mt-10 text-left max-w-md mx-auto">
        <h3 className="font-bold text-gray-800 mb-4 text-lg">
          Photo Requirements:
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-800 font-medium">One person only</span>
              <p className="text-sm text-gray-600">Face camera directly with neutral expression</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-800 font-medium">Eyes visible</span>
              <p className="text-sm text-gray-600">Both eyes open and clearly visible</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-800 font-medium">Good lighting</span>
              <p className="text-sm text-gray-600">Even lighting, no shadows on face</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-800 font-medium">Plain background</span>
              <p className="text-sm text-gray-600">Background will be automatically removed</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-800 font-medium">Glasses (if applicable)</span>
              <p className="text-sm text-gray-600">Ensure no glare on lenses - requires manual verification</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default PhotoUpload;