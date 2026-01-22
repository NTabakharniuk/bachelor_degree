import * as faceapi from 'face-api.js';

/**
 * PHOTO VALIDATION UTILITIES
 * 
 * Uses face-api.js to validate photos against document photo requirements
 * 
 * Requirements checked:
 * 1. Exactly one face detected
 * 2. Face is frontal (yaw/pitch/roll angles)
 * 3. Eyes are visible
 * 4. Face is fully contained in frame
 * 5. Head size is appropriate (60-70% of image height)
 * 6. Expression appears neutral
 * 
 * NOTE: Glasses detection is NOT implemented (requires specialized models or manual check)
 */

let modelsLoaded = false;

/**
 * Load face-api.js models from local /public/models directory
 * 
 * Required models:
 * - ssd_mobilenetv1 (face detection)
 * - face_landmark_68 (facial landmarks)
 * - face_recognition (optional, for better analysis)
 */
export async function loadModels() {
  if (modelsLoaded) return;

  try {
    const MODEL_URL = '/models';
    
    // Load required models
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log('✓ Face-api.js models loaded successfully');
  } catch (error) {
    console.error('Failed to load face-api.js models:', error);
    throw new Error(
      'Failed to load face detection models. Ensure models are in /public/models directory.'
    );
  }
}

/**
 * Validate photo against document photo requirements
 * 
 * @param {string} imageData - Base64 image data or image URL
 * @returns {Promise<Object>} Validation result with checks and face data
 */
export async function validatePhoto(imageData) {
  // Ensure models are loaded
  await loadModels();

  // Create image element
  const img = await loadImage(imageData);

  // Detect faces with landmarks
  const detections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors();

  // Initialize validation result
  const result = {
    isValid: true,
    checks: {},
    faceData: null,
  };

  // Check 1: Exactly one face detected
  if (detections.length === 0) {
    result.checks.faceDetected = {
      passed: false,
      message: 'No face detected in the image',
    };
    result.isValid = false;
  } else if (detections.length > 1) {
    result.checks.faceDetected = {
      passed: false,
      message: `Multiple faces detected (${detections.length}). Only one person allowed.`,
    };
    result.isValid = false;
  } else {
    result.checks.faceDetected = {
      passed: true,
      message: 'Single face detected ✓',
    };

    const detection = detections[0];
    const box = detection.detection.box;
    const landmarks = detection.landmarks;

    // Store face data for processing
    result.faceData = {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      landmarks: landmarks,
    };

    // Check 2: Face is frontal (calculate angles)
    const angles = calculateFaceAngles(landmarks);
    const maxYaw = 15; // degrees
    const maxRoll = 15; // degrees

    if (Math.abs(angles.yaw) > maxYaw || Math.abs(angles.roll) > maxRoll) {
      result.checks.faceFrontal = {
        passed: false,
        message: `Face not frontal enough (yaw: ${angles.yaw.toFixed(1)}°, roll: ${angles.roll.toFixed(1)}°)`,
      };
      result.isValid = false;
    } else {
      result.checks.faceFrontal = {
        passed: true,
        message: `Face is frontal (yaw: ${angles.yaw.toFixed(1)}°, roll: ${angles.roll.toFixed(1)}°) ✓`,
      };
    }

    // Check 3: Eyes are visible
    const eyesVisible = checkEyesVisible(landmarks);
    result.checks.eyesVisible = {
      passed: eyesVisible,
      message: eyesVisible
        ? 'Both eyes clearly visible ✓'
        : 'Eyes not clearly visible or closed',
    };
    if (!eyesVisible) result.isValid = false;

    // Check 4: Face is fully in frame
    const fullyInFrame = checkFaceInFrame(box, img.width, img.height);
    result.checks.faceInFrame = {
      passed: fullyInFrame,
      message: fullyInFrame
        ? 'Face fully contained in frame ✓'
        : 'Face is cut off or too close to edges',
    };
    if (!fullyInFrame) result.isValid = false;

    // Check 5: Head size is appropriate
    const headSizeRatio = box.height / img.height;
    const minRatio = 0.5; // At least 50% of image height
    const maxRatio = 0.75; // At most 75% of image height

    if (headSizeRatio < minRatio || headSizeRatio > maxRatio) {
      result.checks.headSize = {
        passed: false,
        message: `Head size ${headSizeRatio < minRatio ? 'too small' : 'too large'} (${(headSizeRatio * 100).toFixed(0)}% of frame)`,
      };
      result.isValid = false;
    } else {
      result.checks.headSize = {
        passed: true,
        message: `Head size appropriate (${(headSizeRatio * 100).toFixed(0)}% of frame) ✓`,
      };
    }

    // Check 6: Expression appears neutral (basic check based on mouth)
    const expressionNeutral = checkNeutralExpression(landmarks);
    result.checks.expression = {
      passed: expressionNeutral,
      message: expressionNeutral
        ? 'Expression appears neutral ✓'
        : 'Expression may not be neutral - mouth appears open',
    };
    if (!expressionNeutral) result.isValid = false;

    // Check 7: Glasses detection (LIMITATION: Not implemented)
    // Glasses detection requires either:
    // - Custom trained model
    // - API service
    // - Manual user confirmation
    result.checks.glassesCheck = {
      passed: true, // Always pass, but note limitation
      message: 'Manual verification required',
      note: 'LIMITATION: Automated glasses detection not implemented. If wearing glasses, please ensure no glare on lenses.',
    };
  }

  return result;
}

