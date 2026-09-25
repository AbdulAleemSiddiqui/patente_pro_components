/**
 * Logo helpers: square-resize an uploaded image to a PNG data URL, and wrap
 * that PNG in an .ico container so it can serve as the browser favicon
 * (an .ico may contain PNG data — every browser since Vista renders it).
 */

// Refuse absurd source files before decoding them into a canvas
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
// Stored logos keep their aspect ratio; they are only scaled down so the
// longest edge fits in this (keeps the data URL small in the tenants row)
const MAX_LOGO_EDGE = 512;
// Favicon entries are square — the logo is letterboxed into this size
const FAVICON_SIZE = 128;

export function isImageFileTooLarge(file) {
  return file.size > MAX_SOURCE_BYTES;
}

/**
 * Read an image file into a PNG data URL without cropping. The aspect ratio
 * is preserved exactly; the image is only scaled down if an edge exceeds
 * MAX_LOGO_EDGE.
 * @param {File} file - Image file from an <input type="file">
 * @returns {Promise<string>} data:image/png;base64,...
 */
export function fileToLogoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_LOGO_EDGE / img.width, MAX_LOGO_EDGE / img.height);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Not a readable image'));
    };
    img.src = url;
  });
}

/**
 * Fit a logo data URL into a transparent square canvas and wrap it as .ico,
 * so wide logos do not get squashed in the browser tab.
 * @param {string} logoDataUrl - data:image/png;base64,... (any aspect ratio)
 * @returns {string} data:image/x-icon;base64,...
 */
export function logoDataUrlToFaviconIco(logoDataUrl) {
  const img = new Image();
  // .ico wrapping of a data URL is synchronous once the image is decoded
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = FAVICON_SIZE;
      canvas.height = FAVICON_SIZE;
      const ctx = canvas.getContext('2d');
      const scale = Math.min(FAVICON_SIZE / img.width, FAVICON_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (FAVICON_SIZE - w) / 2, (FAVICON_SIZE - h) / 2, w, h);
      resolve(pngDataUrlToIcoDataUrl(canvas.toDataURL('image/png'), FAVICON_SIZE));
    };
    img.onerror = () => reject(new Error('Not a readable image'));
    img.src = logoDataUrl;
  });
}

/**
 * Wrap a PNG data URL in an .ico container (ICONDIR + one ICONDIRENTRY +
 * the raw PNG bytes) and return it as a data URL.
 * @param {string} pngDataUrl - data:image/png;base64,...
 * @param {number} [size] - PNG edge length; 256+ is written as 0 per the spec
 * @returns {string} data:image/x-icon;base64,...
 */
export function pngDataUrlToIcoDataUrl(pngDataUrl, size = 256) {
  const base64 = pngDataUrl.split(',')[1];
  const binary = atob(base64);
  const png = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) png[i] = binary.charCodeAt(i);

  const ICO_HEADER_BYTES = 22;
  const ico = new Uint8Array(ICO_HEADER_BYTES + png.length);
  const view = new DataView(ico.buffer);

  // ICONDIR: reserved=0, type=1 (icon), count=1
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  // ICONDIRENTRY: width, height (0 means 256), colors, reserved
  const sizeByte = size >= 256 ? 0 : size;
  view.setUint8(6, sizeByte);
  view.setUint8(7, sizeByte);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  // planes, bits per pixel
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  // size of the image data, then its offset
  view.setUint32(14, png.length, true);
  view.setUint32(18, ICO_HEADER_BYTES, true);

  ico.set(png, ICO_HEADER_BYTES);

  let binaryIco = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < ico.length; i += CHUNK) {
    binaryIco += String.fromCharCode(...ico.subarray(i, i + CHUNK));
  }
  return `data:image/x-icon;base64,${btoa(binaryIco)}`;
}

/**
 * Replace the page's favicon and apple-touch-icon with the tenant logo.
 * @param {string} icoDataUrl - the letterboxed logo as an .ico data URL
 * @param {string} pngDataUrl - the original logo PNG (for apple-touch-icon)
 */
export function applyFavicon(icoDataUrl, pngDataUrl) {
  document.querySelectorAll('link[rel*="icon"]').forEach((el) => el.remove());
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/x-icon';
  icon.href = icoDataUrl;
  document.head.appendChild(icon);
  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = pngDataUrl;
  document.head.appendChild(apple);
}
