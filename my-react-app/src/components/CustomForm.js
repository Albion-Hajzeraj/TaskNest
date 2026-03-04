import { useState } from 'react';

// library imports
import { PlusIcon } from '@heroicons/react/24/solid'

const initialAdvanced = {
  priority: 'medium',
  dueDate: '',
  category: 'General',
  notes: '',
  repeat: 'none'
};

const CustomForm = ({ addTask, addTaskFromQuickInput }) => {
  const [task, setTask] = useState("");
  const [advanced, setAdvanced] = useState(initialAdvanced);
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
    setAdvanced(initialAdvanced);
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    addTaskFromQuickInput(task);
    setTask("");
    setAdvanced(initialAdvanced);
  };

  const setField = (field, value) => {
    setAdvanced((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <section className="form-stack" aria-label="Create task">
      <form
        className="todo"
        onSubmit={handleFormSubmit}
      >
        <div className="wrapper">
          <input
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
        <button className="btn" type="button" onClick={() => setShowAdvanced((prev) => !prev)}>
          {showAdvanced ? 'Hide advanced' : 'Show advanced'}
        </button>
        <button className="btn" type="button" onClick={handleQuickSubmit}>
          Quick add parse
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-grid">
          <label>
            Priority
            <select className="input" value={advanced.priority} onChange={(e) => setField('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            Due date
            <input className="input" type="date" value={advanced.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
          </label>
          <label>
            Category
            <input className="input" type="text" maxLength={24} value={advanced.category} onChange={(e) => setField('category', e.target.value)} />
          </label>
          <label>
            Repeat
            <select className="input" value={advanced.repeat} onChange={(e) => setField('repeat', e.target.value)}>
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
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
          <p className="hint">Quick add format: `Buy milk tomorrow !high #home repeat:weekly`</p>
        </div>
      )}
    </section>
  )
}
export default CustomForm
