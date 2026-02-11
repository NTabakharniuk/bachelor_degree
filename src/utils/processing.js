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
    // Target head size ratio in final crop (56–70% required). Aim mid-range.
    const desiredHeadRatio = 0.63; // Adjusted to align with the required range (56–70%)

    const cropRect = computePassportCropRect(
      img,
      faceData,
      desiredHeadRatio
    );

    // Add padding around the crop for cleaner hair edges during background removal
    const REMOVAL_PADDING_RATIO = 0.15; // 10–20% recommended
    const padX = cropRect.frameWidth * REMOVAL_PADDING_RATIO;
    const padY = cropRect.frameHeight * REMOVAL_PADDING_RATIO;
    const paddedX = Math.max(0, cropRect.cropX - padX);
    const paddedY = Math.max(0, cropRect.cropY - padY);
    const paddedW = Math.min(img.width - paddedX, cropRect.frameWidth + padX * 2);
    const paddedH = Math.min(img.height - paddedY, cropRect.frameHeight + padY * 2);

    const paddedCanvas = document.createElement('canvas');
    paddedCanvas.width = Math.round(paddedW);
    paddedCanvas.height = Math.round(paddedH);
    const paddedCtx = paddedCanvas.getContext('2d');
    paddedCtx.drawImage(
      img,
      paddedX,
      paddedY,
      paddedW,
      paddedH,
      0,
      0,
      paddedCanvas.width,
      paddedCanvas.height
    );

    // Downscale before background removal to speed up processing
    const workingCanvas = resizeCanvasIfNeeded(paddedCanvas, 1800);
    const scaleX = workingCanvas.width / paddedCanvas.width;
    const scaleY = workingCanvas.height / paddedCanvas.height;

    // Step 2: Remove background using AI (on padded region)
    const paddedImg = await loadImage(workingCanvas.toDataURL('image/png'));
    const bgRemovedBlob = await removeBackground(workingCanvas.toDataURL());
    const bgRemovedImg = await loadImageFromBlob(bgRemovedBlob);
    const foregroundCanvas = applyAlphaMaskFromRemoved(paddedImg, bgRemovedImg);

    // Crop back to the tight passport frame within the padded area
    const offsetX = (cropRect.cropX - paddedX) * scaleX;
    const offsetY = (cropRect.cropY - paddedY) * scaleY;
    const tightW = cropRect.frameWidth * scaleX;
    const tightH = cropRect.frameHeight * scaleY;
    const tightCanvas = document.createElement('canvas');
    tightCanvas.width = Math.round(tightW);
    tightCanvas.height = Math.round(tightH);
    const tightCtx = tightCanvas.getContext('2d');
    tightCtx.drawImage(
      foregroundCanvas,
      offsetX,
      offsetY,
      tightW,
      tightH,
      0,
      0,
      tightCanvas.width,
      tightCanvas.height
    );

    // Step 3: Apply white background and resize to final dimensions
    const finalCanvas = applyWhiteBackgroundAndResize(tightCanvas);

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
function computePassportCropRect(img, faceData, targetHeadRatio) {
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
    frameHeight = faceHeight * 2.7;
  }

  let frameWidth = frameHeight * targetRatio;

  // Keep 3:4 ratio while fitting inside image bounds
  if (frameWidth > img.width) {
    frameWidth = img.width;
    frameHeight = frameWidth / targetRatio;
  }
  if (frameHeight > img.height) {
    frameHeight = img.height;
    frameWidth = frameHeight * targetRatio;
  }

  // Horizontal centering by face center
  const faceCenterX = faceData.x + faceData.width / 2;
  let cropX = faceCenterX - frameWidth / 2;

  // Vertical framing:
  // - Top margin relative to face height
  // - Shoulder area as a portion of final crop height
  const TOP_MARGIN_RATIO = 0.10; // 8–12% of faceHeight
  const SHOULDER_RATIO = 0.12; // 10–15% of cropHeight
  const topMarginPx = faceHeight * TOP_MARGIN_RATIO;
  const shoulderPx = frameHeight * SHOULDER_RATIO;

  const desiredTop = faceData.y - topMarginPx;
  const desiredBottom = faceData.y + faceHeight + shoulderPx;

  // Place crop to include shoulders while preserving headroom.
  // This keeps the face in the upper half.
  let cropY = desiredBottom - frameHeight;
  cropY = Math.min(cropY, desiredTop);

  // Clamp crop to image bounds
  if (cropX < 0) cropX = 0;
  if (cropY < 0) cropY = 0;
  if (cropX + frameWidth > img.width) cropX = img.width - frameWidth;
  if (cropY + frameHeight > img.height) cropY = img.height - frameHeight;

  return { cropX, cropY, frameWidth, frameHeight };
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
  const contrasted = applyContrastAdjustment(sharpened, 1.02);

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
  const sharpenAmount = 0.05;

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
 * Downscale large canvases before heavy processing.
 * Keeps aspect ratio, caps longest side to maxSize.
 */
function resizeCanvasIfNeeded(sourceCanvas, maxSize) {
  const { width, height } = sourceCanvas;
  const longestSide = Math.max(width, height);
  if (longestSide <= maxSize) return sourceCanvas;

  const scale = maxSize / longestSide;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  return canvas;
}

/**
 * Use the background-removed alpha while preserving original colors.
 * This avoids hair and edge brightening caused by semi-transparent foreground.
 */
function applyAlphaMaskFromRemoved(originalImg, alphaImg) {
  const width = alphaImg.width;
  const height = alphaImg.height;

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext('2d');
  baseCtx.drawImage(originalImg, 0, 0, width, height);
  const baseData = baseCtx.getImageData(0, 0, width, height);

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const alphaCtx = alphaCanvas.getContext('2d');
  alphaCtx.drawImage(alphaImg, 0, 0, width, height);
  const alphaData = alphaCtx.getImageData(0, 0, width, height);

  const canvasWidth = baseCanvas.width;
  const canvasHeight = baseCanvas.height;
  const alpha = new Uint8ClampedArray(alphaData.data.length);

  for (let i = 0; i < alphaData.data.length; i += 4) {
    const a = alphaData.data[i + 3];
    // Harder matte to avoid grey hair on white background
    let out;
    if (a <= 60) out = 0;
    else if (a >= 210) out = 255;
    else out = (a - 60) * 1.6;
    alpha[i + 3] = Math.max(0, Math.min(255, out));
  }

  // One-pixel dilation to preserve fine hair edges
  const dilated = new Uint8ClampedArray(alpha);
  for (let y = 1; y < canvasHeight - 1; y++) {
    for (let x = 1; x < canvasWidth - 1; x++) {
      const idx = (y * canvasWidth + x) * 4 + 3;
      if (alpha[idx] >= 200) continue;
      const hasSolidNeighbor =
        alpha[idx - 4] >= 200 ||
        alpha[idx + 4] >= 200 ||
        alpha[idx - canvasWidth * 4] >= 200 ||
        alpha[idx + canvasWidth * 4] >= 200;
      if (hasSolidNeighbor) dilated[idx] = 255;
    }
  }

  for (let i = 0; i < baseData.data.length; i += 4) {
    baseData.data[i + 3] = dilated[i + 3];
  }

  baseCtx.putImageData(baseData, 0, 0);
  return baseCanvas;
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
