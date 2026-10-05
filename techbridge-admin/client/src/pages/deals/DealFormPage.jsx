import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calculator } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clientsApi, dealsApi } from '../../api/endpoints.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import SearchSelect from '../../components/ui/SearchSelect.jsx';
import Select from '../../components/ui/Select.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import Switch from '../../components/ui/Switch.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClientOptions, useStaffOptions } from '../../hooks/useOptions.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { dealSchema, dealToForm, dealToPayload, emptyDeal } from '../../schemas/dealSchemas.js';
import { commissionLabel, commissionTotal } from '../../utils/commission.js';
import { COMMISSION_TYPES, DEAL_STATUSES, toOptions } from '../../utils/constants.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import { safeMinor } from '../../utils/formatMoney.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';

const COMMISSION_TYPE_OPTIONS = COMMISSION_TYPES.map((type) => ({ value: type, label: type === 'fixed' ? 'Fixed amount' : 'Percentage' }));

/** New deal (/deals/new?clientId=...) or edit (/deals/:id/edit) */
export default function DealFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const presetClientId = searchParams.get('clientId') ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  usePageTitle(isEdit ? 'Edit deal' : 'New deal');

  const [clientSearch, setClientSearch] = useState('');
  const debouncedClientSearch = useDebounce(clientSearch, 300);

  const dealQuery = useQuery({ queryKey: ['deal', id], queryFn: () => dealsApi.get(id), enabled: isEdit });
  const presetClientQuery = useQuery({
    queryKey: ['client', presetClientId],
    queryFn: () => clientsApi.get(presetClientId),
    enabled: !isEdit && Boolean(presetClientId),
  });
  const clientsQuery = useClientOptions(debouncedClientSearch);
  const staffQuery = useStaffOptions();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(dealSchema), defaultValues: emptyDeal(presetClientId) });

  useEffect(() => {
    if (isEdit && dealQuery.data) reset(dealToForm(dealQuery.data.deal));
  }, [isEdit, dealQuery.data, reset]);

  const [assignedStaff, overrideCommission, dealAmount, overrideType, overrideRate] = useWatch({
    control,
    name: ['assignedStaff', 'overrideCommission', 'dealAmount', 'commissionType', 'commissionRate'],
  });

  const existingDeal = dealQuery.data?.deal;
  const staffList = staffQuery.data ?? [];
  const selectedStaff = staffList.find((staff) => staff._id === assignedStaff);

  // Client dropdown: search results plus the already chosen client (it may not be in the results)
  const clientOptions = useMemo(() => {
    const options = (clientsQuery.data ?? []).map((client) => ({ value: client._id, label: client.name, description: client.companyName }));
    const chosen = existingDeal?.client ?? presetClientQuery.data?.client;
    if (chosen && !options.some((option) => option.value === chosen._id)) {
      options.unshift({ value: chosen._id, label: chosen.name, description: chosen.companyName });
    }
    return options;
  }, [clientsQuery.data, existingDeal, presetClientQuery.data]);

  // Staff dropdown: active staff plus the currently assigned one (even if inactive now)
  const staffOptions = useMemo(() => {
    const options = staffList.map((staff) => ({ value: staff._id, label: `${staff.name} (${commissionLabel(staff.commissionType, staff.commissionRate, formatMoney)})` }));
    const current = existingDeal?.assignedStaff;
    if (current && !options.some((option) => option.value === current._id)) options.unshift({ value: current._id, label: current.name });
    return options;
  }, [staffList, existingDeal, formatMoney]);

  // Live commission preview, following the same rules as the server
  const commission = useMemo(() => {
    const amount = safeMinor(dealAmount) ?? 0;
    if (!assignedStaff) return { label: 'No staff assigned: no commission', total: 0 };

    let type;
    let rate;
    let source;
    if (overrideCommission) {
      type = overrideType;
      rate = overrideType === 'fixed' ? safeMinor(overrideRate) ?? 0 : Number(overrideRate) || 0;
      source = 'custom rate for this deal';
    } else if (isEdit && existingDeal?.assignedStaff?._id === assignedStaff) {
      type = existingDeal.commissionType;
      rate = existingDeal.commissionRate;
      source = 'rate saved on this deal';
    } else if (selectedStaff) {
      type = selectedStaff.commissionType;
      rate = selectedStaff.commissionRate;
      source = `${selectedStaff.name}'s default rate`;
    } else {
      return { label: 'Loading staff...', total: 0 };
    }
    return { label: `${commissionLabel(type, rate, formatMoney)} (${source})`, total: commissionTotal(amount, type, rate) };
  }, [dealAmount, assignedStaff, overrideCommission, overrideType, overrideRate, isEdit, existingDeal, selectedStaff, formatMoney]);

  const mutation = useMutation({
    mutationFn: (values) => (isEdit ? dealsApi.update(id, dealToPayload(values)) : dealsApi.create(dealToPayload(values))),
    onSuccess: ({ deal }) => {
      toast.success(isEdit ? 'Deal updated' : 'Deal created');
      invalidateMoneyQueries(queryClient);
      navigate(`/deals/${deal._id}`, { replace: true });
    },
    onError: (error) => {
      if (!applyServerErrors(error, setError)) toast.error(error.message);
    },
  });

  if (isEdit && dealQuery.isLoading) return <FullPageSpinner label="Loading deal" />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        backTo={isEdit ? `/deals/${id}` : '/deals'}
        backLabel={isEdit ? 'Back to deal' : 'All deals'}
        title={isEdit ? `Edit ${existingDeal?.title ?? 'deal'}` : 'New deal'}
        description="The agreed price with the client and who works on it."
      />

      <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
        <Card>
          <CardHeader title="Deal details" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="client"
              render={({ field }) => (
                <SearchSelect
                  label="Client"
                  required
                  className="sm:col-span-2"
                  options={clientOptions}
                  value={field.value}
                  onChange={field.onChange}
                  onQueryChange={setClientSearch}
                  loading={clientsQuery.isFetching}
                  placeholder="Search clients"
                  error={errors.client?.message}
                />
              )}
            />
            <Input label="Deal title" required className="sm:col-span-2" placeholder="e.g. Corporate website redesign" error={errors.title?.message} {...register('title')} />
            <Input label="Deal amount" required inputMode="decimal" placeholder="e.g. 150,000" error={errors.dealAmount?.message} {...register('dealAmount')} />
            <Select label="Status" options={toOptions(DEAL_STATUSES)} error={errors.status?.message} {...register('status')} />
            <Input label="Start date" type="date" required error={errors.startDate?.message} {...register('startDate')} />
            <Input label="Deadline" type="date" error={errors.deadline?.message} {...register('deadline')} />
            <Textarea label="Description" rows={3} className="sm:col-span-2" error={errors.description?.message} {...register('description')} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Staff and commission" description="The staff member's rate is copied onto the deal, so later rate changes never affect it." />
          <CardBody className="space-y-4">
            <Select label="Assigned staff" placeholder="No staff (no commission)" options={staffOptions} error={errors.assignedStaff?.message} {...register('assignedStaff')} />

            {assignedStaff && (
              <Controller
                control={control}
                name="overrideCommission"
                render={({ field }) => (
                  <Switch
                    label="Use a different commission for this deal"
                    description="Leave off to use the staff member's rate."
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            )}

            {assignedStaff && overrideCommission && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Commission type" options={COMMISSION_TYPE_OPTIONS} {...register('commissionType')} />
                <Input
                  label={overrideType === 'fixed' ? 'Fixed amount' : 'Percentage (%)'}
                  inputMode="decimal"
                  placeholder={overrideType === 'fixed' ? 'e.g. 15,000' : 'e.g. 10'}
                  error={errors.commissionRate?.message}
                  {...register('commissionRate')}
                />
              </div>
            )}

            <div className="flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3">
              <Calculator className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
              <div className="text-sm">
                <p className="text-gray-600">{commission.label}</p>
                <p className="font-semibold text-gray-900 tabular-nums">Staff commission on this deal: {formatMoney(commission.total)}</p>
              </div>
            </div>

            <Textarea label="Internal notes" rows={2} hint="Only visible to admins" error={errors.notes?.message} {...register('notes')} />
          </CardBody>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create deal'}
          </Button>
        </div>
      </form>
    </div>
  );
}