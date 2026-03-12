import { useMemo } from 'react';

import styles from './GamificationPanel.module.css';

const badgeThresholds = [
  { id: 'streak-3', label: '3-day streak', days: 3 },
  { id: 'streak-7', label: '7-day streak', days: 7 },
  { id: 'streak-14', label: '14-day streak', days: 14 }
];

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const getCurrentStreak = (tasks) => {
  const completedDates = new Set(
    tasks
      .filter((task) => task.completedAt)
      .map((task) => formatDateKey(new Date(task.completedAt)))
  );

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = formatDateKey(cursor);
    if (!completedDates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const GamificationPanel = ({ stats, tasks }) => {
  const streak = useMemo(() => getCurrentStreak(tasks), [tasks]);
  const xpRemaining = Math.max(0, stats.nextLevelXp - stats.xp);

  return (
    <section className={styles.panel} aria-label="Gamification progress">
      <div className={styles.levelRow}>
        <div>
          <p className={styles.label}>Level</p>
          <h3 className={styles.level}>Level {stats.level}</h3>
          <p className={styles.subLabel}>{stats.xp} XP total</p>
        </div>
        <div className={styles.streakCard}>
          <p className={styles.label}>Current streak</p>
          <strong>{streak} days</strong>
        </div>
      </div>

      <div className={styles.progressWrap}>
        <div className={styles.progressHeader}>
          <span>Progress to next level</span>
          <span>{xpRemaining} XP to go</span>
        </div>
        <div className={styles.progressBar} role="progressbar" aria-valuenow={stats.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.progressFill} style={{ width: `${stats.progress}%` }} />
        </div>
        <p className={styles.progressNote}>
          {stats.currentLevelXp} XP · {stats.nextLevelXp} XP
        </p>
      </div>

      <div className={styles.badges}>
        <p className={styles.label}>Streak badges</p>
        <div className={styles.badgeGrid}>
          {badgeThresholds.map((badge) => (
            <span
              key={badge.id}
              className={`${styles.badge} ${streak >= badge.days ? styles.badgeActive : ''}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GamificationPanel;
