const AUTH_STORAGE_KEY = 'pinpoint-auth-session';

function notifyAuthChange() {
  window.dispatchEvent(new Event('auth-session-changed'));
}

export function getAuthSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  notifyAuthChange();
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  notifyAuthChange();
}

export function getAuthToken() {
  return getAuthSession()?.token ?? null;
}

export function getCurrentUser() {
  return getAuthSession()?.user ?? null;
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
