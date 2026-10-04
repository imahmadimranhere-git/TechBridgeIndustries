import { useEffect, useId, useRef, useState } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import Button from './Button.jsx';

const DEFAULT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Grey/white squares behind the image make a transparent background visible
const CHECKERBOARD = {
  backgroundImage:
    'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
};

/**
 * Image upload with instant preview (object URL), drag and drop, and the same checks as the server.
 * onUpload(file) should upload and resolve; onRemove() should delete and resolve.
 */
export default function FileUpload({
  label,
  hint = 'PNG with a transparent background works best. Max 2 MB.',
  currentUrl,
  accept = DEFAULT_TYPES,
  maxSizeMB = 2,
  onUpload,
  onRemove,
  uploading = false,
  removing = false,
  previewClassName = 'h-28',
  className,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Free the browser memory used by the old preview
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const shownUrl = preview ?? currentUrl;

  async function handleFile(file) {
    setError('');
    if (!file) return;
    if (!accept.includes(file.type)) {
      setError('Only PNG, JPG or WEBP images are allowed');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be ${maxSizeMB} MB or smaller`);
      return;
    }

    setPreview(URL.createObjectURL(file));
    try {
      await onUpload?.(file);
    } catch (uploadError) {
      setError(uploadError.message);
      setPreview(null);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setError('');
    try {
      await onRemove?.();
      setPreview(null);
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors sm:flex-row',
          dragging ? 'border-brand bg-brand-50' : 'border-gray-300 bg-white',
          error && 'border-danger'
        )}
      >
        <div
          className={cn('flex w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 sm:w-48', previewClassName)}
          style={CHECKERBOARD}
        >
          {shownUrl ? (
            <img src={shownUrl} alt={`${label ?? 'Image'} preview`} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="size-8 text-gray-300" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">Drag an image here</span> or choose a file
          </p>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={accept.join(',')}
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <Button size="sm" variant="secondary" icon={Upload} loading={uploading} onClick={() => inputRef.current?.click()}>
              {shownUrl ? 'Replace' : 'Upload'}
            </Button>
            {shownUrl && onRemove && (
              <Button size="sm" variant="ghost" icon={Trash2} loading={removing} onClick={handleRemove}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}