import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import { submissionsApi } from '../api/submissions';
import type { BillCategory } from '../types';

import PasteZone from '../components/PasteZone';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewSubmission() {
  const navigate = useNavigate();

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
          // Set "Spares" as the default category if found
          const spares = data.find((c) => c.name.toLowerCase() === 'spares');
          if (spares) setSelectedCategoryId(spares.id);
        }
      })
      .catch((err: Error) => { if (!cancelled) setCatError(err.message); })
      .finally(() => { if (!cancelled) setCatLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Reset files whenever category changes
  useEffect(() => {
    setFiles({});
    setFileErrors({});
  }, [selectedCategoryId]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(e.target.value);
    setSubmitError(null);
  };

  // Unified handler used by both file picker and paste
  const handleFiles = useCallback((docType: string, newFiles: File[], error: string | null) => {
    setFiles((prev) => ({ ...prev, [docType]: newFiles }));
    setFileErrors((prev) => ({ ...prev, [docType]: error }));
  }, []);

  // All required doc types have at least 1 valid file
  const requiredTypes = selectedCategory?.requiredDocumentTypes ?? [];
  const isFormReady =
    !!selectedCategory &&
    requiredTypes.length > 0 &&
    requiredTypes.every((dt) => (files[dt]?.length ?? 0) > 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormReady) return;

    abortRef.current?.abort();
    setSubmitting(true);
    setSubmitError(null);

    // Build Record<docType, File[]> for the API
    const validFiles: Record<string, File[]> = {};
    for (const dt of requiredTypes) {
      validFiles[dt] = files[dt] ?? [];
    }

    try {
      const result = await submissionsApi.create(selectedCategoryId, validFiles);
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
            Select a bill category, then upload files or paste screenshots.
            Each document type supports multiple pages.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

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

          {/* ── Dynamic paste/upload zones ────────────────────────────────── */}
          {selectedCategory && requiredTypes.length > 0 && (
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
                  Uploading…
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
