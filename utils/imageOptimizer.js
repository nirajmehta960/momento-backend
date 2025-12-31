// ============================================================
// IMAGE OPTIMIZATION UTILITY
// ============================================================
// Handles image resizing, WebP conversion, and thumbnail generation

import sharp from "sharp";

// Image optimization configuration
const MAX_WIDTH = 1920; // Maximum width for full-size images
const MAX_HEIGHT = 1920; // Maximum height for full-size images
const THUMBNAIL_WIDTH = 400; // Thumbnail width
const THUMBNAIL_HEIGHT = 400; // Thumbnail height
const QUALITY = 85; // JPEG/WebP quality (0-100)
const WEBP_QUALITY = 80; // WebP quality (0-100)

/**
 * Optimize image: resize and convert to WebP
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {object} options - Optimization options
 * @param {number} options.maxWidth - Maximum width (default: 1920)
 * @param {number} options.maxHeight - Maximum height (default: 1920)
 * @param {number} options.quality - JPEG quality (default: 85)
 * @param {boolean} options.convertToWebP - Convert to WebP (default: true)
 * @returns {Promise<{buffer: Buffer, mimeType: string, width: number, height: number, size: number}>}
 */
export const optimizeImage = async (imageBuffer, options = {}) => {
  try {
    const {
      maxWidth = MAX_WIDTH,
      maxHeight = MAX_HEIGHT,
      quality = QUALITY,
      convertToWebP = true,
    } = options;

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height, format } = metadata;

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      newWidth = Math.round(width * ratio);
      newHeight = Math.round(height * ratio);
    }

    // Process image
    let pipeline = sharp(imageBuffer).resize(newWidth, newHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // Convert to WebP if requested and original format is not WebP
    if (convertToWebP && format !== "webp") {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
      const optimizedBuffer = await pipeline.toBuffer();
      return {
        buffer: optimizedBuffer,
        mimeType: "image/webp",
        width: newWidth,
        height: newHeight,
        size: optimizedBuffer.length,
        originalSize: imageBuffer.length,
        format: "webp",
      };
    } else {
      // Keep original format but optimize
      if (format === "jpeg" || format === "jpg") {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      } else if (format === "png") {
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
      }

      const optimizedBuffer = await pipeline.toBuffer();
      return {
        buffer: optimizedBuffer,
        mimeType: `image/${format}`,
        width: newWidth,
        height: newHeight,
        size: optimizedBuffer.length,
        originalSize: imageBuffer.length,
        format: format,
      };
    }
  } catch (error) {
    throw new Error(`Image optimization failed: ${error.message}`);
  }
};

/**
 * Generate thumbnail from image
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {object} options - Thumbnail options
 * @param {number} options.width - Thumbnail width (default: 400)
 * @param {number} options.height - Thumbnail height (default: 400)
 * @param {boolean} options.convertToWebP - Convert to WebP (default: true)
 * @returns {Promise<{buffer: Buffer, mimeType: string, width: number, height: number, size: number}>}
 */
export const generateThumbnail = async (imageBuffer, options = {}) => {
  try {
    const {
      width = THUMBNAIL_WIDTH,
      height = THUMBNAIL_HEIGHT,
      convertToWebP = true,
    } = options;

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { format } = metadata;

    // Create thumbnail
    let pipeline = sharp(imageBuffer).resize(width, height, {
      fit: "cover",
      position: "center",
    });

    // Convert to WebP if requested
    if (convertToWebP && format !== "webp") {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
      const thumbnailBuffer = await pipeline.toBuffer();
      return {
        buffer: thumbnailBuffer,
        mimeType: "image/webp",
        width,
        height,
        size: thumbnailBuffer.length,
        format: "webp",
      };
    } else {
      // Keep original format but optimize for thumbnail
      if (format === "jpeg" || format === "jpg") {
        pipeline = pipeline.jpeg({ quality: 75, mozjpeg: true });
      } else if (format === "png") {
        pipeline = pipeline.png({ quality: 75, compressionLevel: 9 });
      }

      const thumbnailBuffer = await pipeline.toBuffer();
      return {
        buffer: thumbnailBuffer,
        mimeType: `image/${format}`,
        width,
        height,
        size: thumbnailBuffer.length,
        format: format,
      };
    }
  } catch (error) {
    throw new Error(`Thumbnail generation failed: ${error.message}`);
  }
};

/**
 * Process image: optimize and generate thumbnail
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {object} options - Processing options
 * @returns {Promise<{optimized: object, thumbnail: object}>}
 */
export const processImage = async (imageBuffer, options = {}) => {
  try {
    const [optimized, thumbnail] = await Promise.all([
      optimizeImage(imageBuffer, options),
      generateThumbnail(imageBuffer, options),
    ]);

    return {
      optimized,
      thumbnail,
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Convert buffer to base64 string
 * @param {Buffer} buffer - Image buffer
 * @returns {string} - Base64 string
 */
export const bufferToBase64 = (buffer) => {
  return buffer.toString("base64");
};

/**
 * Get image format from buffer
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<string>} - Image format (jpeg, png, webp, etc.)
 */
export const getImageFormat = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return metadata.format || "unknown";
  } catch (error) {
    throw new Error(`Failed to get image format: ${error.message}`);
  }
};

export default {
  optimizeImage,
  generateThumbnail,
  processImage,
  bufferToBase64,
  getImageFormat,
};
