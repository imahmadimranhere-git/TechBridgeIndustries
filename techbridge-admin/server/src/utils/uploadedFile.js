import ApiError from './ApiError.js';

// Relative path of the image accepted by uploadImage(), or a clear 400 when none was sent
export function uploadedPath(req, fieldName = 'image') {
  if (!req.file?.relativePath) {
    throw ApiError.badRequest('Please choose an image to upload', { [fieldName]: 'Image is required' });
  }
  return req.file.relativePath;
}