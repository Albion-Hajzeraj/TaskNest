const PanelCard = ({ title, children }) => {
  const headingId = `${title.toLowerCase().replace(/\s+/g, '-')}-panel-heading`;

  return (
    <article className="panel-card" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </article>
  );
};

export default PanelCard;
