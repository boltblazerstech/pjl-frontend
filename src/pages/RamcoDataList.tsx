import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { poGrnImportsApi } from '../api/poGrnImports';
import type { PoGrnImportBatch, PoGrnLine } from '../api/poGrnImports';

const LINES_PAGE_SIZE = 15;

const FIXED_COLS: Array<{ key: string; label: string; align?: 'right' }> = [
  { key: 'poNumber',    label: 'PO Number' },
  { key: 'grnNumber',   label: 'GRN Number' },
  { key: 'itemCode',    label: 'Item Code' },
  { key: 'itemDesc',    label: 'Description' },
  { key: 'acceptedQty', label: 'Accepted Qty', align: 'right' },
  { key: 'orderedQty',  label: 'Ordered Qty',  align: 'right' },
  { key: 'unitPrice',   label: 'Unit Price',   align: 'right' },
  { key: 'uom',         label: 'UOM' },
  { key: 'grnDate',     label: 'GRN Date' },
  { key: 'vendorName',  label: 'Vendor' },
];

function formatDate(iso: string) {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function LinesPanel({
  batchId,
  batchName,
  onBack,
}: {
  batchId?: string | number;
  batchName?: string;
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [lines, setLines] = useState<PoGrnLine[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [linesError, setLinesError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setLinesError(null);
    poGrnImportsApi.listLines({ batchId, search: debouncedSearch || undefined, page, size: LINES_PAGE_SIZE })
      .then((res) => {
        setLines(res.content);
        setTotal(res.totalElements);
        setTotalPages(res.totalPages);
      })
      .catch((err: unknown) => setLinesError(err instanceof Error ? err.message : 'Failed to load rows.'))
      .finally(() => setLoading(false));
  }, [batchId, debouncedSearch, page]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="text-sm font-medium text-gray-700 truncate border-l border-gray-300 pl-3">
          {batchName ? `Rows: ${batchName}` : 'All Ramco Rows'}
        </span>
        <div className="ml-auto">
          <input
            type="search"
            placeholder="Search PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64 shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {linesError ? (
          <p className="px-6 py-4 text-sm text-red-600">{linesError}</p>
        ) : loading && lines.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-400 animate-pulse">Loading rows...</p>
        ) : lines.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-400 italic">No rows found.</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {FIXED_COLS.map((c) => (
                  <th key={c.key}
                    className={`px-4 py-3 font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {lines.map((row) => (
                <tr key={String(row.id)} className="hover:bg-indigo-50/30 transition-colors">
                  {FIXED_COLS.map((c) => {
                    const val = row[c.key];
                    return (
                      <td key={c.key}
                        className={`px-4 py-2.5 text-gray-700 whitespace-nowrap ${c.align === 'right' ? 'text-right font-mono text-xs' : ''}`}>
                        {val == null ? <span className="text-gray-300">-</span> : String(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0 text-sm text-gray-600">
          <span>{total} rows - page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 0} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-300 rounded shadow-sm disabled:opacity-40 hover:bg-white bg-gray-50 font-medium">
              Previous
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded shadow-sm disabled:opacity-40 hover:bg-white bg-gray-50 font-medium">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RamcoDataList() {
  const [batches, setBatches] = useState<PoGrnImportBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [drillBatch, setDrillBatch] = useState<PoGrnImportBatch | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

  useEffect(() => {
    setLoadingBatches(true);
    setBatchError(null);
    poGrnImportsApi.list()
      .then(setBatches)
      .catch((err: unknown) => setBatchError(err instanceof Error ? err.message : 'Failed to load history.'))
      .finally(() => setLoadingBatches(false));
  }, []);

  const isInDrilldown = drillBatch !== null || showAllRows;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-indigo-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Ramco Data & Imports</h1>
        </div>
        {!isInDrilldown && (
          <button type="button" onClick={() => setShowAllRows(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md shadow-sm hover:bg-indigo-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search all PO rows globally
          </button>
        )}
      </div>

      {isInDrilldown ? (
        <LinesPanel
          batchId={drillBatch?.id}
          batchName={drillBatch?.fileName}
          onBack={() => { setDrillBatch(null); setShowAllRows(false); }}
        />
      ) : (
        <div className="flex-1 bg-white shadow rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Past Excel Uploads</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {batchError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{batchError}</p>
              </div>
            )}

            {loadingBatches ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-50 border border-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : batches.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-1">No imports yet</p>
                <p className="text-sm">Use the "Import PO/GRN Excel" button on the Submissions list to upload data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {batches.map((b) => (
                  <div key={String(b.id)}
                    className="flex items-center gap-5 rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all bg-white group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100 group-hover:bg-green-100 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900 truncate" title={b.fileName}>{b.fileName}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{formatDate(b.importedAt)}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 flex-shrink-0 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-green-700 text-lg leading-tight">{b.rowsInserted ?? b.inserted ?? 0}</p>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">inserted</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-blue-700 text-lg leading-tight">{b.rowsUpdated ?? b.updated ?? 0}</p>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">updated</p>
                      </div>
                      {b.distinctPos != null && (
                        <div className="text-center">
                          <p className="font-bold text-gray-800 text-lg leading-tight">{b.distinctPos}</p>
                          <p className="text-gray-500 text-xs uppercase tracking-wide">distinct POs</p>
                        </div>
                      )}
                      {b.submissionsResolved != null && (
                        <div className="text-center">
                          <p className="font-bold text-indigo-700 text-lg leading-tight">{b.submissionsResolved}</p>
                          <p className="text-gray-500 text-xs uppercase tracking-wide">resolved</p>
                        </div>
                      )}
                    </div>
                    <div className="pl-4 border-l border-gray-100 flex-shrink-0">
                      <button type="button" onClick={() => { setDrillBatch(b); setShowAllRows(false); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 rounded-md shadow-sm hover:bg-indigo-50 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        View Rows
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
