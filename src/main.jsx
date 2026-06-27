import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  Settings,
  WalletCards,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate, formatPercent } from './utils/format';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { DataTable } from './components/DataTable';
import { ProgressBar } from './components/ProgressBar';
import { ChartCard } from './components/ChartCard';
import { SavingGoalForm } from './components/SavingGoalForm';
import { LoanForm } from './components/LoanForm';
import { createBankLoan, createSavingGoal, fetchBankLoans, fetchSavingGoals } from './api/financeApi';
import { IncomePage } from './features/income/IncomePage';
import { ExpensePage } from './features/expense/ExpensePage';
import { generateRecurringTransactions, incomeSources, incomeTransactions, sumBy } from './features/income/incomeData';
import './styles.css';

const initialGoals = [];
const initialLoans = [];
const EARLY_SETTLEMENT_FEE_RATE = 0.05;

const navItems = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'income', label: 'Thu nhập', icon: CircleDollarSign },
  { id: 'expense', label: 'Chi tiêu', icon: Receipt },
  { id: 'saving', label: 'Tiết kiệm', icon: PiggyBank },
  { id: 'loan', label: 'Khoản vay ngân hàng', icon: CreditCard },
  { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

const statusLabels = {
  Active: 'Đang hoạt động',
  Paused: 'Tạm dừng',
  Completed: 'Hoàn tất',
  Closing: 'Sắp tất toán',
  Paid: 'Đã trả',
  Unpaid: 'Chưa trả',
  Overdue: 'Quá hạn',
};

const scheduleFilters = ['All', 'Paid', 'Unpaid', 'Overdue'];
const scheduleFilterLabels = {
  All: 'Tất cả',
  Paid: 'Đã trả',
  Unpaid: 'Chưa trả',
  Overdue: 'Quá hạn',
};
const schedulePageSize = 12;

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function getOutstandingPrincipal(loan) {
  return Number(loan.outstandingPrincipal ?? loan.remainingBalance) || 0;
}

function createRepaymentSchedule(loan) {
  let balance = getOutstandingPrincipal(loan);
  const monthlyRate = loan.interestRate / 100 / 12;
  const totalInstallments = Number(loan.installmentsPaid || 0) + Number(loan.remainingTermMonths || 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: totalInstallments }, (_, index) => {
    const installmentNumber = index + 1;
    const dueDate = addMonths(loan.startDate || loan.dueDate, index);
    const isFinalInstallment = installmentNumber === totalInstallments;
    const interestAmount = isFinalInstallment ? loan.monthlyPayment - balance : Math.round(balance * monthlyRate);
    const principalAmount = isFinalInstallment ? balance : loan.monthlyPayment - interestAmount;
    balance = Math.max(0, balance - principalAmount);
    const isPaid = installmentNumber <= Number(loan.installmentsPaid || 0);

    return {
      id: `${loan.id}-installment-${installmentNumber}`,
      installmentNumber,
      dueDate,
      paymentAmount: loan.monthlyPayment,
      principalAmount,
      interestAmount,
      remainingBalance: balance,
      status: isPaid ? 'Paid' : new Date(dueDate) < today ? 'Overdue' : 'Unpaid',
    };
  });
}

function withLoanCalculations(loan) {
  const outstandingPrincipal = getOutstandingPrincipal(loan);
  const earlySettlementFee = Math.round(outstandingPrincipal * EARLY_SETTLEMENT_FEE_RATE);

  return {
    ...loan,
    remainingBalance: outstandingPrincipal,
    outstandingPrincipal,
    dueDay: loan.dueDay ?? new Date(loan.dueDate).getDate(),
    installmentsPaid: Number(loan.installmentsPaid || 0),
    earlySettlementFee,
    earlySettlementAmount: outstandingPrincipal + earlySettlementFee,
    repaymentSchedule: loan.repaymentSchedule ?? createRepaymentSchedule({ ...loan, outstandingPrincipal }),
  };
}

