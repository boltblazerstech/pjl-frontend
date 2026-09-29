import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { submissionsApi } from '../api/submissions';
import { poGrnImportsApi } from '../api/poGrnImports';
import type { PoGrnImportBatch, PoGrnImportResult } from '../api/poGrnImports';
import StatusBadge from '../components/StatusBadge';
import type { SubmissionSummary, SubmissionStatus } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const POLLING_STATUSES: SubmissionStatus[] = ['PENDING', 'PROCESSING', 'AWAITING_PO_GRN'];
const POLL_INTERVAL_MS = 5_000;
const PAGE_SIZE = 20;

const ALL_STATUSES: Array<{ value: SubmissionStatus | ''; label: string }> = [
  { value: '',                label: 'All Statuses' },
  { value: 'PENDING',         label: 'Pending' },
  { value: 'PROCESSING',      label: 'Processing' },
  { value: 'AWAITING_PO_GRN', label: 'Waiting for PO/GRN' },
  { value: 'COMPLETED',       label: 'Completed' },
  { value: 'APPROVED',        label: 'Approved' },
  { value: 'REJECTED',        label: 'Rejected' },
  { value: 'EXCEPTION',       label: 'Exception' },
  { value: 'OVERRIDDEN',      label: 'Overridden' },
  { value: 'FAILED',          label: 'Failed' },
];

function formatDate(iso: string) {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ── ImportPoGrnDialog ─────────────────────────────────────────────────────────

interface ImportDialogProps {
  onClose: () => void;
  onImportDone: () => void;
}

function ImportPoGrnDialog({ onClose, onImportDone }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<PoGrnImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [batches, setBatches] = useState<PoGrnImportBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const loadBatches = useCallback(() => {
    setLoadingBatches(true);
    poGrnImportsApi.list()
      .then(setBatches)
      .catch(() => {})
      .finally(() => setLoadingBatches(false));
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
    setResult(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await poGrnImportsApi.upload(selectedFile);
      setResult(res);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadBatches();
      onImportDone();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
        <div className="relative inline-block transform rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <div style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div className="bg-white px-6 py-5 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Import PO/GRN Excel</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Upload Ramco data to resolve waiting submissions</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
              {/* Picker */}
              <div className="flex items-center gap-3 flex-wrap">
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange}
                  className="block text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                <button type="button" disabled={!selectedFile || uploading} onClick={handleUpload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                  {uploading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Importing...
                    </>
                  ) : 'Import'}
                </button>
              </div>

              {/* Error */}
              {uploadError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              )}

              {/* Result summary */}
              {result && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 space-y-3">
                  <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Import complete - {result.fileName || 'file uploaded'}
                  </p>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Inserted',    value: result.rowsInserted ?? result.inserted },
                      { label: 'Updated',     value: result.rowsUpdated  ?? result.updated  },
                      { label: 'Distinct POs', value: result.distinctPos },
                      { label: 'Submissions resolved', value: result.submissionsResolved },
                    ].filter(({ value }) => value != null).map(({ label, value }) => (
                      <div key={label} className="rounded-md bg-white border border-green-100 px-3 py-2">
                        <dt className="text-xs text-green-600">{label}</dt>
                        <dd className="text-xl font-bold text-green-800">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {result.skippedReasons && result.skippedReasons.length > 0 && (
                    <div className="border-t border-green-200 pt-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">Skip reasons:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {result.skippedReasons.map((r, i) => (
                          <li key={i} className="text-xs text-green-700">{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link to="/ramco-data" onClick={onClose}
                    className="inline-block mt-2 text-xs font-medium text-indigo-600 hover:underline">
                    View imported rows in Ramco Data page &rarr;
                  </Link>
                </div>
              )}

              {/* Recent uploads */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Recent uploads</p>
                {loadingBatches ? (
                  <div className="h-16 bg-gray-50 rounded animate-pulse" />
                ) : batches.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No uploads yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {batches.slice(0, 5).map((b) => (
                      <li key={String(b.id)} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 text-sm">
                        <span className="text-gray-700 font-medium truncate flex-1" title={b.fileName}>{b.fileName}</span>
                        <span className="text-gray-400 whitespace-nowrap text-xs">{formatDate(b.importedAt)}</span>
                        <span className="text-green-700 text-xs whitespace-nowrap px-2">
                          +{b.rowsInserted ?? b.inserted ?? 0} inserted
                        </span>
                        <Link to="/ramco-data" onClick={onClose}
                          className="text-xs font-medium text-indigo-600 hover:underline flex-shrink-0">
                          History
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link to="/ramco-data" onClick={onClose}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    View full history and all rows &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 flex justify-end border-t border-gray-200 flex-shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Close
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SubmissionsList() {
  const [rows, setRows] = useState<SubmissionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (pg: number, status: SubmissionStatus | '') => {
      try {
        const result = await submissionsApi.list({
          page: pg,
          pageSize: PAGE_SIZE,
          status: status || undefined,
        });
        setRows(result.data);
        setTotal(result.total);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(page, statusFilter);
  }, [page, statusFilter, fetchPage]);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const hasPending = rows.some((r) => POLLING_STATUSES.includes(r.status as SubmissionStatus));
    if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; }
    if (hasPending) {
      pollerRef.current = setInterval(() => { fetchPage(page, statusFilter); }, POLL_INTERVAL_MS);
    }
    return () => { if (pollerRef.current) clearInterval(pollerRef.current); };
  }, [rows, page, statusFilter, fetchPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900">Submissions</h1>
        <div className="flex items-center gap-2">
          
          <Link to="/ramco-data"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Ramco Data
          </Link>

          <button type="button" onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import PO/GRN Excel
          </button>

          <Link to="/new"
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Submission
          </Link>

        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="status-filter" className="text-sm font-medium text-gray-600">Status</label>
        <select id="status-filter" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as SubmissionStatus | ''); setPage(1); }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
          {ALL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {loading && <span className="text-xs text-gray-400 animate-pulse">Refreshing...</span>}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice No.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading && rows.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No submissions found.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {row.supplierName ?? <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {row.invoiceNo ?? <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(row.submittedAt)}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link to={`/submissions/${row.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                      View &rarr;
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {totalPages} - {total} total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportPoGrnDialog
          onClose={() => setShowImportDialog(false)}
          onImportDone={() => { fetchPage(page, statusFilter); }}
        />
      )}
    </div>
  );
}
