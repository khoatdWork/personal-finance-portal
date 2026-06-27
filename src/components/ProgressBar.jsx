export function ProgressBar({ value, compact = false }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={`progress-wrap ${compact ? 'compact' : ''}`}>
      <div className="progress-track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{Math.round(safeValue)}%</strong>
    </div>
  );
}