function findCurrentInstallment(schedule) {
  return schedule.find((installment) => installment.status !== 'Paid')?.id;
}

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [savingGoals, setSavingGoals] = useState(initialGoals);
  const [bankLoans, setBankLoans] = useState(initialLoans);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([fetchSavingGoals(), fetchBankLoans()])
      .then(([goals, loans]) => {
        setSavingGoals(goals.items || []);
        setBankLoans((loans.items || []).map(withLoanCalculations));
      })
      .catch(() => {});
  }, []);

  const summary = useMemo(() => {
    const totalSavings = savingGoals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
    const totalLoanBalance = bankLoans.reduce((sum, loan) => sum + Number(loan.remainingBalance), 0);
    const totalEarlySettlementAmount = bankLoans.reduce((sum, loan) => sum + Number(loan.earlySettlementAmount), 0);
    const monthlyLoanPayment = bankLoans
      .filter((loan) => loan.status !== 'Paid')
      .reduce((sum, loan) => sum + Number(loan.monthlyPayment), 0);
    const monthlySavings = savingGoals
      .filter((goal) => goal.status !== 'Paused')
      .reduce((sum, goal) => sum + Number(goal.monthlyContribution), 0);
    const nextPayment = [...bankLoans].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    const incomeRows = generateRecurringTransactions(incomeSources, incomeTransactions);
    const month = new Date().toISOString().slice(0, 7);
    const monthlyIncome = sumBy(incomeRows, (row) => row.transactionDate?.startsWith(month));
    const netWorth = totalSavings - totalLoanBalance;
    const savingsProgress = savingGoals.length
      ? savingGoals.reduce((sum, goal) => sum + (goal.currentAmount / goal.targetAmount), 0) / savingGoals.length * 100
      : 0;

    return {
      totalSavings,
      totalLoanBalance,
      totalEarlySettlementAmount,
      monthlyLoanPayment,
      monthlyIncome,
      netWorth,
      availableCash: totalSavings,
      savingsProgress,
      incomeRows,
      netCashFlow: monthlySavings - monthlyLoanPayment,
      nextPayment,
    };
  }, [savingGoals, bankLoans]);

  const pageTitle = navItems.find((item) => item.id === activePage)?.label ?? 'Tổng quan';

  async function addSavingGoal(goal) {
    const created = await createSavingGoal({ ...goal, status: goal.status || 'Active' });
    setSavingGoals((goals) => [created, ...goals]);
    setGoalModalOpen(false);
  }

  async function addLoan(loan) {
    const created = await createBankLoan(loan);
    const nextLoan = {
      ...created,
      dueDay: new Date(created.dueDate).getDate(),
      installmentsPaid: 0,
      status: created.status || 'Active',
    };
    setBankLoans((loans) => [withLoanCalculations(nextLoan), ...loans]);
    setLoanModalOpen(false);
  }

  return (
    <div className="app-shell">
      <Sidebar items={navItems} activePage={activePage} onNavigate={setActivePage} />
      <main className="main-panel">
        <Header
          title={pageTitle}
          onQuickIncome={() => setActivePage('income')}
          onQuickExpense={() => setActivePage('expense')}
          onNewLoan={() => setLoanModalOpen(true)}
        />
        {activePage === 'dashboard' && (
          <Dashboard
            summary={summary}
            savingGoals={savingGoals}
            bankLoans={bankLoans}
            onQuickIncome={() => setActivePage('income')}
            onQuickExpense={() => setActivePage('expense')}
            onNewLoan={() => setLoanModalOpen(true)}
          />
        )}
        {activePage === 'income' && <IncomePage />}
        {activePage === 'expense' && <ExpensePage />}
        {activePage === 'saving' && (
          <MoneySavingPage goals={savingGoals} onAdd={() => setGoalModalOpen(true)} />
        )}
        {activePage === 'loan' && (
          <BankLoanPage loans={bankLoans} onAdd={() => setLoanModalOpen(true)} />
        )}
        {activePage === 'reports' && <PlaceholderPage title="Báo cáo" text="Báo cáo tài chính dùng cùng dữ liệu tiết kiệm và khoản vay." />}
        {activePage === 'settings' && <PlaceholderPage title="Cài đặt" text="Thêm hồ sơ, thông báo và tùy chọn tài chính tại đây." />}
      </main>

      {goalModalOpen && (
        <SavingGoalForm onCancel={() => setGoalModalOpen(false)} onSubmit={addSavingGoal} />
      )}
      {loanModalOpen && (
        <LoanForm onCancel={() => setLoanModalOpen(false)} onSubmit={addLoan} />
      )}
    </div>
  );
}

