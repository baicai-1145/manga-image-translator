import { defineStore } from 'pinia';

interface UiState {
  errorMessage: string | null;
  uploading: boolean;
  isLoading: boolean;
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    errorMessage: null,
    uploading: false,
    isLoading: false
  }),
  actions: {
    setError(message: string | null) {
      this.errorMessage = message;
    },
    setUploading(value: boolean) {
      this.uploading = value;
    },
    setLoading(value: boolean) {
      this.isLoading = value;
    },
    clearError() {
      this.errorMessage = null;
    }
  }
});

