import { format as csvFormat } from 'fast-csv';
import * as ReportService from '../services/ReportService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const show = asyncHandler(async (req, res) => {
  res.json(await ReportService.getReport(req.validated.query));
});

// Streams the CSV row by row instead of building one big string in memory
export const exportCsv = asyncHandler(async (req, res) => {
  const { rows, filename } = await ReportService.buildCsvExport(req.validated.query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // writeBOM lets Excel open UTF-8 (e.g. names with accents) correctly
  const stream = csvFormat({ headers: true, writeBOM: true });
  stream.pipe(res);
  for (const row of rows) stream.write(row);
  stream.end();
});