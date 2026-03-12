// styles
import styles from './TaskItem.module.css';

// Library imports
import { useState } from 'react';
import { ArrowPathIcon, CheckIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { getEffectivePriority } from '../features/tasks/priority';

const TaskItem = ({
  task,
  deleteTask,
  toggleTask,
  enterEditMode,
  addSubtask,
  toggleSubtask,
  deleteSubtask
}) => {
  const effectivePriority = getEffectivePriority(task);
  const priorityLabel = effectivePriority[0].toUpperCase() + effectivePriority.slice(1);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const isOverdue = Boolean(
    task.dueDate &&
    !task.checked &&
    new Date(`${task.dueDate}T00:00:00`).getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime()
  );

  const dueLabel = task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString() : 'No due date';
  const timeSpentMinutes = Math.round((task.timeSpentSeconds || 0) / 60);
  const timeSpentLabel = timeSpentMinutes > 0 ? `${timeSpentMinutes}m focus` : '';

  const onSubmitSubtask = (event) => {
    event.preventDefault();
    if (!addSubtask) return;
    const trimmed = subtaskTitle.trim();
    if (!trimmed) return;
    addSubtask(task.id, trimmed);
    setSubtaskTitle('');
  };

  return (
    <li className={`${styles.taskCard} ${task.checked ? styles.completed : ''} ${isOverdue ? styles.overdue : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <span className={`${styles.priorityBadge} ${styles[`priority-${effectivePriority}`]}`}>{priorityLabel}</span>
            {isOverdue && <span className={`${styles.statusBadge} ${styles.alertPill}`}>Overdue</span>}
            {task.checked && <span className={`${styles.statusBadge} ${styles.donePill}`}>Done</span>}
          </div>
          <h3 className={styles.title}>{task.name}</h3>
          <p className={styles.description}>{task.notes || 'No description provided.'}</p>
        </div>
        <div className={styles.actions}>
          <button
            className={`btn ${styles.iconBtn} ${styles.completeBtn} ${task.checked ? styles.completeActive : ''}`}
            aria-label={`Mark task ${task.name} complete`}
            onClick={() => toggleTask(task.id)}
            type="button"
          >
            <CheckIcon width={20} height={20} />
          </button>
          <button
            className={`btn ${styles.iconBtn}`}
            aria-label={`Edit task: ${task.name}`}
            onClick={() => enterEditMode(task)}
            type="button"
          >
            <PencilSquareIcon width={20} height={20} />
          </button>
          <button
            className={`btn ${styles.iconBtn} ${styles.delete}`}
            aria-label={`Delete task: ${task.name}`}
            onClick={() => deleteTask(task.id)}
            type="button"
          >
            <TrashIcon width={20} height={20} />
          </button>
        </div>
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <ClockIcon width={16} height={16} />
          <span>{dueLabel}</span>
        </div>
        <div className={styles.metaItem}>
          <TagIcon width={16} height={16} />
          <span>#{task.category}</span>
        </div>
        {task.repeat !== 'none' && (
          <div className={styles.metaItem}>
            <ArrowPathIcon width={16} height={16} />
            <span>Repeats {task.repeat}</span>
          </div>
        )}
        {timeSpentLabel && (
          <div className={styles.metaItem}>
            <span>{timeSpentLabel}</span>
          </div>
        )}
      </div>

      {(task.subtasks?.length || addSubtask) && (
        <div className={styles.subtasksBlock}>
          {task.subtasks?.length > 0 && (
            <ul className={styles.subtasks}>
              {task.subtasks.map((subtask) => (
                <li key={subtask.id} className={styles.subtask}>
                  <label className={styles.subtaskLabel}>
                    <input
                      type="checkbox"
                      checked={subtask.checked}
                      onChange={() => toggleSubtask?.(task.id, subtask.id)}
                    />
                    <span className={subtask.checked ? styles.subtaskDone : ''}>
                      {subtask.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    className={styles.subtaskRemove}
                    onClick={() => deleteSubtask?.(task.id, subtask.id)}
                    aria-label={`Remove subtask ${subtask.title}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {addSubtask && (
            <form className={styles.subtaskForm} onSubmit={onSubmitSubtask}>
              <input
                className={styles.subtaskInput}
                type="text"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                maxLength={60}
                placeholder="Add subtask"
                aria-label={`Add subtask for ${task.name}`}
              />
              <button className={`btn ${styles.subtaskAdd}`} type="submit">
                Add
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
export default TaskItem
