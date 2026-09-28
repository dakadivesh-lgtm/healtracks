// API Client Wrapper for WoundWise

const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('woundwise_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('woundwise_token', token);
  } else {
    localStorage.removeItem('woundwise_token');
  }
}

export function removeToken() {
  localStorage.removeItem('woundwise_token');
}

export async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Handle 401 unauthorized
  if (response.status === 401) {
    removeToken();
    window.dispatchEvent(new Event('woundwise:unauthorized'));
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = (typeof data === 'object' && data?.message) || response.statusText || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data;
}

export function getImageUrl(filename) {
  if (!filename) return '';
  const token = getToken();
  return `/api/records/image/${filename}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export function getDownloadImageUrl(filename) {
  const token = getToken();
  return `/api/records/download-image/${filename}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export function getDownloadReportUrl(id) {
  const token = getToken();
  return `/api/records/download-report/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}