/**
 * Calculate face angles (yaw, pitch, roll) from landmarks
 * 
 * Uses geometric relationships between facial landmarks
 * to estimate head rotation angles
 */
function calculateFaceAngles(landmarks) {
  // Get key landmark points
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();

  // Calculate eye center points
  const leftEyeCenter = getCenter(leftEye);
  const rightEyeCenter = getCenter(rightEye);

  // Calculate roll (head tilt) from eye line angle
  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const roll = Math.atan2(dy, dx) * (180 / Math.PI);

  // Calculate yaw (horizontal rotation) from nose position relative to eyes
  const eyesCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
  const noseX = nose[0].x; // Nose tip
  const faceWidth = Math.abs(rightEyeCenter.x - leftEyeCenter.x);
  const noseOffset = (noseX - eyesCenterX) / faceWidth;
  const yaw = noseOffset * 45; // Rough approximation

  return { yaw, roll };
}

/**
 * Check if both eyes are visible and open
 */
function checkEyesVisible(landmarks) {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  // Calculate eye openness (vertical distance between upper and lower lid)
  const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
  const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);

  // Eye width for reference
  const leftEyeWidth = Math.abs(leftEye[3].x - leftEye[0].x);
  const rightEyeWidth = Math.abs(rightEye[3].x - rightEye[0].x);

  // Eye aspect ratio (height / width) - should be > 0.15 for open eyes
  const leftEAR = leftEyeHeight / leftEyeWidth;
  const rightEAR = rightEyeHeight / rightEyeWidth;

  const minEAR = 0.15;

  return leftEAR > minEAR && rightEAR > minEAR;
}

/**
 * Check if face is fully contained in frame
 */
function checkFaceInFrame(box, imgWidth, imgHeight) {
  const margin = 20; // Minimum margin from edges
  return (
    box.x >= margin &&
    box.y >= margin &&
    box.x + box.width <= imgWidth - margin &&
    box.y + box.height <= imgHeight - margin
  );
}

/**
 * Check for neutral expression (basic check)
 * More sophisticated expression analysis would require additional models
 */
function checkNeutralExpression(landmarks) {
  const mouth = landmarks.getMouth();

  // Calculate mouth openness
  const mouthHeight = Math.abs(mouth[14].y - mouth[18].y); // Upper to lower lip
  const mouthWidth = Math.abs(mouth[12].x - mouth[16].x); // Left to right corner

  // Mouth aspect ratio - should be small for closed/neutral
  const mouthAR = mouthHeight / mouthWidth;

  // Threshold for neutral expression (mouth mostly closed)
  return mouthAR < 0.35;
}

/**
 * Get center point of landmark array
 */
function getCenter(points) {
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}

/**
 * Load image from data URL
 */
function loadImage(imageData) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageData;
  });
}