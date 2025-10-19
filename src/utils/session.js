import { nanoid } from 'nanoid';

const STORAGE_KEY = 'clientSessionId';

export const getClientSessionId = () => {
  if (typeof window === 'undefined') {
    return 'server-session';
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const id = nanoid();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch (error) {
    // localStorage might be unavailable (e.g., in private mode)
    return `fallback-${nanoid()}`;
  }
};

export default getClientSessionId;