function Dashboard({ summary, savingGoals, bankLoans, onQuickIncome, onQuickExpense, onNewLoan }) {
  const bestGoal = savingGoals.reduce((best, goal) => {
    const progress = goal.currentAmount / goal.targetAmount;
    return progress > (best.currentAmount / best.targetAmount) ? goal : best;
  }, savingGoals[0]);

  const recentIncome = summary.incomeRows.slice(0, 5);
  const upcomingLoans = [...bankLoans]
    .filter((loan) => loan.status !== 'Paid')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);
  const loanChart = bankLoans.map((loan) => ({ label: loan.bankName, value: loan.remainingBalance }));

  return (
    <section className="page-stack">
      <div className="stats-grid">
        <StatCard title="Tài sản ròng" value={formatCurrency(summary.netWorth)} subtext={`${formatCurrency(summary.netCashFlow)} dòng tiền hằng tháng`} tone={summary.netWorth >= 0 ? 'positive' : 'danger'} icon={WalletCards} featured />
        <StatCard title="Tiền khả dụng" value={formatCurrency(summary.availableCash)} subtext="Số dư tiết kiệm" tone="positive" icon={PiggyBank} />
        <StatCard title="Thu nhập tháng" value={formatCurrency(summary.monthlyIncome)} subtext="Tháng hiện tại" tone="positive" icon={CircleDollarSign} />
        <StatCard title="Chi phí tháng" value={formatCurrency(summary.monthlyLoanPayment)} subtext="Chỉ tính khoản vay" tone="warning" icon={CreditCard} />
        <StatCard title="Tổng nợ" value={formatCurrency(summary.totalLoanBalance)} subtext={`${formatCurrency(summary.totalEarlySettlementAmount)} để tất toán sớm`} tone="danger" icon={WalletCards} />
        <StatCard title="Tiến độ tiết kiệm" value={formatPercent(summary.savingsProgress)} subtext={bestGoal?.goalName || 'Chưa có mục tiêu'} tone="warning" icon={BarChart3} />
      </div>

      <div className="dashboard-grid">
        <ChartCard title="Xu hướng tài sản ròng" type="line" data={loanChart.map((point) => ({ ...point, value: summary.totalSavings - point.value }))} tone="info" />
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Hoạt động mới nhất</p>
              <h2>Giao dịch gần đây</h2>
            </div>
          </div>
          {recentIncome.length ? recentIncome.map((row) => (
            <div className="compact-row" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <p>{formatDate(row.transactionDate)} - {row.note || 'Không có ghi chú'}</p>
              </div>
              <b className={row.amount >= 0 ? 'money-positive' : 'money-negative'}>{formatCurrency(row.amount)}</b>
            </div>
          )) : <div className="empty-state">Chưa có giao dịch.</div>}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Thanh toán tiếp theo</p>
              <h2>Khoản vay sắp đến hạn</h2>
            </div>
          </div>
          {upcomingLoans.length ? upcomingLoans.map((loan) => (
            <div className="compact-row" key={loan.id}>
              <div>
                <strong>{loan.bankName}</strong>
                <p>Hạn {formatDate(loan.dueDate)}</p>
              </div>
              <b>{formatCurrency(loan.monthlyPayment)}</b>
            </div>
          )) : <div className="empty-state">Không có khoản vay sắp đến hạn.</div>}
        </section>
        <section className="panel quick-add-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Nhập nhanh</p>
              <h2>Thêm nhanh</h2>
            </div>
          </div>
          <div className="quick-add-actions">
            <button className="primary-button compact" onClick={onQuickIncome}><Plus size={15} /> Thu nhập</button>
            <button className="secondary-button compact" onClick={onQuickExpense}><Plus size={15} /> Chi tiêu</button>
            <button className="secondary-button compact" onClick={onNewLoan}><Plus size={15} /> Khoản vay mới</button>
          </div>
        </section>
      </div>

    </section>
  );
}

