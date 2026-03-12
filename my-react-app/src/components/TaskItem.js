// styles
import styles from './TaskItem.module.css';

// Library imports
import { useState } from 'react';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { PencilSquareIcon  } from '@heroicons/react/24/outline';
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

  const handleCheckboxChange = () => {
    toggleTask(task.id);
  };

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
    <li className={`${styles.task} ${task.checked ? styles.completed : ''} ${isOverdue ? styles.overdue : ''}`}>
      <div className={styles["task-group"]}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={task.checked}
          onChange={handleCheckboxChange}
          name={task.name}
          id={task.id}
          aria-describedby={`meta-${task.id}`}
        />
        <div className={styles.content}>
          <label
            htmlFor={task.id}
            className={styles.label}
          >
            <span className={styles.titleRow}>
              <span className={styles.title}>{task.name}</span>
              {isOverdue && <span className={`${styles.pill} ${styles.alertPill}`}>Overdue</span>}
              {task.checked && <span className={`${styles.pill} ${styles.donePill}`}>Done</span>}
            </span>
            <small className={styles.meta} id={`meta-${task.id}`}>
              <span className={`${styles.pill} ${styles[`priority-${effectivePriority}`]}`}>{priorityLabel}</span>
              <span className={styles.pill}>#{task.category}</span>
              <span className={styles.pill}>{dueLabel}</span>
              {task.repeat !== 'none' && (
                <span className={`${styles.pill} ${styles.repeatPill}`}>
                  <ArrowPathIcon className={styles.repeatIcon} aria-hidden="true" />
                  Repeats {task.repeat}
                </span>
              )}
              {timeSpentLabel && <span className={styles.pill}>{timeSpentLabel}</span>}
            </small>
            {task.notes && <em className={styles.notes}>{task.notes}</em>}
            <p className={styles.checkmark}>
              <CheckIcon strokeWidth={2} width={24} height={24}/>
            </p>
          </label>
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
        </div>
      </div>
      <div className={styles.actions}>
        <button
          className={`btn ${styles.iconBtn}`}
          aria-label={`Edit task: ${task.name}`}
          onClick={() => enterEditMode(task)}
          type="button"
        >
          <PencilSquareIcon width={24} height={24} />
        </button>

        <button
          className={`btn ${styles.iconBtn} ${styles.delete}`}
          aria-label={`Delete task: ${task.name}`}
          onClick={() => deleteTask(task.id)}
          type="button"
        >
          <TrashIcon width={24} height={24} />
        </button>

      </div>
    </li>
  )
}
export default TaskItem
