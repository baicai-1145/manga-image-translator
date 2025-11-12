const USER_STORAGE_KEY = 'mineru-user-id';

export function getUserId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(USER_STORAGE_KEY);
}

export function setUserId(userId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (userId && userId.trim().length) {
    localStorage.setItem(USER_STORAGE_KEY, userId.trim());
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

