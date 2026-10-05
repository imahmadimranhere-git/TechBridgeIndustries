import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Banknote,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  FilePlus2,
  FileText,
  HandCoins,
  Info,
  Pencil,
  Plus,
  Scale,
  StickyNote,
  Trash2,
  UserCog,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { dealsApi, paymentsApi } from '../../api/endpoints.js';
import DocumentActions from '../../components/documents/DocumentActions.jsx';
import PaymentFormModal from '../../components/forms/PaymentFormModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import NotesTimeline from '../../components/notes/NotesTimeline.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Table from '../../components/ui/Table.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { commissionLabel } from '../../utils/commission.js';
import { formatDate } from '../../utils/formatDate.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';

export default function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dealQuery = useQuery({ queryKey: ['deal', id], queryFn: () => dealsApi.get(id) });
  usePageTitle(dealQuery.data?.deal?.title ?? 'Deal');

  const deleteDeal = useMutation({
    mutationFn: () => dealsApi.remove(id),
    onSuccess: () => {
      toast.success('Deal deleted');
      invalidateMoneyQueries(queryClient);
      navigate('/deals', { replace: true });
    },
    onError: (error) => {
      toast.error(error.message);
      setConfirmDelete(false);
    },
  });

  const deletePayment = useMutation({
    mutationFn: (paymentId) => paymentsApi.remove(paymentId),
    onSuccess: () => {
      toast.success('Payment deleted');
      invalidateMoneyQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setPaymentToDelete(null),
  });

  if (dealQuery.isLoading) return <FullPageSpinner label="Loading deal" />;
  if (dealQuery.isError) {
    return (
      <EmptyState
        icon={Briefcase}
        title={dealQuery.error.status === 404 ? 'Deal not found' : 'Could not load this deal'}
        description={dealQuery.error.message}
        action={
          <Link to="/deals" className="text-sm font-medium text-brand hover:underline">
            Back to deals
          </Link>
        }
      />
    );
  }

  const { deal, financials, payments, invoices } = dealQuery.data;
  const cancelled = deal.status === 'Cancelled';

  const paymentsTab = (
    <Table
      caption="Payments"
      rows={payments}
      emptyState={
        <EmptyState
          compact
          icon={Wallet}
          title="No payments yet"
          action={
            !cancelled && (
              <Button size="sm" icon={Plus} onClick={() => setPaymentOpen(true)}>
                Add payment
              </Button>
            )
          }
        />
      }
      columns={[
        { key: 'date', header: 'Date', render: (payment) => formatDate(payment.date) },
        { key: 'amount', header: 'Amount', align: 'right', render: (payment) => <span className="font-medium text-success">{formatMoney(payment.amount)}</span> },
        { key: 'invoice', header: 'Invoice', render: (payment) => payment.invoice?.invoiceNumber ?? <span className="text-gray-400">Advance</span> },
        { key: 'method', header: 'Method' },
        { key: 'reference', header: 'Reference', render: (payment) => payment.reference || <span className="text-gray-400">-</span> },
        { key: 'by', header: 'Recorded by', render: (payment) => payment.signedBy?.name ?? '-' },
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
                defaultRecipient={deal.client?.email}
              />
              <Button size="sm" variant="ghost" icon={Trash2} aria-label="Delete payment" className="px-2 text-danger" onClick={() => setPaymentToDelete(payment)} />
            </div>
          ),
        },
      ]}
    />
  );

  const invoicesTab = (
    <Table
      caption="Invoices"
      rows={invoices}
      onRowClick={(invoice) => navigate(`/invoices/${invoice._id}`)}
      emptyState={
        <EmptyState
          compact
          icon={FileText}
          title="No invoices yet"
          action={
            !cancelled && (
              <Button size="sm" icon={FilePlus2} onClick={() => navigate(`/invoices/new?dealId=${deal._id}`)}>
                Create invoice
              </Button>
            )
          }
        />
      }
      columns={[
        { key: 'number', header: 'Invoice', render: (invoice) => <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span> },
        { key: 'date', header: 'Date', render: (invoice) => formatDate(invoice.invoiceDate) },
        { key: 'due', header: 'Due', render: (invoice) => formatDate(invoice.dueDate) },
        { key: 'total', header: 'Total', align: 'right', render: (invoice) => formatMoney(invoice.total) },
        { key: 'paid', header: 'Paid', align: 'right', render: (invoice) => formatMoney(invoice.amountPaid) },
        { key: 'balance', header: 'Balance', align: 'right', render: (invoice) => formatMoney(invoice.balanceDue) },
        { key: 'status', header: 'Status', render: (invoice) => <StatusBadge status={invoice.status} /> },
      ]}
    />
  );

  const detailsTab = (
    <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-gray-500">Commission on this deal</dt>
        <dd className="font-medium text-gray-900">
          {deal.assignedStaff ? commissionLabel(deal.commissionType, deal.commissionRate, formatMoney) : 'No staff assigned'}
        </dd>
      </div>
      <div>
        <dt className="text-gray-500">Commission total</dt>
        <dd className="font-medium text-gray-900 tabular-nums">{formatMoney(financials.commissionTotal)}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-gray-500">Description</dt>
        <dd className="whitespace-pre-line text-gray-900">{deal.description || '-'}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-gray-500">Internal notes</dt>
        <dd className="whitespace-pre-line text-gray-900">{deal.notes || '-'}</dd>
      </div>
    </dl>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/deals"
        backLabel="All deals"
        title={deal.title}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/deals/${deal._id}/edit`)}>
              Edit
            </Button>
            <Button variant="ghost" icon={Trash2} className="text-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            <Button variant="secondary" icon={FilePlus2} disabled={cancelled} onClick={() => navigate(`/invoices/new?dealId=${deal._id}`)}>
              Create invoice
            </Button>
            <Button icon={Plus} disabled={cancelled} onClick={() => setPaymentOpen(true)}>
              Add payment
            </Button>
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <StatusBadge status={deal.status} />
          {deal.client && (
            <Link to={`/clients/${deal.client._id}`} className="font-medium text-gray-900 hover:text-brand">
              {deal.client.companyName || deal.client.name}
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5">
            <UserCog className="size-4 text-gray-400" aria-hidden="true" />
            {deal.assignedStaff?.name ?? 'No staff'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-gray-400" aria-hidden="true" />
            {formatDate(deal.startDate)}
            {deal.deadline ? ` to ${formatDate(deal.deadline)}` : ''}
          </span>
        </div>
      </PageHeader>

      {cancelled && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This deal is cancelled. It no longer counts towards the deal value or commission, and new payments or invoices cannot be added.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard tone="info" icon={Banknote} title="Deal Amount" value={formatMoney(deal.dealAmount)} />
        <StatCard tone="success" icon={CircleDollarSign} title="Received" value={formatMoney(financials.received)} />
        <StatCard tone={financials.remaining > 0 ? 'danger' : 'neutral'} icon={Scale} title="Remaining" value={formatMoney(financials.remaining)} />
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Payment Progress</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">{Math.round(financials.progress)}%</p>
          <ProgressBar value={financials.progress} showLabel={false} className="mt-3" />
        </div>
        <StatCard
          tone="warning"
          icon={HandCoins}
          title="Staff Commission"
          value={formatMoney(financials.commissionEarned)}
          hint={`Earned of ${formatMoney(financials.commissionTotal)}`}
        />
      </div>

      <Card>
        <CardBody>
          <Tabs
            tabs={[
              { label: 'Payments', icon: Wallet, count: payments.length, content: paymentsTab },
              { label: 'Invoices', icon: FileText, count: invoices.length, content: invoicesTab },
              { label: 'Notes', icon: StickyNote, content: <NotesTimeline notableType="Deal" notableId={deal._id} /> },
              { label: 'Details', icon: Info, content: detailsTab },
            ]}
          />
        </CardBody>
      </Card>

      <PaymentFormModal open={paymentOpen} onClose={() => setPaymentOpen(false)} dealId={deal._id} />

      <ConfirmDialog
        open={Boolean(paymentToDelete)}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={() => deletePayment.mutate(paymentToDelete._id)}
        loading={deletePayment.isPending}
        title="Delete this payment?"
        message={paymentToDelete && `${formatMoney(paymentToDelete.amount)} on ${formatDate(paymentToDelete.date)} will be removed, and any linked invoice will be recalculated.`}
        confirmLabel="Delete payment"
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteDeal.mutate()}
        loading={deleteDeal.isPending}
        title="Delete this deal?"
        message="The deal and its invoices will be removed. Deals with recorded payments cannot be deleted; mark them Cancelled instead."
        confirmLabel="Delete deal"
      />
    </div>
  );
}