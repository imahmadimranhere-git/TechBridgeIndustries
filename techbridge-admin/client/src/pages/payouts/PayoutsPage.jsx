import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HandCoins, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { payoutsApi } from '../../api/endpoints.js';
import DocumentActions from '../../components/documents/DocumentActions.jsx';
import PayoutFormModal from '../../components/forms/PayoutFormModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import Table from '../../components/ui/Table.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useStaffOptions } from '../../hooks/useOptions.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useRangeParam } from '../../hooks/useRangeParam.js';
import { rangeParams } from '../../utils/dateRanges.js';
import { formatDate } from '../../utils/formatDate.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';

export default function PayoutsPage() {
  usePageTitle('Commission payouts');
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [range, setRange, isReady] = useRangeParam('all_time');
  const [staffId, setStaffId] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const staffQuery = useStaffOptions();

  useEffect(() => setPage(1), [staffId, range.range, range.from, range.to]);

  const params = { page, limit: 20, staffId, ...rangeParams(range) };
  const payoutsQuery = useQuery({
    queryKey: ['payouts', params],
    queryFn: () => payoutsApi.list(params),
    enabled: isReady,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => payoutsApi.remove(id),
    onSuccess: () => {
      toast.success('Payout deleted');
      invalidateMoneyQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  });

  const data = payoutsQuery.data;
  const pageTotal = (data?.items ?? []).reduce((sum, payout) => sum + payout.amount, 0);

  const columns = [
    { key: 'date', header: 'Date', render: (payout) => formatDate(payout.date) },
    {
      key: 'staff',
      header: 'Staff',
      render: (payout) =>
        payout.staff ? (
          <Link to={`/staff/${payout.staff._id}`} className="font-medium text-gray-900 hover:text-brand">
            {payout.staff.name}
          </Link>
        ) : (
          '-'
        ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (payout) => <span className="font-medium text-warning">{formatMoney(payout.amount)}</span> },
    { key: 'method', header: 'Method' },
    { key: 'reference', header: 'Reference', render: (payout) => payout.reference || <span className="text-gray-400">-</span> },
    { key: 'by', header: 'Paid by', render: (payout) => payout.signedBy?.name ?? '-' },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (payout) => (
        <div className="flex items-center gap-1">
          <DocumentActions compact pdfPath={`/payouts/${payout._id}/slip`} emailPath={`/payouts/${payout._id}/email`} emailTitle="Email payout slip" />
          <Button size="sm" variant="ghost" icon={Trash2} aria-label="Delete payout" className="px-2 text-danger" onClick={() => setToDelete(payout)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Commission payouts"
        description="Commission paid out to staff."
        actions={
          <Button icon={Plus} onClick={() => setFormOpen(true)}>
            Pay commission
          </Button>
        }
      />

      <div className="card mb-4 space-y-3 p-4">
        <DateRangeFilter value={range} onChange={setRange} />
        <Select
          aria-label="Staff member"
          placeholder="All staff"
          className="sm:max-w-xs"
          options={(staffQuery.data ?? []).map((staff) => ({ value: staff._id, label: staff.name }))}
          value={staffId}
          onChange={(event) => setStaffId(event.target.value)}
        />
      </div>

      {data?.items?.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <HandCoins className="size-4" aria-hidden="true" />
          Total on this page: <strong className="tabular-nums">{formatMoney(pageTotal)}</strong>
        </div>
      )}

      <Table
        caption="Commission payouts"
        columns={columns}
        rows={data?.items ?? []}
        loading={payoutsQuery.isLoading}
        emptyState={<EmptyState icon={HandCoins} title="No payouts found" description="Try another period or pay commission to a staff member." />}
      />

      {data?.pagination && <Pagination className="mt-4" {...data.pagination} onPageChange={setPage} />}

      <PayoutFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        loading={deleteMutation.isPending}
        title="Delete this payout?"
        message={toDelete && `${formatMoney(toDelete.amount)} paid to ${toDelete.staff?.name ?? 'staff'} will be removed.`}
        confirmLabel="Delete payout"
      />
    </div>
  );
}