const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || 'Ocurrio un error inesperado');
  }
  return data;
}

export const api = {
  login: (username, pin) => request('/auth/login', { method: 'POST', body: { username, pin } }),
  me: (token) => request('/auth/me', { token }),
  changePin: (token, currentPin, newPin) =>
    request('/auth/change-pin', { method: 'POST', token, body: { currentPin, newPin } }),

  currentSession: (token) => request('/cash/current', { token }),
  openSession: (token, openingAmount) => request('/cash/open', { method: 'POST', token, body: { openingAmount } }),
  addMovement: (token, type, amount, concept) =>
    request('/cash/movements', { method: 'POST', token, body: { type, amount, concept } }),
  closeSession: (token, countedAmount, notes) =>
    request('/cash/close', { method: 'POST', token, body: { countedAmount, notes } }),
  history: (token) => request('/cash/history', { token }),
  historyDetail: (token, id) => request(`/cash/history/${id}`, { token }),

  listStaff: (token) => request('/staff', { token }),
  createStaff: (token, payload) => request('/staff', { method: 'POST', token, body: payload }),
  updateStaff: (token, id, payload) => request(`/staff/${id}`, { method: 'PATCH', token, body: payload }),

  clipTransactions: (token) => request('/clip/transactions', { token }),
  clipSync: (token, fromDate, toDate) => request('/clip/sync', { method: 'POST', token, body: { fromDate, toDate } }),
};
