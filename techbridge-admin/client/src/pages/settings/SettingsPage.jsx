import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, FileCheck2, FileSignature, Hash, Landmark, Mail, Palette, Save, Send, Stamp } from 'lucide-react';
import { settingsApi, usersApi } from '../../api/endpoints.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import CompanyStampPreview from '../../components/stamps/CompanyStampPreview.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import FileUpload from '../../components/ui/FileUpload.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { DOCUMENT_TYPES, LETTER_PLACEHOLDERS, settingsFormSchema, settingsPatch, settingsToForm } from '../../schemas/settingsSchemas.js';
import { contrastText, HEX_COLOR } from '../../utils/color.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import { formatMoney } from '../../utils/formatMoney.js';

// Which form keys belong to which tab (each tab saves only its own keys)
const TAB_KEYS = {
  company: ['companyName', 'tagline', 'address', 'city', 'country', 'phone', 'email', 'website'],
  branding: ['brandPrimaryColor', 'brandSecondaryColor', 'currencySymbol'],
  stamp: ['stampMode', 'defaultSignatoryId', 'coSignatory1', 'coSignatory2', 'signatoryLabel'],
  documents: ['documentOptions'],
  invoicing: ['invoicePrefix', 'nextInvoiceNumber', 'defaultTaxPercent', 'defaultDueDays', 'invoiceTerms', 'footerText'],
  bank: ['bankDetails'],
  welcome: ['welcomeLetterTemplate', 'servicesText'],
};

const STAMP_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto-generated round stamp' },
  { value: 'uploaded', label: 'Uploaded stamp image' },
  { value: 'none', label: 'No stamp' },
];

const DOCUMENT_COLUMNS = [
  { option: 'showSignature', label: 'Signature' },
  { option: 'showCoSignature', label: 'Other founders' },
  { option: 'showStamp', label: 'Stamp' },
  { option: 'showQr', label: 'QR code' },
];

const adminLabel = (user) => `${user.name}${user.designation ? ` (${user.designation})` : ''}`;

