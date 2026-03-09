// styles
import styles from './TaskItem.module.css';

// Library imports
import { CheckIcon  } from '@heroicons/react/24/outline';
import { PencilSquareIcon  } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';

const TaskItem = ({ task, deleteTask, toggleTask, enterEditMode }) => {
  const isOverdue = Boolean(
    task.dueDate &&
    !task.checked &&
    new Date(`${task.dueDate}T00:00:00`).getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime()
  );

  const handleCheckboxChange = () => {
    toggleTask(task.id);
  };

  const dueLabel = task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString() : 'No due date';

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
            <span className={`${styles.pill} ${styles[`priority-${task.priority}`]}`}>{task.priority}</span>
            <span className={styles.pill}>#{task.category}</span>
            <span className={styles.pill}>{dueLabel}</span>
            {task.repeat !== 'none' && <span className={styles.pill}>Repeats {task.repeat}</span>}
          </small>
          {task.notes && <em className={styles.notes}>{task.notes}</em>}
          <p className={styles.checkmark}>
            <CheckIcon strokeWidth={2} width={24} height={24}/>
          </p>
        </label>
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
