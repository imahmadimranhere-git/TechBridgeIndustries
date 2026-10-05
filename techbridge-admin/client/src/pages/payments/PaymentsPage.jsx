import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../api/endpoints.js';
import DocumentActions from '../../components/documents/DocumentActions.jsx';
import PaymentFormModal from '../../components/forms/PaymentFormModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import Table from '../../components/ui/Table.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useRangeParam } from '../../hooks/useRangeParam.js';
import { PAYMENT_METHODS, toOptions } from '../../utils/constants.js';
import { rangeParams } from '../../utils/dateRanges.js';
import { formatDate } from '../../utils/formatDate.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';

const linkClass = 'font-medium text-gray-900 hover:text-brand';

export default function PaymentsPage() {
  usePageTitle('Payments');
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [range, setRange, isReady] = useRangeParam('all_time');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => setPage(1), [debouncedSearch, method, range.range, range.from, range.to]);

  const params = { page, limit: 20, search: debouncedSearch, method, ...rangeParams(range) };
  const paymentsQuery = useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsApi.list(params),
    enabled: isReady,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => paymentsApi.remove(id),
    onSuccess: () => {
      toast.success('Payment deleted');
      invalidateMoneyQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  });

  const data = paymentsQuery.data;

  const columns = [
    { key: 'date', header: 'Date', render: (payment) => formatDate(payment.date) },
    {
      key: 'client',
      header: 'Client',
      render: (payment) =>
        payment.client ? (
          <Link to={`/clients/${payment.client._id}`} className={linkClass}>
            {payment.client.companyName || payment.client.name}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      key: 'deal',
      header: 'Deal',
      render: (payment) =>
        payment.deal ? (
          <Link to={`/deals/${payment.deal._id}`} className="hover:text-brand">
            {payment.deal.title}
          </Link>
        ) : (
          '-'
        ),
    },
    { key: 'invoice', header: 'Invoice', render: (payment) => payment.invoice?.invoiceNumber ?? <span className="text-gray-400">Advance</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (payment) => <span className="font-medium text-success">{formatMoney(payment.amount)}</span> },
    { key: 'method', header: 'Method' },
    { key: 'reference', header: 'Reference', render: (payment) => payment.reference || <span className="text-gray-400">-</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (payment) => (
        <div className="flex items-center gap-1">
          <DocumentActions
            compact
            pdfPath={`/payments/${payment._id}/receipt`}
            emailPath={`/payments/${payment._id}/email`}
            emailTitle="Email payment receipt"
          />
          <Button size="sm" variant="ghost" icon={Trash2} aria-label="Delete payment" className="px-2 text-danger" onClick={() => setToDelete(payment)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Money received from clients."
        actions={
          <Button icon={Plus} onClick={() => setFormOpen(true)}>
            Add payment
          </Button>
        }
      />

      <div className="card mb-4 space-y-3 p-4">
        <DateRangeFilter value={range} onChange={setRange} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            aria-label="Search payments"
            placeholder="Search reference or note"
            leftIcon={Search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:col-span-2"
          />
          <Select aria-label="Method" placeholder="All methods" options={toOptions(PAYMENT_METHODS)} value={method} onChange={(event) => setMethod(event.target.value)} />
        </div>
      </div>

      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          <Wallet className="size-4" aria-hidden="true" />
          Total received {data.period?.label ? `(${data.period.label})` : ''}:
          <strong className="tabular-nums">{formatMoney(data.totals.amount)}</strong>
        </div>
      )}

      <Table
        caption="Payments"
        columns={columns}
        rows={data?.items ?? []}
        loading={paymentsQuery.isLoading}
        emptyState={<EmptyState icon={Wallet} title="No payments found" description="Try another period or add a payment." />}
      />

      {data?.pagination && <Pagination className="mt-4" {...data.pagination} onPageChange={setPage} />}

      <PaymentFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        loading={deleteMutation.isPending}
        title="Delete this payment?"
        message={toDelete && `${formatMoney(toDelete.amount)} on ${formatDate(toDelete.date)} will be removed, and any linked invoice will be recalculated.`}
        confirmLabel="Delete payment"
      />
    </div>
  );
}