import { forwardRef, useState } from 'react';

// library imports
import { PlusIcon } from '@heroicons/react/24/solid'
import {
  CATEGORY_SUGGESTIONS,
  INITIAL_ADVANCED_TASK_FIELDS,
  PRIORITY_OPTIONS,
  REPEAT_OPTIONS
} from '../features/tasks/constants';

const CustomForm = forwardRef(({ addTask, addTaskFromQuickInput }, taskInputRef) => {
  const [task, setTask] = useState("");
  const [advanced, setAdvanced] = useState(INITIAL_ADVANCED_TASK_FIELDS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    addTask({
      name: trimmed,
      checked: false,
      ...advanced
    });
    setTask("");
    setAdvanced(INITIAL_ADVANCED_TASK_FIELDS);
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    addTaskFromQuickInput(task);
    setTask("");
    setAdvanced(INITIAL_ADVANCED_TASK_FIELDS);
  };

  const setField = (field, value) => {
    setAdvanced((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <section className="form-stack" aria-label="Create task">
      <form
        className="todo"
        onSubmit={handleFormSubmit}
        aria-label="Create a new task"
      >
        <div className="wrapper">
          <input
            ref={taskInputRef}
            type="text"
            id="task"
            className="input"
            value={task}
            onInput={(e) => setTask(e.target.value)}
            required
            autoFocus
            maxLength={120}
            placeholder="Enter task"
          />
          <label
            htmlFor="task"
            className="label"
          >Task name</label>
        </div>
        <button
          className="btn"
          aria-label="Add Task"
          type="submit"
        >
          <PlusIcon />
        </button>
      </form>

      <div className="form-actions">
        <button
          className="btn"
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-task-options"
        >
          {showAdvanced ? 'Hide advanced' : 'Show advanced'}
        </button>
        <button className="btn" type="button" onClick={handleQuickSubmit}>
          Quick add parse
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-grid" id="advanced-task-options">
          <label>
            Priority
            <select className="input" value={advanced.priority} onChange={(e) => setField('priority', e.target.value)}>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input className="input" type="date" value={advanced.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
          </label>
          <label>
            Task type
            <input
              className="input"
              type="text"
              list="task-category-suggestions"
              maxLength={24}
              value={advanced.category}
              onChange={(e) => setField('category', e.target.value)}
              placeholder="Work, Study, Cleaning..."
              aria-label="Task type"
            />
          </label>
          <label>
            Repeat
            <select className="input" value={advanced.repeat} onChange={(e) => setField('repeat', e.target.value)}>
              {REPEAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Notes
            <textarea
              className="input"
              value={advanced.notes}
              onChange={(e) => setField('notes', e.target.value)}
              maxLength={180}
              rows={2}
              placeholder="Optional notes"
            />
          </label>
          <p className="hint">Task type examples: Work, Study, Cleaning, Home, Finance, Errands</p>
          <p className="hint">Quick add format: `Buy milk tomorrow !high #home repeat:weekly`</p>
        </div>
      )}

      <datalist id="task-category-suggestions">
        {CATEGORY_SUGGESTIONS.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </section>
  )
});

CustomForm.displayName = 'CustomForm';

export default CustomForm
