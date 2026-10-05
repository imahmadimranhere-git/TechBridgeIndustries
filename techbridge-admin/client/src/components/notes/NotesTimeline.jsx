import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Plus, StickyNote, Trash2 } from 'lucide-react';
import { notesApi } from '../../api/endpoints.js';
import { noteSchema } from '../../schemas/noteSchemas.js';
import { applyServerErrors } from '../../utils/formErrors.js';
import { formatDate, toDateInput } from '../../utils/formatDate.js';
import Button from '../ui/Button.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Spinner from '../ui/Spinner.jsx';
import Textarea from '../ui/Textarea.jsx';

const FORM_ID = 'note-form';

function NoteFormModal({ open, note, onClose, onSubmit, saving }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(noteSchema) });

  useEffect(() => {
    if (open) {
      reset({ title: note?.title ?? '', body: note?.body ?? '', date: toDateInput(note?.date ?? new Date()) });
    }
  }, [open, note, reset]);

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={note?._id ? 'Edit note' : 'Add note'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Save note
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          try {
            await onSubmit(values);
          } catch (error) {
            if (!applyServerErrors(error, setError)) toast.error(error.message);
          }
        })}
      >
        <Input label="Title" required error={errors.title?.message} {...register('title')} />
        <Input label="Date" type="date" required error={errors.date?.message} {...register('date')} />
        <Textarea label="Note" rows={5} error={errors.body?.message} {...register('body')} />
      </form>
    </Modal>
  );
}

/** Notes for a Client, Staff member or Deal, shown as a timeline */
export default function NotesTimeline({ notableType, notableId }) {
  const queryClient = useQueryClient();
  const queryKey = ['notes', notableType, notableId];
  const [editing, setEditing] = useState(null); // null = closed, {} = new note, note = edit
  const [toDelete, setToDelete] = useState(null);

  const notesQuery = useQuery({
    queryKey,
    queryFn: () => notesApi.list({ notableType, notableId, limit: 100 }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing?._id ? notesApi.update(editing._id, values) : notesApi.create({ ...values, notableType, notableId }),
    onSuccess: () => {
      toast.success(editing?._id ? 'Note updated' : 'Note added');
      setEditing(null);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notesApi.remove(id),
    onSuccess: () => {
      toast.success('Note deleted');
      setToDelete(null);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const notes = notesQuery.data?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
        <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
          Add note
        </Button>
      </div>

      {notesQuery.isLoading ? (
        <div className="flex justify-center py-10 text-brand">
          <Spinner />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState compact icon={StickyNote} title="No notes yet" description="Keep track of calls, promises and decisions here." />
      ) : (
        <ol className="relative space-y-6 border-l border-gray-200 pl-6">
          {notes.map((note) => (
            <li key={note._id} className="relative">
              <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-brand ring-4 ring-white" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{note.title}</p>
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
              {note.body && <p className="mt-2 text-sm whitespace-pre-line text-gray-700">{note.body}</p>}
            </li>
          ))}
        </ol>
      )}

      <NoteFormModal
        open={editing !== null}
        note={editing}
        onClose={() => setEditing(null)}
        onSubmit={(values) => saveMutation.mutateAsync(values)}
        saving={saveMutation.isPending}
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