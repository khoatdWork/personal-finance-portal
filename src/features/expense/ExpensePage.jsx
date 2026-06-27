import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, Plus, Receipt, Repeat, Search, Trash2, WalletCards, X } from 'lucide-react';
import { ChartCard } from '../../components/ChartCard';
import { DataTable } from '../../components/DataTable';
import { StatCard } from '../../components/StatCard';
import { createExpense, createFixedExpense, deleteExpense, fetchExpenseDashboard, fetchExpenses, fetchFixedExpenses } from '../../api/expenseApi';
import { formatCurrency, formatDate } from '../../utils/format';
import { defaultFixedExpenses, expenseCategories, expenseCategoryLabel, monthKey, sumBy } from './expenseData';

const pageSize = 12;
const paymentMethods = ['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử'];
const sourceLabels = { Web: 'Trang web', Telegram: 'Telegram' };
const typeLabels = { Fixed: 'Cố định', Flexible: 'Linh hoạt' };
const statusLabels = { Active: 'Đang hoạt động', Paused: 'Tạm dừng', Inactive: 'Ngừng dùng' };
const paymentLabels = { Cash: 'Tiền mặt', 'Bank Transfer': 'Chuyển khoản', Card: 'Thẻ', 'E-wallet': 'Ví điện tử' };

