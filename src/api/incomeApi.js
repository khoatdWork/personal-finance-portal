const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';

export async function fetchIncome() {
  const response = await fetch(`${API_BASE_URL}/income`);
  if (!response.ok) throw new Error('Unable to load income');
  return response.json();
}

export async function createIncome(payload) {
  const response = await fetch(`${API_BASE_URL}/income`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to create income');
  return response.json();
}
