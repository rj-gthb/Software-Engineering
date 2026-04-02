import { clearAuthSession, getAuthSession, getAuthToken, setAuthSession } from './auth';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

function buildUrl(path, params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  }

  const queryString = query.toString();
  return `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

function clearSessionOnUnauthorized(status) {
  if (status === 401) {
    clearAuthSession();
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    clearSessionOnUnauthorized(response.status);
    throw new Error(payload?.error?.message ?? 'Request failed.');
  }

  return payload;
}

export async function apiJsonRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, token = getAuthToken(), params = {} } = options;
  const requestHeaders = { ...headers };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseResponse(response);
}

export async function apiRequest(path, options = {}) {
  const payload = await apiJsonRequest(path, options);
  return payload?.data;
}

export async function downloadFile(path, options = {}) {
  const { params = {}, filename = 'download.csv', headers = {}, token = getAuthToken() } = options;
  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, params), {
    method: 'GET',
    headers: requestHeaders,
  });

  if (!response.ok) {
    clearSessionOnUnauthorized(response.status);
    let message = 'Download failed.';

    try {
      const payload = await response.json();
      message = payload?.error?.message ?? message;
    } catch {
      // Ignore JSON parsing issues for file responses.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

export function syncCurrentUser(updatedUser) {
  const currentSession = getAuthSession();

  if (!currentSession?.user || !updatedUser || currentSession.user.id !== updatedUser.id) {
    return;
  }

  setAuthSession({
    ...currentSession,
    user: {
      ...currentSession.user,
      ...updatedUser,
    },
  });
}
