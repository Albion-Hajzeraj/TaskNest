import { useMemo } from 'react';

import styles from './AnalyticsDashboard.module.css';

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatKey = (date) => date.toISOString().slice(0, 10);

const buildLastSevenDays = () => {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
};

const AnalyticsDashboard = ({ tasks }) => {
  const today = startOfDay(new Date());
  const weekDays = useMemo(() => buildLastSevenDays(), []);
  const weekStart = weekDays[0];

  const tasksCompletedThisWeek = useMemo(
    () => tasks.filter((task) => task.completedAt && new Date(task.completedAt) >= weekStart).length,
    [tasks, weekStart]
  );

  const completionRate = useMemo(() => {
    if (!tasks.length) return 0;
    const completed = tasks.filter((task) => task.checked).length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const completedByDay = useMemo(() => {
    const counts = new Map(weekDays.map((day) => [formatKey(day), 0]));
    tasks.forEach((task) => {
      if (!task.completedAt) return;
      const key = formatKey(new Date(task.completedAt));
      if (counts.has(key)) {
        counts.set(key, counts.get(key) + 1);
      }
    });
    return weekDays.map((day) => ({
      date: day,
      count: counts.get(formatKey(day)) || 0
    }));
  }, [tasks, weekDays]);

  const overdueTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.dueDate || task.checked) return false;
      const due = new Date(`${task.dueDate}T00:00:00`);
      return due.getTime() < today.getTime();
    });
  }, [tasks, today]);

  const maxDaily = Math.max(1, ...completedByDay.map((item) => item.count));
  const circleRadius = 48;
  const circumference = 2 * Math.PI * circleRadius;
  const progressOffset = circumference - (completionRate / 100) * circumference;

  return (
    <section className={styles.dashboard} aria-label="Productivity analytics dashboard">
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Completed this week</p>
          <p className={styles.metricValue}>{tasksCompletedThisWeek}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Completion rate</p>
          <p className={styles.metricValue}>{completionRate}%</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Overdue tasks</p>
          <p className={styles.metricValue}>{overdueTasks.length}</p>
        </div>
      </div>

      <div className={styles.charts}>
        <div className={styles.chartCard}>
          <h3>Tasks completed per day</h3>
          <div className={styles.barChart} role="img" aria-label="Bar chart of tasks completed per day">
            {completedByDay.map((item) => {
              const height = Math.round((item.count / maxDaily) * 100);
              const dayLabel = item.date.toLocaleDateString(undefined, { weekday: 'short' });
              return (
                <div key={item.date.toISOString()} className={styles.barItem}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ height: `${height}%` }} />
                  </div>
                  <span className={styles.barValue}>{item.count}</span>
                  <span className={styles.barLabel}>{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3>Completion rate</h3>
          <div className={styles.donutWrap} role="img" aria-label="Completion rate donut chart">
            <svg viewBox="0 0 120 120" className={styles.donut}>
              <circle className={styles.donutTrack} cx="60" cy="60" r={circleRadius} />
              <circle
                className={styles.donutProgress}
                cx="60"
                cy="60"
                r={circleRadius}
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
              />
            </svg>
            <div className={styles.donutLabel}>
              <strong>{completionRate}%</strong>
              <span>of tasks done</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.overdueList}>
        <h3>Overdue tasks</h3>
        {overdueTasks.length ? (
          <ul>
            {overdueTasks.slice(0, 6).map((task) => (
              <li key={task.id}>
                <span>{task.name}</span>
                <small>{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No overdue tasks. Nice work.</p>
        )}
      </div>
    </section>
  );
};

export default AnalyticsDashboard;
