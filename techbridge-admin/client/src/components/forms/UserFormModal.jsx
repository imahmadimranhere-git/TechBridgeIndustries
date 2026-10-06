import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { userCreateSchema, userUpdateSchema } from '../../schemas/userSchemas.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Switch from '../ui/Switch.jsx';

const FORM_ID = 'user-form';

/** Add an admin, or edit `user` when given */
export default function UserFormModal({ open, user, onClose }) {
  const queryClient = useQueryClient();
  const { user: me, setUser } = useAuth();
  const isEdit = Boolean(user?._id);
  const isSelf = isEdit && user._id === me?._id;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(isEdit ? userUpdateSchema : userCreateSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: user?.name ?? '',
      designation: user?.designation ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
      password: '',
      ...(isEdit ? { isActive: user.isActive } : {}),
    });
  }, [open, user, isEdit, reset]);

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? usersApi.update(user._id, values) : usersApi.create(values)),
    onSuccess: ({ user: saved }) => {
      toast.success(isEdit ? 'Admin updated' : `${saved.name} can now log in`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (saved._id === me?._id) setUser(saved);
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
      title={isEdit ? 'Edit admin' : 'Add admin'}
      description="Admins can log in and manage everything in this panel."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Add admin'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required autoFocus error={errors.name?.message} {...register('name')} />
        <Input label="Designation" placeholder="e.g. CEO, Manager" error={errors.designation?.message} {...register('designation')} />
        <Input label="Email" type="email" required autoComplete="off" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <Input
          label={isEdit ? 'New password' : 'Password'}
          type="password"
          required={!isEdit}
          autoComplete="new-password"
          className="sm:col-span-2"
          hint={isEdit ? 'Leave empty to keep the current password. Setting one logs this admin out everywhere.' : 'At least 8 characters with a letter and a number.'}
          error={errors.password?.message}
          {...register('password')}
        />
        {isEdit && (
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch
                className="sm:col-span-2"
                label="Active"
                description={isSelf ? 'You cannot deactivate your own account.' : 'Inactive admins cannot log in, but stay on documents they signed.'}
                checked={Boolean(field.value)}
                onChange={field.onChange}
                disabled={isSelf}
              />
            )}
          />
        )}
      </form>
    </Modal>
  );
}