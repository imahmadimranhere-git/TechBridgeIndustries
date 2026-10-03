import { removeUpload } from '../middleware/upload.js';
import {
  CommissionPayout,
  DocumentVerification,
  Invoice,
  Payment,
  User,
  WelcomeLetterLog,
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import { searchFilter } from '../utils/search.js';
import { serializeUser } from '../utils/serializers.js';
import { getSettings, updateSettings } from './SettingsService.js';

const IMAGE_FIELDS = { signature: 'signaturePath', stamp: 'stampPath' };

export async function findUserOrThrow(id, { withPassword = false } = {}) {
  const query = User.findById(id);
  if (withPassword) query.select('+password');
  const user = await query;
  if (!user) throw ApiError.notFound('Admin user not found');
  return user;
}

async function assertEmailFree(email, exceptId = null) {
  const filter = { email };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await User.exists(filter)) {
    throw ApiError.conflict('Another admin already uses this email', { email: 'Email already in use' });
  }
}

/* ---------------- admin users ---------------- */

export async function listUsers({ page, limit, search }) {
  const { items, pagination } = await paginate(User, searchFilter(search, ['name', 'email', 'designation']), {
    page,
    limit,
    sort: { name: 1, _id: 1 },
  });
  const { defaultSignatoryId } = await getSettings();

  return {
    items: items.map((user) => ({
      ...serializeUser(user),
      isDefaultSignatory: String(user._id) === String(defaultSignatoryId),
    })),
    pagination,
  };
}

export async function getUser(id) {
  return serializeUser(await findUserOrThrow(id));
}

export async function createUser(data) {
  await assertEmailFree(data.email);
  const user = await User.create(data);
  return serializeUser(user);
}

export async function updateUser(id, data, actingUser) {
  const user = await findUserOrThrow(id);
  const isSelf = String(user._id) === String(actingUser._id);
  if (isSelf && data.isActive === false) {
    throw ApiError.badRequest('You cannot deactivate your own account', { isActive: 'Not allowed for yourself' });
  }
  await assertEmailFree(data.email, user._id);

  const { password, ...fields } = data;
  user.set(fields);
  // Setting a new password also logs that admin out everywhere (passwordChangedAt)
  if (password) user.password = password;
  await user.save();
  return serializeUser(user);
}

export async function deleteUser(id, actingUser) {
  if (String(id) === String(actingUser._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await findUserOrThrow(id);

  const signedSomething = await Promise.all([
    Invoice.exists({ signedBy: user._id, deletedAt: { $exists: true } }),
    Payment.exists({ signedBy: user._id }),
    CommissionPayout.exists({ signedBy: user._id }),
    WelcomeLetterLog.exists({ signedBy: user._id }),
    DocumentVerification.exists({ signedBy: user._id }),
  ]);
  if (signedSomething.some(Boolean)) {
    throw ApiError.conflict(
      'This admin has signed documents, so the account cannot be deleted (old PDFs must keep their signer). Deactivate it instead.'
    );
  }

  const { defaultSignatoryId } = await getSettings();
  if (String(defaultSignatoryId) === String(user._id)) {
    await updateSettings({ defaultSignatoryId: String(actingUser._id) });
  }

  await user.deleteOne();
  await Promise.all([removeUpload(user.signaturePath), removeUpload(user.stampPath)]);
}

/* ---------------- signature / stamp images ---------------- */

export async function setUserImage(userId, kind, relativePath) {
  const user = await findUserOrThrow(userId);
  const field = IMAGE_FIELDS[kind];
  const oldPath = user[field];

  user[field] = relativePath;
  await user.save({ validateBeforeSave: false });

  // Remove the replaced file only after the database points to the new one
  if (oldPath && oldPath !== relativePath) await removeUpload(oldPath);
  return serializeUser(user);
}

export const removeUserImage = (userId, kind) => setUserImage(userId, kind, null);

/* ---------------- my profile ---------------- */

export async function updateProfile(userId, data) {
  const user = await findUserOrThrow(userId);
  await assertEmailFree(data.email, user._id);
  user.set(data);
  await user.save();
  return serializeUser(user);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await findUserOrThrow(userId, { withPassword: true });
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect', { currentPassword: 'Current password is incorrect' });
  }
  user.password = newPassword;
  await user.save();
  return user;
}