/**
 * DOWNLOAD UTILITIES
 * 
 * Helper functions for downloading generated images and PDFs
 */

/**
 * Download image from data URL
 * 
 * @param {string} dataUrl - Base64 data URL
 * @param {string} filename - Desired filename
 */
export function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Download blob as file
   * 
   * @param {Blob} blob - File blob
   * @param {string} filename - Desired filename
   */
  export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }