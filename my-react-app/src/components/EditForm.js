import { useState, useEffect } from 'react';

// library imports
import { CheckIcon } from '@heroicons/react/24/solid'

const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const REPEAT_OPTIONS = ['none', 'daily', 'weekly', 'monthly'];
const CATEGORY_SUGGESTIONS = [
  'General',
  'Cleaning',
  'Work',
  'Fitness',
  'Hobby',
  'Personal',
  'Shopping',
  'Study',
  'Health'
];

const EditForm = ({ editedTask, updateTask, closeEditMode }) => {
  const [updatedTaskName, setUpdatedTaskName] = useState(editedTask.name);
  const [priority, setPriority] = useState(editedTask.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(editedTask.dueDate ?? '');
  const [category, setCategory] = useState(editedTask.category ?? 'General');
  const [repeat, setRepeat] = useState(editedTask.repeat ?? 'none');
  const [notes, setNotes] = useState(editedTask.notes ?? '');

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
          <label>
            Priority
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
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
