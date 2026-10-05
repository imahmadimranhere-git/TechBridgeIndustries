import { useEffect } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { saveBlob } from '../../utils/download.js';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';

/** preview: { url, blob, filename } or null */
export default function PdfPreviewModal({ preview, onClose }) {
  // Free the memory used by the PDF when the preview closes or changes
  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);

  return (
    <Modal
      open={Boolean(preview)}
      onClose={onClose}
      size="xl"
      title={preview?.filename ?? 'Preview'}
      footer={
        <>
          <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(preview.url, '_blank', 'noopener')}>
            Open in new tab
          </Button>
          <Button icon={Download} onClick={() => saveBlob(preview.blob, preview.filename)}>
            Download
          </Button>
        </>
      }
    >
      {preview && <iframe title="PDF preview" src={preview.url} className="h-[65vh] w-full rounded-lg border border-gray-200" />}
    </Modal>
  );
}