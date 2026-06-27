import { Bell, ChevronDown, Minus, Plus, Search } from 'lucide-react';

export function Header({ title, onQuickIncome, onQuickExpense, onNewLoan }) {
  return (
    <header className="top-header">
      <div>
        <p>Không gian tài chính</p>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <div className="quick-actions" aria-label="Thao tác nhanh">
          <button className="primary-button compact" onClick={onQuickIncome}><Plus size={15} /> Thu nhập</button>
          <button className="secondary-button compact" onClick={onQuickExpense}><Minus size={15} /> Chi tiêu</button>
          <button className="secondary-button compact" onClick={onNewLoan}><Plus size={15} /> Khoản vay mới</button>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input placeholder="Tìm kiếm" />
        </label>
        <button className="icon-button" aria-label="Thông báo">
          <Bell size={19} />
        </button>
        <button className="profile-button">
          <span>KT</span>
          <div>
            <strong>Khoa Tran</strong>
            <small>Tài khoản cá nhân</small>
          </div>
          <ChevronDown size={17} />
        </button>
      </div>
    </header>
  );
}
