import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  FileText,
  HandCoins,
  Hourglass,
  IdCard,
  Mail,
  Pencil,
  Phone,
  StickyNote,
  Trash2,
  UserX,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { payoutsApi, staffApi } from '../../api/endpoints.js';
import DocumentActions from '../../components/documents/DocumentActions.jsx';
import PayoutFormModal from '../../components/forms/PayoutFormModal.jsx';
import StaffFormModal from '../../components/forms/StaffFormModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import NotesTimeline from '../../components/notes/NotesTimeline.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Table from '../../components/ui/Table.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useRangeParam } from '../../hooks/useRangeParam.js';
import { commissionLabel } from '../../utils/commission.js';
import { rangeParams } from '../../utils/dateRanges.js';
import { formatDate } from '../../utils/formatDate.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';

export default function StaffProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [range, setRange, isReady] = useRangeParam('all_time');
  const [statementRange, setStatementRange] = useState({ range: 'this_month' });
  const [editOpen, setEditOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutToDelete, setPayoutToDelete] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const params = rangeParams(range);
  const profileQuery = useQuery({
    queryKey: ['staff', id, params],
    queryFn: () => staffApi.get(id, params),
    enabled: isReady,
    placeholderData: keepPreviousData,
  });
  usePageTitle(profileQuery.data?.staff?.name ?? 'Staff');

  const deleteStaff = useMutation({
    mutationFn: () => staffApi.remove(id),
    onSuccess: () => {
      toast.success('Staff member deleted');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      navigate('/staff', { replace: true });
    },
    onError: (error) => {
      toast.error(error.message);
      setConfirmDelete(false);
    },
  });

  const deletePayout = useMutation({
    mutationFn: (payoutId) => payoutsApi.remove(payoutId),
    onSuccess: () => {
      toast.success('Payout deleted');
      invalidateMoneyQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setPayoutToDelete(null),
  });

  if (profileQuery.isLoading) return <FullPageSpinner label="Loading staff member" />;
  if (profileQuery.isError) {
    return (
      <EmptyState
        icon={UserX}
        title={profileQuery.error.status === 404 ? 'Staff member not found' : 'Could not load this staff member'}
        description={profileQuery.error.message}
        action={
          <Link to="/staff" className="text-sm font-medium text-brand hover:underline">
            Back to staff
          </Link>
        }
      />
    );
  }

  const { staff, period, financials, deals, payouts } = profileQuery.data;
  const statementParams = rangeParams(statementRange);
  const statementReady = statementRange.range !== 'custom' || (statementRange.from && statementRange.to);

  const dealsTab = (
    <Table
      caption="Deals"
      rows={deals}
      onRowClick={(deal) => navigate(`/deals/${deal._id}`)}
      emptyState={<EmptyState compact icon={Briefcase} title="No deals assigned yet" />}
      columns={[
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
        { key: 'rate', header: 'Rate', render: (deal) => commissionLabel(deal.commissionType, deal.commissionRate, formatMoney) },
        { key: 'amount', header: 'Deal amount', align: 'right', render: (deal) => formatMoney(deal.dealAmount) },
        { key: 'received', header: 'Received', align: 'right', render: (deal) => formatMoney(deal.received) },
        { key: 'earned', header: 'Commission earned', align: 'right', render: (deal) => <span className="font-medium">{formatMoney(deal.commissionEarned)}</span> },
        { key: 'total', header: 'Commission total', align: 'right', render: (deal) => <span className="text-gray-500">{formatMoney(deal.commissionTotal)}</span> },
        { key: 'status', header: 'Status', render: (deal) => <StatusBadge status={deal.status} /> },
      ]}
    />
  );

  const payoutsTab = (
    <Table
      caption="Payouts"
      rows={payouts}
      emptyState={<EmptyState compact icon={HandCoins} title={`No payouts (${period.label})`} />}
      columns={[
        { key: 'date', header: 'Date', render: (payout) => formatDate(payout.date) },
        { key: 'amount', header: 'Amount', align: 'right', render: (payout) => <span className="font-medium text-success">{formatMoney(payout.amount)}</span> },
        { key: 'method', header: 'Method' },
        { key: 'reference', header: 'Reference', render: (payout) => payout.reference || <span className="text-gray-400">-</span> },
        { key: 'by', header: 'Paid by', render: (payout) => payout.signedBy?.name ?? '-' },
        {
          key: 'actions',
          header: <span className="sr-only">Actions</span>,
          render: (payout) => (
            <div className="flex items-center gap-1">
              <DocumentActions
                compact
                pdfPath={`/payouts/${payout._id}/slip`}
                emailPath={`/payouts/${payout._id}/email`}
                emailTitle="Email payout slip"
                defaultRecipient={staff.email}
              />
              <Button size="sm" variant="ghost" icon={Trash2} aria-label="Delete payout" className="px-2 text-danger" onClick={() => setPayoutToDelete(payout)} />
            </div>
          ),
        },
      ]}
    />
  );

  const documentsTab = (
    <Card>
      <CardHeader icon={FileText} title="Commission statement" description="Deals, commission earned and payouts for a period" />
      <CardBody className="space-y-4">
        <DateRangeFilter value={statementRange} onChange={setStatementRange} />
        <DocumentActions
          disabled={!statementReady}
          pdfPath={`/staff/${staff._id}/commission-statement`}
          params={statementParams}
          emailPath={`/staff/${staff._id}/commission-statement/email`}
          emailExtra={statementParams}
          emailTitle="Email commission statement"
          defaultRecipient={staff.email}
        />
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/staff"
        backLabel="All staff"
        title={staff.name}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="ghost" icon={Trash2} className="text-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            <Button icon={HandCoins} onClick={() => setPayoutOpen(true)}>
              Pay commission
            </Button>
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <StatusBadge status={staff.status} />
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-4 text-gray-400" aria-hidden="true" />
            Default: {commissionLabel(staff.commissionType, staff.commissionRate, formatMoney)}
          </span>
          {staff.email && (
            <a href={`mailto:${staff.email}`} className="inline-flex items-center gap-1.5 hover:text-brand">
              <Mail className="size-4 text-gray-400" aria-hidden="true" />
              {staff.email}
            </a>
          )}
          {staff.phone && (
            <a href={`tel:${staff.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand">
              <Phone className="size-4 text-gray-400" aria-hidden="true" />
              {staff.phone}
            </a>
          )}
          {staff.cnic && (
            <span className="inline-flex items-center gap-1.5">
              <IdCard className="size-4 text-gray-400" aria-hidden="true" />
              {staff.cnic}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-gray-400" aria-hidden="true" />
            Joined {formatDate(staff.joiningDate)}
          </span>
        </div>
      </PageHeader>

      <DateRangeFilter value={range} onChange={setRange} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="info" icon={CircleDollarSign} title="Commission Earned" value={formatMoney(financials.commissionEarned)} hint={period.label} />
        <StatCard tone="success" icon={HandCoins} title="Commission Paid" value={formatMoney(financials.commissionPaid)} hint={period.label} />
        <StatCard tone="warning" icon={Hourglass} title="Commission Pending" value={formatMoney(financials.commissionPending)} hint={period.label} />
        <StatCard tone="purple" icon={Briefcase} title="Deals" value={financials.dealsCount} />
      </div>

      <Card>
        <CardBody>
          <Tabs
            tabs={[
              { label: 'Deals', icon: Briefcase, count: deals.length, content: dealsTab },
              { label: 'Payouts', icon: HandCoins, count: payouts.length, content: payoutsTab },
              { label: 'Notes', icon: StickyNote, content: <NotesTimeline notableType="Staff" notableId={staff._id} /> },
              { label: 'Documents', icon: FileText, content: documentsTab },
            ]}
          />
        </CardBody>
      </Card>

      <StaffFormModal open={editOpen} staff={staff} onClose={() => setEditOpen(false)} />
      <PayoutFormModal open={payoutOpen} onClose={() => setPayoutOpen(false)} staffId={staff._id} />

      <ConfirmDialog
        open={Boolean(payoutToDelete)}
        onClose={() => setPayoutToDelete(null)}
        onConfirm={() => deletePayout.mutate(payoutToDelete._id)}
        loading={deletePayout.isPending}
        title="Delete this payout?"
        message={payoutToDelete && `${formatMoney(payoutToDelete.amount)} paid on ${formatDate(payoutToDelete.date)} will be removed and the pending commission will go up again.`}
        confirmLabel="Delete payout"
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteStaff.mutate()}
        loading={deleteStaff.isPending}
        title="Delete this staff member?"
        message="Staff members with deals or payouts cannot be deleted; mark them Inactive instead."
        confirmLabel="Delete"
      />
    </div>
  );
}