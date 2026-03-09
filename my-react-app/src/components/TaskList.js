// component import
import TaskItem from './TaskItem';

// styles
import styles from './TaskList.module.css';

const TaskList = ({ tasks, deleteTask, toggleTask, enterEditMode, emptyMessage = 'No tasks yet.' }) => {
  if (!tasks.length) {
    return <p className={styles.empty} role="status" aria-live="polite">{emptyMessage}</p>;
  }

  return (
    <ul className={styles.tasks} aria-live="polite">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          deleteTask={deleteTask}
          toggleTask={toggleTask}
          enterEditMode={enterEditMode}
        />
      ))
      }
    </ul>
  )
}
export default TaskList
