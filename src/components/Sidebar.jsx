import { Wallet } from 'lucide-react';

export function Sidebar({ items, activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark"><Wallet size={22} /></span>
        <div>
          <strong>Cổng tài chính</strong>
          <small>Tài chính cá nhân</small>
        </div>
      </div>
      <nav className="nav-list" aria-label="Điều hướng chính">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'selected' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
