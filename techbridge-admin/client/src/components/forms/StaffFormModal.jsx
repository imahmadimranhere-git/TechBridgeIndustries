import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { staffApi } from '../../api/endpoints.js';
import { emptyStaff, staffSchema, staffToForm } from '../../schemas/staffSchemas.js';
import { STAFF_STATUSES, toOptions } from '../../utils/constants.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Select from '../ui/Select.jsx';

const FORM_ID = 'staff-form';
const TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage of payments received' },
  { value: 'fixed', label: 'Fixed amount per fully paid deal' },
];

/** Add a staff member, or edit `staff` when given */
export default function StaffFormModal({ open, staff, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(staff?._id);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(staffSchema), defaultValues: emptyStaff });

  useEffect(() => {
    if (open) reset(isEdit ? staffToForm(staff) : emptyStaff);
  }, [open, isEdit, staff, reset]);

  const commissionType = useWatch({ control, name: 'commissionType' });

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? staffApi.update(staff._id, values) : staffApi.create(values)),
    onSuccess: () => {
      toast.success(isEdit ? 'Staff member updated' : 'Staff member added');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      title={isEdit ? 'Edit staff member' : 'Add staff member'}
      description="Staff are paid by commission only; they do not log in."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Add staff member'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required autoFocus error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <Input label="CNIC" placeholder="12345-1234567-1" error={errors.cnic?.message} {...register('cnic')} />
        <Input label="Address" className="sm:col-span-2" error={errors.address?.message} {...register('address')} />
        <Input label="Joining date" type="date" error={errors.joiningDate?.message} {...register('joiningDate')} />
        <Select label="Status" options={toOptions(STAFF_STATUSES)} error={errors.status?.message} {...register('status')} />
        <Select label="Default commission" options={TYPE_OPTIONS} error={errors.commissionType?.message} {...register('commissionType')} />
        <Input
          label={commissionType === 'fixed' ? 'Fixed amount' : 'Percentage (%)'}
          required
          inputMode="decimal"
          placeholder={commissionType === 'fixed' ? 'e.g. 15,000' : 'e.g. 10'}
          hint={isEdit ? 'Changing this only affects new deals.' : 'Copied onto each new deal.'}
          error={errors.commissionRate?.message}
          {...register('commissionRate')}
        />
      </form>
    </Modal>
  );
}