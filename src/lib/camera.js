// Shared camera helpers for the barcode and label scanners.

export const isRetryableCameraError = (err) =>
  err?.name === 'OverconstrainedError' || err?.name === 'NotReadableError';

export const cameraErrorMessage = (err) =>
  err?.name === 'NotAllowedError'
    ? 'Camera permission was denied. Allow camera access in Settings and try again.'
    : `Camera access failed (${err?.name || 'unknown error'}). Try closing other camera apps and reopening the scanner.`;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A busy camera (NotReadableError) needs time to be released; a constraint
// mismatch (OverconstrainedError) does not.
export const retryDelayMs = (err) => (err?.name === 'NotReadableError' ? 400 : 0);
