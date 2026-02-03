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
    // Decide whether to perform an adaptive crop when head is too small
    const detectedHeadRatio = faceData && (faceData.headSizeRatio || faceData.height / img.height);
    const desiredHeadRatio = 0.75; // target ~75% of frame height to meet 32-36mm on 45mm photo

    // If head is too small, crop tighter around the face so it fills more of the frame
    const shouldForceTightCrop = detectedHeadRatio && detectedHeadRatio < desiredHeadRatio;

    const croppedCanvas = cropToPassportSize(
      img,
      faceData,
      shouldForceTightCrop ? desiredHeadRatio : undefined
    );

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
function cropToPassportSize(img, faceData, targetHeadRatio) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Passport photo ratio (width:height = 3:4)
  const targetRatio = 3 / 4;

  const faceHeight = faceData.height;

  // If a targetHeadRatio is supplied, calculate the crop so the face fills
  // that fraction of the frame height. Otherwise use a comfortable framing.
  let frameHeight;
  if (targetHeadRatio && targetHeadRatio > 0) {
    // frameHeight such that faceHeight / frameHeight = targetHeadRatio
    frameHeight = faceHeight / targetHeadRatio;
  } else {
    // Default framing includes shoulders and some headroom
    frameHeight = faceHeight * 1.6;
  }

  // Ensure frameHeight does not exceed image height
  frameHeight = Math.min(frameHeight, img.height);
  const frameWidth = Math.min(frameHeight * targetRatio, img.width);

  // Centering: face slightly above center (more room above head)
  const faceCenterX = faceData.x + faceData.width / 2;
  const faceCenterY = faceData.y + faceData.height / 2;

  let cropX = faceCenterX - frameWidth / 2;
  // Default cropY attempts to place face slightly above center
  let cropY = faceCenterY - frameHeight * 0.4; // 40% above center

  // Enforce minimum top margin: at least 10mm from top of head to top of photo
  // Photo spec: 45 mm total height -> top margin ratio = 10 / 45
  const TOP_MARGIN_RATIO = 10 / 45;
  const requiredTopMarginPx = frameHeight * TOP_MARGIN_RATIO;
  const maxCropYToSatisfyTop = faceData.y - requiredTopMarginPx;
  if (cropY > maxCropYToSatisfyTop) {
    cropY = maxCropYToSatisfyTop;
  }

  // Clamp crop to image bounds
  if (cropX < 0) cropX = 0;
  if (cropY < 0) cropY = 0;
  if (cropX + frameWidth > img.width) cropX = img.width - frameWidth;
  if (cropY + frameHeight > img.height) cropY = img.height - frameHeight;

  // Set canvas size to final crop dimensions (rounded)
  canvas.width = Math.round(frameWidth);
  canvas.height = Math.round(frameHeight);

  // Draw cropped area from original image
  ctx.drawImage(
    img,
    cropX,
    cropY,
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
  const WIDTH_CM = 3.5;
  const HEIGHT_CM = 4.5;

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
  const contrasted = applyContrastAdjustment(sharpened, 1.05);

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
  const sharpenAmount = 0.08;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        // Calculate sharpened value
        const center = data[idx + c];
        const above = data[((y - 1) * width + x) * 4 + c] || center;
        const below = data[((y + 1) * width + x) * 4 + c] || center;
        const left = data[(y * width + (x - 1)) * 4 + c] || center;
        const right = data[(y * width + (x + 1)) * 4 + c] || center;

        const average = (above + below + left + right) / 4;
        const sharpened = center + (center - average) * sharpenAmount;

        outData[idx + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
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
  // contrast: 1.0 = no change; >1 increases contrast
  const data = imageData.data;
  const c = contrast;
  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = data[i + ch];
      const adjusted = ((v - 128) * c) + 128;
      data[i + ch] = Math.max(0, Math.min(255, adjusted));
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
