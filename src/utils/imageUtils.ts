/**
 * Image Utilities for Trade Screenshots
 * Provides client-side image compression, format conversion, and clipboard paste extraction.
 */

export async function fileToDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file or blob to an optimized WebP / JPEG data URL.
 * Keeps resolution high (up to 1920px width/height) while keeping file sizes small (~100KB-200KB).
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.82
): Promise<string> {
  const dataUrl = await fileToDataURL(fileOrBlob);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down if exceeding max dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          maxHeight = height;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl); // Fallback to raw data URL if canvas context fails
        return;
      }

      // Render image to canvas with smooth bicubic scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for optimal compression ratio, fallback to JPEG
      try {
        const compressedWebP = canvas.toDataURL('image/webp', quality);
        if (compressedWebP.startsWith('data:image/webp')) {
          resolve(compressedWebP);
          return;
        }
      } catch (e) {
        // Fall back to jpeg if webp unsupported
      }

      const compressedJpeg = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedJpeg);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };
  });
}

/**
 * Extracts an image file from a ClipboardEvent (e.g. from Ctrl+V paste action)
 */
export function extractImageFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