function MoneySavingPage({ goals, onAdd }) {
  const columns = [
    { key: 'goalName', header: 'Mục tiêu' },
    { key: 'targetAmount', header: 'Số tiền mục tiêu', render: formatCurrency },
    { key: 'currentAmount', header: 'Hiện có', render: formatCurrency },
    {
      key: 'progress',
      header: 'Tiến độ',
      render: (_, goal) => <ProgressBar value={(goal.currentAmount / goal.targetAmount) * 100} compact />,
    },
    { key: 'monthlyContribution', header: 'Góp mỗi tháng', render: formatCurrency },
    { key: 'targetDate', header: 'Ngày mục tiêu', render: formatDate },
    { key: 'status', header: 'Trạng thái', render: (value) => <span className={`status ${value.toLowerCase()}`}>{statusLabels[value] ?? value}</span> },
  ];

  return (
    <section className="page-stack">
      <PageToolbar title="Mục tiêu tiết kiệm" description="Theo dõi mục tiêu và khoản góp hàng tháng." buttonLabel="Thêm mục tiêu" onAdd={onAdd} />
      <DataTable columns={columns} rows={goals} />
    </section>
  );
}

function BankLoanPage({ loans, onAdd }) {
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [schedulePage, setSchedulePage] = useState(1);
  const activeLoan = selectedLoan;
  const totalBalance = loans.reduce((sum, loan) => sum + Number(loan.remainingBalance), 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + Number(loan.monthlyPayment), 0);
  const nextDueLoan = [...loans].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  const averageRate = loans.length
    ? loans.reduce((sum, loan) => sum + Number(loan.interestRate), 0) / loans.length
    : 0;
  const columns = [
    { key: 'bankName', header: 'Ngân hàng' },
    { key: 'originalLoanAmount', header: 'Số tiền vay ban đầu', render: formatCurrency },
    { key: 'remainingBalance', header: 'Dư nợ còn lại', render: formatCurrency },
    { key: 'interestRate', header: 'Lãi suất', render: formatPercent },
    { key: 'monthlyPayment', header: 'Trả mỗi tháng', render: formatCurrency },
    { key: 'remainingTermMonths', header: 'Kỳ hạn còn lại', render: (value) => `${value} tháng` },
    { key: 'installmentsPaid', header: 'Kỳ đã trả' },
    { key: 'dueDay', header: 'Ngày trả hàng tháng' },
    { key: 'dueDate', header: 'Ngày đến hạn', render: formatDate },
    { key: 'startDate', header: 'Ngày bắt đầu', render: formatDate },
    { key: 'endDate', header: 'Ngày kết thúc', render: formatDate },
    { key: 'earlySettlementFee', header: 'Phí tất toán sớm', render: formatCurrency },
    { key: 'earlySettlementAmount', header: 'Số tiền tất toán sớm', render: formatCurrency },
    { key: 'status', header: 'Trạng thái', render: (value) => <span className={`status ${value.toLowerCase()}`}>{statusLabels[value] ?? value}</span> },
    {
      key: 'schedule',
      header: 'Lịch trả',
      render: (_, loan) => (
        <button className="secondary-button table-action" onClick={() => {
          setSelectedLoan(loan);
          setSchedulePage(1);
        }}>
          <CalendarDays size={16} />
          Xem lịch trả
        </button>
      ),
    },
  ];
  const scheduleColumns = [
    { key: 'installmentNumber', header: 'Kỳ' },
    { key: 'dueDate', header: 'Ngày đến hạn', render: formatDate },
    { key: 'paymentAmount', header: 'Số tiền trả hàng tháng', render: formatCurrency },
    { key: 'principalAmount', header: 'Gốc đã trả', render: formatCurrency },
    { key: 'interestAmount', header: 'Lãi đã trả', render: formatCurrency },
    { key: 'remainingBalance', header: 'Dư nợ còn lại', render: formatCurrency },
    { key: 'status', header: 'Trạng thái', render: (value) => <span className={`status ${value.toLowerCase()}`}>{statusLabels[value] ?? value}</span> },
  ];
  const filteredSchedule = activeLoan?.repaymentSchedule
    ? statusFilter === 'All'
      ? activeLoan.repaymentSchedule
      : activeLoan.repaymentSchedule.filter((installment) => installment.status === statusFilter)
    : [];
  const schedulePageCount = Math.max(1, Math.ceil(filteredSchedule.length / schedulePageSize));
  const safeSchedulePage = Math.min(schedulePage, schedulePageCount);
  const visibleSchedule = filteredSchedule.slice((safeSchedulePage - 1) * schedulePageSize, safeSchedulePage * schedulePageSize);

  return (
    <section className="page-stack">
      <PageToolbar title="Khoản vay ngân hàng" description="Quản lý dư nợ, ngày đến hạn, lãi suất và kỳ hạn trả nợ." buttonLabel="Thêm khoản vay" onAdd={onAdd} />
      <div className="loan-summary-grid">
        <StatCard title={'T\u1ed5ng d\u01b0 n\u1ee3'} value={formatCurrency(totalBalance)} tone="danger" icon={WalletCards} />
        <StatCard title={'Tr\u1ea3 m\u1ed7i th\u00e1ng'} value={formatCurrency(totalMonthlyPayment)} tone="warning" icon={CreditCard} />
        <StatCard title={'L\u00e3i su\u1ea5t trung b\u00ecnh'} value={formatPercent(averageRate)} tone="info" icon={BarChart3} />
        <StatCard
          title={'Kho\u1ea3n g\u1ea7n \u0111\u1ebfn h\u1ea1n'}
          value={nextDueLoan ? `${nextDueLoan.bankName} - ${formatDate(nextDueLoan.dueDate)}` : 'Kh\u00f4ng c\u00f3'}
          tone="warning"
          icon={AlertTriangle}
        />
      </div>
      <div className="loan-card-grid">
        {loans.map((loan) => {
          const paidPercent = ((loan.originalLoanAmount - loan.remainingBalance) / loan.originalLoanAmount) * 100;

          return (
            <button
              className={`loan-card ${activeLoan?.id === loan.id ? 'selected' : ''}`}
              key={loan.id}
              onClick={() => {
                setSelectedLoan(loan);
                setSchedulePage(1);
              }}
            >
              <div className="loan-card-top">
                <span className="loan-bank">{loan.bankName}</span>
                <span className={`status ${loan.status.toLowerCase()}`}>{statusLabels[loan.status] ?? loan.status}</span>
              </div>
              <strong>{formatCurrency(loan.remainingBalance)}</strong>
              <ProgressBar value={paidPercent} compact />
              <div className="loan-card-meta">
                <span>{formatCurrency(loan.monthlyPayment)} / {'th\u00e1ng'}</span>
                <span>{'H\u1ea1n'} {formatDate(loan.dueDate)}</span>
              </div>
            </button>
          );
        })}
      </div>
      <DataTable columns={columns} rows={loans} />
      {activeLoan?.repaymentSchedule && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedLoan(null)}>
          <section className="modal schedule-modal" role="dialog" aria-modal="true" aria-label="Lịch trả nợ" onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Lịch trả nợ</p>
                <h2>{activeLoan.bankName}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedLoan(null)} aria-label="Đóng"><X size={18} /></button>
            </div>
            <div className="modal-body">
            <div className="schedule-toolbar">
              <label>
                Trạng thái
                <select value={statusFilter} onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setSchedulePage(1);
                }}>
                  {scheduleFilters.map((status) => (
                    <option key={status} value={status}>{scheduleFilterLabels[status]}</option>
                  ))}
                </select>
              </label>
            </div>
            <DataTable
              columns={scheduleColumns}
              rows={visibleSchedule}
              getRowClass={(row) => [
                `schedule-row-${row.status.toLowerCase()}`,
                row.id === findCurrentInstallment(activeLoan.repaymentSchedule) ? 'schedule-row-current' : '',
              ].filter(Boolean).join(' ')}
            />
            <div className="pagination">
              <span>{filteredSchedule.length ? `${(safeSchedulePage - 1) * schedulePageSize + 1}-${Math.min(safeSchedulePage * schedulePageSize, filteredSchedule.length)} / ${filteredSchedule.length}` : '0 / 0'}</span>
              <div>
                <button className="secondary-button table-action" disabled={safeSchedulePage === 1} onClick={() => setSchedulePage((page) => Math.max(1, page - 1))}>Trước</button>
                <button className="secondary-button table-action" disabled={safeSchedulePage === schedulePageCount} onClick={() => setSchedulePage((page) => Math.min(schedulePageCount, page + 1))}>Sau</button>
              </div>
            </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function PageToolbar({ title, description, buttonLabel, onAdd }) {
  return (
    <div className="page-toolbar">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <button className="primary-button" onClick={onAdd}>
        <Plus size={18} />
        {buttonLabel}
      </button>
    </div>
  );
}

function PlaceholderPage({ title, text }) {
  return (
    <section className="placeholder">
      <Search size={24} />
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
