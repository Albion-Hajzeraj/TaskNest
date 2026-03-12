import { forwardRef, useMemo, useState } from 'react';

// library imports
import { PlusIcon } from '@heroicons/react/24/solid'
import {
  CATEGORY_SUGGESTIONS,
  INITIAL_ADVANCED_TASK_FIELDS,
  PRIORITY_OPTIONS,
  REPEAT_OPTIONS
} from '../features/tasks/constants';
import { getAutoPriority } from '../features/tasks/priority';
import { generateSubtasks } from '../services/ai-api';

const CustomForm = forwardRef(({ addTask, addTaskFromQuickInput }, taskInputRef) => {
  const [task, setTask] = useState("");
  const [advanced, setAdvanced] = useState(INITIAL_ADVANCED_TASK_FIELDS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [suggestedSubtasks, setSuggestedSubtasks] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    const cleanedSubtasks = (advanced.subtasks || [])
      .map((item) => ({
        ...item,
        title: (item.title || '').trim()
      }))
      .filter((item) => item.title);
    addTask({
      name: trimmed,
      checked: false,
      ...advanced,
      subtasks: cleanedSubtasks
    });
    setTask("");
    setAdvanced(INITIAL_ADVANCED_TASK_FIELDS);
    setSuggestedSubtasks([]);
    setShowSuggestions(false);
    setAiError('');
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    addTaskFromQuickInput(task);
    setTask("");
    setAdvanced(INITIAL_ADVANCED_TASK_FIELDS);
    setSuggestedSubtasks([]);
    setShowSuggestions(false);
    setAiError('');
  };

  const setField = (field, value) => {
    setAdvanced((prev) => ({ ...prev, [field]: value }));
  }

  const isComplexTask = useMemo(() => {
    const trimmed = task.trim();
    if (!trimmed) return false;
    const words = trimmed.split(/\s+/).filter(Boolean);
    return trimmed.length >= 24 || words.length >= 4;
  }, [task]);

  const updateSubtask = (index, value) => {
    setAdvanced((prev) => {
      const next = [...(prev.subtasks || [])];
      next[index] = { ...next[index], title: value };
      return { ...prev, subtasks: next };
    });
  };

  const removeSubtask = (index) => {
    setAdvanced((prev) => {
      const next = [...(prev.subtasks || [])];
      next.splice(index, 1);
      return { ...prev, subtasks: next };
    });
  };

  const addSubtask = () => {
    setAdvanced((prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), { title: '', checked: false }]
    }));
  };

  const updateSuggested = (index, value) => {
    setSuggestedSubtasks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeSuggested = (index) => {
    setSuggestedSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const addSuggested = () => {
    setSuggestedSubtasks((prev) => [...prev, '']);
  };

  const handleGenerateSubtasks = async () => {
    const trimmed = task.trim();
    if (!trimmed || isGenerating) return;
    setIsGenerating(true);
    setAiError('');
    try {
      const result = await generateSubtasks(trimmed);
      const next = Array.isArray(result?.subtasks) ? result.subtasks : [];
      setSuggestedSubtasks(next);
      setShowSuggestions(true);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to generate subtasks');
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptSuggested = () => {
    const cleaned = suggestedSubtasks
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title) => ({ title, checked: false }));
    setAdvanced((prev) => ({ ...prev, subtasks: cleaned }));
    setShowSuggestions(false);
  };

  const autoPriority = getAutoPriority(advanced.dueDate);

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
        {isComplexTask && (
          <button
            className="btn"
            type="button"
            onClick={() => {
              setShowAdvanced(true);
              handleGenerateSubtasks();
            }}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Subtasks'}
          </button>
        )}
        <button className="btn" type="button" onClick={handleQuickSubmit}>
          Quick add parse
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-grid" id="advanced-task-options">
          <div className="field">
            <span>Priority</span>
            <div className="stack-inline">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={advanced.priorityMode !== 'manual'}
                  onChange={(e) => setField('priorityMode', e.target.checked ? 'auto' : 'manual')}
                />
                <span>Auto</span>
              </label>
              <select
                className="input"
                value={advanced.priority}
                onChange={(e) => setField('priority', e.target.value)}
                disabled={advanced.priorityMode !== 'manual'}
                aria-disabled={advanced.priorityMode !== 'manual'}
                aria-label="Manual priority"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option[0].toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {advanced.priorityMode !== 'manual' && (
              <small className="hint">Auto priority: {autoPriority[0].toUpperCase() + autoPriority.slice(1)}</small>
            )}
          </div>
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
          <div className="full-width subtask-builder">
            <div className="subtask-header">
              <span>Subtasks</span>
              <div className="subtask-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={addSubtask}
                >
                  Add subtask
                </button>
              </div>
            </div>
            {aiError && <p className="hint">{aiError}</p>}
            {!!advanced.subtasks?.length && (
              <div className="subtask-list">
                {advanced.subtasks.map((item, index) => (
                  <div className="subtask-row" key={`${index}-${item.title}`}>
                    <input
                      className="input"
                      type="text"
                      value={item.title}
                      onChange={(e) => updateSubtask(index, e.target.value)}
                      placeholder={`Subtask ${index + 1}`}
                    />
                    <button
                      className="btn"
                      type="button"
                      onClick={() => removeSubtask(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {showSuggestions && (
            <div className="full-width ai-suggestions">
              <p className="hint">AI suggested subtasks (edit before applying)</p>
              <div className="subtask-list">
                {suggestedSubtasks.map((title, index) => (
                  <div className="subtask-row" key={`suggest-${index}`}>
                    <input
                      className="input"
                      type="text"
                      value={title}
                      onChange={(e) => updateSuggested(index, e.target.value)}
                      placeholder={`Suggestion ${index + 1}`}
                    />
                    <button
                      className="btn"
                      type="button"
                      onClick={() => removeSuggested(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button className="btn" type="button" onClick={addSuggested}>
                  Add suggestion
                </button>
                <button className="btn" type="button" onClick={acceptSuggested}>
                  Use subtasks
                </button>
                <button className="btn" type="button" onClick={() => setShowSuggestions(false)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
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
