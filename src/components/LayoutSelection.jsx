import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { generateA4Layout, generate10x15Layout } from '../utils/layoutGeneration';
import { downloadImage } from '../utils/download';

/**
 * LAYOUT SELECTION COMPONENT
 * 
 * Allows user to choose print layout:
 * - Single photo (3x4 cm)
 * - A4 sheet (6 photos)
 * - 10x15 cm photo paper (9 photos)
 */
function LayoutSelection({ originalImage, processedImage, onReset }) {
  const [loading, setLoading] = useState(false);

  const handleSingleDownload = () => {
    downloadImage(processedImage, 'passport_photo_3x4cm.jpg');
  };

  const handleA4Download = async () => {
    setLoading(true);
    try {
      const layoutDataUrl = await generateA4Layout(processedImage);
      downloadImage(layoutDataUrl, 'passport_photos_a4.jpg');
    } catch (err) {
      alert('Layout generation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle10x15Download = async () => {
    setLoading(true);
    try {
      const layoutDataUrl = await generate10x15Layout(processedImage);
      downloadImage(layoutDataUrl, 'passport_photos_10x15cm.jpg');
    } catch (err) {
      alert('Layout generation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Your Photo is Ready!
      </h2>

      {/* Before/After Comparison */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 text-center">
            Original Photo
          </p>
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <img
              src={originalImage}
              alt="Original"
              className="w-full h-auto"
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 text-center">
            Processed (3×4 cm, 300 DPI)
          </p>
          <div className="border-2 border-green-200 rounded-lg overflow-hidden bg-white p-4">
            <img
              src={processedImage}
              alt="Processed"
              className="w-full h-auto mx-auto"
              style={{ maxWidth: '300px' }}
            />
          </div>
        </div>
      </div>

      {/* Download Options */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          Choose Print Layout
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Single Photo */}
          <button
            onClick={handleSingleDownload}
            disabled={loading}
            className="border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <p className="font-bold text-gray-800 mb-1">Single Photo</p>
            <p className="text-sm text-gray-600 mb-2">3×4 cm at 300 DPI</p>
            <p className="text-xs text-gray-500">Perfect for digital use</p>
          </button>

          {/* A4 Layout */}
          <button
            onClick={handleA4Download}
            disabled={loading}
            className="border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-10 h-10 text-blue-600 mx-auto mb-3 animate-spin" />
            ) : (
              <Download className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            )}
            <p className="font-bold text-gray-800 mb-1">A4 Sheet</p>
            <p className="text-sm text-gray-600 mb-2">6 photos (2×3 grid)</p>
            <p className="text-xs text-gray-500">Print on standard A4 paper</p>
          </button>

          {/* 10x15 Layout */}
          <button
            onClick={handle10x15Download}
            disabled={loading}
            className="border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-10 h-10 text-blue-600 mx-auto mb-3 animate-spin" />
            ) : (
              <Download className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            )}
            <p className="font-bold text-gray-800 mb-1">10×15 cm</p>
            <p className="text-sm text-gray-600 mb-2">9 photos (3×3 grid)</p>
            <p className="text-xs text-gray-500">Print on photo paper</p>
          </button>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Technical Specifications:</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Photo Size:</p>
            <p className="font-semibold text-gray-800">3×4 cm (35×45 mm)</p>
          </div>
          <div>
            <p className="text-gray-600">Resolution:</p>
            <p className="font-semibold text-gray-800">300 DPI (354×472 px)</p>
          </div>
          <div>
            <p className="text-gray-600">Background:</p>
            <p className="font-semibold text-gray-800">Pure White (RGB 255, 255, 255)</p>
          </div>
        </div>
      </div>

      {/* Process Another Photo */}
      <div className="text-center">
        <button
          onClick={onReset}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
        >
          ← Process Another Photo
        </button>
      </div>
    </div>
  );
}

export default LayoutSelection;