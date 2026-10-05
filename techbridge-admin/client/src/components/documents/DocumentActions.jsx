import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Download, Eye, Mail } from 'lucide-react';
import { fetchPdf } from '../../api/documents.js';
import { saveBlob } from '../../utils/download.js';
import Button from '../ui/Button.jsx';
import EmailDialog from './EmailDialog.jsx';
import PdfPreviewModal from './PdfPreviewModal.jsx';

/**
 * Preview / Download / Email buttons for any PDF route.
 *   pdfPath:   '/invoices/123/pdf'
 *   emailPath: '/invoices/123/email' (omit to hide the Email button)
 *   params:    query params for the PDF (e.g. a date range)
 *   emailExtra: extra body fields for the email (e.g. the same range)
 *   onDone:    called after a download or an email (to refresh logs)
 *   compact:   icon-only buttons for table rows
 */
export default function DocumentActions({
  pdfPath,
  params = {},
  emailPath,
  emailExtra = {},
  emailTitle,
  defaultRecipient,
  subjectHint,
  onDone,
  compact = false,
  disabled = false,
}) {
  const [preview, setPreview] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);

  const previewMutation = useMutation({
    mutationFn: () => fetchPdf(pdfPath, params),
    onSuccess: (pdf) => setPreview({ ...pdf, url: URL.createObjectURL(pdf.blob) }),
    onError: (error) => toast.error(error.message),
  });

  const downloadMutation = useMutation({
    mutationFn: () => fetchPdf(pdfPath, { ...params, download: 1 }),
    onSuccess: (pdf) => {
      saveBlob(pdf.blob, pdf.filename);
      onDone?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const actions = [
    { key: 'preview', label: 'Preview', icon: Eye, onClick: () => previewMutation.mutate(), loading: previewMutation.isPending },
    { key: 'download', label: 'Download', icon: Download, onClick: () => downloadMutation.mutate(), loading: downloadMutation.isPending },
    emailPath && { key: 'email', label: 'Email', icon: Mail, onClick: () => setEmailOpen(true), loading: false },
  ].filter(Boolean);

  return (
    <>
      {/* stopPropagation: clicking a button inside a table row must not open the row */}
      <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
        {actions.map((action) =>
          compact ? (
            <Button
              key={action.key}
              size="sm"
              variant="ghost"
              icon={action.icon}
              loading={action.loading}
              disabled={disabled}
              onClick={action.onClick}
              aria-label={action.label}
              title={action.label}
              className="px-2"
            />
          ) : (
            <Button key={action.key} size="sm" variant="secondary" icon={action.icon} loading={action.loading} disabled={disabled} onClick={action.onClick}>
              {action.label}
            </Button>
          )
        )}
      </div>

      <PdfPreviewModal preview={preview} onClose={() => setPreview(null)} />

      {emailPath && (
        <EmailDialog
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          title={emailTitle}
          emailPath={emailPath}
          defaultRecipient={defaultRecipient}
          subjectHint={subjectHint}
          extra={emailExtra}
          onSent={onDone}
        />
      )}
    </>
  );
}