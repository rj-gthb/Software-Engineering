import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, next) {
  const status = error instanceof HttpError ? error.status : 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      message: error.message || 'Internal server error.',
      details: error.details,
    },
  });
}
