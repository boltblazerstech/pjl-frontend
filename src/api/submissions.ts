import { apiClient } from './client';
import type {
  PaginatedSubmissions,
  SubmissionSummary,
  SubmissionDetail,
  Exception,
  SubmissionStatus,
  OverrideRequest,
  OverrideResponse,
} from '../types';

export interface ListSubmissionsParams {
  page?: number;
  pageSize?: number;
  status?: SubmissionStatus | '';
}

/**
 * The backend may return either:
 *   • A plain array:       SubmissionSummary[]
 *   • A paginated envelope: { data: SubmissionSummary[], total, page, pageSize }
 *   • Spring Page wrapper:  { content: SubmissionSummary[], totalElements, ... }
 *
 * This normalises any of those shapes into PaginatedSubmissions so the
 * component always has result.data as a guaranteed array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalisePage(raw: any, fallbackPage: number): PaginatedSubmissions {
  // Plain array
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length, page: fallbackPage, pageSize: raw.length };
  }
  // Spring Page: { content, totalElements, number, size }
  if (Array.isArray(raw.content)) {
    return {
      data: raw.content,
      total: raw.totalElements ?? raw.content.length,
      page: (raw.number ?? fallbackPage - 1) + 1,
      pageSize: raw.size ?? raw.content.length,
    };
  }
  // Our own envelope: { data, total, page, pageSize }
  if (Array.isArray(raw.data)) {
    return {
      data: raw.data,
      total: raw.total ?? raw.data.length,
      page: raw.page ?? fallbackPage,
      pageSize: raw.pageSize ?? raw.data.length,
    };
  }
  // Unknown shape — surface an empty page rather than crashing
  console.warn('[submissionsApi] Unrecognised list response shape:', raw);
  return { data: [], total: 0, page: fallbackPage, pageSize: 0 };
}

export function normaliseRow(raw: any): SubmissionSummary {
  return {
    id: String(raw.id),
    status: raw.status,
    categoryId: String(raw.categoryId ?? raw.category_id ?? ''),
    categoryName: raw.categoryName ?? raw.category_name ?? raw.categoryId ?? '',
    submittedAt: raw.uploadedAt ?? raw.submittedAt ?? raw.submitted_at ?? raw.createdAt ?? raw.created_at ?? raw.createdDate ?? raw.created_date ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseDetail(raw: any): SubmissionDetail {
  return {
    id: String(raw.id),
    status: raw.status,
    categoryId: String(raw.categoryId ?? raw.category_id ?? ''),
    categoryName: raw.categoryName ?? raw.category_name ?? raw.categoryId ?? '',
    submittedAt: raw.uploadedAt ?? raw.submittedAt ?? raw.submitted_at ?? raw.createdAt ?? raw.created_at ?? raw.createdDate ?? raw.created_date ?? '',
    overrideReason: raw.reviewerNotes ?? raw.overrideReason ?? raw.override_reason,
    overriddenBy: raw.overriddenBy ?? raw.overridden_by,
    warrantyStatus: raw.warrantyStatus ?? raw.warranty_status,
    extractedDocuments: (raw.documents ?? raw.extractedDocuments ?? raw.extracted_documents ?? []).map((doc: any) => ({
      documentType: doc.docType ?? doc.documentType ?? doc.document_type ?? 'Document',
      fields: doc.fields ?? {},
      lineItems: (doc.lineItems ?? doc.line_items ?? []).map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? item.unit_price,
        amount: item.amount,
      })),
    })),
    exceptions: (raw.exceptions ?? []).map((ex: any): Exception => {
      // New shape: { id, action, detail: "[CALC_MISMATCH] Invoice line #1: ...", actor, createdAt }
      if (ex.detail !== undefined) {
        const match = /^\[([^\]]+)\]\s*(.*)$/s.exec(ex.detail ?? '');
        return {
          code:   match ? match[1] : (ex.action ?? 'EXCEPTION'),
          reason: match ? match[2].trim() : (ex.detail ?? ''),
          id:       String(ex.id ?? ''),
          action:   ex.action,
          actor:    ex.actor,
          createdAt: ex.createdAt ?? ex.created_at,
        };
      }
      // Old shape: { code, reason, documentType }
      return {
        code:         ex.code ?? 'EXCEPTION',
        reason:       ex.reason ?? '',
        documentType: ex.documentType ?? ex.document_type,
      };
    }),
    auditTrail: (raw.auditLogs ?? raw.auditTrail ?? raw.audit_trail ?? []).map((entry: any) => ({
      id: String(entry.id ?? Math.random()),
      timestamp: entry.createdAt ?? entry.timestamp ?? entry.created_at ?? new Date().toISOString(),
      action: entry.action,
      actor: entry.actor,
      detail: entry.detail,
    })),
    matchedLineItems: (raw.matchedLineItems ?? raw.matched_line_items ?? raw.lineMatches ?? []).map((item: any) => ({
      description:    item.description ?? item.itemDescription ?? item.item_description ?? '',
      invoiceQty:     item.invoiceQuantity ?? item.invoiceQty    ?? item.invoice_qty    ?? null,
      invoiceRate:    item.invoiceRate     ?? item.invoice_rate   ?? null,
      invoiceAmount:  item.invoiceAmount   ?? item.invoice_amount ?? null,
      poQty:          item.poQuantity      ?? item.poQty          ?? item.po_qty         ?? null,
      poRate:         item.poRate          ?? item.po_rate         ?? null,
      grnAcceptedQty: item.grnAcceptedQuantity ?? item.grnAcceptedQty ?? item.grn_accepted_qty ?? item.grnQty ?? null,
      exception:      item.exception ?? item.exceptionReason ?? item.exception_reason ?? null,
    })),
  };
}

export const submissionsApi = {
  async list(params: ListSubmissionsParams = {}): Promise<PaginatedSubmissions> {
    const query = new URLSearchParams();
    if (params.page != null) {
      // Spring Data Pageable is 0-indexed, but our UI is 1-indexed.
      query.set('page', String(Math.max(0, params.page - 1)));
    }
    if (params.pageSize != null) query.set('size', String(params.pageSize));
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.get<any>(`/submissions${qs ? `?${qs}` : ''}`);
    const page = normalisePage(raw, params.page ?? 1);
    return { ...page, data: page.data.map(normaliseRow) };
  },

  async getById(id: string): Promise<SubmissionDetail> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.get<any>(`/submissions/${id}`);
    return normaliseDetail(raw);
  },

  /**
   * Submit a new submission as multipart/form-data.
   * Each document type may have multiple files (pages).
   * All files for a type are appended under the same lowercase key so the
   * backend can collect them as a list.
   */
  async create(categoryId: string, files: Record<string, File[]>, saveAsGroup?: boolean, groupName?: string): Promise<SubmissionDetail> {
    const form = new FormData();
    form.append('billCategoryId', categoryId);
    if (saveAsGroup !== undefined) {
      form.append('saveAsGroup', String(saveAsGroup));
    }
    if (groupName) {
      form.append('groupName', groupName);
    }
    for (const [docType, fileList] of Object.entries(files)) {
      let key = docType.trim().toLowerCase();
      
      // Force exact key names required by the backend in case the category
      // document types have unexpected formatting or extra words.
      if (key.includes('invoice')) key = 'invoice';
      else if (key.includes('po') || key.includes('purchase')) key = 'po';
      else if (key.includes('grn') || key.includes('goods')) key = 'grn';

      for (const file of fileList) {
        form.append(key, file);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.postForm<any>('/submissions', form);
    return normaliseDetail(raw);
  },

  /**
   * Replace a single document file on an existing submission.
   * PATCH /api/submissions/{id}/files with the file under its exact key (invoice/po/grn).
   */
  async replaceFile(id: string, docType: string, file: File): Promise<SubmissionDetail> {
    const form = new FormData();
    let key = docType.trim().toLowerCase();
    if (key.includes('invoice')) key = 'invoice';
    else if (key.includes('po') || key.includes('purchase')) key = 'po';
    else if (key.includes('grn') || key.includes('goods')) key = 'grn';
    form.append(key, file);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.patchForm<any>(`/submissions/${id}/files`, form);
    return normaliseDetail(raw);
  },

  /**
   * Re-run verification on an existing submission.
   * POST /api/submissions/{id}/rerun — returns the updated submission.
   */
  async rerun(id: string): Promise<SubmissionDetail> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.post<any>(`/submissions/${id}/rerun`, {});
    return normaliseDetail(raw);
  },

  override(id: string, payload: OverrideRequest): Promise<OverrideResponse> {
    return apiClient.post<OverrideResponse>(`/submissions/${id}/override`, payload);
  },
};
