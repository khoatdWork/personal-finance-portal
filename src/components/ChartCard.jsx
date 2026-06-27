import { formatCurrency } from '../utils/format';

export function ChartCard({ title, data, type, tone = 'info' }) {
  const hasData = data?.some((point) => Number(point.value));
  return (
    <section className="chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{type === 'bar' ? 'Tiến độ' : 'Xu hướng'}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {hasData ? (
        type === 'bar' ? <BarChart data={data} tone={tone} /> : <LineChart data={data} tone={tone} />
      ) : (
        <div className="empty-state">Chưa có dữ liệu biểu đồ.</div>
      )}
    </section>
  );
}

function BarChart({ data, tone }) {
  const max = Math.max(...data.map((point) => point.value));

  return (
    <div className="bar-chart" aria-label="Biểu đồ cột">
      {data.map((point) => (
        <div className="bar-column" key={point.label}>
          <div className="bar-shell">
            <span className={tone} style={{ height: `${(point.value / max) * 100}%` }} title={formatCurrency(point.value)} />
          </div>
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, tone }) {
  const width = 520;
  const height = 190;
  const min = Math.min(...data.map((point) => point.value));
  const max = Math.max(...data.map((point) => point.value));
  const range = max - min || 1;
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.value - min) / range) * (height - 24) - 12;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ dư nợ khoản vay">
        <polyline className={tone} points={points} fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((point.value - min) / range) * (height - 24) - 12;
          return <circle key={point.label} cx={x} cy={y} r="5" />;
        })}
      </svg>
      <div className="chart-labels">
        {data.map((point) => <small key={point.label}>{point.label}</small>)}
      </div>
    </div>
  );
}
