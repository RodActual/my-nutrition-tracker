// Shared camera helpers for the barcode and label scanners.

const KNOWN_NAMES = ['NotAllowedError', 'NotReadableError', 'OverconstrainedError', 'NotFoundError'];

// html5-qrcode sometimes rejects with a plain string instead of a DOMException.
export const cameraErrorName = (err) => {
  if (typeof err === 'string') return KNOWN_NAMES.find((n) => err.includes(n)) || null;
  return err?.name || null;
};

export const isRetryableCameraError = (err) =>
  ['OverconstrainedError', 'NotReadableError'].includes(cameraErrorName(err));

export const cameraErrorMessage = (err) =>
  cameraErrorName(err) === 'NotAllowedError'
    ? 'Camera permission was denied. Allow camera access in Settings and try again.'
    : `Camera access failed (${cameraErrorName(err) || 'unknown error'}). Try closing other camera apps and reopening the scanner.`;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A busy camera (NotReadableError) needs time to be released; a constraint
// mismatch (OverconstrainedError) does not.
export const retryDelayMs = (err) => (cameraErrorName(err) === 'NotReadableError' ? 400 : 0);
