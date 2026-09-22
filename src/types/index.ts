// ─── Bill Categories ─────────────────────────────────────────────────────────

export interface BillCategory {
  id: string;
  name: string;
  description?: string;
  /** Each entry drives one mandatory upload field on the submission form */
  requiredDocumentTypes: string[];
}

// ─── Submission list / pagination ────────────────────────────────────────────

export type SubmissionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXCEPTION'
  | 'OVERRIDDEN'
  | 'FAILED'
  | 'GREEN'
  | 'AMBER'
  | 'RED';

export interface SubmissionSummary {
  id: string;
  status: SubmissionStatus;
  categoryId: string;
  categoryName: string;
  submittedAt: string;
  supplierName?: string | null;
  invoiceNo?: string | null;
}

export interface PaginatedSubmissions {
  data: SubmissionSummary[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Submission detail ────────────────────────────────────────────────────────

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

export interface ExtractedDocument {
  /** e.g. "Invoice", "PO", "GRN" */
  documentType: string;
  /** Original uploaded filename, e.g. "Invoice-9.pdf" */
  originalFilename?: string | null;
  fields: Record<string, string | number | null>;
  lineItems?: LineItem[];
}

export interface Exception {
  /** Rule code — from `code` field or parsed from `[CODE] ...` in `detail` */
  code: string;
  /** Human-readable reason — from `reason` field or the text after `[CODE]` in `detail` */
  reason: string;
  documentType?: string;
  // Fields present when the backend sends exceptions shaped like audit-log entries
  id?: string;
  action?: string;
  actor?: string;
  createdAt?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface MatchedLineItem {
  description: string;
  invoiceQty?: number | null;
  invoiceRate?: number | null;
  invoiceAmount?: number | null;
  poQty?: number | null;
  poRate?: number | null;
  grnAcceptedQty?: number | null;
  /** Present when this line has a validation exception */
  exception?: string | null;
}

export interface SubmissionDetail {
  id: string;
  status: SubmissionStatus;
  categoryId: string;
  categoryName: string;
  submittedAt: string;
  extractedDocuments: ExtractedDocument[];
  exceptions: Exception[];
  auditTrail: AuditEntry[];
  matchedLineItems: MatchedLineItem[];
  warrantyStatus?: string;
  overriddenBy?: string;
  overrideReason?: string;
  overrideStatus?: string;
}

// ─── Override ─────────────────────────────────────────────────────────────────

export interface OverrideRequest {
  newStatus: SubmissionStatus;
  reason: string;
}

export interface OverrideResponse {
  success: boolean;
  submission: SubmissionDetail;
  message?: string;
}
