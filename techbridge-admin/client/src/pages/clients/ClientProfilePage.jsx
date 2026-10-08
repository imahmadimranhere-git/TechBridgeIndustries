import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Award,
  Banknote,
  Briefcase,
  CircleDollarSign,
  FileSignature,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Scale,
  StickyNote,
  Trash2,
  UserX,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clientsApi } from '../../api/endpoints.js';
import DocumentActions from '../../components/documents/DocumentActions.jsx';
import ClientFormModal from '../../components/forms/ClientFormModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import NotesTimeline from '../../components/notes/NotesTimeline.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import Select from '../../components/ui/Select.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Table from '../../components/ui/Table.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { rangeParams } from '../../utils/dateRanges.js';
import { formatDate } from '../../utils/formatDate.js';
import { toWhatsAppNumber } from '../../utils/whatsapp.js';

const linkClass = 'font-medium text-gray-900 hover:text-brand';

function ContactItem({ icon: Icon, children, href }) {
  if (!children) return null;
  const content = (
    <>
      <Icon className="size-4 text-gray-400" aria-hidden="true" />
      {children}
    </>
  );
  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand">
      {content}
    </a>
  ) : (
    <span className="inline-flex items-center gap-1.5">{content}</span>
  );
}

export default function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branding, formatMoney } = useSettings();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statementRange, setStatementRange] = useState({ range: 'all_time' });
  const [welcomeDealId, setWelcomeDealId] = useState('');
  // Project completion certificate: which deal, when it was delivered, what was handed over
  const [completion, setCompletion] = useState({ dealId: '', deliveredOn: '', deliverables: '' });
  const updateCompletion = (field) => (event) => setCompletion((current) => ({ ...current, [field]: event.target.value }));

  const profileQuery = useQuery({ queryKey: ['client', id], queryFn: () => clientsApi.get(id) });
  usePageTitle(profileQuery.data?.client?.name ?? 'Client');

  const deleteMutation = useMutation({
    mutationFn: () => clientsApi.remove(id),
    onSuccess: () => {
      toast.success('Client deleted');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/clients', { replace: true });
    },
    onError: (error) => {
      toast.error(error.message);
      setConfirmDelete(false);
    },
  });

  if (profileQuery.isLoading) return <FullPageSpinner label="Loading client" />;

  if (profileQuery.isError) {
    return (
      <EmptyState
        icon={UserX}
        title={profileQuery.error.status === 404 ? 'Client not found' : 'Could not load this client'}
        description={profileQuery.error.message}
        action={
          <Link to="/clients" className="text-sm font-medium text-brand hover:underline">
            Back to clients
          </Link>
        }
      />
    );
  }

  const { client, stats, deals, payments, invoices, welcomeLetters } = profileQuery.data;
  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: ['client', id] });
  const statementParams = rangeParams(statementRange);
  const statementReady = statementRange.range !== 'custom' || (statementRange.from && statementRange.to);
  const completedDeals = deals.filter((deal) => deal.status === 'Completed');
  const completionParams = completion.dealId ? completion : {};
  const location = [client.address, client.city, client.country].filter(Boolean).join(', ');

  // WhatsApp: the client's WhatsApp number, else their phone
  const whatsappPhone = client.whatsapp || client.phone;
  const whatsappFor = (what) => ({
    phone: whatsappPhone,
    message: `Dear ${client.name}, please find attached your ${what} from ${branding.companyName}.`,
  });

  const dealsTab = (
    <Table
      caption="Deals"
      rows={deals}
      onRowClick={(deal) => navigate(`/deals/${deal._id}`)}
      emptyState={
        <EmptyState
          compact
          icon={Briefcase}
          title="No deals yet"
          action={
            <Link to={`/deals/new?clientId=${client._id}`} className="text-sm font-medium text-brand hover:underline">
              Create the first deal
            </Link>
          }
        />
      }
      columns={[
        { key: 'title', header: 'Deal', render: (deal) => <span className="font-medium text-gray-900">{deal.title}</span> },
        { key: 'amount', header: 'Amount', align: 'right', render: (deal) => formatMoney(deal.dealAmount) },
        { key: 'received', header: 'Received', align: 'right', render: (deal) => <span className="text-success">{formatMoney(deal.received)}</span> },
        { key: 'remaining', header: 'Remaining', align: 'right', render: (deal) => formatMoney(deal.remaining) },
        { key: 'progress', header: 'Progress', className: 'min-w-40', render: (deal) => <ProgressBar value={deal.progress} size="sm" /> },
        { key: 'staff', header: 'Staff', render: (deal) => deal.staff?.name ?? <span className="text-gray-400">-</span> },
        { key: 'status', header: 'Status', render: (deal) => <StatusBadge status={deal.status} /> },
      ]}
    />
  );

  const paymentsTab = (
    <Table
      caption="Payment history"
      rows={payments}
      emptyState={<EmptyState compact icon={Wallet} title="No payments yet" />}
      columns={[
        { key: 'date', header: 'Date', render: (payment) => formatDate(payment.date) },
        {
          key: 'deal',
          header: 'Deal',
          render: (payment) => (
            <Link to={`/deals/${payment.deal._id}`} className={linkClass}>
              {payment.deal.title}
            </Link>
          ),
        },
        { key: 'invoice', header: 'Invoice', render: (payment) => payment.invoice?.invoiceNumber ?? <span className="text-gray-400">Advance</span> },
        { key: 'amount', header: 'Amount', align: 'right', render: (payment) => <span className="font-medium text-success">{formatMoney(payment.amount)}</span> },
        { key: 'method', header: 'Method' },
        { key: 'reference', header: 'Reference', render: (payment) => payment.reference || <span className="text-gray-400">-</span> },
        {
          key: 'receipt',
          header: 'Receipt',
          render: (payment) => (
            <DocumentActions
              compact
              pdfPath={`/payments/${payment._id}/receipt`}
              emailPath={`/payments/${payment._id}/email`}
              emailTitle="Email payment receipt"
              defaultRecipient={client.email}
              whatsapp={whatsappFor(`payment receipt for ${formatMoney(payment.amount)}`)}
            />
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
      emptyState={<EmptyState compact icon={FileText} title="No invoices yet" />}
      columns={[
        { key: 'number', header: 'Invoice', render: (invoice) => <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span> },
        { key: 'deal', header: 'Deal', render: (invoice) => invoice.deal?.title ?? '-' },
        { key: 'date', header: 'Date', render: (invoice) => formatDate(invoice.invoiceDate) },
        { key: 'due', header: 'Due', render: (invoice) => formatDate(invoice.dueDate) },
        { key: 'total', header: 'Total', align: 'right', render: (invoice) => formatMoney(invoice.total) },
        { key: 'balance', header: 'Balance', align: 'right', render: (invoice) => formatMoney(invoice.balanceDue) },
        { key: 'status', header: 'Status', render: (invoice) => <StatusBadge status={invoice.status} /> },
      ]}
    />
  );

  const documentsTab = (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader icon={Receipt} title="Client statement" description="Every deal and payment as a ledger with a running balance" />
        <CardBody className="space-y-4">
          <DateRangeFilter value={statementRange} onChange={setStatementRange} />
          <DocumentActions
            disabled={!statementReady}
            pdfPath={`/clients/${client._id}/statement`}
            params={statementParams}
            emailPath={`/clients/${client._id}/statement/email`}
            emailExtra={statementParams}
            emailTitle="Email client statement"
            defaultRecipient={client.email}
            whatsapp={whatsappFor('account statement')}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={FileSignature} title="Welcome letter" description="Uses the template from Settings" />
        <CardBody className="space-y-4">
          <Select
            label="Deal summary"
            placeholder="No deal summary"
            options={deals.map((deal) => ({ value: deal._id, label: deal.title }))}
            value={welcomeDealId}
            onChange={(event) => setWelcomeDealId(event.target.value)}
          />
          <DocumentActions
            pdfPath={`/clients/${client._id}/welcome-letter`}
            params={{ dealId: welcomeDealId }}
            emailPath={`/clients/${client._id}/welcome-letter/email`}
            emailExtra={welcomeDealId ? { dealId: welcomeDealId } : {}}
            emailTitle="Email welcome letter"
            defaultRecipient={client.email}
            whatsapp={whatsappFor('welcome letter')}
            onDone={refreshProfile}
          />
          {!toWhatsAppNumber(whatsappPhone) && (
            <p className="text-xs text-gray-500">
              No WhatsApp or phone number is saved for this client. WhatsApp will ask you to choose the contact. Add a number with Edit to open the chat directly.
            </p>
          )}
          <div>
            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">History</h4>
            {welcomeLetters.length === 0 ? (
              <p className="text-sm text-gray-500">No welcome letter sent or downloaded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {welcomeLetters.map((log) => (
                  <li key={log._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="text-gray-700">
                      {log.action}
                      {log.sentTo ? ` to ${log.sentTo}` : ''}
                      <span className="block text-xs text-gray-500">
                        {formatDate(log.createdAt, 'dd MMM yyyy, hh:mm a')}
                        {log.sentBy?.name ? ` · ${log.sentBy.name}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={log.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          icon={Award}
          title="Project completion certificate"
          description="Send after delivery: confirms the project is complete and thanks the client. Text is in Settings."
        />
        <CardBody className="space-y-4">
          {completedDeals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              No completed deal yet. When a project is delivered, open the deal, set its status to Completed, then come back here.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Completed deal"
                  placeholder="Choose a deal"
                  options={completedDeals.map((deal) => ({ value: deal._id, label: deal.title }))}
                  value={completion.dealId}
                  onChange={updateCompletion('dealId')}
                />
                <Input
                  label="Delivered on"
                  type="date"
                  hint="Leave empty for today."
                  value={completion.deliveredOn}
                  onChange={updateCompletion('deliveredOn')}
                />
              </div>
              <Textarea
                label="What was delivered (optional)"
                rows={4}
                placeholder={'Website (desktop and mobile)\nAdmin panel\nSource code and documentation'}
                hint="One item per line. Leave empty for a general confirmation."
                value={completion.deliverables}
                onChange={updateCompletion('deliverables')}
              />
              <DocumentActions
                disabled={!completion.dealId}
                pdfPath={`/clients/${client._id}/completion-certificate`}
                params={completionParams}
                emailPath={`/clients/${client._id}/completion-certificate/email`}
                emailExtra={completionParams}
                emailTitle="Email project completion certificate"
                defaultRecipient={client.email}
                whatsapp={{
                  phone: whatsappPhone,
                  message: `Dear ${client.name}, we are delighted to share that your project has been successfully delivered. Please find attached your Project Completion Certificate. Thank you for choosing ${branding.companyName}.`,
                }}
              />
              {!completion.dealId && <p className="text-xs text-gray-500">Choose a deal to preview or send the certificate.</p>}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/clients"
        backLabel="All clients"
        title={client.name}
        description={client.companyName}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="ghost" icon={Trash2} className="text-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            <Button icon={Plus} onClick={() => navigate(`/deals/new?clientId=${client._id}`)}>
              New deal
            </Button>
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <StatusBadge status={client.status} />
          <ContactItem icon={Mail} href={client.email ? `mailto:${client.email}` : undefined}>
            {client.email}
          </ContactItem>
          <ContactItem icon={Phone} href={client.phone ? `tel:${client.phone}` : undefined}>
            {client.phone}
          </ContactItem>
          <ContactItem icon={MessageCircle} href={client.whatsapp ? `https://wa.me/${toWhatsAppNumber(client.whatsapp)}` : undefined}>
            {client.whatsapp}
          </ContactItem>
          <ContactItem icon={Globe} href={client.website ? (client.website.startsWith('http') ? client.website : `https://${client.website}`) : undefined}>
            {client.website}
          </ContactItem>
          <ContactItem icon={MapPin}>{location}</ContactItem>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="info" icon={Banknote} title="Total Deal Amount" value={formatMoney(stats.totalDealValue)} />
        <StatCard tone="success" icon={CircleDollarSign} title="Total Received" value={formatMoney(stats.totalReceived)} />
        <StatCard tone={stats.remaining > 0 ? 'danger' : 'neutral'} icon={Scale} title="Remaining" value={formatMoney(stats.remaining)} />
        <StatCard tone="purple" icon={Briefcase} title="Number of Deals" value={stats.dealsCount} />
      </div>

      <Card>
        <CardBody>
          <Tabs
            tabs={[
              { label: 'Deals', icon: Briefcase, count: deals.length, content: dealsTab },
              { label: 'Payments', icon: Wallet, count: payments.length, content: paymentsTab },
              { label: 'Invoices', icon: FileText, count: invoices.length, content: invoicesTab },
              { label: 'Notes', icon: StickyNote, content: <NotesTimeline notableType="Client" notableId={client._id} /> },
              { label: 'Documents', icon: Receipt, content: documentsTab },
            ]}
          />
        </CardBody>
      </Card>

      <ClientFormModal open={editOpen} client={client} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete this client?"
        message="The client, their deals and invoices will be removed from all lists. Clients with recorded payments cannot be deleted."
        confirmLabel="Delete client"
      />
    </div>
  );
}
