const StatCard = ({ value, label }) => {
  return (
    <article className="stat-card" aria-label={`${label}: ${value}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
};

export default StatCard;
