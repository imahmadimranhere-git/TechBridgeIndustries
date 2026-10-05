import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Briefcase, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dealsApi } from '../../api/endpoints.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import Select from '../../components/ui/Select.jsx';
import Table from '../../components/ui/Table.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { DEAL_STATUSES, toOptions } from '../../utils/constants.js';

export default function DealsPage() {
  usePageTitle('Deals');
  const navigate = useNavigate();
  const { formatMoney } = useSettings();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const params = { page, limit: 20, search: debouncedSearch, status };
  const dealsQuery = useQuery({
    queryKey: ['deals', params],
    queryFn: () => dealsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const columns = [
    {
      key: 'title',
      header: 'Deal',
      render: (deal) => (
        <div>
          <p className="font-medium text-gray-900">{deal.title}</p>
          <p className="text-xs text-gray-500">{deal.client?.companyName || deal.client?.name}</p>
        </div>
      ),
    },
    { key: 'staff', header: 'Staff', render: (deal) => deal.staff?.name ?? <span className="text-gray-400">-</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (deal) => formatMoney(deal.dealAmount) },
    { key: 'received', header: 'Received', align: 'right', render: (deal) => <span className="text-success">{formatMoney(deal.received)}</span> },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (deal) => <span className={deal.remaining > 0 ? 'font-medium text-danger' : 'text-gray-500'}>{formatMoney(deal.remaining)}</span>,
    },
    { key: 'progress', header: 'Progress', className: 'min-w-40', render: (deal) => <ProgressBar value={deal.progress} size="sm" /> },
    { key: 'status', header: 'Status', render: (deal) => <StatusBadge status={deal.status} /> },
  ];

  const data = dealsQuery.data;
  const hasFilters = Boolean(debouncedSearch || status);

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Projects agreed with clients, and how much has been paid."
        actions={
          <Button icon={Plus} onClick={() => navigate('/deals/new')}>
            New deal
          </Button>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          aria-label="Search deals"
          placeholder="Search deal, client or staff"
          leftIcon={Search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="lg:col-span-2"
        />
        <Select aria-label="Status" placeholder="All statuses" options={toOptions(DEAL_STATUSES)} value={status} onChange={(event) => setStatus(event.target.value)} />
      </div>

      <Table
        caption="Deals"
        columns={columns}
        rows={data?.items ?? []}
        loading={dealsQuery.isLoading}
        onRowClick={(deal) => navigate(`/deals/${deal._id}`)}
        emptyState={
          <EmptyState
            icon={Briefcase}
            title={hasFilters ? 'No deals match your filters' : 'No deals yet'}
            description={hasFilters ? 'Try a different search or status.' : 'Create a deal for a client to start tracking payments.'}
            action={
              !hasFilters && (
                <Button icon={Plus} onClick={() => navigate('/deals/new')}>
                  New deal
                </Button>
              )
            }
          />
        }
      />

      {data?.pagination && <Pagination className="mt-4" {...data.pagination} onPageChange={setPage} />}
    </div>
  );
}