function ColorField({ label, value, onChange, error }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={HEX_COLOR.test(value ?? '') ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
        />
        <input
          aria-label={label}
          value={value ?? ''}
          maxLength={7}
          onChange={(event) => onChange(event.target.value)}
          className="input-base font-mono uppercase"
        />
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function SaveBar({ onSave, saving, note }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
      <p className="text-xs text-gray-500">{note ?? 'Changes apply to new PDFs, emails and the whole panel straight away.'}</p>
      <Button icon={Save} loading={saving} onClick={onSave}>
        Save
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  usePageTitle('Settings');
  const queryClient = useQueryClient();
  const { refreshBranding } = useSettings();
  const [savingTab, setSavingTab] = useState(null);
  const [testTo, setTestTo] = useState('');

  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list({ limit: 100 }) });

  const {
    register,
    control,
    trigger,
    getValues,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(settingsFormSchema) });

  // Fill the form once when the settings first arrive
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (settingsQuery.data && !loaded) {
      reset(settingsToForm(settingsQuery.data));
      setLoaded(true);
    }
  }, [settingsQuery.data, loaded, reset]);

  const [primary, secondary, currencySymbol, companyName, city, country, stampMode, invoicePrefix, nextNumber] = useWatch({
    control,
    name: ['brandPrimaryColor', 'brandSecondaryColor', 'currencySymbol', 'companyName', 'city', 'country', 'stampMode', 'invoicePrefix', 'nextInvoiceNumber'],
  });

  // After any change: refresh this page's data and the public branding (colours, logo, favicon)
  const applyResponse = (data) => {
    queryClient.setQueryData(['settings'], data);
    refreshBranding();
  };

  const saveMutation = useMutation({
    mutationFn: (patch) => settingsApi.update(patch),
    onSuccess: (data) => {
      applyResponse(data);
      setValue('nextInvoiceNumber', String(data.nextInvoiceNumber));
      toast.success('Settings saved');
    },
    onError: (error) => {
      if (!applyServerErrors(error, setError)) toast.error(error.message);
    },
    onSettled: () => setSavingTab(null),
  });

  async function saveTab(tab) {
    const keys = TAB_KEYS[tab];
    const valid = await trigger(keys);
    if (!valid) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setSavingTab(tab);
    saveMutation.mutate(settingsPatch(getValues(), keys, settingsQuery.data.nextInvoiceNumber));
  }

  const testEmail = useMutation({
    mutationFn: () => settingsApi.testEmail(testTo),
    onSuccess: (result) => {
      toast.success(result.message);
      if (result.previewUrl) {
        toast(
          () => (
            <a href={result.previewUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand underline">
              Open the test email
            </a>
          ),
          { duration: 12000 }
        );
      }
    },
    onError: (error) => toast.error(error.message),
  });

  if (settingsQuery.isLoading || !loaded) return <FullPageSpinner label="Loading settings" />;

  const data = settingsQuery.data;
  const saving = (tab) => savingTab === tab && saveMutation.isPending;
  const allAdmins = usersQuery.data?.items ?? [];
  const activeAdmins = allAdmins.filter((user) => user.isActive);
  // Founders may be inactive admins (sign documents but never log in)
  const founderOptions = allAdmins.map((user) => ({
    value: user._id,
    label: `${adminLabel(user)}${user.isActive ? '' : ' - cannot log in'}`,
  }));

  /* ---------------- tabs ---------------- */

  const companyTab = (
    <div className="space-y-6">
      <FileUpload
        label="Company logo"
        hint="Shown on the login page, sidebar, favicon, PDFs and emails. PNG with a transparent background, max 2 MB."
        currentUrl={data.logoUrl}
        onUpload={async (file) => {
          applyResponse(await settingsApi.uploadLogo(file));
          toast.success('Logo saved');
        }}
        onRemove={async () => {
          applyResponse(await settingsApi.removeLogo());
          toast.success('Logo removed; the text logo is used instead');
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Company name" required error={errors.companyName?.message} {...register('companyName')} />
        <Input label="Tagline" error={errors.tagline?.message} {...register('tagline')} />
        <Input label="Address" className="sm:col-span-2" error={errors.address?.message} {...register('address')} />
        <Input label="City" error={errors.city?.message} {...register('city')} />
        <Input label="Country" error={errors.country?.message} {...register('country')} />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Website" className="sm:col-span-2" error={errors.website?.message} {...register('website')} />
      </div>
      <SaveBar onSave={() => saveTab('company')} saving={saving('company')} />
    </div>
  );

  const brandingTab = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          control={control}
          name="brandPrimaryColor"
          render={({ field }) => <ColorField label="Primary color" value={field.value} onChange={field.onChange} error={errors.brandPrimaryColor?.message} />}
        />
        <Controller
          control={control}
          name="brandSecondaryColor"
          render={({ field }) => <ColorField label="Secondary color" value={field.value} onChange={field.onChange} error={errors.brandSecondaryColor?.message} />}
        />
        <Input label="Currency symbol" required placeholder="Rs" error={errors.currencySymbol?.message} {...register('currencySymbol')} />
      </div>

      {/* Live preview: brand utilities inside use these local CSS variables */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">Live preview</p>
        <div
          className="overflow-hidden rounded-xl border border-gray-200"
          style={{
            '--color-brand': HEX_COLOR.test(primary ?? '') ? primary : '#1d4ed8',
            '--color-brand-contrast': contrastText(primary),
          }}
        >
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-brand-contrast">
            <span className="font-semibold">{companyName || 'Company'}</span>
            <span className="text-sm opacity-80">Admin Panel</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-white p-4">
            <span className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-contrast">Primary button</span>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">Badge</span>
            <span className="text-sm font-medium text-brand underline">A link</span>
            <span className="rounded-lg border-l-4 border-brand bg-gray-50 px-3 py-2 text-sm tabular-nums">
              {formatMoney(12500000, { symbol: currencySymbol || 'Rs' })}
            </span>
            <span className="size-8 rounded-lg" style={{ backgroundColor: HEX_COLOR.test(secondary ?? '') ? secondary : '#0f172a' }} title="Secondary color" />
          </div>
        </div>
      </div>
      <SaveBar onSave={() => saveTab('branding')} saving={saving('branding')} note="After saving, the whole panel, PDFs and emails use the new colours." />
    </div>
  );

  const stampTab = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Select label="Company stamp on documents" options={STAMP_MODE_OPTIONS} error={errors.stampMode?.message} {...register('stampMode')} />
          {stampMode === 'uploaded' && (
            <FileUpload
              label="Stamp image"
              currentUrl={data.stampUrl}
              onUpload={async (file) => {
                applyResponse(await settingsApi.uploadStamp(file));
                setValue('stampMode', 'uploaded');
                toast.success('Stamp saved');
              }}
              onRemove={async () => {
                const response = await settingsApi.removeStamp();
                applyResponse(response);
                setValue('stampMode', response.settings.stampMode);
                toast.success('Stamp removed; the auto-generated stamp is used instead');
              }}
            />
          )}
          {stampMode === 'auto' && (
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-gray-600">
              Built from the company name, city and country (Company tab) in the primary colour. It updates as you type.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Default signatory"
              placeholder="Choose an admin"
              hint="Signs documents that have no signer of their own."
              options={activeAdmins.map((user) => ({ value: user._id, label: adminLabel(user) }))}
              error={errors.defaultSignatoryId?.message}
              {...register('defaultSignatoryId')}
            />
            <Input label="Signatory label" required error={errors.signatoryLabel?.message} {...register('signatoryLabel')} />
            <Select
              label="Other founder 1 (optional)"
              placeholder="None"
              hint="Signs next to the main signer and is listed as a contact."
              options={founderOptions}
              error={errors.coSignatory1?.message}
              {...register('coSignatory1')}
            />
            <Select
              label="Other founder 2 (optional)"
              placeholder="None"
              hint="Up to three signatures fit on a page."
              options={founderOptions}
              error={errors.coSignatory2?.message}
              {...register('coSignatory2')}
            />
          </div>
          <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-gray-600">
            Every document shows the person who created it on the right (with the stamp), and the other founders to the left. Welcome
            letters list all of them as points of contact, and emails list them under the sign-off. Use the placeholder{' '}
            <code className="rounded bg-white px-1 font-mono text-xs">{'{team}'}</code> in the welcome letter to name them in the text.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Preview</p>
          <CompanyStampPreview mode={stampMode} companyName={companyName} city={city} country={country} color={primary} uploadedUrl={data.stampUrl} size={180} />
        </div>
      </div>
      <SaveBar onSave={() => saveTab('stamp')} saving={saving('stamp')} />
    </div>
  );

  const documentsTab = (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Choose what appears on each type of PDF.</p>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Document
              </th>
              {DOCUMENT_COLUMNS.map(({ label }) => (
                <th key={label} scope="col" className="px-4 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap text-gray-500 uppercase">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DOCUMENT_TYPES.map(({ key, label }) => (
              <tr key={key} className="even:bg-gray-50/60">
                <td className="px-4 py-3 font-medium whitespace-nowrap text-gray-900">{label}</td>
                {DOCUMENT_COLUMNS.map(({ option, label: columnLabel }) => (
                  <td key={option} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${label}: ${columnLabel}`}
                      className="size-4 rounded border-gray-300 text-brand focus:ring-brand/40"
                      {...register(`documentOptions.${key}.${option}`)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar onSave={() => saveTab('documents')} saving={saving('documents')} />
    </div>
  );

  const invoicingTab = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Input label="Invoice prefix" required error={errors.invoicePrefix?.message} {...register('invoicePrefix')} />
        <Input
          label="Next invoice number"
          inputMode="numeric"
          hint={`Next invoice: ${(invoicePrefix || 'TBI').toUpperCase()}-${String(nextNumber || 1).padStart(4, '0')}`}
          error={errors.nextInvoiceNumber?.message}
          {...register('nextInvoiceNumber')}
        />
        <Input label="Default tax %" type="number" step="0.01" min="0" max="100" error={errors.defaultTaxPercent?.message} {...register('defaultTaxPercent')} />
        <Input label="Due in (days)" type="number" min="0" max="365" error={errors.defaultDueDays?.message} {...register('defaultDueDays')} />
      </div>
      <Textarea label="Default invoice terms" rows={4} error={errors.invoiceTerms?.message} {...register('invoiceTerms')} />
      <Input label="PDF footer text" hint='Printed at the bottom of every PDF, e.g. "Thank you for your business".' error={errors.footerText?.message} {...register('footerText')} />
      <SaveBar onSave={() => saveTab('invoicing')} saving={saving('invoicing')} note="The next number can move forward, never back to a number already used." />
    </div>
  );

  const bankTab = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Bank name" error={errors.bankDetails?.bankName?.message} {...register('bankDetails.bankName')} />
        <Input label="Account title" error={errors.bankDetails?.accountTitle?.message} {...register('bankDetails.accountTitle')} />
        <Input label="Account number" error={errors.bankDetails?.accountNumber?.message} {...register('bankDetails.accountNumber')} />
        <Input label="IBAN" error={errors.bankDetails?.iban?.message} {...register('bankDetails.iban')} />
        <Input label="Branch" error={errors.bankDetails?.branch?.message} {...register('bankDetails.branch')} />
        <Input label="SWIFT code" error={errors.bankDetails?.swiftCode?.message} {...register('bankDetails.swiftCode')} />
      </div>
      <SaveBar onSave={() => saveTab('bank')} saving={saving('bank')} note="Printed on invoices, statements and welcome letters when an account number or IBAN is filled in." />
    </div>
  );

  const welcomeTab = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm text-gray-500">Click a placeholder to add it at the end of the letter. It is replaced with real details in the PDF.</p>
        <div className="flex flex-wrap gap-2">
          {LETTER_PLACEHOLDERS.map((placeholder) => (
            <button
              key={placeholder}
              type="button"
              onClick={() => setValue('welcomeLetterTemplate', `${getValues('welcomeLetterTemplate')} ${placeholder}`, { shouldDirty: true })}
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700 hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
            >
              {placeholder}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        label="Welcome letter template"
        rows={12}
        hint="Leave an empty line between paragraphs."
        error={errors.welcomeLetterTemplate?.message}
        {...register('welcomeLetterTemplate')}
      />
      <Textarea label="Our services" rows={7} hint="One service per line." error={errors.servicesText?.message} {...register('servicesText')} />
      <SaveBar onSave={() => saveTab('welcome')} saving={saving('welcome')} />
    </div>
  );

  const emailTab = (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-gray-600">
        Emails are sent with the SMTP settings in <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">server/.env</code>. If none are set,
        development uses a temporary test inbox and gives you a link to view the email.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input label="Send a test email to" type="email" className="flex-1" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="you@example.com" />
        <Button icon={Send} loading={testEmail.isPending} disabled={!testTo} onClick={() => testEmail.mutate()}>
          Send test
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Settings" description="Company details, branding, documents and invoicing." />
      <Card>
        <CardBody>
          <Tabs
            tabs={[
              { label: 'Company', icon: Building2, content: companyTab },
              { label: 'Branding', icon: Palette, content: brandingTab },
              { label: 'Stamp and signatory', icon: Stamp, content: stampTab },
              { label: 'Documents', icon: FileCheck2, content: documentsTab },
              { label: 'Invoicing', icon: Hash, content: invoicingTab },
              { label: 'Bank details', icon: Landmark, content: bankTab },
              { label: 'Welcome letter', icon: FileSignature, content: welcomeTab },
              { label: 'Email', icon: Mail, content: emailTab },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
