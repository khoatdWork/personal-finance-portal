const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) throw new Error('Expense API failed');
  return response.json();
}

export const fetchExpenses = () => request('/expenses');
export const fetchExpenseDashboard = () => request('/expenses/dashboard');
export const fetchFixedExpenses = () => request('/expenses/fixed/list');
export const createExpense = (payload) => request('/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const createFixedExpense = (payload) => request('/expenses/fixed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
export const deleteExpense = (id) => request(`/expenses/${id}`, { method: 'DELETE' });
