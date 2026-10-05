import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  HandCoins,
  Hourglass,
  PiggyBank,
  RefreshCw,
  Scale,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/endpoints.js';
import MonthlyBarChart from '../components/charts/MonthlyBarChart.jsx';
import ShareDoughnut from '../components/charts/ShareDoughnut.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import DateRangeFilter from '../components/ui/DateRangeFilter.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Table from '../components/ui/Table.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useRangeParam } from '../hooks/useRangeParam.js';
import { rangeParams } from '../utils/dateRanges.js';
import { formatDate } from '../utils/formatDate.js';

const linkClass = 'font-medium text-gray-900 hover:text-brand';

function TableCard({ title, viewAllTo, children }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        actions={
          viewAllTo && (
            <Link to={viewAllTo} className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          )
        }
      />
      {children}
    </Card>
  );
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { formatMoney } = useSettings();
  const [range, setRange, isReady] = useRangeParam('this_month');
  const params = rangeParams(range);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', params],
    queryFn: () => dashboardApi.get(params),
    enabled: isReady,
    placeholderData: keepPreviousData,
  });

  const loading = isLoading || !data;
  const cards = data?.cards ?? {};
  const stats = data?.stats ?? {};
  const tables = data?.tables ?? {};
  const compact = { className: 'rounded-none border-0', maxHeight: 'max-h-none', skeletonRows: 3 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={data?.period?.label ? `Showing ${data.period.label}` : 'Your business at a glance'}
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      {isError && (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-danger">{error.message}</p>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => refetch()}>
              Try again
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Row 1: main financial cards */}
      <section aria-label="Main figures" className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
        <StatCard size="lg" tone="info" icon={Wallet} title="Total Received from Clients" value={formatMoney(cards.totalReceived)} loading={loading} />
        <StatCard
          size="lg"
          tone="warning"
          icon={HandCoins}
          title="Commission Paid to Staff"
          value={formatMoney(cards.commissionPaid)}
          hint={`Pending: ${formatMoney(cards.commissionPending)}`}
          loading={loading}
        />
        <StatCard size="lg" tone="success" icon={PiggyBank} title="Our Remaining Balance" value={formatMoney(cards.cashInHand)} loading={loading} />
        <StatCard size="lg" tone="purple" icon={TrendingUp} title="Our Net Profit" value={formatMoney(cards.netProfit)} loading={loading} />
      </section>

      {/* Row 2: secondary cards */}
      <section aria-label="More figures" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Banknote} title="Total Deal Value" value={formatMoney(stats.totalDealValue)} loading={loading} />
        <StatCard icon={Scale} tone="warning" title="Remaining from Clients" value={formatMoney(stats.remainingFromClients)} loading={loading} />
        <StatCard icon={Briefcase} tone="info" title="Active Deals" value={stats.activeDeals ?? 0} loading={loading} />
        <StatCard
          icon={AlertTriangle}
          tone="danger"
          title="Overdue Invoices"
          value={stats.overdueInvoices ?? 0}
          hint={stats.overdueInvoices ? `${formatMoney(stats.overdueAmount)} outstanding` : undefined}
          loading={loading}
        />
        <StatCard icon={Hourglass} tone="warning" title="Commission Pending" value={formatMoney(stats.commissionPending)} loading={loading} />
        <StatCard icon={Users} tone="neutral" title="Total Clients" value={stats.totalClients ?? 0} loading={loading} />
        <StatCard icon={UserCog} tone="neutral" title="Total Staff" value={stats.totalStaff ?? 0} loading={loading} />
      </section>

      {/* Row 3: charts */}
      <section aria-label="Charts" className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly overview" description="Received, commission to staff and net profit" />
          <CardBody>{loading ? <div className="h-72 animate-pulse rounded-xl bg-gray-50" /> : <MonthlyBarChart data={data.charts.monthly} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Where the money went" description="Total received in this period" />
          <CardBody>
            {loading ? (
              <div className="mx-auto size-48 animate-pulse rounded-full bg-gray-50" />
            ) : (
              <ShareDoughnut staffCommission={data.charts.share.staffCommission} ourShare={data.charts.share.ourShare} />
            )}
          </CardBody>
        </Card>
      </section>

      {/* Row 4: tables */}
      <section aria-label="Lists" className="grid gap-6 lg:grid-cols-2">
        <TableCard title="Highest remaining balance" viewAllTo="/clients?sort=remaining">
          <Table
            {...compact}
            loading={loading}
            rows={tables.topRemainingClients ?? []}
            rowKey="client"
            emptyState={<EmptyState compact title="No outstanding balances" />}
            columns={[
              {
                key: 'client',
                header: 'Client',
                render: (row) => (
                  <Link to={`/clients/${row.client._id}`} className={linkClass}>
                    {row.client.name}
                    {row.client.companyName && <span className="block text-xs font-normal text-gray-500">{row.client.companyName}</span>}
                  </Link>
                ),
              },
              { key: 'remaining', header: 'Remaining', align: 'right', render: (row) => <span className="font-medium text-danger">{formatMoney(row.remaining)}</span> },
            ]}
          />
        </TableCard>

        <TableCard title="Recent payments" viewAllTo="/payments">
          <Table
            {...compact}
            loading={loading}
            rows={tables.recentPayments ?? []}
            emptyState={<EmptyState compact title="No payments in this period" />}
            columns={[
              { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
              { key: 'client', header: 'Client', render: (row) => row.client?.companyName || row.client?.name || '-' },
              { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="font-medium text-success">{formatMoney(row.amount)}</span> },
            ]}
          />
        </TableCard>

        <TableCard title="Recent deals" viewAllTo="/deals">
          <Table
            {...compact}
            loading={loading}
            rows={tables.recentDeals ?? []}
            emptyState={<EmptyState compact title="No new deals in this period" />}
            columns={[
              {
                key: 'title',
                header: 'Deal',
                render: (row) => (
                  <Link to={`/deals/${row._id}`} className={linkClass}>
                    {row.title}
                    <span className="block text-xs font-normal text-gray-500">{row.client?.companyName || row.client?.name}</span>
                  </Link>
                ),
              },
              { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatMoney(row.dealAmount) },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </TableCard>

        <TableCard title="Top staff" viewAllTo="/staff">
          <Table
            {...compact}
            loading={loading}
            rows={tables.topStaff ?? []}
            rowKey="staff"
            emptyState={<EmptyState compact title="No staff yet" />}
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
              { key: 'earned', header: 'Earned', align: 'right', render: (row) => formatMoney(row.commissionEarned) },
              { key: 'pending', header: 'Pending', align: 'right', render: (row) => formatMoney(row.commissionPending) },
            ]}
          />
        </TableCard>

        <TableCard title="Recent commission payouts" viewAllTo="/payouts">
          <Table
            {...compact}
            loading={loading}
            rows={tables.recentPayouts ?? []}
            emptyState={<EmptyState compact title="No payouts in this period" />}
            columns={[
              { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
              { key: 'staff', header: 'Staff', render: (row) => row.staff?.name ?? '-' },
              { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="font-medium text-warning">{formatMoney(row.amount)}</span> },
            ]}
          />
        </TableCard>

        <TableCard title="Recent notes" viewAllTo="/notes">
          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-10 animate-pulse rounded bg-gray-50" />
              ))}
            </div>
          ) : (tables.recentNotes ?? []).length === 0 ? (
            <EmptyState compact title="No notes yet" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {tables.recentNotes.map((note) => (
                <li key={note._id} className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-900">{note.title}</p>
                  <p className="text-xs text-gray-500">
                    {note.notableType}: {note.notableId?.name ?? note.notableId?.title ?? 'removed'} · {formatDate(note.date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TableCard>
      </section>
    </div>
  );
}