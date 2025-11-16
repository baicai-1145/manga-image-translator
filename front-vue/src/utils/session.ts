const USER_STORAGE_KEY = 'mineru-user-id';

export function getUserId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  let id = localStorage.getItem(USER_STORAGE_KEY);
  // 首次访问自动生成一个用户ID并持久化，后续直接复用
  if (!id) {
    id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(USER_STORAGE_KEY, id);
  }
  return id;
}

export function setUserId(userId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (userId && userId.trim().length) {
    localStorage.setItem(USER_STORAGE_KEY, userId.trim());
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}
