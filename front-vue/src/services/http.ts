import axios from 'axios';
import { resolveApiBase } from './config';
import { getUserId } from '@/utils/session';

export const http = axios.create({
  timeout: 120000
});

const initialBase = resolveApiBase();
if (initialBase) {
  http.defaults.baseURL = initialBase;
}

http.interceptors.request.use((config) => {
  const base = resolveApiBase();
  if (base) config.baseURL = base;
  const headers = (config.headers ??= {});
  const userId = getUserId();
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  return config;
});

