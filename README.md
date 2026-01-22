# Document Photo Preparation System

**Bachelor's Thesis Project**

Automatic validation and processing of portrait photos according to document photo standards (passport-style photos).

---

## 📋 Project Overview

This web application automatically validates and processes portrait photos to meet document photo requirements. It uses computer vision and AI to:

- ✅ Detect and validate faces against passport photo standards
- ✅ Automatically crop and process photos
- ✅ Remove backgrounds and apply pure white background
- ✅ Generate print-ready layouts (A4 or 10×15 cm)

### Target Use Case

The system is designed for:
- Passport photo preparation
- ID card photo processing
- Visa application photos
- Official document photos

---

## 🛠 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend Framework** | React 18.3+ with Vite |
| **Language** | JavaScript (ES6+) |
| **Styling** | Tailwind CSS |
| **Face Detection** | face-api.js (browser-based ML) |
| **Background Removal** | @imgly/background-removal |
| **PDF Generation** | jsPDF |
| **Image Processing** | HTML Canvas API |

---

## 📦 Installation

### Prerequisites

- **Node.js** 16+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Steps

#### 1. Clone or extract the project
```bash
cd document-photo-prep
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Download face-api.js models

**⚠️ CRITICAL STEP**: The application requires face-api.js ML models to be placed in `/public/models`. These models are NOT included in the repository due to their size.

**Download models:**

- Visit: https://github.com/justadudewhohacks/face-api.js-models
- Download the following model folders:
  - `ssd_mobilenetv1`
  - `face_landmark_68_model`
  - `face_recognition_model`

**Place models in the project structure:**
```
project-root/
├── public/
│   ├── models/
│   │   ├── ssd_mobilenetv1/
│   │   │   ├── ssd_mobilenetv1_model-weights_manifest.json
│   │   │   └── ssd_mobilenetv1_model-shard1
│   │   ├── face_landmark_68_model/
│   │   │   ├── face_landmark_68_model-weights_manifest.json
│   │   │   └── face_landmark_68_model-shard1
│   │   └── face_recognition_model/
│   │       ├── face_recognition_model-weights_manifest.json
│   │       └── face_recognition_model-shard1
```

**Verify models are loaded:**
After starting the application, check the browser console for:
```
✓ Face-api.js models loaded successfully
```

#### 4. Run the development server
```bash
npm run dev
```

The application will open at `http://localhost:3000`

#### 5. Build for production
```bash
npm run build
```

The production build will be in the `dist/` directory.

---

## 🎯 Features & Algorithms

### 1. Photo Validation

**Purpose**: Ensure uploaded photos meet document photo requirements before processing.

**Algorithm**: Multi-stage validation using face-api.js

**Validation Steps**:

1. **Face Detection**
   - Uses SSD MobileNet V1 model
   - Detects faces with confidence scores
   - Ensures exactly one face is present

2. **Landmark Detection**
   - Identifies 68 facial landmark points
   - Maps eyes, nose, mouth, jaw, eyebrows

3. **Angle Calculation**
   - **Yaw** (horizontal rotation): Calculated from nose position relative to eye centers
   - **Roll** (head tilt): Calculated from eye line angle
   - Ensures face is frontal

4. **Eye Visibility Check**
   - Measures Eye Aspect Ratio (EAR)
   - EAR = (eye height) / (eye width)
   - Ensures both eyes are open and visible

5. **Frame Containment**
   - Verifies face is fully within frame
   - Minimum 20px margin from edges

6. **Head Size Validation**
   - Calculates ratio: (face height) / (image height)
   - Ensures proper framing

7. **Expression Analysis**
   - Measures Mouth Aspect Ratio (MAR)
   - MAR = (mouth height) / (mouth width)
   - Detects non-neutral expressions

**Validation Thresholds**:

| Parameter | Threshold | Reason |
|-----------|-----------|--------|
| **Maximum Yaw** | ±15° | Face must be frontal |
| **Maximum Roll** | ±15° | Head must be straight |
| **Min Eye Aspect Ratio** | 0.15 | Eyes must be open |
| **Head Size Ratio** | 50-75% | Proper framing |
| **Mouth Aspect Ratio** | < 0.35 | Neutral expression |

**⚠️ Known Limitation**: 

**Glasses Detection is NOT implemented** due to:
- Lack of specialized pre-trained models
- High complexity of reliable glare detection
- Would require custom model training or external API

**Solution**: Users must manually verify no glare is present on glasses.

---

### 2. Photo Processing

**Purpose**: Transform validated photo into print-ready document photo.

**Algorithm**: Multi-step image processing pipeline

**Processing Steps**:

1. **Cropping to Passport Size**
   - Target ratio: 3:4 (width:height)
   - Algorithm:
```
     frame_height = face_height × 1.6  (includes shoulders)
     frame_width = frame_height × (3/4)
     crop_x = face_center_x - (frame_width / 2)
     crop_y = face_center_y - (frame_height × 0.4)
```
   - Ensures face is centered with proper headroom

