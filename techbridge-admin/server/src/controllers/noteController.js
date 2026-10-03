import * as NoteService from '../services/NoteService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await NoteService.listNotes(req.validated.query));
});

export const create = asyncHandler(async (req, res) => {
  const note = await NoteService.createNote(req.body, req.user);
  res.status(201).json({ note });
});

export const update = asyncHandler(async (req, res) => {
  const note = await NoteService.updateNote(req.params.id, req.body);
  res.json({ note });
});

export const remove = asyncHandler(async (req, res) => {
  await NoteService.deleteNote(req.params.id);
  res.json({ message: 'Note deleted' });
});