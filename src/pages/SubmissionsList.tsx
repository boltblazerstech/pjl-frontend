import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { submissionsApi } from '../api/submissions';
import StatusBadge from '../components/StatusBadge';
import type { SubmissionSummary, SubmissionStatus } from '../types';

/** Statuses that should be polled for live updates */
const POLLING_STATUSES: SubmissionStatus[] = ['PENDING', 'PROCESSING'];
const POLL_INTERVAL_MS = 5_000;
const PAGE_SIZE = 20;

const ALL_STATUSES: Array<{ value: SubmissionStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING',    label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED',  label: 'Completed' },
  { value: 'APPROVED',   label: 'Approved' },
  { value: 'REJECTED',   label: 'Rejected' },
  { value: 'EXCEPTION',  label: 'Exception' },
  { value: 'OVERRIDDEN', label: 'Overridden' },
  { value: 'FAILED',     label: 'Failed' },
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

export default function SubmissionsList() {
  const [rows, setRows] = useState<SubmissionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
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

  // ── Initial load + when filter/page changes ────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchPage(page, statusFilter);
  }, [page, statusFilter, fetchPage]);

  // ── Polling: refresh in-flight rows every N seconds ───────────────────────
  useEffect(() => {
    const hasPending = rows.some((r) =>
      POLLING_STATUSES.includes(r.status as SubmissionStatus),
    );

    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (hasPending) {
      pollerRef.current = setInterval(() => {
        // Silent refresh — do not show spinner
        fetchPage(page, statusFilter);
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [rows, page, statusFilter, fetchPage]);

  // ── Derived pagination ─────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Submissions</h1>
        <Link
          to="/new"
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Submission
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="status-filter" className="text-sm font-medium text-gray-600">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as SubmissionStatus | '');
            setPage(1);
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">Refreshing…</span>
        )}
      </div>

      {/* Error state */}
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Bill Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Uploaded
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {loading && rows.length === 0 ? (
              /* skeleton rows */
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  No submissions found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {row.categoryName}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(row.submittedAt)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      to={`/submissions/${row.id}`}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View →
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
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
