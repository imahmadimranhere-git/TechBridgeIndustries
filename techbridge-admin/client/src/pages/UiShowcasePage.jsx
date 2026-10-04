import { useState } from 'react';
import { Banknote, FileText, HandCoins, PiggyBank, Plus, Trash2, TrendingUp, Users, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/layout/PageHeader.jsx';
import CompanyStampPreview from '../components/stamps/CompanyStampPreview.jsx';
import StatusStamp from '../components/stamps/StatusStamp.jsx';
import Badge, { StatusBadge } from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import DateRangeFilter from '../components/ui/DateRangeFilter.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import FileUpload from '../components/ui/FileUpload.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import SearchSelect from '../components/ui/SearchSelect.jsx';
import Select from '../components/ui/Select.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Switch from '../components/ui/Switch.jsx';
import Table from '../components/ui/Table.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { DEFAULT_RANGE } from '../utils/dateRanges.js';

// Temporary page to try every component. Not linked in the sidebar.
const SAMPLE_DEALS = [
  { _id: '1', title: 'Corporate Website', client: 'Sheikh Textiles', amount: 15000000, received: 15000000, status: 'Completed' },
  { _id: '2', title: 'Food Delivery App', client: 'Malik Foods', amount: 45000000, received: 25000000, status: 'In Progress' },
  { _id: '3', title: 'E-commerce Store', client: 'Noor Boutique', amount: 25000000, received: 5000000, status: 'In Progress' },
  { _id: '4', title: 'AI Chatbot', client: 'Ahmed Logistics', amount: 12000000, received: 2000000, status: 'Cancelled' },
];

const CLIENT_OPTIONS = [
  { value: 'a', label: 'Hamza Sheikh', description: 'Sheikh Textiles' },
  { value: 'b', label: 'Ayesha Malik', description: 'Malik Foods' },
  { value: 'c', label: 'Bilal Ahmed', description: 'Ahmed Logistics' },
];

export default function UiShowcasePage() {
  usePageTitle('UI components');
  const { branding, formatMoney } = useSettings();
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [client, setClient] = useState('');
  const [showStamp, setShowStamp] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const columns = [
    { key: 'title', header: 'Deal', render: (row) => <span className="font-medium text-gray-900">{row.title}</span> },
    { key: 'client', header: 'Client' },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatMoney(row.amount) },
    { key: 'received', header: 'Received', align: 'right', render: (row) => formatMoney(row.received) },
    { key: 'progress', header: 'Progress', render: (row) => <ProgressBar value={(row.received / row.amount) * 100} size="sm" /> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="UI components"
        description="Every building block of the admin panel in one place."
        actions={
          <>
            <Button variant="secondary" icon={FileText} onClick={() => toast.success('Secondary button clicked')}>
              Secondary
            </Button>
            <Button icon={Plus} onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
          </>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      {/* Main dashboard cards: blue, orange, green, purple */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard size="lg" tone="info" icon={Wallet} title="Total Received from Clients" value={formatMoney(77000000)} />
        <StatCard size="lg" tone="warning" icon={HandCoins} title="Commission Paid to Staff" value={formatMoney(2500000)} hint={`Pending: ${formatMoney(3000000)}`} />
        <StatCard size="lg" tone="success" icon={PiggyBank} title="Our Remaining Balance" value={formatMoney(74500000)} />
        <StatCard size="lg" tone="purple" icon={TrendingUp} title="Our Net Profit" value={formatMoney(71500000)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Banknote} title="Total Deal Value" value={formatMoney(141000000)} />
        <StatCard icon={Users} tone="neutral" title="Total Clients" value="5" />
        <StatCard loading title="Loading example" />
      </div>

      <Card>
        <CardHeader title="Table with pagination" description="Sticky header, zebra rows, right-aligned money" icon={FileText} />
        <CardBody className="space-y-4">
          <Table columns={columns} rows={SAMPLE_DEALS} onRowClick={(row) => toast(`Clicked ${row.title}`)} />
          <Pagination page={page} pages={5} total={97} limit={20} onPageChange={setPage} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Form fields" />
          <CardBody className="space-y-4">
            <Input label="Client name" required placeholder="e.g. Hamza Sheikh" />
            <Input label="With an error" defaultValue="wrong@" error="Email is invalid" />
            <Select label="Payment method" placeholder="Choose..." options={['Cash', 'Bank', 'JazzCash', 'EasyPaisa'].map((m) => ({ value: m, label: m }))} />
            <SearchSelect label="Client (searchable)" options={CLIENT_OPTIONS} value={client} onChange={setClient} placeholder="Type to search clients" />
            <Textarea label="Note" placeholder="Anything to remember..." hint="Visible only to admins" />
            <Switch label="Show stamp on invoices" description="Applies to every invoice PDF" checked={showStamp} onChange={setShowStamp} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Badges, progress and stamps" />
          <CardBody className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Active', 'Lead', 'Inactive'].map((status) => (
                <StatusBadge key={status} status={status} />
              ))}
              <Badge tone="brand">Brand</Badge>
            </div>
            <div className="space-y-3">
              <ProgressBar value={0} />
              <ProgressBar value={35} />
              <ProgressBar value={72} />
              <ProgressBar value={100} />
            </div>
            <div className="flex flex-wrap items-center gap-6 py-2">
              <StatusStamp status="Paid" />
              <StatusStamp status="Partially Paid" />
              <StatusStamp status="Overdue" />
              <StatusStamp status="Completed" size="sm" />
            </div>
            <div className="flex items-center gap-6">
              <CompanyStampPreview
                companyName={branding.companyName}
                city="Lahore"
                country="Pakistan"
                color={branding.brandPrimaryColor}
                size={140}
              />
              <p className="text-sm text-gray-500">Live preview of the auto-generated stamp, identical to the PDFs.</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Tabs, upload and empty state" />
        <CardBody>
          <Tabs
            tabs={[
              {
                label: 'Upload',
                icon: FileText,
                content: <FileUpload label="Signature" onUpload={async () => toast.success('Preview only: nothing was uploaded')} onRemove={async () => {}} />,
              },
              {
                label: 'Empty state',
                count: 0,
                content: (
                  <EmptyState
                    title="No payments yet"
                    description="Payments you record for this deal will show up here."
                    action={<Button icon={Plus}>Add payment</Button>}
                  />
                ),
              },
              {
                label: 'Danger zone',
                content: (
                  <Button variant="danger" icon={Trash2} onClick={() => setConfirmOpen(true)}>
                    Delete something
                  </Button>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add payment"
        description="Example modal with a form and footer buttons"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false);
                toast.success('Saved (example)');
              }}
            >
              Save payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Amount" placeholder="e.g. 50,000" required />
          <Select label="Method" options={['Cash', 'Bank'].map((m) => ({ value: m, label: m }))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success('Deleted (example)');
        }}
        title="Delete this record?"
        message="This cannot be undone. The record will be removed from all lists."
        confirmLabel="Delete"
      />
    </div>
  );
}