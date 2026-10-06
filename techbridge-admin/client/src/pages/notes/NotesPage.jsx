import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Plus, Search, StickyNote, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { notesApi } from '../../api/endpoints.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { NoteFormModal } from '../../components/notes/NotesTimeline.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchSelect from '../../components/ui/SearchSelect.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClientOptions, useDealOptions, useStaffOptions } from '../../hooks/useOptions.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { noteSchema } from '../../schemas/noteSchemas.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import { formatDate, toDateInput } from '../../utils/formatDate.js';

const TYPES = ['Client', 'Staff', 'Deal'];
const TYPE_TONES = { Client: 'info', Staff: 'purple', Deal: 'warning' };
const LINKS = { Client: '/clients', Staff: '/staff', Deal: '/deals' };
const NEW_FORM_ID = 'new-note-form';

const newNoteSchema = noteSchema.extend({
  notableType: z.enum(TYPES),
  notableId: z.string().min(1, 'Choose who this note is about'),
});

/** New note for any client, staff member or deal */
function NewNoteModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(newNoteSchema) });

  useEffect(() => {
    if (open) reset({ notableType: 'Client', notableId: '', title: '', body: '', date: toDateInput(new Date()) });
  }, [open, reset]);

  const notableType = useWatch({ control, name: 'notableType' });
  const clients = useClientOptions(debouncedSearch, { enabled: open && notableType === 'Client' });
  const staff = useStaffOptions({ enabled: open && notableType === 'Staff' });
  const deals = useDealOptions({ search: debouncedSearch }, { enabled: open && notableType === 'Deal' });

  const options = {
    Client: (clients.data ?? []).map((item) => ({ value: item._id, label: item.name, description: item.companyName })),
    Staff: (staff.data ?? []).map((item) => ({ value: item._id, label: item.name })),
    Deal: (deals.data ?? []).map((item) => ({ value: item._id, label: item.title, description: item.client?.companyName || item.client?.name })),
  }[notableType ?? 'Client'];

  const mutation = useMutation({
    mutationFn: (values) => notesApi.create(values),
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (error) => {
      if (!applyServerErrors(error, setError)) toast.error(error.message);
    },
  });

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => {} : onClose}
      title="Add note"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={NEW_FORM_ID} loading={mutation.isPending}>
            Save note
          </Button>
        </>
      }
    >
      <form id={NEW_FORM_ID} noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="About a"
            options={TYPES.map((type) => ({ value: type, label: type }))}
            {...register('notableType', {
              onChange: () => {
                setValue('notableId', '');
                setSearch('');
              },
            })}
          />
          <Controller
            control={control}
            name="notableId"
            render={({ field }) => (
              <SearchSelect
                label={notableType ?? 'Record'}
                required
                className="sm:col-span-2"
                options={options}
                value={field.value}
                onChange={field.onChange}
                onQueryChange={notableType === 'Staff' ? undefined : setSearch}
                placeholder={`Search ${(notableType ?? '').toLowerCase()}`}
                error={errors.notableId?.message}
              />
            )}
          />
        </div>
        <Input label="Title" required error={errors.title?.message} {...register('title')} />
        <Input label="Date" type="date" required error={errors.date?.message} {...register('date')} />
        <Textarea label="Note" rows={5} error={errors.body?.message} {...register('body')} />
      </form>
    </Modal>
  );
}

export default function NotesPage() {
  usePageTitle('Notes');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => setPage(1), [debouncedSearch, type]);

  const params = { page, limit: 20, search: debouncedSearch, notableType: type };
  const notesQuery = useQuery({
    queryKey: ['notes', 'all', params],
    queryFn: () => notesApi.list(params),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const updateMutation = useMutation({
    mutationFn: (values) => notesApi.update(editing._id, values),
    onSuccess: () => {
      toast.success('Note updated');
      setEditing(null);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notesApi.remove(id),
    onSuccess: () => {
      toast.success('Note deleted');
      refresh();
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setToDelete(null),
  });

  const data = notesQuery.data;
  const notes = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Everything written about clients, staff and deals."
        actions={
          <Button icon={Plus} onClick={() => setNewOpen(true)}>
            Add note
          </Button>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <Input
          aria-label="Search notes"
          placeholder="Search title or text"
          leftIcon={Search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:col-span-2"
        />
        <Select
          aria-label="About"
          placeholder="Clients, staff and deals"
          options={TYPES.map((value) => ({ value, label: `${value}s` }))}
          value={type}
          onChange={(event) => setType(event.target.value)}
        />
      </div>

      {notesQuery.isLoading ? (
        <div className="flex justify-center py-16 text-brand">
          <Spinner className="size-6" />
        </div>
      ) : notes.length === 0 ? (
        <div className="card">
          <EmptyState icon={StickyNote} title="No notes found" description="Notes added on client, staff and deal pages also appear here." />
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const about = note.notableId;
            return (
              <li key={note._id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={TYPE_TONES[note.notableType]}>{note.notableType}</Badge>
                      {about ? (
                        <Link to={`${LINKS[note.notableType]}/${about._id}`} className="text-sm font-medium text-gray-700 hover:text-brand">
                          {about.name ?? about.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">Record removed</span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-gray-900">{note.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(note.date)}
                      {note.createdBy?.name ? ` · ${note.createdBy.name}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" icon={Pencil} aria-label="Edit note" className="px-2" onClick={() => setEditing(note)} />
                    <Button size="sm" variant="ghost" icon={Trash2} aria-label="Delete note" className="px-2 text-danger" onClick={() => setToDelete(note)} />
                  </div>
                </div>
                {note.body && <p className="mt-3 text-sm whitespace-pre-line text-gray-700">{note.body}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {data?.pagination && <Pagination className="mt-4" {...data.pagination} onPageChange={setPage} />}

      <NewNoteModal open={newOpen} onClose={() => setNewOpen(false)} />

      <NoteFormModal
        open={Boolean(editing)}
        note={editing}
        onClose={() => setEditing(null)}
        onSubmit={(values) => updateMutation.mutateAsync(values)}
        saving={updateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete._id)}
        loading={deleteMutation.isPending}
        title="Delete this note?"
        message={toDelete ? `"${toDelete.title}" will be removed permanently.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}