import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../ui/Button.jsx';
import FileUpload from '../ui/FileUpload.jsx';
import Modal from '../ui/Modal.jsx';

/** Signature and personal stamp of any admin */
export default function UserImagesModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const { user: me, setUser } = useAuth();

  async function run(action, message) {
    const { user: saved } = await action();
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ['users'] });
    if (saved._id === me?._id) setUser(saved);
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      size="lg"
      title={user ? `Signature and stamp: ${user.name}` : ''}
      description="Shown in the signatory block of documents this admin signs."
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {user && (
        <div className="space-y-6">
          <FileUpload
            label="Signature"
            currentUrl={user.signatureUrl}
            onUpload={(file) => run(() => usersApi.uploadImage(user._id, 'signature', file), 'Signature saved')}
            onRemove={() => run(() => usersApi.removeImage(user._id, 'signature'), 'Signature removed')}
          />
          <FileUpload
            label="Personal stamp (optional)"
            hint="Used only when the company stamp is turned off. Transparent PNG, max 2 MB."
            currentUrl={user.stampUrl}
            onUpload={(file) => run(() => usersApi.uploadImage(user._id, 'stamp', file), 'Stamp saved')}
            onRemove={() => run(() => usersApi.removeImage(user._id, 'stamp'), 'Stamp removed')}
          />
        </div>
      )}
    </Modal>
  );
}