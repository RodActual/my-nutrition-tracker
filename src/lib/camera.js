// Shared camera helpers for the barcode and label scanners.

const KNOWN_NAMES = ['NotAllowedError', 'NotReadableError', 'OverconstrainedError', 'NotFoundError'];

// html5-qrcode sometimes rejects with a plain string instead of a DOMException.
export const cameraErrorName = (err) => {
  if (typeof err === 'string') {
    if (/permission denied|SecurityError/i.test(err)) return 'NotAllowedError';
    return KNOWN_NAMES.find((n) => err.includes(n)) || null;
  }
  return err?.name === 'SecurityError' ? 'NotAllowedError' : (err?.name || null);
};

export const isRetryableCameraError = (err) =>
  ['OverconstrainedError', 'NotReadableError'].includes(cameraErrorName(err));

export const cameraErrorMessage = (err) => {
  const name = cameraErrorName(err);
  if (name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access in Settings and try again.';
  if (name === 'NotFoundError') return 'No camera was found on this device.';
  return `Camera access failed (${name || 'unknown error'}). Try closing other camera apps and reopening the scanner.`;
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A busy camera (NotReadableError) needs time to be released; a constraint
// mismatch (OverconstrainedError) does not.
export const retryDelayMs = (err) => (cameraErrorName(err) === 'NotReadableError' ? 400 : 0);
