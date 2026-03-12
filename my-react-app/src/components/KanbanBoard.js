import { useMemo, useState } from 'react';

import styles from './KanbanBoard.module.css';
import { getEffectivePriority } from '../features/tasks/priority';

const COLUMNS = [
  { id: 'todo', label: 'Todo' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' }
];

const KanbanBoard = ({ tasks, onStatusChange, enterEditMode, deleteTask, isBusy }) => {
  const [draggingId, setDraggingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const grouped = useMemo(() => {
    const base = { todo: [], 'in-progress': [], done: [] };
    tasks.forEach((task) => {
      const key = base[task.status] ? task.status : (task.checked ? 'done' : 'todo');
      base[key].push(task);
    });
    return base;
  }, [tasks]);

  const onDragStart = (event, taskId) => {
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(taskId);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setOverColumn(null);
  };

  const onDragOver = (event, columnId) => {
    event.preventDefault();
    setOverColumn(columnId);
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event, columnId) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange?.(taskId, columnId);
    }
    setDraggingId(null);
    setOverColumn(null);
  };

  return (
    <section className={styles.board} aria-label="Kanban board">
      {COLUMNS.map((column) => (
        <div
          key={column.id}
          className={`${styles.column} ${overColumn === column.id ? styles.over : ''}`}
          onDragOver={(event) => onDragOver(event, column.id)}
          onDragLeave={() => setOverColumn(null)}
          onDrop={(event) => onDrop(event, column.id)}
        >
          <header className={styles.columnHeader}>
            <h3>{column.label}</h3>
            <span className={styles.count}>{grouped[column.id].length}</span>
          </header>
          <div className={styles.columnBody}>
            {grouped[column.id].map((task) => {
              const effectivePriority = getEffectivePriority(task);
              const dueLabel = task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString() : 'No due date';
              return (
                <article
                  key={task.id}
                  className={`${styles.card} ${draggingId === task.id ? styles.dragging : ''}`}
                  draggable={!isBusy}
                  onDragStart={(event) => onDragStart(event, task.id)}
                  onDragEnd={onDragEnd}
                >
                  <div className={styles.cardHeader}>
                    <h4>{task.name}</h4>
                    <span className={`${styles.badge} ${styles[`priority-${effectivePriority}`]}`}>
                      {effectivePriority[0].toUpperCase() + effectivePriority.slice(1)}
                    </span>
                  </div>
                  <div className={styles.meta}>
                    <span>{dueLabel}</span>
                    {!!task.subtasks?.length && (
                      <span>{task.subtasks.filter((item) => item.checked).length}/{task.subtasks.length} subtasks</span>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => enterEditMode?.(task)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => deleteTask?.(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
            {!grouped[column.id].length && (
              <p className={styles.empty}>Drop tasks here</p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};

export default KanbanBoard;