2. **Background Removal**
   - Uses `@imgly/background-removal` library
   - AI-based segmentation
   - Outputs person with transparent background

3. **White Background Application**
   - Applies RGB(255, 255, 255) pure white
   - Maintains person in foreground

4. **Resizing to Standard Dimensions**
   - Final size: 3×4 cm at 300 DPI
   - Pixel dimensions: 354×472 pixels
   - Calculation:
```
     pixels = cm × 0.393701 × DPI
     width = 3 × 0.393701 × 300 = 354 px
     height = 4 × 0.393701 × 300 = 472 px
```

5. **Image Optimization**
   - **Sharpening**: Unsharp mask algorithm
```
     sharpened = center + (center - average_neighbors) × 0.2
```
   - **Contrast Enhancement**: Linear adjustment
```
     factor = (259 × (contrast × 255 + 255)) / (255 × (259 - contrast × 255))
     adjusted = factor × (value - 128) + 128
```

**Output**: High-quality 3×4 cm photo at 300 DPI, ready for printing.

---

### 3. Layout Generation

**Purpose**: Create print-ready layouts for efficient printing.

**Layouts Available**:

#### A4 Layout (210×297 mm)
- **Configuration**: 2 columns × 3 rows = 6 photos
- **Dimensions**: 2480×3508 pixels at 300 DPI
- **Margins**: 20mm from edges
- **Spacing**: 15mm between photos
- **Features**: 
  - Cutting guides (gray borders)
  - Print instructions at bottom
  - Optimized for home/office printers

#### 10×15 cm Photo Paper Layout (100×150 mm)
- **Configuration**: 3 columns × 3 rows = 9 photos
- **Dimensions**: 1181×1772 pixels at 300 DPI
- **Margins**: Centered with 5mm spacing
- **Features**:
  - Cutting guides
  - Optimized for photo labs
  - Maximum photo count per sheet

**Algorithm**:
```javascript
// For each photo in grid:
x = margin + col × (photo_width + spacing)
y = margin + row × (photo_height + spacing)
draw_photo(x, y)
draw_border(x, y)  // Cutting guide
```

---

