import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  Copy,
  Download,
  FileSpreadsheet,
  Plus,
  Repeat,
  Search,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { ChartCard } from '../../components/ChartCard';
import { DataTable } from '../../components/DataTable';
import { StatCard } from '../../components/StatCard';
import { createIncome, fetchIncome } from '../../api/incomeApi';
import { createIncomeSource, fetchIncomeSources } from '../../api/financeApi';
import { formatCurrency, formatDate, formatPercent } from '../../utils/format';
import {
  categoryName,
  generateRecurringTransactions,
  incomeCategories as defaultCategories,
  incomeSources as defaultSources,
  incomeTransactions as defaultTransactions,
  makeCsv,
  monthKey,
  sameWeek,
  sumBy,
} from './incomeData';

const typeLabels = { fixed: 'Cố định', daily: 'Hằng ngày', freelance: 'Tự do', other: 'Khác', variable: 'Biến động', 'one-time': 'Một lần' };

export function IncomePage() {
  const [categories] = useState(defaultCategories);
  const [sources, setSources] = useState(defaultSources);
  const [transactions, setTransactions] = useState(defaultTransactions);
  const [modal, setModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [backendRows, setBackendRows] = useState([]);
  const [apiState, setApiState] = useState({ loading: true, error: '' });

  useEffect(() => {
    loadBackendRows();
  }, []);

  function loadBackendRows() {
    setApiState({ loading: true, error: '' });
    fetchIncome()
      .then((data) => {
        setBackendRows(data.items.map(mapApiIncome));
        setApiState({ loading: false, error: '' });
      })
      .catch(() => setApiState({ loading: false, error: 'Không tải được dữ liệu thu nhập.' }));
    fetchIncomeSources()
      .then((data) => setSources(data.items || []))
      .catch(() => {});
  }

  const generatedTransactions = useMemo(
    () => generateRecurringTransactions(sources, transactions),
    [sources, transactions],
  );
  const localRows = useMemo(() => generatedTransactions.map((row) => ({
    ...row,
    category: categoryName(categories, row.categoryId),
  })).filter((row) => !row.deleted), [categories, generatedTransactions]);
  const rows = useMemo(() => backendRows.length || apiState.loading ? backendRows : localRows, [apiState.loading, backendRows, localRows]);
  const visibleRows = rows.filter((row) => {
    const haystack = `${row.name} ${row.category} ${row.note} ${row.created_from}`.toLowerCase();
    return (typeFilter === 'all' || row.type === typeFilter)
      && (sourceFilter === 'all' || row.created_from === sourceFilter)
      && (!fromDate || row.transactionDate >= fromDate)
      && (!toDate || row.transactionDate <= toDate)
      && haystack.includes(query.toLowerCase());
  });
  const stats = useMemo(() => incomeStats(rows), [rows]);
  const monthTrend = useMemo(() => trendRows(rows), [rows]);
  const categoryTrend = useMemo(() => categoryRows(rows, categories), [categories, rows]);
  const selectedRows = selectedDate ? rows.filter((row) => row.transactionDate === selectedDate) : [];

  async function addSource(source) {
    const created = await createIncomeSource({ ...source, type: 'fixed', recurring: true });
    setSources((items) => [created, ...items]);
    setModal(null);
  }

  async function addTransaction(transaction) {
    const created = await createIncome({
      amount: transaction.amount,
      source: transaction.name,
      income_type: transaction.type === 'fixed' ? 'fixed' : 'daily',
      earned_at: `${transaction.transactionDate}T${transaction.time || '00:00'}:00+07:00`,
      note: transaction.note || null,
    });
    setBackendRows((items) => [mapApiIncome(created), ...items]);
    setModal(null);
  }

  function duplicate(row) {
    addTransaction({
      name: row.name,
      type: row.type === 'fixed' ? 'variable' : row.type,
      categoryId: row.categoryId,
      amount: row.amount,
      transactionDate: new Date().toISOString().slice(0, 10),
      time: row.time,
      note: row.note,
      attachment: row.attachment,
    });
  }

  function updateAmount(row) {
    const amount = Number(prompt('Số tiền mới', row.amount));
    if (!amount) return;
    const now = new Date().toISOString();
    setTransactions((items) => items.map((item) => item.id === row.id ? { ...item, amount, updatedAt: now } : item));
  }

  function deleteRow(row) {
    if (!confirm(`Xóa ${row.name}?`)) return;
    setTransactions((items) => items.map((item) => item.id === row.id ? { ...item, deleted: true, updatedAt: new Date().toISOString() } : item));
  }

  function exportCsv() {
    const blob = new Blob([makeCsv(visibleRows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lich-su-thu-nhap.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: 'transactionDate', header: 'Ngày', render: formatDate },
    { key: 'type', header: 'Loại', render: (value) => <span className={`status ${value}`}>{typeLabels[value] || value}</span> },
    { key: 'note', header: 'Ghi chú', render: (value) => value || '—' },
    { key: 'created_from', header: 'Nguồn nhập', render: (value) => value ? <span className={`status ${value}`}>{value === 'telegram' ? 'Telegram' : 'Trang web'}</span> : 'Trang web' },
    { key: 'amount', header: 'Số tiền', render: (value) => <span className={Number(value) >= 0 ? 'money-positive' : 'money-negative'}>{formatCurrency(value)}</span> },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="inline-actions">
          <button className="icon-button small" onClick={() => duplicate(row)} aria-label="Nhân bản"><Copy size={15} /></button>
          <button className="icon-button small" onClick={() => updateAmount(row)} aria-label="Sửa số tiền"><CircleDollarSign size={15} /></button>
          <button className="icon-button small" onClick={() => deleteRow(row)} aria-label="Xóa"><X size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <section className="page-stack income-page">
      <div className="page-toolbar">
        <div>
          <h1>Quản lý thu nhập</h1>
          <p>Theo dõi nguồn thu định kỳ, khoản thu hằng ngày, biểu đồ, lịch và lịch sử xuất CSV.</p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" onClick={() => setModal('source')}><Repeat size={18} /> Nguồn cố định</button>
          <button className="primary-button" onClick={() => setModal('income')}><Plus size={18} /> Thêm khoản thu</button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Hôm nay" value={formatCurrency(stats.today)} tone="positive" icon={CircleDollarSign} />
        <StatCard title="Tuần này" value={formatCurrency(stats.week)} tone="info" icon={CalendarDays} />
        <StatCard title="Tháng này" value={formatCurrency(stats.month)} tone="positive" icon={WalletCards} />
        <StatCard title="Năm nay" value={formatCurrency(stats.year)} tone="info" icon={TrendingUp} />
        <StatCard title="Thu cố định" value={formatCurrency(stats.fixed)} tone="positive" icon={Repeat} />
        <StatCard title="Thu biến động" value={formatCurrency(stats.variable)} tone="info" icon={CircleDollarSign} />
        <StatCard title="Thu một lần" value={formatCurrency(stats.oneTime)} tone="warning" icon={FileSpreadsheet} />
        <StatCard title="Trung bình ngày" value={formatCurrency(stats.averageDaily)} tone="info" icon={CalendarDays} />
        <StatCard title="Ngày cao nhất" value={formatCurrency(stats.highestDay)} tone="positive" icon={TrendingUp} />
        <StatCard title="Tăng trưởng tháng" value={formatPercent(stats.growth)} tone={stats.growth >= 0 ? 'positive' : 'danger'} icon={TrendingUp} />
      </div>

      <div className="chart-grid">
        <ChartCard title="Xu hướng thu nhập theo tháng" type="line" data={monthTrend} tone="info" />
        <ChartCard title="Thu nhập theo danh mục" type="bar" data={categoryTrend} tone="positive" />
      </div>

      <div className="income-grid">
        <CalendarView rows={rows} selectedDate={selectedDate} onSelect={setSelectedDate} />
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Giao dịch trong ngày</p>
              <h2>{selectedDate ? formatDate(selectedDate) : 'Chọn một ngày'}</h2>
            </div>
          </div>
          {selectedRows.length ? selectedRows.map((row) => (
            <div className="day-row" key={row.id}>
              <span className={`dot ${row.type}`} />
              <div>
                <strong>{row.name}</strong>
                <p>{row.category} - {typeLabels[row.type]}</p>
              </div>
              <b>{formatCurrency(row.amount)}</b>
            </div>
          )) : <p className="empty-copy">Chưa có khoản thu trong ngày này.</p>}
        </section>
      </div>

      <section className="history-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khoản thu" />
        </div>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">Tất cả loại</option>
          <option value="fixed">Cố định</option>
          <option value="daily">Hằng ngày</option>
          <option value="freelance">Tự do</option>
          <option value="other">Khác</option>
          <option value="variable">Biến động</option>
          <option value="one-time">Một lần</option>
        </select>        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
          <option value="all">Tất cả nguồn nhập</option>
          <option value="telegram">Telegram</option>
          <option value="web">Trang web</option>
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Từ ngày" />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Đến ngày" />

        <button className="secondary-button" onClick={exportCsv}><Download size={18} /> Xuất CSV</button>
      </section>

      {apiState.loading && <p className="api-status">Đang tải dữ liệu từ máy chủ...</p>}
      {apiState.error && <p className="api-status error">{apiState.error} <button className="secondary-button compact" onClick={loadBackendRows}>Thử lại</button></p>}
      {!apiState.loading && !visibleRows.length && <p className="api-status">Chưa có khoản thu nào.</p>}
      <DataTable columns={columns} rows={visibleRows} emptyText="Chưa có khoản thu nào. Thêm khoản thu đầu tiên hoặc gửi 500k từ Telegram." />

      {modal === 'income' && <IncomeForm categories={categories} onCancel={() => setModal(null)} onSubmit={addTransaction} />}
      {modal === 'source' && <SourceForm categories={categories.filter((item) => item.type === 'fixed')} onCancel={() => setModal(null)} onSubmit={addSource} />}
    </section>
  );
}

function mapApiIncome(row) {
  return {
    id: row.id,
    name: row.source,
    type: row.income_type,
    category: row.created_from === 'telegram' ? 'Telegram' : 'API',
    amount: row.amount,
    transactionDate: row.earned_date,
    time: row.earned_time,
    note: row.note || row.raw_input || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    created_from: row.created_from,
  };
}

function incomeStats(rows) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const year = String(now.getFullYear());
  const month = today.slice(0, 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const dailyTotals = Object.values(rows.reduce((grouped, row) => {
    grouped[row.transactionDate] = (grouped[row.transactionDate] || 0) + Number(row.amount);
    return grouped;
  }, {}));
  const currentMonth = sumBy(rows, (row) => monthKey(row.transactionDate) === month);
  const lastMonth = sumBy(rows, (row) => monthKey(row.transactionDate) === previousMonth);

  return {
    today: sumBy(rows, (row) => row.transactionDate === today),
    week: sumBy(rows, (row) => sameWeek(row.transactionDate, now)),
    month: currentMonth,
    year: sumBy(rows, (row) => row.transactionDate.startsWith(year)),
    fixed: sumBy(rows, (row) => row.type === 'fixed'),
    variable: sumBy(rows, (row) => row.type === 'variable'),
    oneTime: sumBy(rows, (row) => row.type === 'one-time'),
    averageDaily: dailyTotals.length ? dailyTotals.reduce((sum, value) => sum + value, 0) / dailyTotals.length : 0,
    highestDay: Math.max(0, ...dailyTotals),
    growth: lastMonth ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0,
  };
}

function trendRows(rows) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const key = date.toISOString().slice(0, 7);
    return { label: `${date.getMonth() + 1}/${String(date.getFullYear()).slice(2)}`, value: sumBy(rows, (row) => monthKey(row.transactionDate) === key) };
  });
}

