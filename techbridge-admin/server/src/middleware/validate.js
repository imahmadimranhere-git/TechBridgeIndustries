import ApiError from '../utils/ApiError.js';

const PARTS = ['params', 'query', 'body'];

// Zod issues -> { field: 'first message' }, e.g. { email: 'Email is invalid' }
function formatIssues(issues, prefix = '') {
  const errors = {};
  for (const issue of issues) {
    const key = [prefix, ...issue.path].filter((part) => part !== '').join('.') || '_root';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * validate({ body: schema, query: schema, params: schema })
 * Parsed (cleaned and type-converted) data is stored on req.validated.
 * req.body is also replaced, so unknown fields never reach the controller.
 */
export const validate = (schemas) => (req, _res, next) => {
  const errors = {};
  req.validated = req.validated ?? {};

  for (const part of PARTS) {
    const schema = schemas[part];
    if (!schema) continue;

    const result = schema.safeParse(req[part] ?? {});
    if (result.success) {
      req.validated[part] = result.data;
      if (part === 'body') req.body = result.data;
    } else {
      Object.assign(errors, formatIssues(result.error.issues, part === 'body' ? '' : part));
    }
  }

  if (Object.keys(errors).length) {
    return next(ApiError.badRequest('Please fix the highlighted fields', errors));
  }
  return next();
};