## 📁 Project Structure
```
document-photo-prep/
├── public/
│   ├── models/              # face-api.js ML models (NOT included)
│   │   ├── ssd_mobilenetv1/
│   │   ├── face_landmark_68_model/
│   │   └── face_recognition_model/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── PhotoUpload.jsx         # File upload component
│   │   ├── PhotoValidation.jsx     # Validation display
│   │   ├── PhotoProcessing.jsx     # Processing status
│   │   ├── LayoutSelection.jsx     # Layout chooser
│   │   ├── ProgressSteps.jsx       # Progress indicator
│   │   └── ErrorDisplay.jsx        # Error messages
│   ├── utils/
│   │   ├── validation.js           # Face validation logic
│   │   ├── processing.js           # Image processing
│   │   ├── layoutGeneration.js     # Print layouts
│   │   └── download.js             # File downloads
│   ├── App.jsx                     # Main application
│   ├── main.jsx                    # React entry point
│   └── index.css                   # Tailwind imports
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

## 🔬 Technical Implementation Details

### Face Detection Algorithm

**Model**: SSD MobileNet V1
- **Type**: Single Shot MultiBox Detector
- **Backbone**: MobileNet V1 (lightweight CNN)
- **Input**: 300×300 RGB image
- **Output**: Bounding boxes with confidence scores

**Why this model?**
- Fast inference in browser (~100ms)
- Good accuracy for frontal faces
- Small model size (~5MB)

### Facial Landmark Detection

**Model**: 68-point facial landmark detector
- **Type**: Regression-based CNN
- **Output**: 68 (x,y) coordinates
- **Landmark groups**:
  - Jaw: points 0-16
  - Right eyebrow: 17-21
  - Left eyebrow: 22-26
  - Nose: 27-35
  - Right eye: 36-41
  - Left eye: 42-47
  - Mouth: 48-67

### Background Removal

**Technology**: @imgly/background-removal
- **Method**: Deep learning segmentation
- **Model**: U²-Net or similar architecture
- **Process**:
  1. Segment person from background
  2. Create alpha mask
  3. Apply mask to original image
  4. Output transparent PNG

**Performance**: 3-10 seconds depending on image size

---

## ⚡ Performance Considerations

### Optimization Strategies

1. **Model Loading**
   - Models loaded once and cached
   - Total size: ~15MB
   - Initial load: 2-5 seconds

2. **Image Processing**
   - Canvas API for fast pixel manipulation
   - Web Workers could be added for heavy operations
   - Typical processing time: 5-15 seconds

3. **Memory Management**
   - Images loaded as needed
   - Canvas cleared after use
   - Blob URLs revoked after download

### Browser Compatibility

| Browser | Compatibility | Notes |
|---------|---------------|-------|
| Chrome 90+ | ✅ Full support | Recommended |
| Firefox 88+ | ✅ Full support | Good performance |
| Safari 14+ | ✅ Full support | May be slower |
| Edge 90+ | ✅ Full support | Chromium-based |

---

## 🐛 Known Limitations

### 1. Glasses Detection
- **Issue**: Not implemented
- **Reason**: Requires specialized model
- **Workaround**: Manual user verification
- **Future**: Could integrate external API or train custom model

### 2. Background Removal Performance
- **Issue**: Slow on large images (>4MP)
- **Reason**: AI processing in browser
- **Workaround**: Recommend images < 2000×2000 px
- **Future**: Could use Web Workers for parallel processing

### 3. Browser ML Limitations
- **Issue**: Less accurate than server-side ML
- **Reason**: Smaller models for browser compatibility
- **Impact**: ~85-90% accuracy vs 95%+ server-side
- **Future**: Could add server-side processing option

### 4. Mobile Performance
- **Issue**: Slower on mobile devices
- **Reason**: Limited CPU/GPU resources
- **Impact**: 2-3x slower than desktop
- **Workaround**: Process on desktop when possible

---

## 🧪 Testing Recommendations

### For Bachelor's Thesis Defense

1. **Prepare Test Images**
   - ✅ Perfect photo (passes all checks)
   - ❌ Multiple people (fails: multiple faces)
   - ❌ Side profile (fails: yaw angle)
   - ❌ Tilted head (fails: roll angle)
   - ❌ Eyes closed (fails: eye visibility)
   - ❌ Smiling (fails: expression check)
   - ❌ Too close/far (fails: head size)

2. **Demonstrate Each Step**
   - Upload process
   - Validation with pass/fail examples
   - Processing visualization
   - Layout generation
   - Download functionality

3. **Explain Limitations**
   - Glasses detection
   - Browser performance
   - Accuracy vs server-side
   - Mobile constraints

4. **Show Technical Details**
   - Model architecture
   - Algorithm explanations
   - Code structure
   - Performance metrics

---

## 📚 References & Resources

### Libraries Used

- **React**: https://react.dev/
- **face-api.js**: https://github.com/justadudewhohacks/face-api.js
- **@imgly/background-removal**: https://github.com/imgly/background-removal-js
- **jsPDF**: https://github.com/parallax/jsPDF
- **Tailwind CSS**: https://tailwindcss.com/

### Academic References

- **Face Detection**: Liu, W., et al. "SSD: Single Shot MultiBox Detector" (2016)
- **Facial Landmarks**: Kazemi, V., & Sullivan, J. "One Millisecond Face Alignment" (2014)
- **Image Segmentation**: Qin, X., et al. "U²-Net: Going Deeper with Nested U-Structure" (2020)

### Document Photo Standards

- **ICAO Document 9303**: International passport photo standards
- **ISO/IEC 19794-5**: Biometric data interchange formats

---

## 🎓 Bachelor's Thesis Notes

### Project Evaluation Criteria

This project demonstrates:

1. **Technical Skills**
   - Modern web development (React, Vite)
   - Computer vision implementation
   - Image processing algorithms
   - API integration

2. **Problem Solving**
   - Real-world problem identification
   - Algorithm selection and optimization
   - Limitation handling
   - User experience design

3. **Code Quality**
   - Modular architecture
   - Comprehensive documentation
   - Error handling
   - Performance optimization

### Potential Extensions

Future improvements could include:

1. **Enhanced Detection**
   - Glasses glare detection
   - Emotion classification
   - Pose estimation

2. **Additional Features**
   - Batch processing
   - Cloud storage integration
   - Mobile app version
   - Server-side processing option

3. **Internationalization**
   - Multiple language support
   - Country-specific photo standards
   - Currency/size unit conversion

---

## 📝 License

This project is created as a Bachelor's thesis project for educational purposes.

---

## 👤 Author

**Bachelor's Thesis Project**
Document Photo Preparation System

---

## 🆘 Troubleshooting

### Models Not Loading

**Symptom**: Console error "Failed to load face detection models"

**Solution**:
1. Verify models are in `/public/models`
2. Check file names match exactly
3. Clear browser cache
4. Restart dev server

### Background Removal Fails

**Symptom**: Processing hangs or fails

**Solution**:
1. Try smaller image (< 2000×2000 px)
2. Check browser console for errors
3. Ensure good internet connection (library may load from CDN)
4. Try different browser

### Validation Always Fails

**Symptom**: Valid photos fail validation

**Solution**:
1. Ensure face is clearly visible
2. Check lighting is adequate
3. Verify face is frontal
4. Try different photo

### Performance Issues

**Symptom**: Slow processing

**Solution**:
1. Resize images before upload
2. Close other browser tabs
3. Use desktop instead of mobile
4. Update browser to latest version

---

## 📞 Support

For questions or issues:
1. Check browser console for errors
2. Review this README thoroughly
3. Verify all dependencies are installed
4. Ensure models are correctly placed

---

**End of Documentation**