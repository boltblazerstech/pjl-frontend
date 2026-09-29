import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import { submissionsApi } from '../api/submissions';
import type { BillCategory } from '../types';
import PasteZone from '../components/PasteZone';

type Mode = 'invoice-only' | 'all-docs';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewSubmission() {
  const navigate = useNavigate();

  // ── Mode toggle ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('invoice-only');

  // ── Categories ─────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const selectedCategory = categories.find((c) => String(c.id) === String(selectedCategoryId)) ?? null;

  // files[docType] = File[]  (multiple pages per document type)
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>({});

  // Invoice-only: single PasteZone
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [invoiceFileError, setInvoiceFileError] = useState<string | null>(null);

  // ── Submit state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch categories on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setCatLoading(true);
    categoriesApi
      .list()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          const spares = data.find((c) => c.name.toLowerCase() === 'spares');
          if (spares) setSelectedCategoryId(spares.id);
        }
      })
      .catch((err: Error) => { if (!cancelled) setCatError(err.message); })
      .finally(() => { if (!cancelled) setCatLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Reset files whenever category or mode changes
  useEffect(() => {
    setFiles({});
    setFileErrors({});
    setInvoiceFiles([]);
    setInvoiceFileError(null);
  }, [selectedCategoryId, mode]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(e.target.value);
    setSubmitError(null);
  };

  const handleFiles = useCallback((docType: string, newFiles: File[], error: string | null) => {
    setFiles((prev) => ({ ...prev, [docType]: newFiles }));
    setFileErrors((prev) => ({ ...prev, [docType]: error }));
  }, []);

  const handleInvoiceFiles = useCallback((_docType: string, newFiles: File[], error: string | null) => {
    setInvoiceFiles(newFiles);
    setInvoiceFileError(error);
  }, []);

  // All required doc types have at least 1 valid file (full-docs mode)
  const requiredTypes = selectedCategory?.requiredDocumentTypes ?? [];
  const isAllDocsReady =
    !!selectedCategory &&
    requiredTypes.length > 0 &&
    requiredTypes.every((dt) => (files[dt]?.length ?? 0) > 0);

  const isInvoiceOnlyReady = !!selectedCategory && invoiceFiles.length > 0;

  const isFormReady = mode === 'invoice-only' ? isInvoiceOnlyReady : isAllDocsReady;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormReady) return;

    abortRef.current?.abort();
    setSubmitting(true);
    setSubmitError(null);

    try {
      let result;
      if (mode === 'invoice-only') {
        result = await submissionsApi.createInvoiceOnly(selectedCategoryId, invoiceFiles);
      } else {
        const validFiles: Record<string, File[]> = {};
        for (const dt of requiredTypes) {
          validFiles[dt] = files[dt] ?? [];
        }
        result = await submissionsApi.create(selectedCategoryId, validFiles);
      }
      navigate(`/submissions/${result.id}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">New Submission</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a mode, select a bill category, and upload your documents.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

          {/* ── Mode toggle ───────────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Submission mode</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('invoice-only')}
                className={[
                  'flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors',
                  mode === 'invoice-only'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <span className={[
                  'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2',
                  mode === 'invoice-only' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300',
                ].join(' ')}>
                  {mode === 'invoice-only' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Invoice only</p>
                  <p className="text-xs text-gray-500 mt-0.5">PO and GRN data matched from imported Ramco data</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('all-docs')}
                className={[
                  'flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors',
                  mode === 'all-docs'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <span className={[
                  'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2',
                  mode === 'all-docs' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300',
                ].join(' ')}>
                  {mode === 'all-docs' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Upload all 3 documents</p>
                  <p className="text-xs text-gray-500 mt-0.5">Upload Invoice, PO, and GRN files manually</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── Category dropdown ─────────────────────────────────────────── */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Bill Category <span className="text-red-500">*</span>
            </label>

            {catLoading ? (
              <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
            ) : catError ? (
              <p className="text-sm text-red-600">Failed to load categories: {catError}</p>
            ) : (
              <select
                id="category"
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— Select a category —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            {selectedCategory?.description && (
              <p className="mt-1 text-xs text-gray-500">{selectedCategory.description}</p>
            )}
          </div>

          {/* ── Invoice-only upload ───────────────────────────────────────── */}
          {mode === 'invoice-only' && selectedCategory && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Invoice Document</p>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                PO and GRN data will be automatically matched from Ramco import records. The submission will show as <strong className="font-semibold mx-1">Waiting for PO/GRN</strong> until a matching import is processed.
              </div>
              <PasteZone
                docType="Invoice"
                files={invoiceFiles}
                fileError={invoiceFileError}
                onFiles={handleInvoiceFiles}
              />
            </div>
          )}

          {/* ── All-docs upload zones ─────────────────────────────────────── */}
          {mode === 'all-docs' && selectedCategory && requiredTypes.length > 0 && (
            <div className="space-y-5">
              <p className="text-sm font-medium text-gray-700">Required Documents</p>
              {requiredTypes.map((docType) => (
                <PasteZone
                  key={docType}
                  docType={docType}
                  files={files[docType] ?? []}
                  fileError={fileErrors[docType] ?? null}
                  onFiles={handleFiles}
                />
              ))}
            </div>
          )}

          {/* ── Backend error ─────────────────────────────────────────────── */}
          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormReady || submitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
