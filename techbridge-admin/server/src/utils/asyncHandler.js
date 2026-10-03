// Wraps an async route/middleware so any thrown error reaches the error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;