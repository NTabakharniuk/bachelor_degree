/**
 * LAYOUT GENERATION UTILITIES
 * 
 * Generates print-ready layouts:
 * - A4 sheet (210x297mm) with 6 photos (2x3 grid)
 * - 10x15 cm photo paper with 9 photos (3x3 grid)
 * 
 * All layouts are generated at 300 DPI for high-quality printing
 */

const DPI = 300;
const MM_TO_INCH = 0.0393701;

/**
 * Generate A4 layout with 6 passport photos (2x3 grid)
 * 
 * A4 dimensions: 210x297mm
 * Photo dimensions: 30x40mm (3x4 cm)
 * 
 * @param {string} photoDataUrl - Processed photo as base64 data URL
 * @returns {Promise<string>} Layout as base64 data URL
 */
export async function generateA4Layout(photoDataUrl) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // A4 dimensions at 300 DPI
      const a4WidthMM = 210;
      const a4HeightMM = 297;
      canvas.width = Math.round(a4WidthMM * MM_TO_INCH * DPI); // 2480 pixels
      canvas.height = Math.round(a4HeightMM * MM_TO_INCH * DPI); // 3508 pixels

      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Photo dimensions (3x4 cm = 30x40 mm)
      const photoWidthMM = 30;
      const photoHeightMM = 40;
      const photoWidthPx = Math.round(photoWidthMM * MM_TO_INCH * DPI); // 354 pixels
      const photoHeightPx = Math.round(photoHeightMM * MM_TO_INCH * DPI); // 472 pixels

      // Layout configuration (2 columns x 3 rows)
      const cols = 2;
      const rows = 3;
      const marginMM = 20; // 20mm margin from edges
      const spacingMM = 15; // 15mm spacing between photos

      const marginPx = Math.round(marginMM * MM_TO_INCH * DPI);
      const spacingPx = Math.round(spacingMM * MM_TO_INCH * DPI);

      // Load photo image
      const img = new Image();
      img.onload = () => {
        // Draw photos in grid
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = marginPx + col * (photoWidthPx + spacingPx);
            const y = marginPx + row * (photoHeightPx + spacingPx);

            // Draw photo
            ctx.drawImage(img, x, y, photoWidthPx, photoHeightPx);

            // Draw border for cutting guides
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
          }
        }

        // Add cutting guides text
        ctx.fillStyle = '#666666';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Cut along gray lines', marginPx, canvas.height - 30);
        ctx.font = '12px Arial';
        ctx.fillText('3×4 cm passport photos - Print at 300 DPI', marginPx, canvas.height - 10);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = reject;
      img.src = photoDataUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate 10x15 cm photo paper layout with 9 photos (3x3 grid)
 * 
 * 10x15 cm dimensions: 100x150mm
 * Photo dimensions: 30x40mm (3x4 cm)
 * 
 * @param {string} photoDataUrl - Processed photo as base64 data URL
 * @returns {Promise<string>} Layout as base64 data URL
 */
export async function generate10x15Layout(photoDataUrl) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 10x15 cm dimensions at 300 DPI
      const paperWidthMM = 100;
      const paperHeightMM = 150;
      canvas.width = Math.round(paperWidthMM * MM_TO_INCH * DPI); // 1181 pixels
      canvas.height = Math.round(paperHeightMM * MM_TO_INCH * DPI); // 1772 pixels

      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Photo dimensions (3x4 cm = 30x40 mm)
      const photoWidthMM = 30;
      const photoHeightMM = 40;
      const photoWidthPx = Math.round(photoWidthMM * MM_TO_INCH * DPI);
      const photoHeightPx = Math.round(photoHeightMM * MM_TO_INCH * DPI);

      // Layout configuration (3 columns x 3 rows)
      const cols = 3;
      const rows = 3;
      const spacingMM = 5; // 5mm spacing between photos
      const spacingPx = Math.round(spacingMM * MM_TO_INCH * DPI);

      // Calculate margins to center the grid
      const totalGridWidth = cols * photoWidthPx + (cols - 1) * spacingPx;
      const totalGridHeight = rows * photoHeightPx + (rows - 1) * spacingPx;
      const marginX = (canvas.width - totalGridWidth) / 2;
      const marginY = (canvas.height - totalGridHeight) / 2;

      // Load photo image
      const img = new Image();
      img.onload = () => {
        // Draw photos in grid
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = marginX + col * (photoWidthPx + spacingPx);
            const y = marginY + row * (photoHeightPx + spacingPx);

            // Draw photo
            ctx.drawImage(img, x, y, photoWidthPx, photoHeightPx);

            // Draw border for cutting guides
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
          }
        }

        // Add info text
        ctx.fillStyle = '#666666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('3×4 cm photos - 300 DPI', canvas.width / 2, canvas.height - 10);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = reject;
      img.src = photoDataUrl;
    } catch (error) {
      reject(error);
    }
  });
}