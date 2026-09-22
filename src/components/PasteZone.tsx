import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';

const ACCEPTED = '.pdf,image/*';

export function validate(file: File): string | null {
  if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
    return 'Only PDF or image files are accepted.';
  }
  return null;
}

export function FileIcon({ file }: { file: File }) {
  return file.type === 'application/pdf' ? (
    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export interface PasteZoneProps {
  docType: string;
  files: File[];
  fileError: string | null;
  onFiles: (docType: string, files: File[], error: string | null) => void;
  singleFile?: boolean;
}

export default function PasteZone({ docType, files, fileError, onFiles, singleFile = false }: PasteZoneProps) {
  const [focused, setFocused] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Paste → append to array
  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      e.preventDefault();
      let newFiles: File[] = [];
      for (const item of imageItems) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const ext = blob.type.split('/')[1] || 'png';
        const idx = files.length + newFiles.length + 1;
        newFiles.push(new File([blob], `${docType}-page${idx}.${ext}`, { type: blob.type }));
      }
      if (singleFile && newFiles.length > 1) {
        newFiles = [newFiles[0]];
      }

      if (newFiles.length > 0) {
        const firstErr = newFiles.map(validate).find(Boolean) ?? null;
        if (singleFile) {
          onFiles(docType, firstErr ? [] : newFiles, firstErr);
        } else {
          onFiles(docType, firstErr ? files : [...files, ...newFiles], firstErr);
        }
      }
    };

    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [docType, files, onFiles, singleFile]);

  // File picker → append to array
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    let picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    if (singleFile && picked.length > 1) {
      picked = [picked[0]];
    }
    const firstErr = picked.map(validate).find(Boolean) ?? null;
    if (singleFile) {
      onFiles(docType, firstErr ? [] : picked, firstErr ?? null);
    } else {
      onFiles(docType, firstErr ? files : [...files, ...picked], firstErr ?? null);
    }
    // Reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  // Remove one file by index
  const handleRemove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    onFiles(docType, next, null);
  };

  const borderColor = focused
    ? 'border-indigo-400 ring-2 ring-indigo-200'
    : files.length > 0
    ? 'border-green-400'
    : fileError
    ? 'border-red-400'
    : 'border-gray-300 hover:border-indigo-300';

  return (
    <div>
      {/* Label */}
      <p className="block text-sm font-medium text-gray-700 mb-1.5">
        {docType} <span className="text-red-500">*</span>
        <span className="ml-2 text-xs font-normal text-gray-400">
          PDF · Images · paste screenshots{singleFile ? '' : ' · multiple pages OK'}
        </span>
      </p>

      {/* Zone */}
      <div
        ref={zoneRef}
        tabIndex={0}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`rounded-lg border-2 border-dashed px-4 py-4 transition-all outline-none ${borderColor}`}
      >
        {/* File list */}
        {files.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {files.map((f, idx) => (
              <li key={idx} className="flex items-center gap-2 bg-green-50 rounded-md px-3 py-1.5">
                <FileIcon file={f} />
                <span className="flex-1 text-sm font-medium text-green-800 truncate">
                  {f.name}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add-more prompt */}
        {(!singleFile || files.length === 0) && (
          <div className="flex flex-col items-center gap-2 text-center">
            {files.length === 0 ? (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                focused ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {focused ? 'Ready — press Ctrl+V to paste' : 'Click here, then Ctrl+V to paste screenshot'}
              </div>
            ) : (
              <span className="text-xs text-gray-400">
                {focused ? 'Ctrl+V to paste another page' : 'Click here to paste more pages'}
              </span>
            )}

            <span className="text-xs text-gray-400">or</span>

            <label
              htmlFor={`file-${docType}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-md cursor-pointer hover:bg-indigo-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {files.length === 0 ? 'Browse files' : 'Add more files'}
            </label>
            <input
              id={`file-${docType}`}
              type="file"
              accept={ACCEPTED}
              multiple={!singleFile}
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>
        )}
      </div>

      {/* Error message */}
      {fileError && (
        <p className="mt-1 text-xs text-red-600">{fileError}</p>
      )}
    </div>
  );
}
