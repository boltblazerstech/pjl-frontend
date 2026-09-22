import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import StatusBadge from '../components/StatusBadge';
import type { GroupDetail, SubmissionSummary } from '../types';

function formatDate(iso: string) {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function SubmissionRow({ row }: { row: SubmissionSummary }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
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
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Run
  const [running, setRunning] = useState(false);

  // File replacing
  const [replacingDocType, setReplacingDocType] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await groupsApi.getById(id);
      setGroup(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load group.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEditNameClick = () => {
    if (!group) return;
    setEditNameValue(group.name);
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    if (!group || !id) return;
    if (editNameValue.trim() === group.name) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const updated = await groupsApi.updateName(id, editNameValue.trim());
      setGroup(updated);
      setIsEditingName(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleRunClick = async () => {
    if (!group || !id) return;
    setRunning(true);
    try {
      const { id: submissionId } = await groupsApi.run(id);
      navigate(`/submissions/${submissionId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to run group');
      setRunning(false); // only reset if error, else we navigated
    }
  };

  const handleReplaceClick = (docType: string) => {
    setReplacingDocType(docType);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!group || !id || !replacingDocType) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input
    e.target.value = '';
    const dt = replacingDocType;
    setReplacingDocType(null); // immediately clear state

    try {
      const updated = await groupsApi.replaceFile(id, dt, file);
      setGroup(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to replace file');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl mx-auto">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="h-40 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-6 py-4 max-w-4xl mx-auto">
        <p className="text-sm text-red-700">{error ?? 'Group not found.'}</p>
        <button
          onClick={() => navigate('/groups')}
          className="mt-3 text-sm text-indigo-600 hover:underline"
        >
          ← Back to groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hidden file input for replacements */}
      <input
        type="file"
        accept=".pdf,image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="bg-white shadow sm:rounded-lg px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/groups')}
              className="text-xs text-gray-400 hover:text-indigo-600 mb-2 flex items-center gap-1"
            >
              ← All Groups
            </button>
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    disabled={savingName}
                    autoFocus
                    className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg"
                  />
                  <button
                    onClick={handleNameSave}
                    disabled={savingName}
                    className="text-sm text-indigo-600 hover:text-indigo-900 font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    disabled={savingName}
                    className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 group flex items-center gap-2">
                    {group.name}
                    <button
                      onClick={handleEditNameClick}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 focus:opacity-100"
                      title="Edit name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </h1>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Category: <span className="font-medium text-gray-700">{group.categoryName}</span>
            </p>
          </div>
          <div>
            <button
              onClick={handleRunClick}
              disabled={running}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {running ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Running…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Files */}
      <section className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Current Files</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Replacing a file will only affect future runs, not past submissions.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {group.files.length === 0 ? (
            <li className="px-6 py-8 text-center text-sm text-gray-500">
              No files in this group.
            </li>
          ) : (
            group.files.map((file, idx) => (
              <li key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                    {file.docType}
                  </p>
                  <p className="text-sm text-gray-500 truncate max-w-md">
                    {file.filename}
                  </p>
                </div>
                <button
                  onClick={() => handleReplaceClick(file.docType)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-900 border border-gray-300 rounded px-3 py-1.5 hover:bg-white bg-gray-50"
                >
                  Replace
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Past Runs */}
      <section className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Past Runs <span className="ml-2 text-sm font-normal text-gray-500">({group.runs.length})</span>
          </h2>
        </div>
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
                Run Date
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {group.runs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  This group has never been run.
                </td>
              </tr>
            ) : (
              group.runs.map((run) => <SubmissionRow key={run.id} row={run} />)
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
