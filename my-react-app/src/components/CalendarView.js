import { useMemo, useState } from 'react';

import styles from './CalendarView.module.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (value) => String(value).padStart(2, '0');

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfWeek = (date) => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const buildMonthDays = (cursorDate) => {
  const firstOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
  const lastOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0);
  const start = startOfWeek(firstOfMonth);
  const end = endOfWeek(lastOfMonth);

  const days = [];
  let current = start;
  while (current.getTime() <= end.getTime()) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  return days;
};

const buildWeekDays = (cursorDate) => {
  const start = startOfWeek(cursorDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};

const CalendarView = ({
  tasks,
  viewMode,
  onViewModeChange,
  cursorDate,
  onNavigate,
  selectedDate,
  onSelectDate,
  onMoveTask,
  isBusy
}) => {
  const [dragOverDate, setDragOverDate] = useState('');

  const tasksByDate = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const list = map.get(task.dueDate) || [];
      list.push(task);
      map.set(task.dueDate, list);
    });
    return map;
  }, [tasks]);

  const visibleDays = useMemo(() => {
    if (viewMode === 'week') return buildWeekDays(cursorDate);
    return buildMonthDays(cursorDate);
  }, [cursorDate, viewMode]);

  const monthLabel = cursorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const weekStartLabel = startOfWeek(cursorDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const weekEndLabel = endOfWeek(cursorDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const rangeLabel = viewMode === 'week' ? `Week of ${weekStartLabel} - ${weekEndLabel}` : monthLabel;

  const handlePrev = () => {
    const next = new Date(cursorDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    onNavigate?.(next);
  };

  const handleNext = () => {
    const next = new Date(cursorDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    onNavigate?.(next);
  };

  const handleDrop = (event, dateKey) => {
    event.preventDefault();
    setDragOverDate('');
    const taskId = event.dataTransfer.getData('text/plain');
    if (!taskId || isBusy) return;
    onMoveTask?.(taskId, dateKey);
  };

  const todayKey = formatDateKey(new Date());

  return (
    <section className={styles.calendar} aria-label="Calendar view">
      <header className={styles.header}>
        <div>
          <p className={styles.rangeLabel}>{rangeLabel}</p>
          <p className={styles.rangeHint}>Drag tasks onto a date to reschedule.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.nav}>
            <button className="btn" type="button" onClick={handlePrev} aria-label="Previous range">
              Prev
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => onNavigate?.(new Date())}
              aria-label="Jump to today"
            >
              Today
            </button>
            <button className="btn" type="button" onClick={handleNext} aria-label="Next range">
              Next
            </button>
          </div>
          <div className="segmented-control" role="tablist" aria-label="Calendar view mode">
            <button
              className={`btn segment-btn ${viewMode === 'month' ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={viewMode === 'month'}
              onClick={() => onViewModeChange?.('month')}
            >
              Month
            </button>
            <button
              className={`btn segment-btn ${viewMode === 'week' ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={viewMode === 'week'}
              onClick={() => onViewModeChange?.('week')}
            >
              Week
            </button>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {DAY_LABELS.map((label) => (
          <div key={label} className={styles.dayHeader}>
            {label}
          </div>
        ))}

        {visibleDays.map((date) => {
          const dateKey = formatDateKey(date);
          const dayTasks = tasksByDate.get(dateKey) || [];
          const isSelected = selectedDate === dateKey;
          const isToday = todayKey === dateKey;
          const isOutsideMonth = viewMode === 'month' && date.getMonth() !== cursorDate.getMonth();
          const showTasks = dayTasks.slice(0, 3);
          const remaining = dayTasks.length - showTasks.length;

          return (
            <div
              key={dateKey}
              className={`${styles.dayCell} ${isSelected ? styles.selected : ''} ${isOutsideMonth ? styles.outside : ''} ${dragOverDate === dateKey ? styles.dragOver : ''}`}
              onClick={() => onSelectDate?.(dateKey)}
              onDragOver={(event) => {
                if (isBusy) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverDate(dateKey);
              }}
              onDragLeave={() => setDragOverDate('')}
              onDrop={(event) => handleDrop(event, dateKey)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectDate?.(dateKey);
                }
              }}
            >
              <div className={styles.dayMeta}>
                <span className={`${styles.dayNumber} ${isToday ? styles.today : ''}`}>{date.getDate()}</span>
                <span className={styles.taskCount}>{dayTasks.length || ''}</span>
              </div>
              <div className={styles.taskList} aria-label={`Tasks due ${date.toDateString()}`}>
                {showTasks.map((task) => (
                  <div
                    key={task.id}
                    className={styles.taskChip}
                    draggable={!isBusy}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', task.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    title={task.name}
                    aria-label={`Task ${task.name}`}
                  >
                    {task.name}
                  </div>
                ))}
                {remaining > 0 && (
                  <div className={styles.moreTasks}>+{remaining} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CalendarView;
