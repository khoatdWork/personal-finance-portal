export function StatCard({ title, value, subtext, tone = 'info', icon: Icon, featured = false }) {
  return (
    <section className={`stat-card ${tone}${featured ? ' featured' : ''}`}>
      {Icon && (
        <div className="stat-icon">
          <Icon size={18} />
        </div>
      )}
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        {subtext && <small>{subtext}</small>}
      </div>
    </section>
  );
}
