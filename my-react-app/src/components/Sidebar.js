import {
  CalendarDaysIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  RectangleGroupIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import styles from './Sidebar.module.css';

const Sidebar = ({
  activePanel,
  items,
  onNavigate,
  collapsed,
  onToggleCollapse
}) => {
  const iconById = {
    overview: Squares2X2Icon,
    tasks: RectangleGroupIcon,
    calendar: CalendarDaysIcon,
    analytics: ChartBarSquareIcon,
    settings: Cog6ToothIcon
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} aria-label="Main navigation">
      <div className={styles.brandRow}>
        <div className={styles.brand}>
          <span className={styles.logo}>TN</span>
          {!collapsed && (
            <div>
              <h2>TaskNest</h2>
              <p>Productivity OS</p>
            </div>
          )}
        </div>
        <button
          className={styles.collapseBtn}
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>
      <nav className={styles.nav} aria-label="Workspace sections">
        {items.map((item) => (
          (() => {
            const Icon = iconById[item.id] || Squares2X2Icon;
            return (
          <button
            key={item.id}
            type="button"
            className={`${styles.link} ${activePanel === item.id ? styles.active : ''}`}
            onClick={() => onNavigate?.(item)}
            aria-current={activePanel === item.id ? 'page' : undefined}
            aria-label={`${item.label} panel`}
          >
            <span className={styles.linkIcon}>
              <Icon />
            </span>
            {!collapsed && (
              <span className={styles.linkText}>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </span>
            )}
          </button>
            );
          })()
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
