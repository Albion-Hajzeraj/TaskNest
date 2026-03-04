import styles from './Sidebar.module.css';

const Sidebar = ({ activePanel, setActivePanel, stats }) => {
  const items = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'focus', label: 'Focus' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <aside className={styles.sidebar} aria-label="Main navigation">
      <div className={styles.brand}>
        <h2>TaskNest</h2>
        <p>{stats.active} active</p>
      </div>
      <nav className={styles.nav}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.link} ${activePanel === item.id ? styles.active : ''}`}
            onClick={() => setActivePanel(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
