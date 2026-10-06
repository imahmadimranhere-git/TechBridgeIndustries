import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { KeyRound, Lightbulb, PenLine, UserCircle } from 'lucide-react';
import { profileApi } from '../../api/endpoints.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import FileUpload from '../../components/ui/FileUpload.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { passwordSchema, profileSchema } from '../../schemas/userSchemas.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import { formatDate } from '../../utils/formatDate.js';

/** How the signatory block will look on documents this admin signs */
function SignaturePreview({ user, companyName }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="relative ml-auto w-60 text-center">
        {user.stampUrl && (
          <img src={user.stampUrl} alt="" className="pointer-events-none absolute -top-6 -left-14 size-28 object-contain opacity-80 mix-blend-multiply" />
        )}
        <div className="flex h-16 items-end justify-center">
          {user.signatureUrl ? (
            <img src={user.signatureUrl} alt="Your signature" className="max-h-14 max-w-[200px] object-contain" />
          ) : (
            <span className="text-xs text-gray-400">No signature yet</span>
          )}
        </div>
        <div className="mx-3 border-t border-gray-800" />
        <p className="mt-1 text-sm font-semibold text-gray-900">{user.name}</p>
        {user.designation && <p className="text-xs text-gray-500">{user.designation}</p>}
        <p className="text-xs font-semibold text-brand">{companyName}</p>
        <p className="text-[11px] tracking-wide text-gray-500 uppercase">Authorized Signatory &middot; {formatDate(new Date())}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  usePageTitle('My profile');
  const { user, setUser } = useAuth();
  const { branding } = useSettings();

  /* ---------- details ---------- */
  const details = useForm({ resolver: zodResolver(profileSchema) });
  useEffect(() => {
    details.reset({ name: user.name, designation: user.designation ?? '', phone: user.phone ?? '', email: user.email });
  }, [user, details.reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const detailsMutation = useMutation({
    mutationFn: (values) => profileApi.update(values),
    onSuccess: ({ user: saved }) => {
      setUser(saved);
      toast.success('Profile updated');
    },
    onError: (error) => {
      if (!applyServerErrors(error, details.setError)) toast.error(error.message);
    },
  });

  /* ---------- password ---------- */
  const password = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const passwordMutation = useMutation({
    mutationFn: (values) => profileApi.changePassword(values),
    onSuccess: (result) => {
      toast.success(result.message);
      password.reset();
    },
    onError: (error) => {
      if (!applyServerErrors(error, password.setError)) toast.error(error.message);
    },
  });

  /* ---------- images ---------- */
  const saveImage = async (action, message) => {
    const { user: saved } = await action();
    setUser(saved);
    toast.success(message);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="My profile" description="Your details, signature and password." />

      <Card>
        <CardHeader icon={UserCircle} title="Personal details" description="Your name and designation appear under your signature on documents." />
        <CardBody>
          <form noValidate onSubmit={details.handleSubmit((values) => detailsMutation.mutate(values))} className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" required error={details.formState.errors.name?.message} {...details.register('name')} />
            <Input label="Designation" placeholder="e.g. CEO" error={details.formState.errors.designation?.message} {...details.register('designation')} />
            <Input label="Email" type="email" required error={details.formState.errors.email?.message} {...details.register('email')} />
            <Input label="Phone" error={details.formState.errors.phone?.message} {...details.register('phone')} />
            <div className="sm:col-span-2">
              <Button type="submit" loading={detailsMutation.isPending}>
                Save details
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={PenLine} title="Signature and stamp" description="Used on invoices, receipts and letters you create or send." />
        <CardBody className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-info-soft px-4 py-3 text-sm text-info">
            <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Sign on plain white paper, take a clear photo, and remove the background (any free "remove background" tool works). A PNG with a
              transparent background looks best on documents. Maximum size 2 MB.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <FileUpload
                label="Signature"
                currentUrl={user.signatureUrl}
                onUpload={(file) => saveImage(() => profileApi.uploadImage('signature', file), 'Signature saved')}
                onRemove={() => saveImage(() => profileApi.removeImage('signature'), 'Signature removed')}
              />
              <FileUpload
                label="Personal stamp (optional)"
                hint="Used only when the company stamp is turned off in Settings."
                currentUrl={user.stampUrl}
                onUpload={(file) => saveImage(() => profileApi.uploadImage('stamp', file), 'Stamp saved')}
                onRemove={() => saveImage(() => profileApi.removeImage('stamp'), 'Stamp removed')}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">Preview on documents</p>
              <SignaturePreview user={user} companyName={branding.companyName} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={KeyRound} title="Change password" description="You stay logged in here; other devices are logged out." />
        <CardBody>
          <form noValidate onSubmit={password.handleSubmit((values) => passwordMutation.mutate(values))} className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={password.formState.errors.currentPassword?.message}
              {...password.register('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={password.formState.errors.newPassword?.message}
              {...password.register('newPassword')}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={password.formState.errors.confirmPassword?.message}
              {...password.register('confirmPassword')}
            />
            <div className="sm:col-span-3">
              <Button type="submit" loading={passwordMutation.isPending}>
                Change password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}