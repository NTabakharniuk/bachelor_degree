import { removeBackground } from '@imgly/background-removal';

/**
 * PHOTO PROCESSING UTILITIES
 * 
 * Handles automatic photo processing:
 * 1. Crop to face area with proper margins
 * 2. Remove background using AI
 * 3. Apply pure white background
 * 4. Resize to 3x4 cm at 300 DPI (354x472 pixels)
 * 5. Apply sharpening and optimization
 */

/**
 * Process photo to create document-ready image
 * 
 * @param {string} imageData - Base64 image data
 * @param {Object} faceData - Face detection data from validation
 * @returns {Promise<string>} Processed image as base64 data URL
 */
export async function processPhoto(imageData, faceData) {
  try {
    // Load original image
    const img = await loadImage(imageData);

    // Step 1: Crop to passport photo dimensions (3:4 ratio)
    const croppedCanvas = cropToPassportSize(img, faceData);

    // Step 2: Remove background using AI
    const bgRemovedBlob = await removeBackground(croppedCanvas.toDataURL());
    const bgRemovedImg = await loadImageFromBlob(bgRemovedBlob);

    // Step 3: Apply white background and resize to final dimensions
    const finalCanvas = applyWhiteBackgroundAndResize(bgRemovedImg);

    // Step 4: Apply final optimizations (sharpening, contrast)
    applyOptimizations(finalCanvas);

    // Return as base64 data URL
    return finalCanvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('Photo processing error:', error);
    throw new Error(`Processing failed: ${error.message}`);
  }
}

/**
 * Crop image to passport photo size (3:4 ratio)
 * Centers the face and includes shoulders
 * 
 * @param {HTMLImageElement} img - Original image
 * @param {Object} faceData - Face bounding box and landmarks
 * @returns {HTMLCanvasElement} Cropped canvas
 */
function cropToPassportSize(img, faceData) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Passport photo ratio (width:height = 3:4)
  const targetRatio = 3 / 4;

  // Calculate crop dimensions
  // Head should be 70-80% of frame height, face centered
  const faceHeight = faceData.height;
  const frameHeight = faceHeight * 1.6; // Include shoulders and space above head
  const frameWidth = frameHeight * targetRatio;

  // Calculate crop position to center face
  // Face should be slightly above center (more space above head than below)
  const faceCenterX = faceData.x + faceData.width / 2;
  const faceCenterY = faceData.y + faceData.height / 2;

  const cropX = faceCenterX - frameWidth / 2;
  const cropY = faceCenterY - frameHeight * 0.4; // 40% of frame above face center

  // Set canvas size to crop dimensions
  canvas.width = Math.round(frameWidth);
  canvas.height = Math.round(frameHeight);

  // Draw cropped image
  ctx.drawImage(
    img,
    Math.max(0, cropX),
    Math.max(0, cropY),
    frameWidth,
    frameHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas;
}

/**
 * Apply white background and resize to final passport photo dimensions
 * 
 * Final size: 3x4 cm at 300 DPI = 354x472 pixels
 * 
 * @param {HTMLImageElement} img - Image with background removed
 * @returns {HTMLCanvasElement} Final canvas with white background
 */
function applyWhiteBackgroundAndResize(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Calculate final dimensions at 300 DPI
  const DPI = 300;
  const CM_TO_INCH = 0.393701;
  const WIDTH_CM = 3;
  const HEIGHT_CM = 4;

  // Final pixel dimensions
  canvas.width = Math.round(WIDTH_CM * CM_TO_INCH * DPI); // 354 pixels
  canvas.height = Math.round(HEIGHT_CM * CM_TO_INCH * DPI); // 472 pixels

  // Fill with pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw image on white background
  // Calculate scaling to fit while maintaining aspect ratio
  const scale = Math.min(
    canvas.width / img.width,
    canvas.height / img.height
  );

  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;

  // Center the image
  const x = (canvas.width - scaledWidth) / 2;
  const y = (canvas.height - scaledHeight) / 2;

  ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

  return canvas;
}

/**
 * Apply final optimizations to improve photo quality
 * - Sharpening
 * - Contrast adjustment
 * - Color correction
 * 
 * @param {HTMLCanvasElement} canvas - Canvas to optimize
 */
function applyOptimizations(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply subtle sharpening using unsharp mask technique
  // This enhances edges without creating artifacts
  const sharpened = applySharpeningFilter(imageData);

  // Apply slight contrast enhancement
  const contrasted = applyContrastAdjustment(sharpened, 1.1);

  // Put processed data back
  ctx.putImageData(contrasted, 0, 0);
}

/**
 * Apply sharpening filter
 * Uses a simple unsharp mask algorithm
 */
function applySharpeningFilter(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  const outData = output.data;

  // Sharpening kernel (simplified)
  const sharpenAmount = 0.2;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        // Calculate sharpened value
        const center = data[idx + c];
        const above = data[((y - 1) * width + x) * 4 + c];
        const below = data[((y + 1) * width + x) * 4 + c];
        const left = data[(y * width + (x - 1)) * 4 + c];
        const right = data[(y * width + (x + 1)) * 4 + c];

        const average = (above + below + left + right) / 4;
        const sharpened = center + (center - average) * sharpenAmount;

        outData[idx + c] = Math.max(0, Math.min(255, sharpened));
      }
      outData[idx + 3] = data[idx + 3]; // Alpha channel
    }
  }

  return output;
}

/**
 * Apply contrast adjustment
 * 
 * @param {ImageData} imageData - Image data
 * @param {number} contrast - Contrast factor (1.0 = no change)
 */
function applyContrastAdjustment(imageData, contrast) {
  const data = imageData.data;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    // Apply to RGB channels only
    for (let c = 0; c < 3; c++) {
      const value = data[i + c];
      const adjusted = factor * (value - 128) + 128;
      data[i + c] = Math.max(0, Math.min(255, adjusted));
    }
  }

  return imageData;
}

/**
 * Load image from data URL
 */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Load image from blob
 */
function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}
