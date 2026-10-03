// An error we throw on purpose; the error handler turns it into a clean JSON response
export default class ApiError extends Error {
  constructor(statusCode, message, errors = undefined, meta = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.meta = meta;
    this.isOperational = true;
  }

  static badRequest(message = 'Invalid request', errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Please log in to continue') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'This record conflicts with an existing one', errors) {
    return new ApiError(409, message, errors);
  }

  // The browser should show a confirm dialog and resend with confirmOverpay: true
  static needsConfirmation(message, meta = {}) {
    return new ApiError(409, message, undefined, { requiresConfirmation: true, ...meta });
  }
}