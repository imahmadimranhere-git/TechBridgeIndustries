import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileText, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '../../api/endpoints.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Table from '../../components/ui/Table.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useRangeParam } from '../../hooks/useRangeParam.js';
import { INVOICE_STATUSES, toOptions } from '../../utils/constants.js';
import { rangeParams } from '../../utils/dateRanges.js';
import { formatDate } from '../../utils/formatDate.js';

export default function InvoicesPage() {
  usePageTitle('Invoices');
  const navigate = useNavigate();
  const { formatMoney } = useSettings();
  const [range, setRange, isReady] = useRangeParam('all_time');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [debouncedSearch, status, range.range, range.from, range.to]);

  const params = { page, limit: 20, search: debouncedSearch, status, ...rangeParams(range) };
  const invoicesQuery = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.list(params),
    enabled: isReady,
    placeholderData: keepPreviousData,
  });

  const data = invoicesQuery.data;

  const columns = [
    { key: 'number', header: 'Invoice', render: (invoice) => <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span> },
    { key: 'client', header: 'Client', render: (invoice) => invoice.client?.companyName || invoice.client?.name || '-' },
    { key: 'deal', header: 'Deal', render: (invoice) => invoice.deal?.title ?? '-' },
    { key: 'date', header: 'Date', render: (invoice) => formatDate(invoice.invoiceDate) },
    { key: 'due', header: 'Due', render: (invoice) => formatDate(invoice.dueDate) },
    { key: 'total', header: 'Total', align: 'right', render: (invoice) => formatMoney(invoice.total) },
    { key: 'paid', header: 'Paid', align: 'right', render: (invoice) => <span className="text-success">{formatMoney(invoice.amountPaid)}</span> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (invoice) => <span className={invoice.balanceDue > 0 ? 'font-medium text-danger' : 'text-gray-500'}>{formatMoney(invoice.balanceDue)}</span>,
    },
    { key: 'status', header: 'Status', render: (invoice) => <StatusBadge status={invoice.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Bills sent to clients and how much is still due."
        actions={
          <Button icon={Plus} onClick={() => navigate('/invoices/new')}>
            New invoice
          </Button>
        }
      />

      <div className="card mb-4 space-y-3 p-4">
        <DateRangeFilter value={range} onChange={setRange} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            aria-label="Search invoices"
            placeholder="Search invoice number or notes"
            leftIcon={Search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:col-span-2"
          />
          <Select aria-label="Status" placeholder="All statuses" options={toOptions(INVOICE_STATUSES)} value={status} onChange={(event) => setStatus(event.target.value)} />
        </div>
      </div>

      {data && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard tone="info" title="Invoiced" value={formatMoney(data.totals.total)} />
          <StatCard tone="success" title="Paid" value={formatMoney(data.totals.amountPaid)} />
          <StatCard tone="danger" title="Balance due" value={formatMoney(data.totals.balanceDue)} />
        </div>
      )}

      <Table
        caption="Invoices"
        columns={columns}
        rows={data?.items ?? []}
        loading={invoicesQuery.isLoading}
        onRowClick={(invoice) => navigate(`/invoices/${invoice._id}`)}
        emptyState={
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Try another period or create an invoice."
            action={
              <Button icon={Plus} onClick={() => navigate('/invoices/new')}>
                New invoice
              </Button>
            }
          />
        }
      />

      {data?.pagination && <Pagination className="mt-4" {...data.pagination} onPageChange={setPage} />}
    </div>
  );
}