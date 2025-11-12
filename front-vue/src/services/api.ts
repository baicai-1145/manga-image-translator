import { http } from './http';
import { resolveApiBase } from './config';

export interface TaskRecord {
  id: string;
  status: string;
  mode?: string | null;
  queue_position?: number | null;
  result_path?: string | null;
  error?: string | null;
  config?: Record<string, any> | null;
  meta?: Record<string, any> | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  updated_at: string;
}

export async function fetchTasks(limit = 50): Promise<TaskRecord[]> {
  const res = await http.get<TaskRecord[]>(`/tasks`, { params: { limit } });
  return res.data;
}

export async function fetchTask(taskId: string): Promise<TaskRecord> {
  const res = await http.get<TaskRecord>(`/tasks/${encodeURIComponent(taskId)}`);
  return res.data;
}

export function getResultImageUrl(folder: string): string {
  const base = resolveApiBase() ?? '';
  // /api/result served by proxy → backend /result
  const clean = folder.replace(/^\/+/, '').replace(/\/+$/, '');
  return `${base}/result/${clean}/final.png`;
}

export function getResultFileUrl(folder: string, filename: string): string {
  const base = resolveApiBase() ?? '';
  const clean = folder.replace(/^\/+/, '').replace(/\/+$/, '');
  const file = filename.replace(/^\/+/, '');
  return `${base}/result/${clean}/${file}`;
}

export async function listResultDirectories(): Promise<string[]> {
  const base = resolveApiBase() ?? '';
  // server exposes /results/list (no /api prefix at backend), we call via proxy base
  const res = await fetch(`${base}/results/list`, { cache: 'no-cache' });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as { directories?: string[] };
  return Array.isArray(data.directories) ? data.directories : [];
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export interface CreateBatchZipOptions {
  batch_size?: number;
}

export async function createBatchZip(files: File[], config: object, opts: CreateBatchZipOptions = {}): Promise<{ blob: Blob; taskId?: string }> {
  const images = await Promise.all(files.map(fileToDataUrl));
  const base = resolveApiBase() ?? '';
  const res = await fetch(`${base}/translate/batch/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images,
      config,
      batch_size: opts.batch_size ?? 4
    })
  });
  if (!res.ok) {
    throw new Error(`批处理失败：${res.status} ${await res.text()}`);
  }
  const taskId = res.headers.get('X-Task-Id') ?? undefined;
  const blob = await res.blob();
  return { blob, taskId };
}
