import { useState, useEffect } from 'react';

// library imports
import { CheckIcon } from '@heroicons/react/24/solid'
import { CATEGORY_SUGGESTIONS, PRIORITY_OPTIONS, REPEAT_OPTIONS } from '../features/tasks/constants';
import { getAutoPriority } from '../features/tasks/priority';

const EditForm = ({ editedTask, updateTask, closeEditMode }) => {
  const [updatedTaskName, setUpdatedTaskName] = useState(editedTask.name);
  const [priority, setPriority] = useState(editedTask.priority ?? 'medium');
  const [priorityMode, setPriorityMode] = useState(editedTask.priorityMode ?? 'auto');
  const [dueDate, setDueDate] = useState(editedTask.dueDate ?? '');
  const [category, setCategory] = useState(editedTask.category ?? 'General');
  const [repeat, setRepeat] = useState(editedTask.repeat ?? 'none');
  const [notes, setNotes] = useState(editedTask.notes ?? '');

  const autoPriority = getAutoPriority(dueDate);

  useEffect(()=> {
    const closeModalIfEscaped = (e) => {
      e.key === "Escape" && closeEditMode();
    }

    window.addEventListener('keydown', closeModalIfEscaped)

    return () => {
      window.removeEventListener('keydown', closeModalIfEscaped)
    }
  }, [closeEditMode])

  const handleFormSubmit = (e) => {
    e.preventDefault();
    updateTask({
      ...editedTask,
      name: updatedTaskName.trim(),
      priority,
      priorityMode,
      dueDate,
      category: category.trim() || 'General',
      repeat,
      notes: notes.trim()
    })
  }

  return (
    <div
      role="dialog"
      aria-labelledby="editTask"
      onClick={(e) => {e.target === e.currentTarget && closeEditMode()}}
      >
      <form
        className="todo edit-form"
        onSubmit={handleFormSubmit}
        >
        <div className="wrapper">
          <input
            type="text"
            id="editTask"
            className="input"
            value={updatedTaskName}
            onInput={(e) => setUpdatedTaskName(e.target.value)}
            required
            autoFocus
            maxLength={60}
            placeholder="Update Task"
          />
          <label
            htmlFor="editTask"
            className="label"
          >Update Task</label>
        </div>
        <div className="advanced-grid">
          <div className="field">
            <span>Priority</span>
            <div className="stack-inline">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={priorityMode !== 'manual'}
                  onChange={(e) => setPriorityMode(e.target.checked ? 'auto' : 'manual')}
                />
                <span>Auto</span>
              </label>
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={priorityMode !== 'manual'}
                aria-disabled={priorityMode !== 'manual'}
                aria-label="Manual priority"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option[0].toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {priorityMode !== 'manual' && (
              <small className="hint">Auto priority: {autoPriority[0].toUpperCase() + autoPriority.slice(1)}</small>
            )}
          </div>
          <label>
            Due date
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label>
            Category
            <input
              className="input"
              type="text"
              list="edit-task-category-suggestions"
              maxLength={24}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="edit-task-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label>
            Repeat
            <select className="input" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={180}
              rows={2}
              placeholder="Optional notes"
            />
          </label>
        </div>
        <button
          className="btn"
          aria-label={`Confirm edited task to now read ${updatedTaskName}`}
          type="submit"
          >
          <CheckIcon strokeWidth={2} height={24} width={24} />
        </button>
      </form>
    </div>
  )
}
export default EditForm
