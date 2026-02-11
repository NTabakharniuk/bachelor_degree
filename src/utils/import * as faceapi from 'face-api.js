import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Load face-api.js models from the /models directory
 * Ensures models are loaded exactly once.
 */
async function loadModels() {
    if (modelsLoaded) return;

    const MODEL_URL = '/models'; // Correct path for Vite projects

    try {
        console.log('Loading face-api.js models from:', MODEL_URL);

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
 * Validate photo using face-api.js
 * Ensures models are loaded before running validation.
 *
 * @param {string} imageData - Base64 image data or image URL
 * @returns {Promise<Object>} Validation result
 */
async function validatePhoto(imageData) {
    // Ensure models are loaded before validation
    try {
        await loadModels();
    } catch (error) {
        console.error('Validation aborted due to model loading failure:', error);
        throw new Error('Validation cannot proceed because models failed to load.');
    }

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

        // Additional validation checks can be added here...
    }

    return result;
}

/**
 * Load image from data URL or URL
 *
 * @param {string} imageData - Base64 image data or image URL
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
function loadImage(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageData;
    });
}

// Example usage
(async () => {
    try {
        const result = await validatePhoto('path/to/your/image.jpg');
        console.log('Validation result:', result);
    } catch (error) {
        console.error('Error during validation:', error);
    }
})();
