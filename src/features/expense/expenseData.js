export const expenseCategories = [
  { id: 'coffee', name: 'Cà phê', value: 'Coffee', type: 'Flexible', icon: 'Coffee', color: '#7c3f20', active: true },
  { id: 'food', name: 'Ăn uống', value: 'Food', type: 'Flexible', icon: 'Utensils', color: '#0f766e', active: true },
  { id: 'fuel', name: 'Xăng xe', value: 'Fuel', type: 'Flexible', icon: 'Fuel', color: '#b45309', active: true },
  { id: 'shopping', name: 'Mua sắm', value: 'Shopping', type: 'Flexible', icon: 'ShoppingBag', color: '#be123c', active: true },
  { id: 'travel', name: 'Du lịch', value: 'Travel', type: 'Flexible', icon: 'Plane', color: '#2563eb', active: true },
  { id: 'other', name: 'Khác', value: 'Other', type: 'Flexible', icon: 'Receipt', color: '#64748b', active: true },
  { id: 'rent', name: 'Thuê nhà', value: 'House Rent', type: 'Fixed', icon: 'Home', color: '#475569', active: true },
  { id: 'internet', name: 'Internet', type: 'Fixed', icon: 'Wifi', color: '#0891b2', active: true },
  { id: 'insurance', name: 'Bảo hiểm', value: 'Insurance', type: 'Fixed', icon: 'Shield', color: '#4f46e5', active: true },
];

const categoryLabels = Object.fromEntries(expenseCategories.flatMap((item) => [[item.name, item.name], [item.value || item.name, item.name]]));
export const expenseCategoryLabel = (value) => categoryLabels[value] || value || 'Khác';

export const defaultFixedExpenses = [
  {
    id: 'fixed-rent',
    name: 'Thuê nhà',
    amount: 6700000,
    category: 'House Rent',
    payment_day: 1,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    status: 'Active',
    notes: '',
  },
];

export function sumBy(rows, predicate = () => true) {
  return rows.filter(predicate).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function monthKey(date) {
  return String(date || '').slice(0, 7);
}
