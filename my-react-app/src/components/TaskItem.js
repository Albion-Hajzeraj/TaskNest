// styles
import styles from './TaskItem.module.css';

// Library imports
import { CheckIcon  } from '@heroicons/react/24/outline';
import { PencilSquareIcon  } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';

const TaskItem = ({ task, deleteTask, toggleTask, enterEditMode }) => {
  const handleCheckboxChange = () => {
    toggleTask(task.id);
  };

  const dueLabel = task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString() : 'No due date';

  return (
    <li className={styles.task}>
      <div className={styles["task-group"]}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={task.checked}
          onChange={handleCheckboxChange}
          name={task.name}
          id={task.id}
        />
        <label
          htmlFor={task.id}
          className={styles.label}
        >
          <span>{task.name}</span>
          <small className={styles.meta}>
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
      <div className={styles["task-group"]}>
        <button
          className='btn'
          aria-label={`Update ${task.name} Task`}
          onClick={() => enterEditMode(task)}
        >
          <PencilSquareIcon width={24} height={24} />
        </button>

        <button
          className={`btn ${styles.delete}`}
          aria-label={`Delete ${task.name} Task`}
          onClick={() => deleteTask(task.id)}
        >
          <TrashIcon width={24} height={24} />
        </button>

      </div>
    </li>
  )
}
export default TaskItem