export function ExpensePage() {
  const [rows, setRows] = useState([]);
  const [fixedRows, setFixedRows] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [method, setMethod] = useState('all');
  const [source, setSource] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [apiState, setApiState] = useState({ loading: true, error: '' });

  useEffect(() => {
    reload();
  }, []);

  function reload() {
    setApiState({ loading: true, error: '' });
    Promise.all([fetchExpenses(), fetchFixedExpenses(), fetchExpenseDashboard()])
      .then(async ([expenseData, fixedData, dashboardData]) => {
        const fixedItems = fixedData.items || [];
        const hasRent = fixedItems.some((row) => row.name === 'Thuê nhà' || row.category === 'House Rent');
        const fixedRows = hasRent
          ? fixedItems
          : [await createFixedExpense(defaultFixedExpenses[0]), ...fixedItems];
        setRows(expenseData.items || []);
        setFixedRows(fixedRows);
        setDashboard({ ...dashboardData, fixed: sumBy(fixedRows, (row) => row.status === 'Active') });
        setApiState({ loading: false, error: '' });
      })
      .catch(() => setApiState({ loading: false, error: 'Không tải được dữ liệu chi tiêu.' }));
  }

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const haystack = `${row.category} ${row.description} ${row.payment_method} ${row.source}`.toLowerCase();
      return haystack.includes(query.toLowerCase())
        && (category === 'all' || row.category === category)
        && (method === 'all' || paymentLabel(row.payment_method) === method)
        && (source === 'all' || row.source === source)
        && (!fromDate || row.date >= fromDate)
        && (!toDate || row.date <= toDate);
    });
    return [...filtered].sort((a, b) => sort === 'amount-desc'
      ? Number(b.amount) - Number(a.amount)
      : `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [category, fromDate, method, query, rows, sort, source, toDate]);

  const stats = useMemo(() => makeStats(rows, fixedRows, dashboard), [dashboard, fixedRows, rows]);
  const trend = useMemo(() => monthlyTrend(rows), [rows]);
  const byCategory = useMemo(() => categoryTrend(rows), [rows]);
  const fixedVsFlexible = [
    { label: 'Cố định', value: stats.fixed },
    { label: 'Linh hoạt', value: stats.flexible },
  ];
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = visibleRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function addExpense(data) {
    const created = await createExpense(data);
    setRows((items) => [created, ...items]);
    setModal(null);
    reload();
  }

  async function addFixed(data) {
    await createFixedExpense(data);
    setModal(null);
    reload();
  }

  async function bulkDelete() {
    await Promise.all(selected.map(deleteExpense));
    setSelected([]);
    reload();
  }

  function exportCsv() {
    const blob = new Blob([makeCsv(visibleRows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chi-tieu.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: 'select', header: '', render: (_, row) => <input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, row.id] : items.filter((id) => id !== row.id))} aria-label={`Chọn ${row.description || expenseCategoryLabel(row.category)}`} /> },
    { key: 'date', header: 'Ngày', render: formatDate },
    { key: 'time', header: 'Giờ' },
    { key: 'category', header: 'Danh mục', render: (value) => <span className="status warning">{expenseCategoryLabel(value)}</span> },
    { key: 'description', header: 'Mô tả', render: (value) => cleanDescription(value) || '-' },
    { key: 'payment_method', header: 'Thanh toán', render: paymentLabel },
    { key: 'source', header: 'Nguồn', render: (value) => <span className={`status ${String(value).toLowerCase()}`}>{sourceLabels[value] || value}</span> },
    { key: 'amount', header: 'Số tiền', render: (value) => <span className="money-negative">-{formatCurrency(value)}</span> },
  ];

  return (
    <section className="page-stack expense-page">
      <div className="page-toolbar">
        <div>
          <h1>Quản lý chi tiêu</h1>
          <p>Nhập nhanh từ trang web hoặc Telegram, lưu đồng bộ vào Google Sheets.</p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" onClick={() => setModal('fixed')}><Repeat size={18} /> Chi cố định</button>
          <button className="primary-button" onClick={() => setModal('expense')}><Plus size={18} /> Nhập nhanh</button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Hôm nay" value={formatCurrency(stats.today)} tone="danger" icon={Receipt} />
        <StatCard title="Tháng này" value={formatCurrency(stats.month)} tone="warning" icon={WalletCards} />
        <StatCard title="Chi cố định" value={formatCurrency(stats.fixed)} tone="info" icon={Repeat} />
        <StatCard title="Chi linh hoạt" value={formatCurrency(stats.flexible)} tone="danger" icon={CalendarDays} />
      </div>

      <div className="chart-grid">
        <ChartCard title="Xu hướng chi tiêu theo tháng" type="line" data={trend} tone="danger" />
        <ChartCard title="Chi tiêu theo danh mục" type="bar" data={byCategory} tone="warning" />
        <ChartCard title="Cố định và linh hoạt" type="bar" data={fixedVsFlexible} tone="info" />
      </div>

      <section className="history-toolbar">
        <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm chi tiêu" /></div>
        <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="all">Tất cả danh mục</option>
          {[...new Set([...expenseCategories.map((item) => item.value || item.name), ...rows.map((row) => row.category)])].filter(Boolean).map((item) => <option key={item} value={item}>{expenseCategoryLabel(item)}</option>)}
        </select>
        <select value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }}>
          <option value="all">Tất cả phương thức</option>
          {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }}>
          <option value="all">Tất cả nguồn</option>
          <option value="Web">Trang web</option>
          <option value="Telegram">Telegram</option>
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Từ ngày" />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Đến ngày" />
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="date-desc">Mới nhất trước</option>
          <option value="amount-desc">Số tiền cao nhất</option>
        </select>
        <button className="secondary-button" onClick={exportCsv}><Download size={18} /> CSV</button>
        <button className="secondary-button" disabled={!selected.length} onClick={bulkDelete}><Trash2 size={18} /> Xóa</button>
      </section>

      {apiState.loading && <p className="api-status">Đang tải dữ liệu chi tiêu...</p>}
      {apiState.error && <p className="api-status error">{apiState.error} <button className="secondary-button compact" onClick={reload}>Thử lại</button></p>}
      <DataTable columns={columns} rows={pagedRows} emptyText="Chưa có khoản chi nào. Thêm tại đây hoặc gửi `cà phê 45k` từ Telegram." />
      <div className="pagination expense-pagination">
        <span>{visibleRows.length ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, visibleRows.length)} / ${visibleRows.length}` : '0 / 0'}</span>
        <div>
          <button className="secondary-button table-action" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Trước</button>
          <button className="secondary-button table-action" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Sau</button>
        </div>
      </div>

      <FixedExpenses rows={fixedRows} />
      {modal === 'expense' && <ExpenseForm onCancel={() => setModal(null)} onSubmit={addExpense} />}
      {modal === 'fixed' && <FixedExpenseForm onCancel={() => setModal(null)} onSubmit={addFixed} />}
    </section>
  );
}

function ExpenseForm({ onCancel, onSubmit }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    onSubmit({
      amount: Number(data.amount),
      category: data.category,
      expense_type: 'Flexible',
      description: data.description,
      date: data.date,
      time: data.time || '00:00',
      payment_method: data.payment_method,
      source: 'Web',
    });
  }

  return (
    <Modal title="Thêm chi tiêu" onCancel={onCancel}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
          <label>Số tiền<input name="amount" required autoFocus type="number" min="1" placeholder="45000" /></label>
          <label>Danh mục<select name="category">{expenseCategories.filter((item) => item.type === 'Flexible').map((item) => <option key={item.id} value={item.value || item.name}>{item.name}</option>)}</select></label>
          <label>Mô tả<input name="description" placeholder="Cà phê gặp khách" /></label>
          <label>Ngày<input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Giờ<input name="time" type="time" defaultValue={new Date().toTimeString().slice(0, 5)} /></label>
          <label>Thanh toán<select name="payment_method">{paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    </Modal>
  );
}

