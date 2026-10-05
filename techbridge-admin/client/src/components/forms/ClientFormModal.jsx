import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clientsApi } from '../../api/endpoints.js';
import { clientSchema, emptyClient } from '../../schemas/clientSchemas.js';
import { CLIENT_SOURCES, CLIENT_STATUSES, toOptions } from '../../utils/constants.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Select from '../ui/Select.jsx';

const FORM_ID = 'client-form';

/** Add a new client, or edit `client` when given */
export default function ClientFormModal({ open, client, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(client?._id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(clientSchema), defaultValues: emptyClient });

  useEffect(() => {
    if (!open) return;
    reset(isEdit ? Object.fromEntries(Object.keys(emptyClient).map((key) => [key, client[key] ?? emptyClient[key]])) : emptyClient);
  }, [open, isEdit, client, reset]);

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? clientsApi.update(client._id, values) : clientsApi.create(values)),
    onSuccess: ({ client: saved }) => {
      toast.success(isEdit ? 'Client updated' : 'Client added');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', saved._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSaved?.(saved);
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
      size="lg"
      title={isEdit ? 'Edit client' : 'Add client'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Add client'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-4 sm:grid-cols-2">
        <Input label="Client name" required autoFocus error={errors.name?.message} {...register('name')} />
        <Input label="Company" error={errors.companyName?.message} {...register('companyName')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <Input label="WhatsApp" error={errors.whatsapp?.message} {...register('whatsapp')} />
        <Input label="Website" placeholder="https://" error={errors.website?.message} {...register('website')} />
        <Input label="Address" className="sm:col-span-2" error={errors.address?.message} {...register('address')} />
        <Input label="City" error={errors.city?.message} {...register('city')} />
        <Input label="Country" error={errors.country?.message} {...register('country')} />
        <Select label="Source" options={toOptions(CLIENT_SOURCES)} error={errors.source?.message} {...register('source')} />
        <Select label="Status" options={toOptions(CLIENT_STATUSES)} error={errors.status?.message} {...register('status')} />
      </form>
    </Modal>
  );
}