import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dealsApi, paymentsApi } from '../../api/endpoints.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClientOptions, useDealOptions, useInvoiceOptions } from '../../hooks/useOptions.js';
import { emptyPayment, paymentSchema, paymentToPayload } from '../../schemas/paymentSchemas.js';
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

const FORM_ID = 'payment-form';

/**
 * Record a payment.
 * From a deal or invoice page pass dealId (and invoiceId); from the payments list pass nothing
 * and the admin picks client -> deal -> invoice.
 */
export default function PaymentFormModal({ open, onClose, dealId: fixedDealId = '', invoiceId: fixedInvoiceId = '', onSaved }) {
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  // Set when the server asks "save anyway?" (amount more than what is owed)
  const [pending, setPending] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(paymentSchema), defaultValues: emptyPayment() });

  const dealId = useWatch({ control, name: 'deal' });
  const invoiceId = useWatch({ control, name: 'invoice' });

  useEffect(() => {
    if (!open) return;
    reset(emptyPayment(fixedDealId, fixedInvoiceId));
    setClientId('');
    setClientSearch('');
    setPending(null);
  }, [open, fixedDealId, fixedInvoiceId, reset]);

  // A different deal means a different list of invoices
  useEffect(() => {
    if (!fixedInvoiceId) setValue('invoice', '');
  }, [dealId, fixedInvoiceId, setValue]);

  const clientsQuery = useClientOptions(debouncedClientSearch, { enabled: open && !fixedDealId });
  const dealsQuery = useDealOptions({ clientId }, { enabled: open && !fixedDealId && Boolean(clientId) });
  const fixedDealQuery = useQuery({
    queryKey: ['deal', fixedDealId],
    queryFn: () => dealsApi.get(fixedDealId),
    enabled: open && Boolean(fixedDealId),
  });
  const invoicesQuery = useInvoiceOptions({ dealId }, { enabled: open });

  // What is still owed on the chosen deal and invoice
  const dealInfo = useMemo(() => {
    if (fixedDealId) return fixedDealQuery.data?.financials ?? null;
    return dealsQuery.data?.find((deal) => deal._id === dealId) ?? null;
  }, [fixedDealId, fixedDealQuery.data, dealsQuery.data, dealId]);

  const invoiceInfo = invoicesQuery.data?.find((invoice) => invoice._id === invoiceId) ?? null;

  const mutation = useMutation({
    mutationFn: (payload) => paymentsApi.create(payload),
    onSuccess: ({ payment }) => {
      toast.success(`Payment of ${formatMoney(payment.amount)} saved`);
      invalidateMoneyQueries(queryClient);
      setPending(null);
      onSaved?.(payment);
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

  const fillAmount = (minor) => setValue('amount', String(toMajor(minor)), { shouldValidate: true });

  const clientOptions = (clientsQuery.data ?? []).map((client) => ({
    value: client._id,
    label: client.name,
    description: client.companyName,
  }));

  const dealOptions = (dealsQuery.data ?? []).map((deal) => ({
    value: deal._id,
    label: `${deal.title} (remaining ${formatMoney(deal.remaining)})`,
    disabled: deal.status === 'Cancelled',
  }));

  const invoiceOptions = (invoicesQuery.data ?? []).map((invoice) => ({
    value: invoice._id,
    label: `${invoice.invoiceNumber} (balance ${formatMoney(invoice.balanceDue)})`,
  }));

  return (
    <>
      <Modal
        open={open}
        onClose={mutation.isPending ? () => {} : onClose}
        size="lg"
        title="Add payment"
        description="Money received from a client for a deal."
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} loading={mutation.isPending && !pending}>
              Save payment
            </Button>
          </>
        }
      >
        <form id={FORM_ID} noValidate onSubmit={handleSubmit((values) => mutation.mutate(paymentToPayload(values)))} className="space-y-4">
          {fixedDealId ? (
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm">
              <p className="font-medium text-gray-900">{dealInfo?.title ?? 'Loading deal...'}</p>
              {dealInfo?.client && <p className="text-gray-600">{dealInfo.client.companyName || dealInfo.client.name}</p>}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <SearchSelect
                label="Client"
                required
                options={clientOptions}
                value={clientId}
                onChange={(value) => {
                  setClientId(value);
                  setValue('deal', '');
                }}
                onQueryChange={setClientSearch}
                loading={clientsQuery.isFetching}
                placeholder="Search clients"
              />
              <Select
                label="Deal"
                required
                placeholder={clientId ? 'Choose a deal' : 'Choose a client first'}
                disabled={!clientId}
                options={dealOptions}
                error={errors.deal?.message}
                {...register('deal')}
              />
            </div>
          )}

          <Select
            label="Invoice"
            placeholder="No invoice (advance payment)"
            disabled={!dealId || Boolean(fixedInvoiceId)}
            options={invoiceOptions}
            hint="Linking an invoice updates its status (Partially Paid / Paid)."
            {...register('invoice')}
          />

          {(dealInfo || invoiceInfo) && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              {dealInfo && (
                <span className="text-gray-600">
                  Deal remaining: <strong className="text-gray-900 tabular-nums">{formatMoney(dealInfo.remaining)}</strong>
                </span>
              )}
              {invoiceInfo && (
                <span className="text-gray-600">
                  Invoice balance: <strong className="text-gray-900 tabular-nums">{formatMoney(invoiceInfo.balanceDue)}</strong>
                </span>
              )}
              <span className="flex-1" />
              {invoiceInfo?.balanceDue > 0 && (
                <Button size="sm" variant="ghost" onClick={() => fillAmount(invoiceInfo.balanceDue)}>
                  Fill invoice balance
                </Button>
              )}
              {dealInfo?.remaining > 0 && (
                <Button size="sm" variant="ghost" onClick={() => fillAmount(dealInfo.remaining)}>
                  Fill deal remaining
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Amount" required inputMode="decimal" placeholder="e.g. 50,000" error={errors.amount?.message} {...register('amount')} />
            <Input label="Date" type="date" required error={errors.date?.message} {...register('date')} />
            <Controller
              control={control}
              name="method"
              render={({ field }) => <Select label="Method" options={toOptions(PAYMENT_METHODS)} {...field} />}
            />
          </div>

          <Input label="Reference" placeholder="Bank transaction ID, cheque number..." error={errors.reference?.message} {...register('reference')} />
          <Textarea label="Note" rows={3} error={errors.note?.message} {...register('note')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => mutation.mutate({ ...pending.payload, confirmOverpay: true })}
        loading={mutation.isPending}
        tone="primary"
        title="Record more than what is owed?"
        message={pending?.message}
        confirmLabel="Save anyway"
      />
    </>
  );
}