import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Plus, Search, Trash2, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { staffApi } from '../../api/endpoints.js';
import StaffFormModal from '../../components/forms/StaffFormModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import Table from '../../components/ui/Table.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { commissionLabel } from '../../utils/commission.js';
import { STAFF_STATUSES, toOptions } from '../../utils/constants.js';

export default function StaffPage() {
  usePageTitle('Staff');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, staff: null });
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const params = { page, limit: 20, search: debouncedSearch, status };
  const staffQuery = useQuery({
    queryKey: ['staff', params],
    queryFn: () => staffApi.list(params),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => staffApi.remove(id),
    onSuccess: () => {
      toast.success('Staff member deleted');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (staff) => (
        <div>
          <p className="font-medium text-gray-900">{staff.name}</p>
          {staff.phone && <p className="text-xs text-gray-500">{staff.phone}</p>}
        </div>
      ),
    },
    { key: 'commission', header: 'Commission', render: (staff) => commissionLabel(staff.commissionType, staff.commissionRate, formatMoney) },
    { key: 'deals', header: 'Deals', align: 'right', render: (staff) => staff.financials.dealsCount },
    { key: 'earned', header: 'Earned', align: 'right', render: (staff) => formatMoney(staff.financials.commissionEarned) },
    { key: 'paid', header: 'Paid', align: 'right', render: (staff) => <span className="text-success">{formatMoney(staff.financials.commissionPaid)}</span> },
    {
      key: 'pending',
      header: 'Pending',
      align: 'right',
      render: (staff) => (
        <span className={staff.financials.commissionPending > 0 ? 'font-medium text-warning' : 'text-gray-500'}>
          {formatMoney(staff.financials.commissionPending)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (staff) => <StatusBadge status={staff.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (staff) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Edit ${staff.name}`} className="px-2" onClick={() => setForm({ open: true, staff })} />
          <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Delete ${staff.name}`} className="px-2 text-danger" onClick={() => setToDelete(staff)} />
        </div>
      ),
    },
  ];

  const data = staffQuery.data;

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Commission-based team members (no salary)."
        actions={
          <Button icon={Plus} onClick={() => setForm({ open: true, staff: null })}>
            Add staff member
          </Button>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <Input
          aria-label="Search staff"
          placeholder="Search name, email, phone or CNIC"
          leftIcon={Search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:col-span-2"
        />
        <Select aria-label="Status" placeholder="All statuses" options={toOptions(STAFF_STATUSES)} value={status} onChange={(event) => setStatus(event.target.value)} />
      </div>

      <Table
        caption="Staff"
        columns={columns}
        rows={data?.items ?? []}
        loading={staffQuery.isLoading}
        onRowClick={(staff) => navigate(`/staff/${staff._id}`)}
        emptyState={
          <EmptyState
            icon={UserCog}
            title="No staff found"
            description="Add the people who work on your deals and earn commission."
            action={
              <Button icon={Plus} onClick={() => setForm({ open: true, staff: null })}>
                Add staff member
              </Button>
            }
          />
        }
      />

      {data?.pagination && <Pagination className="mt-4" {...data.pagination} onPageChange={setPage} />}

      <StaffFormModal open={form.open} staff={form.staff} onClose={() => setForm({ open: false, staff: null })} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        loading={deleteMutation.isPending}
        title="Delete this staff member?"
        message="Staff members with deals or payouts cannot be deleted; mark them Inactive instead."
        confirmLabel="Delete"
      />
    </div>
  );
}