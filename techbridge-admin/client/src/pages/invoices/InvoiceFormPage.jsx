import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, Send, Trash2 } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dealsApi, invoicesApi, settingsApi } from '../../api/endpoints.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import SearchSelect from '../../components/ui/SearchSelect.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useDealOptions } from '../../hooks/useOptions.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { emptyInvoice, emptyItem, invoiceSchema, invoiceToForm, invoiceToPayload } from '../../schemas/invoiceSchemas.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import { calculateInvoiceTotals } from '../../utils/invoiceTotals.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';

/** New invoice (/invoices/new?dealId=...) or edit (/invoices/:id/edit) */
export default function InvoiceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const presetDealId = searchParams.get('dealId') ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  usePageTitle(isEdit ? 'Edit invoice' : 'New invoice');

  const [dealSearch, setDealSearch] = useState('');
  const debouncedDealSearch = useDebounce(dealSearch, 300);

  const invoiceQuery = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id), enabled: isEdit });
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, enabled: !isEdit });
  const dealsQuery = useDealOptions({ search: debouncedDealSearch });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(invoiceSchema), defaultValues: emptyInvoice({ deal: presetDealId }) });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // New invoice: defaults from Settings (due days, tax, terms)
  useEffect(() => {
    if (isEdit || !settingsQuery.data) return;
    const { settings } = settingsQuery.data;
    reset(
      emptyInvoice({
        deal: presetDealId,
        dueDays: settings.defaultDueDays,
        taxPercent: settings.defaultTaxPercent,
        terms: settings.invoiceTerms,
      })
    );
  }, [isEdit, settingsQuery.data, presetDealId, reset]);

  // Edit: the saved invoice
  useEffect(() => {
    if (isEdit && invoiceQuery.data) reset(invoiceToForm(invoiceQuery.data.invoice));
  }, [isEdit, invoiceQuery.data, reset]);

  const [dealId, items, discount, taxPercent] = useWatch({ control, name: ['deal', 'items', 'discount', 'taxPercent'] });
  const totals = useMemo(() => calculateInvoiceTotals(items, discount, taxPercent), [items, discount, taxPercent]);

  // The chosen deal's remaining amount, shown while creating the invoice
  const selectedDealQuery = useQuery({ queryKey: ['deal', dealId], queryFn: () => dealsApi.get(dealId), enabled: Boolean(dealId) });
  const selectedDeal = selectedDealQuery.data;

  const dealOptions = useMemo(() => {
    const options = (dealsQuery.data ?? [])
      .filter((deal) => deal.status !== 'Cancelled')
      .map((deal) => ({
        value: deal._id,
        label: deal.title,
        description: `${deal.client?.companyName || deal.client?.name || ''} · remaining ${formatMoney(deal.remaining)}`,
      }));
    if (selectedDeal && !options.some((option) => option.value === selectedDeal.deal._id)) {
      options.unshift({ value: selectedDeal.deal._id, label: selectedDeal.deal.title, description: selectedDeal.deal.client?.name });
    }
    return options;
  }, [dealsQuery.data, selectedDeal, formatMoney]);

  const existing = invoiceQuery.data?.invoice;
  const canStayDraft = !isEdit || existing?.status === 'Draft';

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? invoicesApi.update(id, payload) : invoicesApi.create(payload)),
    onSuccess: ({ invoice }) => {
      toast.success(isEdit ? 'Invoice updated' : `Invoice ${invoice.invoiceNumber} created`);
      invalidateMoneyQueries(queryClient);
      navigate(`/invoices/${invoice._id}`, { replace: true });
    },
    onError: (error) => {
      if (!applyServerErrors(error, setError)) toast.error(error.message);
    },
  });

  const submitAs = (status) => handleSubmit((values) => mutation.mutate(invoiceToPayload(values, status)));

  if (isEdit && invoiceQuery.isLoading) return <FullPageSpinner label="Loading invoice" />;

  const remaining = selectedDeal?.financials?.remaining;
  const overRemaining = typeof remaining === 'number' && totals.total > remaining;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        backTo={isEdit ? `/invoices/${id}` : '/invoices'}
        backLabel={isEdit ? 'Back to invoice' : 'All invoices'}
        title={isEdit ? `Edit ${existing?.invoiceNumber ?? 'invoice'}` : 'New invoice'}
        description={isEdit ? 'Totals are recalculated when you save.' : 'The invoice number is assigned automatically when you save.'}
      />

      <form noValidate onSubmit={submitAs(canStayDraft ? 'Draft' : 'Sent')} className="space-y-6">
        <Card>
          <CardHeader title="Bill to" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Controller
              control={control}
              name="deal"
              render={({ field }) => (
                <SearchSelect
                  label="Deal"
                  required
                  className="sm:col-span-3"
                  options={dealOptions}
                  value={field.value}
                  onChange={field.onChange}
                  onQueryChange={setDealSearch}
                  loading={dealsQuery.isFetching}
                  placeholder="Search deals or clients"
                  error={errors.deal?.message}
                />
              )}
            />

            {selectedDeal && (
              <div className="grid gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm sm:col-span-3 sm:grid-cols-4">
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium text-gray-900">{selectedDeal.deal.client?.companyName || selectedDeal.deal.client?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Deal amount</p>
                  <p className="font-medium text-gray-900 tabular-nums">{formatMoney(selectedDeal.financials.dealAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Received</p>
                  <p className="font-medium text-success tabular-nums">{formatMoney(selectedDeal.financials.received)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Remaining</p>
                  <p className="font-semibold text-danger tabular-nums">{formatMoney(remaining)}</p>
                </div>
              </div>
            )}

            <Input label="Invoice date" type="date" required error={errors.invoiceDate?.message} {...register('invoiceDate')} />
            <Input label="Due date" type="date" required error={errors.dueDate?.message} {...register('dueDate')} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Line items"
            actions={
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => append(emptyItem())}>
                Add item
              </Button>
            }
          />
          <CardBody className="space-y-3">
            <div className="hidden grid-cols-12 gap-3 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase sm:grid">
              <span className="col-span-6">Description</span>
              <span className="col-span-1">Qty</span>
              <span className="col-span-2">Rate</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>

            {fields.map((field, index) => {
              const itemErrors = errors.items?.[index];
              return (
                <div key={field.id} className="grid grid-cols-12 items-start gap-3 rounded-xl border border-gray-100 p-3 sm:border-0 sm:p-0">
                  <Input
                    aria-label={`Item ${index + 1} description`}
                    placeholder="What is this for?"
                    className="col-span-12 sm:col-span-6"
                    error={itemErrors?.description?.message}
                    {...register(`items.${index}.description`)}
                  />
                  <Input
                    aria-label={`Item ${index + 1} quantity`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="col-span-4 sm:col-span-1"
                    error={itemErrors?.qty?.message}
                    {...register(`items.${index}.qty`)}
                  />
                  <Input
                    aria-label={`Item ${index + 1} rate`}
                    inputMode="decimal"
                    placeholder="0"
                    className="col-span-8 sm:col-span-2"
                    error={itemErrors?.rate?.message}
                    {...register(`items.${index}.rate`)}
                  />
                  <p className="col-span-9 pt-2 text-right text-sm font-medium text-gray-900 tabular-nums sm:col-span-2">
                    {formatMoney(totals.amounts[index] ?? 0)}
                  </p>
                  <div className="col-span-3 flex justify-end sm:col-span-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      aria-label={`Remove item ${index + 1}`}
                      className="px-2 text-danger"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    />
                  </div>
                </div>
              );
            })}

            {errors.items?.message && <p className="text-xs text-danger">{errors.items.message}</p>}
            {errors.items?.root?.message && <p className="text-xs text-danger">{errors.items.root.message}</p>}
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader title="Notes and terms" />
            <CardBody className="space-y-4">
              <Textarea label="Notes" rows={3} placeholder="Shown on the invoice" error={errors.notes?.message} {...register('notes')} />
              <Textarea label="Terms and conditions" rows={4} error={errors.terms?.message} {...register('terms')} />
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Totals" description="Live preview" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Discount" inputMode="decimal" placeholder="0" error={errors.discount?.message} {...register('discount')} />
                <Input label="Tax %" type="number" step="0.01" min="0" max="100" error={errors.taxPercent?.message} {...register('taxPercent')} />
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subtotal</dt>
                  <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Discount</dt>
                    <dd className="tabular-nums">- {formatMoney(totals.discount)}</dd>
                  </div>
                )}
                {totals.taxPercent > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tax ({totals.taxPercent}%)</dt>
                    <dd className="tabular-nums">{formatMoney(totals.taxAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="text-brand tabular-nums">{formatMoney(totals.total)}</dd>
                </div>
              </dl>

              {overRemaining && (
                <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  This invoice is more than the deal's remaining amount ({formatMoney(remaining)}).
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={mutation.isPending}>
            Cancel
          </Button>
          {canStayDraft ? (
            <>
              <Button type="submit" variant="secondary" loading={mutation.isPending}>
                Save as draft
              </Button>
              <Button icon={Send} loading={mutation.isPending} onClick={submitAs('Sent')}>
                Save and mark as sent
              </Button>
            </>
          ) : (
            <Button type="submit" loading={mutation.isPending}>
              Save changes
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}