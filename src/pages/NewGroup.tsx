import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import { groupsApi } from '../api/groups';
import type { BillCategory } from '../types';
import PasteZone from '../components/PasteZone';

export default function NewGroup() {
  const navigate = useNavigate();

  // ── Categories ─────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || submitting) return;

    // Validate all required documents are present and have no errors
    const missing: string[] = [];
    const withErrors: string[] = [];
    for (const docType of selectedCategory.requiredDocumentTypes) {
      if (!files[docType] || files[docType].length === 0) {
        missing.push(docType);
      }
      if (fileErrors[docType]) {
        withErrors.push(docType);
      }
    }

    if (missing.length > 0 || withErrors.length > 0) {
      setSubmitError(
        missing.length > 0
          ? `Please provide all required documents: ${missing.join(', ')}.`
          : `Please fix errors in documents: ${withErrors.join(', ')}.`
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Cancel previous inflight submit if user somehow double clicked
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const response = await groupsApi.create(selectedCategoryId, name, files);
      navigate(`/groups/${response.id}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create group');
      setSubmitting(false);
    }
  };

  const isFormValid =
    selectedCategory &&
    selectedCategory.requiredDocumentTypes.every((dt) => files[dt]?.length > 0 && !fileErrors[dt]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/groups')}
          className="text-xs text-gray-400 hover:text-indigo-600 mb-2 flex items-center gap-1"
        >
          ← All Groups
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Group</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a reusable group of files. You can run it multiple times to generate submissions.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        {catLoading ? (
          <div className="px-6 py-12 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading categories…</p>
          </div>
        ) : catError ? (
          <div className="px-6 py-12 text-center text-red-600 text-sm">
            {catError}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-8 space-y-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={handleCategoryChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border bg-white"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {selectedCategory?.description && (
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedCategory.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly Supplier Invoice"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {selectedCategory && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">
                  Required Documents
                </h3>
                {selectedCategory.requiredDocumentTypes.map((docType) => (
                  <PasteZone
                    key={docType}
                    docType={docType}
                    files={files[docType] || []}
                    fileError={fileErrors[docType] || null}
                    onFiles={handleFiles}
                  />
                ))}
              </div>
            )}

            {submitError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <div className="pt-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Creating Group…
                  </>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
