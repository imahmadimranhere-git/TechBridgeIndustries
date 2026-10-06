import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { publicApi } from '../api/public.js';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatDate } from '../utils/formatDate.js';
import { formatMoney } from '../utils/formatMoney.js';

function Row({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 sm:text-right">{children}</dd>
    </div>
  );
}

/** Public page opened from the QR code on every PDF: /verify/TBI-INV-0001-8F3K */
export default function VerifyPage() {
  usePageTitle('Verify document');
  const { code } = useParams();
  const navigate = useNavigate();
  const { branding } = useSettings();
  const [input, setInput] = useState(code ?? '');

  const verifyQuery = useQuery({
    queryKey: ['verify', code],
    queryFn: () => publicApi.verifyDocument(code),
    enabled: Boolean(code),
    retry: false,
  });

  const document = verifyQuery.data;
  const notFound = verifyQuery.isError && verifyQuery.error.status === 404;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="lg" />
        </div>

        <div className="card overflow-hidden">
          {!code && (
            <div className="p-6 text-center">
              <h1 className="text-lg font-semibold text-gray-900">Verify a document</h1>
              <p className="mt-1 text-sm text-gray-500">Scan the QR code on the document, or type the code printed next to it.</p>
            </div>
          )}

          {code && verifyQuery.isLoading && (
            <div className="flex flex-col items-center gap-3 p-10 text-brand">
              <Spinner className="size-8" label="Checking document" />
              <p className="text-sm text-gray-500">Checking document...</p>
            </div>
          )}

          {notFound && (
            <div className="p-8 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
                <ShieldX className="size-7" aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-lg font-semibold text-gray-900">Document not found</h1>
              <p className="mt-1 text-sm text-gray-500">
                No document with the code <span className="font-mono font-semibold text-gray-700">{code}</span> was issued by {branding.companyName}.
                Check the code, or contact us if you believe this is a mistake.
              </p>
            </div>
          )}

          {verifyQuery.isError && !notFound && (
            <div className="p-8 text-center">
              <AlertTriangle className="mx-auto size-8 text-warning" aria-hidden="true" />
              <p className="mt-3 text-sm text-gray-600">{verifyQuery.error.message}</p>
            </div>
          )}

          {document && (
            <>
              <div className={document.isValid ? 'bg-success-soft px-6 py-6 text-center' : 'bg-warning-soft px-6 py-6 text-center'}>
                <span
                  className={`mx-auto flex size-14 items-center justify-center rounded-full bg-white ${document.isValid ? 'text-success' : 'text-warning'}`}
                >
                  {document.isValid ? <ShieldCheck className="size-7" aria-hidden="true" /> : <AlertTriangle className="size-7" aria-hidden="true" />}
                </span>
                <h1 className={`mt-3 text-lg font-semibold ${document.isValid ? 'text-success' : 'text-warning'}`}>
                  {document.isValid ? 'Genuine document' : 'This document has been revoked'}
                </h1>
                <p className="mt-1 text-sm text-gray-700">
                  {document.isValid
                    ? `This document is genuine and issued by ${document.issuer}.`
                    : `${document.issuer} has withdrawn this document. Please contact us.`}
                </p>
              </div>

              <dl className="divide-y divide-gray-100 px-6">
                <Row label="Document type">{document.documentLabel}</Row>
                <Row label="Number">{document.documentNumber}</Row>
                <Row label="Issued to">{document.partyName}</Row>
                <Row label="Amount">
                  {document.amount !== null && document.amount !== undefined
                    ? formatMoney(document.amount, { symbol: document.currencySymbol })
                    : null}
                </Row>
                <Row label="Date">{formatDate(document.documentDate ?? document.issuedAt)}</Row>
                <Row label="Period">
                  {document.periodFrom ? `${formatDate(document.periodFrom)} to ${formatDate(document.periodTo)}` : null}
                </Row>
                <Row label="Status">{document.status ? <StatusBadge status={document.status} /> : null}</Row>
                <Row label="Verification code">
                  <span className="font-mono">{document.code}</span>
                </Row>
                <Row label="Issued on">{formatDate(document.issuedAt, 'dd MMM yyyy, hh:mm a')}</Row>
              </dl>
            </>
          )}

          <form
            className="flex gap-2 border-t border-gray-100 bg-gray-50/70 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const next = input.trim().toUpperCase();
              if (next) navigate(`/verify/${encodeURIComponent(next)}`);
            }}
          >
            <Input
              aria-label="Verification code"
              placeholder="e.g. TBI-INV-0001-8F3K"
              leftIcon={Search}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="flex-1"
              inputClassName="font-mono uppercase"
            />
            <Button type="submit">Verify</Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          {[branding.website, branding.email, branding.phone].filter(Boolean).join('  ·  ')}
        </p>
      </div>
    </div>
  );
}