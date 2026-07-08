export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export function asyncHandler(handler) {
  return function wrappedAsyncHandler(req, res, next) {
    return Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const isApiError = error instanceof ApiError;
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const message = statusCode >= 500 && !isApiError
    ? 'An unexpected error occurred'
    : error?.message || 'Request failed';

  if (statusCode >= 500) {
    console.error('[errorHandler]', {
      method: req.method,
      path: req.originalUrl,
      statusCode,
      message: error?.message,
      stack: error?.stack,
      requestId: req.headers['x-request-id'],
      user: req.user?.uid,
    });
  }

  return res.status(statusCode).json({ error: message });
}
