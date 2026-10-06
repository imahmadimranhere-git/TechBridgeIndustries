import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { usersApi } from '../../api/endpoints.js';
import UserFormModal from '../../components/forms/UserFormModal.jsx';
import UserImagesModal from '../../components/forms/UserImagesModal.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Table from '../../components/ui/Table.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { formatDate } from '../../utils/formatDate.js';

export default function UsersPage() {
  usePageTitle('Admin users');
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [form, setForm] = useState({ open: false, user: null });
  const [imagesFor, setImagesFor] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list({ limit: 100 }) });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('Admin deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  });

  const users = usersQuery.data?.items ?? [];
  // Keep the images modal in sync after an upload
  const imagesUser = imagesFor ? users.find((user) => user._id === imagesFor._id) ?? imagesFor : null;

  const columns = [
    {
      key: 'name',
      header: 'Admin',
      render: (user) => (
        <div>
          <p className="flex items-center gap-2 font-medium text-gray-900">
            {user.name}
            {user._id === me?._id && <Badge tone="brand">You</Badge>}
            {user.isDefaultSignatory && <Badge tone="purple">Default signatory</Badge>}
          </p>
          <p className="text-xs text-gray-500">{user.designation || 'Admin'}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'signature',
      header: 'Signature',
      render: (user) =>
        user.signatureUrl ? (
          <img src={user.signatureUrl} alt={`${user.name} signature`} className="h-8 max-w-[120px] object-contain" />
        ) : (
          <span className="text-xs text-gray-400">Not uploaded</span>
        ),
    },
    { key: 'lastLogin', header: 'Last login', render: (user) => (user.lastLoginAt ? formatDate(user.lastLoginAt, 'dd MMM yyyy, hh:mm a') : 'Never') },
    { key: 'status', header: 'Status', render: (user) => <Badge tone={user.isActive ? 'success' : 'neutral'} dot>{user.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (user) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" icon={ImagePlus} aria-label={`Signature and stamp of ${user.name}`} className="px-2" onClick={() => setImagesFor(user)} />
          <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Edit ${user.name}`} className="px-2" onClick={() => setForm({ open: true, user })} />
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            aria-label={`Delete ${user.name}`}
            className="px-2 text-danger"
            disabled={user._id === me?._id}
            title={user._id === me?._id ? 'You cannot delete your own account' : undefined}
            onClick={() => setToDelete(user)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admin users"
        description="People who can log in to this panel. Staff and clients never log in."
        actions={
          <Button icon={Plus} onClick={() => setForm({ open: true, user: null })}>
            Add admin
          </Button>
        }
      />

      <Table
        caption="Admin users"
        columns={columns}
        rows={users}
        loading={usersQuery.isLoading}
        emptyState={<EmptyState icon={ShieldCheck} title="No admins" />}
      />

      <UserFormModal open={form.open} user={form.user} onClose={() => setForm({ open: false, user: null })} />
      <UserImagesModal user={imagesUser} onClose={() => setImagesFor(null)} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        loading={deleteMutation.isPending}
        title={toDelete ? `Delete ${toDelete.name}?` : ''}
        message="Admins who have signed documents cannot be deleted, so old PDFs keep their signer. Deactivate them instead."
        confirmLabel="Delete admin"
      />
    </div>
  );
}