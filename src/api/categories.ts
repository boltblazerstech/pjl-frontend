import { apiClient } from './client';
import type { BillCategory } from '../types';

/**
 * The backend may return the document-types field as either:
 *   • required_document_types  (snake_case — Spring Boot default)
 *   • requiredDocumentTypes    (camelCase  — if Jackson is configured)
 *
 * This function normalises any raw API object into a properly-typed
 * BillCategory so the rest of the UI can rely on the camelCase shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(raw: any): BillCategory {
  return {
    // Coerce to string — backends often return numeric IDs, but
    // HTMLSelectElement.value is always a string, so the find() comparison
    // would silently fail if left as a number (1 === "1" → false).
    id: String(raw.id),
    name: raw.name,
    description: raw.description,
    requiredDocumentTypes:
      raw.requiredDocumentTypes ??
      raw.required_document_types ??
      [],
  };
}

export const categoriesApi = {
  async list(): Promise<BillCategory[]> {
    // Fetch as `any[]` so we can normalise the raw payload before handing
    // it to the strongly-typed parts of the app.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.get<any[]>('/bill-categories');
    return raw.map(normalise);
  },
};
