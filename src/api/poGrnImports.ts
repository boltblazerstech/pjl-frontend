import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

/** One import batch — returned by GET /api/po-grn-imports */
export interface PoGrnImportBatch {
  id: string | number;
  importedAt: string;
  importedBy?: string;
  fileName: string;       // backend field name
  rowsInserted: number;   // backend field name
  rowsUpdated: number;    // backend field name
  distinctPos?: number;   // backend field name
  submissionsResolved?: number;
  // also accept the old camelCase variants defensively
  rowsRead?: number;
  inserted?: number;
  updated?: number;
  filename?: string;
}

/** Result of a POST /api/po-grn-imports upload */
export interface PoGrnImportResult extends PoGrnImportBatch {
  message?: string;
  skippedReasons?: string[];
  skipped?: number;
}

/** One data row from the po_grn_line table — returned by GET /api/po-grn-lines */
export interface PoGrnLine {
  id: string | number;
  batchId?: string | number;
  poNumber: string;
  itemCode?: string;
  itemDesc?: string;
  acceptedQty?: number | null;
  orderedQty?: number | null;
  unitPrice?: number | null;
  uom?: string;
  grnNumber?: string;
  grnDate?: string;
  vendorCode?: string;
  vendorName?: string;
  // catch-all for any extra fields the backend returns
  [key: string]: unknown;
}

export interface PagedPoGrnLines {
  content: PoGrnLine[];
  totalElements: number;
  totalPages: number;
  number: number;   // 0-indexed current page
  size: number;
}

export interface ListLinesParams {
  batchId?: string | number;
  search?: string;
  page?: number;   // 0-indexed (Spring)
  size?: number;
  sort?: string;
}

// ── Normaliser ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normaliseBatch(raw: any): PoGrnImportBatch {
  return {
    id: raw.id ?? '',
    importedAt: raw.importedAt ?? raw.imported_at ?? raw.createdAt ?? raw.created_at ?? '',
    importedBy: raw.importedBy ?? raw.imported_by,
    fileName: raw.fileName ?? raw.filename ?? raw.file_name ?? '',
    rowsInserted: raw.rowsInserted ?? raw.rows_inserted ?? raw.inserted ?? 0,
    rowsUpdated: raw.rowsUpdated ?? raw.rows_updated ?? raw.updated ?? 0,
    distinctPos: raw.distinctPos ?? raw.distinct_pos,
    submissionsResolved: raw.submissionsResolved ?? raw.submissions_resolved,
    rowsRead: raw.rowsRead ?? raw.rows_read,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const poGrnImportsApi = {
  /**
   * Upload an Excel file to import PO/GRN data.
   * POST /api/po-grn-imports   multipart field: "file"
   */
  async upload(file: File): Promise<PoGrnImportResult> {
    const form = new FormData();
    form.append('file', file);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.postForm<any>('/po-grn-imports', form);
    return normaliseBatch(raw) as PoGrnImportResult;
  },

  /**
   * List past import batches.
   * GET /api/po-grn-imports
   */
  async list(): Promise<PoGrnImportBatch[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.get<any>('/po-grn-imports');
    const arr: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.content)
        ? raw.content
        : Array.isArray(raw.data)
          ? raw.data
          : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return arr.map((b: any) => normaliseBatch(b));
  },

  /**
   * List paginated PO/GRN line rows.
   * GET /api/po-grn-lines
   */
  async listLines(params: ListLinesParams = {}): Promise<PagedPoGrnLines> {
    const qs = new URLSearchParams();
    if (params.batchId != null) qs.set('batchId', String(params.batchId));
    if (params.search) qs.set('search', params.search);
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 20));
    qs.set('sort', params.sort ?? 'id,desc');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.get<any>(`/po-grn-lines?${qs.toString()}`);

    // Normalise Spring Page envelope
    if (raw && Array.isArray(raw.content)) {
      return {
        content: raw.content as PoGrnLine[],
        totalElements: raw.totalElements ?? raw.content.length,
        totalPages: raw.totalPages ?? 1,
        number: raw.number ?? 0,
        size: raw.size ?? params.size ?? 20,
      };
    }
    // Plain array fallback
    if (Array.isArray(raw)) {
      return { content: raw as PoGrnLine[], totalElements: raw.length, totalPages: 1, number: 0, size: raw.length };
    }
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };
  },
};
