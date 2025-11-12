export type StreamEvent =
  | { type: 'progress'; message: string }
  | { type: 'queue'; position: string | null }
  | { type: 'waiting' }
  | { type: 'complete'; blob: Blob }
  | { type: 'error'; message: string }
  | { type: 'folder'; folder: string; taskId?: string };

export interface UploadOptions {
  endpoint?: string; // default: /api/translate/with-form/image/stream/web
  headers?: Record<string, string>;
}

export async function uploadAndStream(
  file: File,
  config: object,
  onEvent: (ev: StreamEvent) => void,
  opts: UploadOptions = {}
): Promise<void> {
  const endpoint = opts.endpoint ?? '/api/translate/with-form/image/stream/web';
  const form = new FormData();
  form.append('image', file);
  form.append('config', JSON.stringify(config ?? {}));

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
    headers: opts.headers
  });
  if (!response.ok || !response.body) {
    throw new Error(`上传失败：${response.status}`);
  }

  const taskId = response.headers.get('X-Task-Id') || undefined;
  const reader = response.body.getReader();
  let buffer = new Uint8Array();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const merged = new Uint8Array(buffer.length + value.length);
    merged.set(buffer);
    merged.set(value, buffer.length);
    buffer = merged;
    // parse frames
    while (buffer.length >= 5) {
      const status = buffer[0];
      const size = new DataView(buffer.buffer).getUint32(1, false);
      const total = 5 + size;
      if (buffer.length < total) break;
      const payload = buffer.slice(5, total);
      const rest = buffer.slice(total);
      buffer = rest;

      switch (status) {
        case 0: {
          const blob = new Blob([payload], { type: 'image/png' });
          onEvent({ type: 'complete', blob });
          break;
        }
        case 1: {
          const text = new TextDecoder('utf-8').decode(payload);
          // special progress messages that carry folder info
          if (text.startsWith('final_ready:') || text.startsWith('rendering_folder:')) {
            const folder = text.split(':', 2)[1]?.trim();
            if (folder) {
              onEvent({ type: 'folder', folder, taskId });
              break;
            }
          }
          onEvent({ type: 'progress', message: text });
          break;
        }
        case 2: {
          const text = new TextDecoder('utf-8').decode(payload);
          onEvent({ type: 'error', message: text });
          break;
        }
        case 3: {
          const text = new TextDecoder('utf-8').decode(payload);
          onEvent({ type: 'queue', position: text });
          break;
        }
        case 4: {
          onEvent({ type: 'waiting' });
          break;
        }
        default:
          // ignore unknown
          break;
      }
    }
  }
}
