import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clientsApi } from '../../api/endpoints.js';
import ClientFormModal from '../../components/forms/ClientFormModal.jsx';
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
import { CLIENT_SOURCES, CLIENT_STATUSES, toOptions } from '../../utils/constants.js';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'remaining', label: 'Highest remaining' },
];

export default function ClientsPage() {
  usePageTitle('Clients');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [filters, setFilters] = useState({ status: '', source: '', sort: searchParams.get('sort') || 'newest' });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, client: null });
  const [toDelete, setToDelete] = useState(null);

  // Any new search or filter starts again from page 1
  useEffect(() => setPage(1), [debouncedSearch, filters]);

  const params = { page, limit: 20, search: debouncedSearch, ...filters };
  const clientsQuery = useQuery({
    queryKey: ['clients', params],
    queryFn: () => clientsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => clientsApi.remove(id),
    onSuccess: () => {
      toast.success('Client deleted');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  });

  const setFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const hasFilters = Boolean(debouncedSearch || filters.status || filters.source);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (client) => (
        <div>
          <p className="font-medium text-gray-900">{client.name}</p>
          {client.email && <p className="text-xs text-gray-500">{client.email}</p>}
        </div>
      ),
    },
    { key: 'companyName', header: 'Company', render: (client) => client.companyName || <span className="text-gray-400">-</span> },
    { key: 'total', header: 'Total Deal', align: 'right', render: (client) => formatMoney(client.financials.totalDealValue) },
    { key: 'received', header: 'Received', align: 'right', render: (client) => <span className="text-success">{formatMoney(client.financials.received)}</span> },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (client) => (
        <span className={client.financials.remaining > 0 ? 'font-medium text-danger' : 'text-gray-500'}>{formatMoney(client.financials.remaining)}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (client) => <StatusBadge status={client.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (client) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Edit ${client.name}`} className="px-2" onClick={() => setForm({ open: true, client })} />
          <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Delete ${client.name}`} className="px-2 text-danger" onClick={() => setToDelete(client)} />
        </div>
      ),
    },
  ];

  const data = clientsQuery.data;

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Everyone you do business with, and what they owe."
        actions={
          <Button icon={Plus} onClick={() => setForm({ open: true, client: null })}>
            Add client
          </Button>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          aria-label="Search clients"
          placeholder="Search name, company, email, phone"
          leftIcon={Search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select aria-label="Status" placeholder="All statuses" options={toOptions(CLIENT_STATUSES)} value={filters.status} onChange={setFilter('status')} />
        <Select aria-label="Source" placeholder="All sources" options={toOptions(CLIENT_SOURCES)} value={filters.source} onChange={setFilter('source')} />
        <Select aria-label="Sort" options={SORT_OPTIONS} value={filters.sort} onChange={setFilter('sort')} />
      </div>

      <Table
        caption="Clients"
        columns={columns}
        rows={data?.items ?? []}
        loading={clientsQuery.isLoading}
        onRowClick={(client) => navigate(`/clients/${client._id}`)}
        emptyState={
          <EmptyState
            icon={Users}
            title={hasFilters ? 'No clients match your filters' : 'No clients yet'}
            description={hasFilters ? 'Try a different search or clear the filters.' : 'Add your first client to start tracking deals and payments.'}
            action={
              !hasFilters && (
                <Button icon={Plus} onClick={() => setForm({ open: true, client: null })}>
                  Add client
                </Button>
              )
            }
          />
        }
      />

      {data?.pagination && <Pagination className="mt-4" {...data.pagination} onPageChange={setPage} />}

      <ClientFormModal open={form.open} client={form.client} onClose={() => setForm({ open: false, client: null })} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        loading={deleteMutation.isPending}
        title="Delete this client?"
        message={
          toDelete && (
            <>
              <strong>{toDelete.name}</strong> and their deals and invoices will be removed from all lists. Clients with recorded payments
              cannot be deleted; mark them Inactive instead.
            </>
          )
        }
        confirmLabel="Delete client"
      />
    </div>
  );
}