function FixedExpenseForm({ onCancel, onSubmit }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    onSubmit({
      name: data.name,
      amount: Number(data.amount),
      category: data.category,
      payment_day: Number(data.payment_day),
      start_date: data.start_date,
      end_date: data.end_date || null,
      status: data.status,
      notes: data.notes,
    });
  }

  return (
    <Modal title="Chi cố định" onCancel={onCancel}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
          <label>Tên khoản chi<input name="name" required autoFocus placeholder="Internet" /></label>
          <label>Số tiền<input name="amount" required type="number" min="1" placeholder="300000" /></label>
          <label>Danh mục<select name="category">{expenseCategories.filter((item) => item.type === 'Fixed').map((item) => <option key={item.id} value={item.value || item.name}>{item.name}</option>)}</select></label>
          <label>Ngày thanh toán<input name="payment_day" required type="number" min="1" max="31" defaultValue="1" /></label>
          <label>Ngày bắt đầu<input name="start_date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Ngày kết thúc<input name="end_date" type="date" /></label>
          <label>Trạng thái<select name="status"><option value="Active">Đang hoạt động</option><option value="Paused">Tạm dừng</option><option value="Inactive">Ngừng dùng</option></select></label>
          <label className="wide-field">Ghi chú<input name="notes" placeholder="Ghi chú tùy chọn" /></label>
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    </Modal>
  );
}

function FixedExpenses({ rows }) {
  return (
    <section className="panel fixed-expense-panel">
      <div className="section-heading"><div><p className="eyebrow">Định kỳ</p><h2>Chi cố định</h2></div></div>
      {rows.length ? rows.map((row) => (
        <div className="compact-row" key={row.id}>
          <div><strong>{row.name}</strong><p>{expenseCategoryLabel(row.category)} - lần thanh toán tới {nextPayment(row.payment_day)}</p></div>
          <span className={`status ${String(row.status).toLowerCase()}`}>{statusLabels[row.status] || row.status}</span>
          <b>{formatCurrency(row.amount)}</b>
        </div>
      )) : <div className="empty-state">Chưa có khoản chi cố định.</div>}
    </section>
  );
}

function Modal({ title, children, onCancel }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="modal wide" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onCancel} aria-label="Đóng"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function FormActions({ onCancel }) {
  return <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Hủy</button><button type="submit" className="primary-button">Lưu</button></div>;
}

function makeStats(rows, fixedRows, dashboard) {
  if (dashboard) return dashboard;
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  return {
    today: sumBy(rows, (row) => row.date === today),
    month: sumBy(rows, (row) => monthKey(row.date) === month),
    fixed: sumBy(fixedRows, (row) => row.status === 'Active'),
    flexible: sumBy(rows, (row) => row.expense_type === 'Flexible' && monthKey(row.date) === month),
  };
}

function monthlyTrend(rows) {
  const grouped = rows.reduce((items, row) => {
    const key = monthKey(row.date);
    items[key] = (items[key] || 0) + Number(row.amount || 0);
    return items;
  }, {});
  return Object.keys(grouped).sort().slice(-12).map((key) => ({ label: key, value: grouped[key] }));
}

function categoryTrend(rows) {
  const grouped = rows.reduce((items, row) => {
    const key = expenseCategoryLabel(row.category || 'Other');
    items[key] = (items[key] || 0) + Number(row.amount || 0);
    return items;
  }, {});
  return Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
}

function nextPayment(day) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), Number(day || 1));
  if (date < now) date.setMonth(date.getMonth() + 1);
  return formatDate(date.toISOString().slice(0, 10));
}

function makeCsv(rows) {
  const headers = ['Ngày', 'Giờ', 'Số tiền', 'Danh mục', 'Loại', 'Mô tả', 'Thanh toán', 'Nguồn'];
  const lines = rows.map((row) => [row.date, row.time, row.amount, expenseCategoryLabel(row.category), typeLabels[row.expense_type] || row.expense_type, cleanDescription(row.description), paymentLabel(row.payment_method), sourceLabels[row.source] || row.source]
    .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function cleanDescription(value) {
  return String(value || '').replace(/\s*\[tg:[^\]]+\]\s*/g, '').trim();
}

function paymentLabel(value) {
  return paymentLabels[value] || value || 'Tiền mặt';
}
