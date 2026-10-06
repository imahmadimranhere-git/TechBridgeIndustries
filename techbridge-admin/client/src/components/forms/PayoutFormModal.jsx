import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { staffApi } from '../../api/endpoints.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { emptyPayout, payoutSchema } from '../../schemas/staffSchemas.js';
import { PAYMENT_METHODS, toOptions } from '../../utils/constants.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import { toMajor } from '../../utils/formatMoney.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';
import Button from '../ui/Button.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import SearchSelect from '../ui/SearchSelect.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';

const FORM_ID = 'payout-form';

/**
 * Pay commission to a staff member.
 * From a staff profile pass staffId; from the payouts list the admin chooses the staff member.
 */
export default function PayoutFormModal({ open, onClose, staffId: fixedStaffId = '' }) {
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  // Set when the server asks "save anyway?" (more than the pending commission)
  const [pending, setPending] = useState(null);

  // All staff with their overall commission figures (inactive staff can still be paid)
  const staffQuery = useQuery({
    queryKey: ['staff', 'payout-options'],
    queryFn: () => staffApi.list({ limit: 100 }),
    select: (data) => data.items,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(payoutSchema), defaultValues: emptyPayout() });

  useEffect(() => {
    if (!open) return;
    reset(emptyPayout(fixedStaffId));
    setPending(null);
  }, [open, fixedStaffId, reset]);

  const staffId = useWatch({ control, name: 'staff' });
  const selected = useMemo(() => staffQuery.data?.find((staff) => staff._id === staffId), [staffQuery.data, staffId]);
  const pendingCommission = selected?.financials?.commissionPending ?? 0;

  const mutation = useMutation({
    mutationFn: ({ staff, ...body }) => staffApi.createPayout(staff, body),
    onSuccess: ({ payout }) => {
      toast.success(`Payout of ${formatMoney(payout.amount)} saved`);
      invalidateMoneyQueries(queryClient);
      setPending(null);
      onClose();
    },
    onError: (error, payload) => {
      if (error.status === 409 && error.meta?.requiresConfirmation) {
        setPending({ payload, message: error.message });
        return;
      }
      setPending(null);
      if (!applyServerErrors(error, setError)) toast.error(error.message);
    },
  });

  const staffOptions = (staffQuery.data ?? []).map((staff) => ({
    value: staff._id,
    label: staff.name,
    description: `Pending ${formatMoney(staff.financials.commissionPending)}${staff.status === 'Inactive' ? ' · inactive' : ''}`,
  }));

  return (
    <>
      <Modal
        open={open}
        onClose={mutation.isPending ? () => {} : onClose}
        title="Pay commission"
        description="Commission paid out to a staff member."
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} loading={mutation.isPending && !pending}>
              Save payout
            </Button>
          </>
        }
      >
        <form
          id={FORM_ID}
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate({ ...values, confirmOverpay: false }))}
          className="space-y-4"
        >
          {fixedStaffId ? (
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-gray-900">{selected?.name ?? 'Loading...'}</div>
          ) : (
            <Controller
              control={control}
              name="staff"
              render={({ field }) => (
                <SearchSelect
                  label="Staff member"
                  required
                  options={staffOptions}
                  value={field.value}
                  onChange={field.onChange}
                  loading={staffQuery.isLoading}
                  placeholder="Search staff"
                  error={errors.staff?.message}
                />
              )}
            />
          )}

          {selected && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <span className="text-gray-600">
                Pending commission: <strong className="text-gray-900 tabular-nums">{formatMoney(pendingCommission)}</strong>
              </span>
              {pendingCommission > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setValue('amount', String(toMajor(pendingCommission)), { shouldValidate: true })}>
                  Pay full pending
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Amount" required inputMode="decimal" placeholder="e.g. 15,000" error={errors.amount?.message} {...register('amount')} />
            <Input label="Date" type="date" required error={errors.date?.message} {...register('date')} />
            <Select label="Method" options={toOptions(PAYMENT_METHODS)} {...register('method')} />
          </div>
          <Input label="Reference" placeholder="Transaction ID" error={errors.reference?.message} {...register('reference')} />
          <Textarea label="Note" rows={3} error={errors.note?.message} {...register('note')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => mutation.mutate({ ...pending.payload, confirmOverpay: true })}
        loading={mutation.isPending}
        tone="primary"
        title="Pay more than the pending commission?"
        message={pending?.message}
        confirmLabel="Save anyway"
      />
    </>
  );
}