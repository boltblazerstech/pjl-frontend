import { apiClient } from './client';
import type { PaginatedGroups, GroupDetail, GroupSummary, GroupFile } from '../types';
import { normaliseRow as normaliseSubmissionRow } from './submissions';

export interface ListGroupsParams {
  page?: number;
  pageSize?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseGroupRow(raw: any): GroupSummary {
  return {
    id: String(raw.id),
    name: raw.name ?? `Group ${raw.id}`,
    categoryId: String(raw.categoryId ?? raw.category_id ?? ''),
    categoryName: raw.categoryName ?? raw.category_name ?? raw.categoryId ?? '',
    runCount: raw.runCount ?? raw.run_count ?? 0,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseGroupPage(raw: any, fallbackPage: number): PaginatedGroups {
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length, page: fallbackPage, pageSize: raw.length };
  }
  if (Array.isArray(raw.content)) {
    return {
      data: raw.content,
      total: raw.totalElements ?? raw.content.length,
      page: (raw.number ?? fallbackPage - 1) + 1,
      pageSize: raw.size ?? raw.content.length,
    };
  }
  if (Array.isArray(raw.data)) {
    return {
      data: raw.data,
      total: raw.total ?? raw.data.length,
      page: raw.page ?? fallbackPage,
      pageSize: raw.pageSize ?? raw.data.length,
    };
  }
  return { data: [], total: 0, page: fallbackPage, pageSize: 20 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseGroupDetail(raw: any): GroupDetail {
  const summary = normaliseGroupRow(raw);

  let files: GroupFile[] = [];
  if (raw.files && Array.isArray(raw.files)) {
    files = raw.files.map((f: any) => ({
      docType: f.docType ?? f.documentType ?? f.document_type ?? '',
      filename: f.filename ?? f.fileRef ?? f.file_ref ?? '',
    }));
  } else {
    // Top-level string fields
    const extractFilename = (path: string) => {
      const basename = path.split('/').pop() || path;
      return basename.replace(/^\d+-/, ''); // remove timestamp prefix
    };

    if (raw.invoiceFileRef) {
      files.push({ docType: 'invoice', filename: extractFilename(raw.invoiceFileRef) });
    }
    if (raw.poFileRef) {
      files.push({ docType: 'po', filename: extractFilename(raw.poFileRef) });
    }
    if (raw.grnFileRef) {
      files.push({ docType: 'grn', filename: extractFilename(raw.grnFileRef) });
    }
  }

  return {
    ...summary,
    files,
    runs: (raw.runs ?? raw.submissions ?? []).map(normaliseSubmissionRow),
  };
}

export const groupsApi = {
  async list(params: ListGroupsParams = {}): Promise<PaginatedGroups> {
    const query = new URLSearchParams();
    if (params.page != null) {
      query.set('page', String(Math.max(0, params.page - 1)));
    }
    if (params.pageSize != null) query.set('size', String(params.pageSize));
    const qs = query.toString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.get<any>(`/groups${qs ? `?${qs}` : ''}`);
    const page = normaliseGroupPage(raw, params.page ?? 1);
    return { ...page, data: page.data.map(normaliseGroupRow) };
  },

  async getById(id: string): Promise<GroupDetail> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.get<any>(`/groups/${id}`);
    return normaliseGroupDetail(raw);
  },

  async create(categoryId: string, name: string, files: Record<string, File[]>): Promise<GroupDetail> {
    const form = new FormData();
    form.append('billCategoryId', categoryId);
    if (name) {
      form.append('name', name);
    }
    for (const [docType, fileList] of Object.entries(files)) {
      let key = docType.trim().toLowerCase();
      if (key.includes('invoice')) key = 'invoice';
      else if (key.includes('po') || key.includes('purchase')) key = 'po';
      else if (key.includes('grn') || key.includes('goods')) key = 'grn';

      for (const file of fileList) {
        form.append(key, file);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.postForm<any>('/groups', form);
    return normaliseGroupDetail(raw);
  },

  async replaceFile(groupId: string, docType: string, file: File): Promise<GroupDetail> {
    const form = new FormData();
    let key = docType.trim().toLowerCase();
    if (key.includes('invoice')) key = 'invoice';
    else if (key.includes('po') || key.includes('purchase')) key = 'po';
    else if (key.includes('grn') || key.includes('goods')) key = 'grn';
    
    form.append(key, file);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.patchForm<any>(`/groups/${groupId}`, form);
    return normaliseGroupDetail(raw);
  },

  async updateName(groupId: string, name: string): Promise<GroupDetail> {
    const form = new FormData();
    form.append('name', name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.patchForm<any>(`/groups/${groupId}`, form);
    return normaliseGroupDetail(raw);
  },

  async run(groupId: string): Promise<{ id: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiClient.post<any>(`/groups/${groupId}/run`, {});
    return { id: String(raw.id ?? raw.submissionId ?? raw.submission_id ?? '') };
  },

  async delete(groupId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
  }
};
