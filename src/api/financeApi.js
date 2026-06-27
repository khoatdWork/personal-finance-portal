const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) throw new Error('Finance API failed');
  return response.json();
}

const post = (path, payload) => request(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const fetchSavingGoals = () => request('/finance/saving-goals');
export const createSavingGoal = (payload) => post('/finance/saving-goals', payload);
export const fetchBankLoans = () => request('/finance/bank-loans');
export const createBankLoan = (payload) => post('/finance/bank-loans', payload);
export const fetchIncomeSources = () => request('/finance/income-sources');
export const createIncomeSource = (payload) => post('/finance/income-sources', payload);
