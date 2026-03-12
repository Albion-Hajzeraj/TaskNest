import styles from './PomodoroTimer.module.css';

const formatDuration = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatTotal = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  return hours ? `${hours}h ${String(mins).padStart(2, '0')}m` : `${mins}m`;
};

const PomodoroTimer = ({
  tasks,
  activeTaskId,
  mode,
  secondsLeft,
  isRunning,
  onStart,
  onPause,
  onReset,
  onSkip,
  onStartTask
}) => {
  const activeTask = tasks.find((task) => task.id === activeTaskId) || null;
  const statusLabel = mode === 'break' ? 'Break' : 'Focus';

  return (
    <section className={styles.timer} aria-label="Pomodoro focus mode">
      <header className={styles.header}>
        <div>
          <p className={styles.label}>Pomodoro</p>
          <h3 className={styles.title}>{statusLabel} session</h3>
        </div>
        <span className={`${styles.modePill} ${mode === 'break' ? styles.break : styles.work}`}>
          {mode === 'break' ? 'Break' : 'Work'}
        </span>
      </header>

      <div className={styles.countdown} role="timer" aria-live="polite">
        {formatDuration(secondsLeft)}
      </div>

      <p className={styles.taskName}>
        {activeTask ? `Working on: ${activeTask.name}` : 'Pick a task to start'}
      </p>

      <div className={styles.controls}>
        {isRunning ? (
          <button className="btn" type="button" onClick={onPause}>
            Pause
          </button>
        ) : (
          <button className="btn" type="button" onClick={onStart} disabled={!activeTask}>
            Start
          </button>
        )}
        <button className="btn" type="button" onClick={onReset}>
          Reset
        </button>
        <button className="btn" type="button" onClick={onSkip}>
          Skip
        </button>
      </div>

      <div className={styles.taskList}>
        <p className={styles.listTitle}>Choose a task</p>
        {tasks.length ? (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.name}</strong>
                  <small>{formatTotal(task.timeSpentSeconds)} logged</small>
                </div>
                <button
                  className="btn"
                  type="button"
                  onClick={() => onStartTask(task.id)}
                >
                  Start focus
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No active tasks available.</p>
        )}
      </div>
    </section>
  );
};

export default PomodoroTimer;
