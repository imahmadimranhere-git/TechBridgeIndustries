import { useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BarChart3, Briefcase, ChevronDown, FileSpreadsheet, HandCoins, PiggyBank, TrendingUp, Users, UserCog, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../../api/endpoints.js';
import DocumentActions from '../../components/documents/DocumentActions.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Table from '../../components/ui/Table.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useRangeParam } from '../../hooks/useRangeParam.js';
import { rangeParams } from '../../utils/dateRanges.js';
import { saveBlob } from '../../utils/download.js';

// The four main values get the dashboard colours and icons
const SUMMARY_STYLE = {
  totalReceived: { tone: 'info', icon: Wallet },
  commissionPaid: { tone: 'warning', icon: HandCoins },
  cashInHand: { tone: 'success', icon: PiggyBank },
  netProfit: { tone: 'purple', icon: TrendingUp },
};

const CSV_TYPES = [
  { type: 'summary', label: 'Summary (8 values)' },
  { type: 'clients', label: 'Client-wise' },
  { type: 'deals', label: 'Deal-wise' },
  { type: 'staff', label: 'Staff-wise' },
];

const linkClass = 'font-medium text-gray-900 hover:text-brand';

function CsvMenu({ params }) {
  const [busy, setBusy] = useState(false);

  async function download(type) {
    setBusy(true);
    try {
      const response = await reportsApi.exportCsv({ ...params, type });
      const match = /filename="?([^"]+)"?/i.exec(response.headers['content-disposition'] ?? '');
      saveBlob(response.data, match ? match[1] : `report-${type}.csv`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Menu>
      <MenuButton
        disabled={busy}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none data-focus:ring-2 data-focus:ring-brand/30 disabled:opacity-60"
      >
        <FileSpreadsheet className="size-4" aria-hidden="true" />
        {busy ? 'Preparing...' : 'Export CSV'}
        <ChevronDown className="size-4 text-gray-400" aria-hidden="true" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        transition
        className="z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg transition duration-100 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        {CSV_TYPES.map((item) => (
          <MenuItem key={item.type}>
            <button type="button" onClick={() => download(item.type)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-50">
              {item.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

export default function ReportsPage() {
  usePageTitle('Reports');
  const { formatMoney } = useSettings();
  const [range, setRange, isReady] = useRangeParam('this_month');
  const params = rangeParams(range);

  const reportQuery = useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsApi.get(params),
    enabled: isReady,
    placeholderData: keepPreviousData,
  });

  const report = reportQuery.data;
  const loading = reportQuery.isLoading || !report;
  const tableProps = { loading, maxHeight: 'max-h-[60vh]' };

  const clientsTable = (
    <Table
      {...tableProps}
      caption="Client-wise report"
      rows={report?.clients ?? []}
      rowKey="client"
      emptyState={<EmptyState compact icon={Users} title="No clients" />}
      columns={[
        {
          key: 'client',
          header: 'Client',
          render: (row) => (
            <Link to={`/clients/${row.client._id}`} className={linkClass}>
              {row.client.name}
            </Link>
          ),
        },
        { key: 'company', header: 'Company', render: (row) => row.client.companyName || '-' },
        { key: 'deals', header: 'Deals', align: 'right', render: (row) => row.dealsCount },
        { key: 'total', header: 'Total deal', align: 'right', render: (row) => formatMoney(row.totalDealValue) },
        { key: 'received', header: 'Received', align: 'right', render: (row) => <span className="text-success">{formatMoney(row.received)}</span> },
        { key: 'remaining', header: 'Remaining', align: 'right', render: (row) => <span className={row.remaining > 0 ? 'font-medium text-danger' : ''}>{formatMoney(row.remaining)}</span> },
      ]}
    />
  );

  const dealsTable = (
    <div>
      <Table
        {...tableProps}
        caption="Deal-wise report"
        rows={report?.deals ?? []}
        emptyState={<EmptyState compact icon={Briefcase} title="No deal activity in this period" />}
        columns={[
          {
            key: 'deal',
            header: 'Deal',
            render: (row) => (
              <Link to={`/deals/${row._id}`} className={linkClass}>
                {row.title}
              </Link>
            ),
          },
          { key: 'client', header: 'Client', render: (row) => row.client?.companyName || row.client?.name || '-' },
          { key: 'staff', header: 'Staff', render: (row) => row.staff?.name ?? '-' },
          { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatMoney(row.dealAmount) },
          { key: 'received', header: 'Received *', align: 'right', render: (row) => formatMoney(row.receivedInPeriod) },
          { key: 'remaining', header: 'Remaining', align: 'right', render: (row) => formatMoney(row.remaining) },
          { key: 'commission', header: 'Commission *', align: 'right', render: (row) => formatMoney(row.commissionEarnedInPeriod) },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        ]}
      />
      <p className="mt-2 text-xs text-gray-500">* Within the selected period. Remaining is the balance at the end of the period.</p>
    </div>
  );

  const staffTable = (
    <Table
      {...tableProps}
      caption="Staff-wise report"
      rows={report?.staff ?? []}
      rowKey="staff"
      emptyState={<EmptyState compact icon={UserCog} title="No staff" />}
      columns={[
        {
          key: 'staff',
          header: 'Staff',
          render: (row) => (
            <Link to={`/staff/${row.staff._id}`} className={linkClass}>
              {row.staff.name}
            </Link>
          ),
        },
        { key: 'deals', header: 'Deals', align: 'right', render: (row) => row.dealsCount },
        { key: 'earned', header: 'Commission earned', align: 'right', render: (row) => formatMoney(row.commissionEarned) },
        { key: 'paid', header: 'Commission paid', align: 'right', render: (row) => <span className="text-success">{formatMoney(row.commissionPaid)}</span> },
        { key: 'pending', header: 'Commission pending', align: 'right', render: (row) => <span className={row.commissionPending > 0 ? 'font-medium text-warning' : ''}>{formatMoney(row.commissionPending)}</span> },
      ]}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={report?.period?.label ? `Financial report for ${report.period.label}` : 'Financial report'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DocumentActions pdfPath="/reports/pdf" params={params} disabled={!isReady} />
            <CsvMenu params={params} />
          </div>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(report?.summaryRows ?? Array.from({ length: 8 }, (_, index) => ({ key: `loading-${index}`, label: '' }))).map((row) => {
          const style = SUMMARY_STYLE[row.key] ?? { tone: 'neutral', icon: BarChart3 };
          return (
            <StatCard
              key={row.key}
              size={SUMMARY_STYLE[row.key] ? 'lg' : 'md'}
              tone={style.tone}
              icon={style.icon}
              title={row.label}
              value={formatMoney(row.amount)}
              loading={loading}
            />
          );
        })}
      </section>

      <Card>
        <CardBody>
          <Tabs
            tabs={[
              { label: 'Client-wise', icon: Users, count: report?.clients?.length, content: clientsTable },
              { label: 'Deal-wise', icon: Briefcase, count: report?.deals?.length, content: dealsTable },
              { label: 'Staff-wise', icon: UserCog, count: report?.staff?.length, content: staffTable },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}