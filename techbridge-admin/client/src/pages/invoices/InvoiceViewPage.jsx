import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Copy, FileText, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { invoicesApi } from '../../api/endpoints.js';
import DocumentActions from '../../components/documents/DocumentActions.jsx';
import PaymentFormModal from '../../components/forms/PaymentFormModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatusStamp from '../../components/stamps/StatusStamp.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import Table from '../../components/ui/Table.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { formatDate } from '../../utils/formatDate.js';
import { invalidateMoneyQueries } from '../../utils/queryInvalidation.js';

export default function InvoiceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatMoney } = useSettings();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invoiceQuery = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id) });
  usePageTitle(invoiceQuery.data?.invoice?.invoiceNumber ?? 'Invoice');

  const refresh = () => invalidateMoneyQueries(queryClient);

  const markSent = useMutation({
    mutationFn: () => invoicesApi.markSent(id),
    onSuccess: () => {
      toast.success('Invoice marked as sent');
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const duplicate = useMutation({
    mutationFn: () => invoicesApi.duplicate(id),
    onSuccess: ({ invoice }) => {
      toast.success(`Draft ${invoice.invoiceNumber} created from this invoice`);
      refresh();
      navigate(`/invoices/${invoice._id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteInvoice = useMutation({
    mutationFn: () => invoicesApi.remove(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      refresh();
      navigate('/invoices', { replace: true });
    },
    onError: (error) => {
      toast.error(error.message);
      setConfirmDelete(false);
    },
  });

  if (invoiceQuery.isLoading) return <FullPageSpinner label="Loading invoice" />;
  if (invoiceQuery.isError) {
    return (
      <EmptyState
        icon={FileText}
        title={invoiceQuery.error.status === 404 ? 'Invoice not found' : 'Could not load this invoice'}
        description={invoiceQuery.error.message}
        action={
          <Link to="/invoices" className="text-sm font-medium text-brand hover:underline">
            Back to invoices
          </Link>
        }
      />
    );
  }

  const { invoice, payments, deal } = invoiceQuery.data;
  const client = invoice.client;
  const isDraft = invoice.status === 'Draft';

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/invoices"
        backLabel="All invoices"
        title={invoice.invoiceNumber}
        description={client ? client.companyName || client.name : undefined}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/invoices/${invoice._id}/edit`)}>
              Edit
            </Button>
            <Button variant="secondary" icon={Copy} loading={duplicate.isPending} onClick={() => duplicate.mutate()}>
              Duplicate
            </Button>
            {isDraft && (
              <Button variant="secondary" icon={Send} loading={markSent.isPending} onClick={() => markSent.mutate()}>
                Mark as sent
              </Button>
            )}
            <Button variant="ghost" icon={Trash2} className="text-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            {invoice.balanceDue > 0 && (
              <Button icon={Plus} onClick={() => setPaymentOpen(true)}>
                Add payment
              </Button>
            )}
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={invoice.status} />
          <DocumentActions
            pdfPath={`/invoices/${invoice._id}/pdf`}
            emailPath={`/invoices/${invoice._id}/email`}
            emailTitle={`Email invoice ${invoice.invoiceNumber}`}
            defaultRecipient={client?.email}
            onDone={refresh}
          />
        </div>
      </PageHeader>

      {/* On-screen version of the invoice */}
      <Card className="relative overflow-hidden">
        <StatusStamp status={invoice.status} size="lg" className="absolute top-8 right-8 hidden sm:inline-block" />
        <CardBody className="space-y-8 p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand uppercase">Bill to</p>
              {client ? (
                <div className="mt-1 text-sm">
                  <Link to={`/clients/${client._id}`} className="font-semibold text-gray-900 hover:text-brand">
                    {client.name}
                  </Link>
                  {client.companyName && <p className="text-gray-700">{client.companyName}</p>}
                  <p className="text-gray-500">{[client.address, client.city, client.country].filter(Boolean).join(', ')}</p>
                  <p className="text-gray-500">{[client.email, client.phone].filter(Boolean).join(' · ')}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">Client record not available</p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:mr-40">
              <dt className="text-gray-500">Invoice date</dt>
              <dd className="text-right font-medium">{formatDate(invoice.invoiceDate)}</dd>
              <dt className="text-gray-500">Due date</dt>
              <dd className="text-right font-medium">{formatDate(invoice.dueDate)}</dd>
              <dt className="text-gray-500">Project</dt>
              <dd className="text-right font-medium">
                {invoice.deal ? (
                  <Link to={`/deals/${invoice.deal._id}`} className="hover:text-brand">
                    {invoice.deal.title}
                  </Link>
                ) : (
                  '-'
                )}
              </dd>
              {invoice.signedBy && (
                <>
                  <dt className="text-gray-500">Signed by</dt>
                  <dd className="text-right font-medium">{invoice.signedBy.name}</dd>
                </>
              )}
            </dl>
          </div>

          <Table
            caption="Line items"
            rows={invoice.items}
            maxHeight="max-h-none"
            columns={[
              { key: 'index', header: '#', render: (_item, index) => index + 1 },
              { key: 'description', header: 'Description', className: 'whitespace-normal' },
              { key: 'qty', header: 'Qty', align: 'right' },
              { key: 'rate', header: 'Rate', align: 'right', render: (item) => formatMoney(item.rate) },
              { key: 'amount', header: 'Amount', align: 'right', render: (item) => formatMoney(item.amount) },
            ]}
          />

          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
            <div className="max-w-md space-y-4 text-sm">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Notes</p>
                  <p className="mt-1 whitespace-pre-line text-gray-700">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Terms</p>
                  <p className="mt-1 whitespace-pre-line text-gray-700">{invoice.terms}</p>
                </div>
              )}
            </div>

            <dl className="w-full space-y-2 text-sm sm:w-80">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(invoice.subtotal)}</dd>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Discount</dt>
                  <dd className="tabular-nums">- {formatMoney(invoice.discount)}</dd>
                </div>
              )}
              {invoice.taxPercent > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tax ({invoice.taxPercent}%)</dt>
                  <dd className="tabular-nums">{formatMoney(invoice.taxAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-brand pt-2 text-base font-semibold text-brand">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(invoice.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Paid</dt>
                <dd className="text-success tabular-nums">{formatMoney(invoice.amountPaid)}</dd>
              </div>
              <div className="flex justify-between rounded-lg bg-brand-50 px-3 py-2 font-semibold">
                <dt>Balance due</dt>
                <dd className="tabular-nums">{formatMoney(invoice.balanceDue)}</dd>
              </div>
            </dl>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Payments against this invoice"
          description={deal ? `Deal remaining: ${formatMoney(deal.remaining)}` : undefined}
        />
        <Table
          caption="Payments"
          className="rounded-none border-0"
          maxHeight="max-h-none"
          rows={payments}
          emptyState={<EmptyState compact title="No payments recorded for this invoice yet" />}
          columns={[
            { key: 'date', header: 'Date', render: (payment) => formatDate(payment.date) },
            { key: 'amount', header: 'Amount', align: 'right', render: (payment) => <span className="font-medium text-success">{formatMoney(payment.amount)}</span> },
            { key: 'method', header: 'Method' },
            { key: 'reference', header: 'Reference', render: (payment) => payment.reference || '-' },
            {
              key: 'receipt',
              header: 'Receipt',
              render: (payment) => (
                <DocumentActions
                  compact
                  pdfPath={`/payments/${payment._id}/receipt`}
                  emailPath={`/payments/${payment._id}/email`}
                  emailTitle="Email payment receipt"
                  defaultRecipient={client?.email}
                />
              ),
            },
          ]}
        />
      </Card>

      <PaymentFormModal open={paymentOpen} onClose={() => setPaymentOpen(false)} dealId={invoice.deal?._id} invoiceId={invoice._id} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteInvoice.mutate()}
        loading={deleteInvoice.isPending}
        title={`Delete ${invoice.invoiceNumber}?`}
        message="The invoice will be removed from all lists. Invoices with recorded payments cannot be deleted; delete the payments first."
        confirmLabel="Delete invoice"
      />
    </div>
  );
}