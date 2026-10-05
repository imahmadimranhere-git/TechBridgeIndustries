import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { sendDocumentEmail } from '../../api/documents.js';
import { emailFormSchema } from '../../schemas/emailSchemas.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Textarea from '../ui/Textarea.jsx';

const FORM_ID = 'document-email-form';

/**
 * Sends a document by email with the PDF attached.
 * extra: additional body fields (e.g. { range } for statements, { dealId } for welcome letters).
 */
export default function EmailDialog({ open, onClose, title = 'Send by email', emailPath, defaultRecipient = '', subjectHint, extra = {}, onSent }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { to: defaultRecipient, cc: '', subject: '', message: '' },
  });

  // Fresh form every time the dialog opens
  useEffect(() => {
    if (open) reset({ to: defaultRecipient, cc: '', subject: '', message: '' });
  }, [open, defaultRecipient, reset]);

  const mutation = useMutation({
    mutationFn: (values) =>
      sendDocumentEmail(emailPath, {
        to: values.to || undefined,
        cc: values.cc || undefined,
        subject: values.subject || undefined,
        message: values.message || undefined,
        ...extra,
      }),
    onSuccess: (result) => {
      toast.success(result.message);
      if (result.previewUrl) {
        toast(
          () => (
            <span className="text-sm">
              Test inbox:{' '}
              <a href={result.previewUrl} target="_blank" rel="noreferrer" className="font-medium text-brand underline">
                open the email
              </a>
            </span>
          ),
          { duration: 12000 }
        );
      }
      onSent?.(result);
      onClose();
    },
    onError: (error) => {
      if (!applyServerErrors(error, setError)) toast.error(error.message);
    },
  });

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => {} : onClose}
      title={title}
      description="The PDF is attached automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} icon={Send} loading={mutation.isPending}>
            Send email
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
        <Input
          label="To"
          placeholder="name@example.com"
          hint={defaultRecipient ? 'Separate several addresses with commas' : 'This record has no email saved; enter one here'}
          error={errors.to?.message}
          {...register('to')}
        />
        <Input label="CC" placeholder="Optional" error={errors.cc?.message} {...register('cc')} />
        <Input label="Subject" placeholder={subjectHint ?? 'Leave empty for the default subject'} error={errors.subject?.message} {...register('subject')} />
        <Textarea label="Personal message" rows={4} placeholder="Optional note shown above the document details" error={errors.message?.message} {...register('message')} />
      </form>
    </Modal>
  );
}