function categoryRows(rows, categories) {
  return categories
    .map((category) => ({ label: category.name, value: sumBy(rows, (row) => row.categoryId === category.id) }))
    .filter((item) => item.value > 0)
    .slice(0, 6);
}

function CalendarView({ rows, selectedDate, onSelect }) {
  const [cursor, setCursor] = useState(new Date());
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = start.getDay();
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + days }, (_, index) => index < offset ? null : index - offset + 1);

  return (
    <section className="panel income-calendar">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lịch thu nhập</p>
          <h2>{cursor.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h2>
        </div>
        <div className="inline-actions">
          <button className="icon-button small" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Tháng trước">{'<'}</button>
          <button className="icon-button small" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Tháng sau">{'>'}</button>
        </div>
      </div>
      <div className="calendar-grid">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => <b key={day}>{day}</b>)}
        {cells.map((day, index) => {
          const date = day ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const dayRows = rows.filter((row) => row.transactionDate === date);
          const total = sumBy(dayRows);
          return (
            <button key={`${day}-${index}`} className={selectedDate === date ? 'selected' : ''} disabled={!day} onClick={() => onSelect(date)}>
              <span>{day}</span>
              {total > 0 && <strong>{formatCurrency(total)}</strong>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function IncomeForm({ categories, onCancel, onSubmit }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    onSubmit({
      name: data.name,
      type: data.type,
      categoryId: data.categoryId,
      amount: Number(data.amount),
      transactionDate: data.transactionDate,
      time: data.time,
      note: data.note,
      attachment: data.attachment,
    });
  }

  return (
    <Modal title="Thêm khoản thu" onCancel={onCancel}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
          <label>Tên khoản thu<input name="name" required autoFocus placeholder="Dự án làm tự do" /></label>
          <label>Loại<select name="type" defaultValue="variable"><option value="variable">Biến động</option><option value="one-time">Một lần</option></select></label>
          <label>Danh mục<select name="categoryId">{categories.filter((item) => item.type !== 'fixed').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Số tiền<input name="amount" required type="number" min="0" placeholder="1000000" /></label>
          <label>Ngày<input name="transactionDate" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Giờ<input name="time" type="time" /></label>
          <label className="wide-field">Ghi chú<input name="note" placeholder="Ghi chú tùy chọn" /></label>
          <label className="wide-field">Đính kèm<input name="attachment" placeholder="Tên tệp hoặc liên kết" /></label>
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    </Modal>
  );
}

function SourceForm({ categories, onCancel, onSubmit }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    onSubmit({
      name: data.name,
      categoryId: data.categoryId,
      recurringDay: Number(data.recurringDay),
      startDate: data.startDate,
      endDate: data.endDate,
      defaultAmount: Number(data.defaultAmount),
      status: data.status,
      description: data.description,
      color: data.color,
      icon: data.icon,
    });
  }

  return (
    <Modal title="Nguồn thu cố định hằng tháng" onCancel={onCancel}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
          <label>Tên nguồn thu<input name="name" required autoFocus placeholder="Lương công ty" /></label>
          <label>Danh mục<select name="categoryId">{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Số tiền<input name="defaultAmount" required type="number" min="0" placeholder="35000000" /></label>
          <label>Ngày nhận<input name="recurringDay" required type="number" min="1" max="31" defaultValue="25" /></label>
          <label>Ngày bắt đầu<input name="startDate" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Ngày kết thúc<input name="endDate" type="date" /></label>
          <label>Trạng thái<select name="status"><option value="active">Đang hoạt động</option><option value="paused">Tạm dừng</option><option value="inactive">Ngừng dùng</option></select></label>
          <label>Màu<input name="color" type="color" defaultValue="#0066cc" /></label>
          <label>Biểu tượng<input name="icon" defaultValue="Briefcase" /></label>
          <label className="wide-field">Mô tả<input name="description" placeholder="Mô tả tùy chọn" /></label>
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    </Modal>
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
  return (
    <div className="form-actions">
      <button type="button" className="secondary-button" onClick={onCancel}>Hủy</button>
      <button type="submit" className="primary-button">Lưu</button>
    </div>
  );
}
