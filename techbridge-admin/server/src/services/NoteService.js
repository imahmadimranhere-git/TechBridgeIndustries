import { Client, Deal, Note, Staff } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import { searchFilter } from '../utils/search.js';

const NOTABLE_MODELS = { Client, Staff, Deal };

async function findNoteOrThrow(id) {
  const note = await Note.findById(id);
  if (!note) throw ApiError.notFound('Note not found');
  return note;
}

export function listNotes({ page, limit, search, notableType, notableId }) {
  const filter = { ...searchFilter(search, ['title', 'body']) };
  if (notableType) filter.notableType = notableType;
  if (notableId) filter.notableId = notableId;

  return paginate(Note, filter, {
    page,
    limit,
    sort: { date: -1, _id: -1 },
    populate: [
      { path: 'notableId', select: 'name title' },
      { path: 'createdBy', select: 'name' },
    ],
  });
}

export async function createNote(data, user) {
  const Model = NOTABLE_MODELS[data.notableType];
  if (!(await Model.exists({ _id: data.notableId }))) {
    throw ApiError.badRequest(`${data.notableType} not found`, { notableId: 'Record not found' });
  }
  return Note.create({ ...data, date: data.date ?? new Date(), createdBy: user._id });
}

export async function updateNote(id, data) {
  const note = await findNoteOrThrow(id);
  note.set({ title: data.title, body: data.body, date: data.date ?? note.date });
  await note.save();
  return note;
}

export async function deleteNote(id) {
  const note = await findNoteOrThrow(id);
  await note.deleteOne();
}