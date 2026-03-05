import styles from './Sidebar.module.css';

const Sidebar = ({ activePanel, setActivePanel, stats }) => {
  const items = [
    { id: 'overview', label: 'Overview', hint: `${stats.completionRate}% done` },
    { id: 'tasks', label: 'Tasks', hint: `${stats.total} total` },
    { id: 'focus', label: 'Focus', hint: `${stats.overdue} overdue` },
    { id: 'settings', label: 'Settings', hint: 'Theme and data' }
  ];

  return (
    <aside className={styles.sidebar} aria-label="Main navigation">
      <div className={styles.brand}>
        <h2>TaskNest</h2>
        <p>{stats.active} active tasks</p>
      </div>
      <nav className={styles.nav}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.link} ${activePanel === item.id ? styles.active : ''}`}
            onClick={() => setActivePanel(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.hint}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
