import { defineStore } from 'pinia';

interface BatchState {
  previews: Record<string, string[]>; // taskId -> array of object URLs
  zips: Record<string, Blob | undefined>;
}

export const useBatchStore = defineStore('batch', {
  state: (): BatchState => ({
    previews: {},
    zips: {}
  }),
  actions: {
    setBatchData(taskId: string, urls: string[], zip?: Blob) {
      this.previews[taskId] = urls;
      if (zip) this.zips[taskId] = zip;
    },
    clear(taskId: string) {
      const urls = this.previews[taskId] ?? [];
      urls.forEach(u => URL.revokeObjectURL(u));
      delete this.previews[taskId];
      delete this.zips[taskId];
    }
  }
});

