import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submissionsApi } from '../api/submissions';
import StatusBadge from '../components/StatusBadge';
import type {
  SubmissionDetail,
  MatchedLineItem,
  ExtractedDocument,
  Exception,
  AuditEntry,
  SubmissionStatus,
} from '../types';

// ── Status options available for override ──────────────────────────────────
const OVERRIDE_STATUSES: SubmissionStatus[] = [
  'APPROVED',
  'REJECTED',
  'OVERRIDDEN',
];

const TERMINAL_STATUSES: SubmissionStatus[] = [
  'GREEN', 'AMBER', 'RED', 'FAILED', 'APPROVED', 'REJECTED', 'OVERRIDDEN', 'COMPLETED',
];

function formatDate(iso: string) {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Renders one extracted document card with fields + optional line-items table */
function ExtractedDocCard({
  doc,
  submissionId,
  onReplaced,
}: {
  doc: ExtractedDocument;
  submissionId: string;
  onReplaced: (updated: SubmissionDetail) => void;
}) {
  const [replacing, setReplacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setReplacing(true);
    setSuccess(false);
    setError(null);
    try {
      const updated = await submissionsApi.replaceFile(submissionId, doc.documentType, file);
      onReplaced(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to replace file.');
    } finally {
      setReplacing(false);
    }
  };

  // Separate scalar fields from arrays so they render cleanly
  const scalarFields = Object.entries(doc.fields).filter(
    ([, v]) => v !== null && v !== '' && !Array.isArray(v),
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Card header with Replace button */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{doc.documentType}</h4>
        <div className="flex items-center gap-2">
          {success && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Replaced
            </span>
          )}
          {error && (
            <span className="text-xs text-red-600 truncate max-w-48">{error}</span>
          )}
          <button
            type="button"
            disabled={replacing}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {replacing ? (
              <>
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Replace file
              </>
            )}
          </button>
          <input
            type="file"
            accept=".pdf,image/*"
            ref={inputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Scalar fields */}
      {scalarFields.length > 0 && (
        <dl className="divide-y divide-gray-100">
          {scalarFields.map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-2 gap-4 px-4 py-2 text-sm"
            >
              <dt className="font-medium text-gray-500 capitalize">
                {key.replace(/_/g, ' ')}
              </dt>
              <dd className="text-gray-900">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Line items table */}
      {doc.lineItems && doc.lineItems.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Line Items
          </p>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-2 py-1.5 font-medium text-gray-500">Description</th>
                <th className="px-2 py-1.5 font-medium text-gray-500 text-right">Qty</th>
                <th className="px-2 py-1.5 font-medium text-gray-500 text-right">Unit Price</th>
                <th className="px-2 py-1.5 font-medium text-gray-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doc.lineItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-gray-800">{item.description}</td>
                  <td className="px-2 py-1.5 text-gray-700 text-right">
                    {item.quantity ?? '—'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-700 text-right">
                    {item.unitPrice != null
                      ? item.unitPrice.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })
                      : '—'}
                  </td>
                  <td className="px-2 py-1.5 font-medium text-gray-900 text-right">
                    {item.amount.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Exceptions section */
function ExceptionsSection({ exceptions }: { exceptions: Exception[] }) {
  if (exceptions.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No exceptions recorded.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {exceptions.map((ex, idx) => (
        <li
          key={ex.id ?? idx}
          className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            {/* Amber dot */}
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1.5" />

            <div className="flex-1 min-w-0">
              {/* Code badge + documentType */}
              <p className="text-sm font-semibold text-amber-800 flex flex-wrap items-center gap-2">
                <span className="font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-xs">
                  {ex.code}
                </span>
                {ex.documentType && (
                  <span className="text-xs font-normal text-amber-600">
                    [{ex.documentType}]
                  </span>
                )}
              </p>

              {/* Reason */}
              <p className="text-sm text-amber-700 mt-1">{ex.reason}</p>

              {/* Metadata: actor + timestamp (only for audit-log-shaped exceptions) */}
              {(ex.actor || ex.createdAt) && (
                <p className="text-xs text-amber-500 mt-1.5">
                  {ex.actor && <span>by {ex.actor}</span>}
                  {ex.actor && ex.createdAt && <span className="mx-1">·</span>}
                  {ex.createdAt && <span>{formatDate(ex.createdAt)}</span>}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Chronological audit trail */
function AuditTrailSection({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 italic">No audit entries.</p>;
  }
  return (
    <ol className="relative border-l border-gray-200 space-y-0">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-4 pb-6 last:pb-0">
          <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white bg-indigo-400" />
          <time className="block text-xs font-normal leading-none text-gray-400 mb-0.5">
            {formatDate(entry.timestamp)}
          </time>
          <p className="text-sm font-semibold text-gray-800">
            {entry.action}
            <span className="ml-2 text-xs font-normal text-gray-500">
              by {entry.actor}
            </span>
          </p>
          {entry.detail && (
            <p className="text-sm text-gray-600 mt-0.5">{entry.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Shown prominently when a submission FAILED before matching could run */
function FailureBanner({ auditTrail }: { auditTrail: AuditEntry[] }) {
  // The most recent FAILED audit entry carries the failure detail
  const failEntry = [...auditTrail]
    .reverse()
    .find((e) => e.action === 'FAILED' || e.detail?.toLowerCase().includes('fail'));

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <svg className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-800">
            Extraction failed before matching could be performed
          </p>
          {failEntry?.detail && (
            <p className="mt-1 text-sm text-red-700 font-mono whitespace-pre-wrap">
              {failEntry.detail}
            </p>
          )}
          {failEntry && (
            <p className="mt-1.5 text-xs text-red-500">
              {formatDate(failEntry.timestamp)} · by {failEntry.actor}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** fmt helper — numbers formatted as plain decimals, null → dash */
function n(val: number | null | undefined) {
  if (val == null) return <span className="text-gray-300">—</span>;
  return <>{val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>;
}

/** Combined analysis table — one row per matched line item */
function CombinedAnalysisSection({
  items,
  status,
  auditTrail,
}: {
  items: MatchedLineItem[];
  status: SubmissionStatus;
  auditTrail: AuditEntry[];
}) {
  // Still in-flight → never show the failure banner
  const isInFlight = status === 'PENDING' || status === 'PROCESSING';

  if (isInFlight) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
        <svg className="animate-spin w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm">Extraction and verification in progress…</p>
      </div>
    );
  }

  // Terminal state but no lines produced → extraction failed
  if (items.length === 0) {
    if (status === 'FAILED') {
      return <FailureBanner auditTrail={auditTrail} />;
    }
    return (
      <p className="text-sm text-gray-500 italic py-4">
        No matched line items available for this submission.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 bg-gray-50 border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Description
            </th>
            {/* Invoice columns */}
            <th className="border-b border-gray-200 px-3 py-2.5 text-right text-xs font-semibold text-indigo-600 uppercase tracking-wide">Inv Qty</th>
            <th className="border-b border-gray-200 px-3 py-2.5 text-right text-xs font-semibold text-indigo-600 uppercase tracking-wide">Inv Rate</th>
            <th className="border-b border-gray-200 px-3 py-2.5 text-right text-xs font-semibold text-indigo-600 uppercase tracking-wide">Inv Amount</th>
            {/* PO columns */}
            <th className="border-b border-gray-200 px-3 py-2.5 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">PO Qty</th>
            <th className="border-b border-gray-200 px-3 py-2.5 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">PO Rate</th>
            {/* GRN column */}
            <th className="border-b border-gray-200 px-3 py-2.5 text-right text-xs font-semibold text-amber-600 uppercase tracking-wide">GRN Accepted</th>
            {/* Status */}
            <th className="border-b border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, idx) => {
            const hasException = !!item.exception;
            return (
              <tr key={idx} className={`group hover:bg-gray-50 transition-colors ${hasException ? 'bg-red-50 hover:bg-red-50' : ''}`}>
                <td className="sticky left-0 bg-inherit px-3 py-2 font-medium text-gray-800">
                  {item.description || '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{n(item.invoiceQty)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{n(item.invoiceRate)}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">{n(item.invoiceAmount)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{n(item.poQty)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{n(item.poRate)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{n(item.grnAcceptedQty)}</td>
                <td className="px-3 py-2 text-center">
                  {hasException ? (
                    <span className="relative group/tooltip inline-flex">
                      {/* Red/amber warning icon */}
                      <svg className="w-4 h-4 text-red-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      {/* Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-md bg-gray-900 text-white text-xs px-3 py-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg text-left">
                        {item.exception}
                      </span>
                    </span>
                  ) : (
                    <svg className="w-4 h-4 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Override panel — status dropdown + reason + submit */
function OverridePanel({
  submissionId,
  onSuccess,
}: {
  submissionId: string;
  onSuccess: (updated: SubmissionDetail) => void;
}) {
  const [newStatus, setNewStatus] = useState<SubmissionStatus>(OVERRIDE_STATUSES[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = reason.trim().length > 0 && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await submissionsApi.override(submissionId, {
        newStatus,
        reason: reason.trim(),
      });
      if (response.success) {
        setReason('');
        onSuccess(response.submission);
      } else {
        setError(response.message ?? 'Override failed.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Override failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* New status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Status
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as SubmissionStatus)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {OVERRIDE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required reason for override…"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md shadow-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Apply Override'}
        </button>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-run state
  const [showRerunConfirm, setShowRerunConfirm] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await submissionsApi.getById(id);
      setSubmission(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submission.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll when in-flight (fresh or after re-run)
  useEffect(() => {
    if (!submission) return;
    const isInFlight = submission.status === 'PENDING' || submission.status === 'PROCESSING';
    if (!isInFlight) return;

    const intervalId = setInterval(() => {
      load();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [submission?.status, load]);

  // ── Re-run handler ─────────────────────────────────────────────────────────
  const handleRerunConfirmed = async () => {
    if (!id) return;
    setShowRerunConfirm(false);
    setRerunning(true);
    setRerunError(null);
    try {
      const updated = await submissionsApi.rerun(id);
      setSubmission(updated);
    } catch (err: unknown) {
      setRerunError(err instanceof Error ? err.message : 'Re-run failed.');
    } finally {
      setRerunning(false);
    }
  };

  // Optimistic update after override — no full reload
  const handleOverrideSuccess = (updated: SubmissionDetail) => {
    setSubmission(updated);
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="h-40 bg-gray-100 rounded" />
        <div className="h-40 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-6 py-4">
        <p className="text-sm text-red-700">{error ?? 'Submission not found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 text-sm text-indigo-600 hover:underline"
        >
          ← Back to submissions
        </button>
      </div>
    );
  }

  const canOverride = submission.status !== 'APPROVED';
  const isTerminal = TERMINAL_STATUSES.includes(submission.status as SubmissionStatus);

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="bg-white shadow sm:rounded-lg px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-gray-400 hover:text-indigo-600 mb-1 flex items-center gap-1"
            >
              ← All Submissions
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {submission.categoryName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Submitted {formatDate(submission.submittedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {submission.warrantyStatus && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                {submission.warrantyStatus}
              </span>
            )}
            <StatusBadge status={submission.status} />

            {/* Re-run button — only available when in a terminal state */}
            {isTerminal && (
              <button
                type="button"
                disabled={rerunning}
                onClick={() => setShowRerunConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {rerunning ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Re-running…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-run
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {rerunError && (
          <p className="mt-3 text-sm text-red-600">{rerunError}</p>
        )}
      </div>

      {/* ── Re-run confirmation modal ─────────────────────────────────────────── */}
      {showRerunConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowRerunConfirm(false)}
            />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Re-run Verification</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        This will replace this submission's current results. <strong>This cannot be undone.</strong>
                      </p>
                      <p className="text-sm text-gray-500">
                        If you want to keep the current result, create a new submission instead.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleRerunConfirmed}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Proceed
                </button>
                <button
                  type="button"
                  onClick={() => setShowRerunConfirm(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Extracted Documents ──────────────────────────────────────────────── */}
      <section className="bg-white shadow sm:rounded-lg px-6 py-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Extracted Fields
        </h2>
        {submission.extractedDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No extracted data yet — processing may still be in progress.
          </p>
        ) : (
          <div className="space-y-4">
            {submission.extractedDocuments.map((doc, idx) => (
              <ExtractedDocCard
                key={idx}
                doc={doc}
                submissionId={submission.id}
                onReplaced={setSubmission}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Combined Analysis ──────────────────────────────────────────────── */}
      <section className="bg-white shadow sm:rounded-lg px-6 py-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Combined Analysis
          {submission.matchedLineItems.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              {submission.matchedLineItems.length} line{submission.matchedLineItems.length !== 1 ? 's' : ''}
              {' · '}
              {submission.matchedLineItems.filter(i => !i.exception).length} matched ·{' '}
              <span className="text-red-600">
                {submission.matchedLineItems.filter(i => !!i.exception).length} exception{submission.matchedLineItems.filter(i => !!i.exception).length !== 1 ? 's' : ''}
              </span>
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Invoice · PO · GRN cross-reference. Hover a red ⚠ icon for the exception detail.
        </p>
        <CombinedAnalysisSection
          items={submission.matchedLineItems}
          status={submission.status}
          auditTrail={submission.auditTrail}
        />
      </section>

      {/* ── Exceptions ───────────────────────────────────────────────────────── */}
      <section className="bg-white shadow sm:rounded-lg px-6 py-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Exceptions
          {submission.exceptions.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {submission.exceptions.length}
            </span>
          )}
        </h2>
        <ExceptionsSection exceptions={submission.exceptions} />
      </section>

      {/* ── Audit Trail ──────────────────────────────────────────────────────── */}
      <section className="bg-white shadow sm:rounded-lg px-6 py-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Audit Trail</h2>
        <AuditTrailSection entries={submission.auditTrail} />
      </section>

      {/* ── Override ─────────────────────────────────────────────────────────── */}
      {canOverride && (
        <section className="bg-white shadow sm:rounded-lg border-t-4 border-purple-400 px-6 py-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Override Decision
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Manually set a status and provide a mandatory reason. This action
            will be recorded in the audit trail.
          </p>

          {submission.overrideReason && (
            <div className="mb-4 rounded-md bg-purple-50 border border-purple-200 px-4 py-3 text-sm">
              <span className="font-semibold text-purple-800">
                Previous override by {submission.overriddenBy ?? 'unknown'}:&nbsp;
              </span>
              <span className="text-purple-700">{submission.overrideReason}</span>
            </div>
          )}

          <OverridePanel
            submissionId={submission.id}
            onSuccess={handleOverrideSuccess}
          />
        </section>
      )}
    </div>
  );
}
