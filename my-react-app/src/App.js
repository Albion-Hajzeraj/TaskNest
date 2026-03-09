import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useLocalStorage from './hooks/useLocalStorage';
import { createTask, deleteTask as deleteTaskApi, getTasks, updateTask as updateTaskApi } from './services/tasks-api';

import CustomForm from './components/CustomForm';
import EditForm from './components/EditForm';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import SettingsPanel from './components/panels/SettingsPanel';
import PanelCard from './components/ui/PanelCard';
import StatCard from './components/ui/StatCard';

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' }
];

const PANEL_SHORTCUTS = { '1': 'overview', '2': 'tasks', '3': 'focus', '4': 'settings' };

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isTodayDate = (dateStr) => {
  if (!dateStr) return false;
  const today = startOfToday();
  const date = new Date(`${dateStr}T00:00:00`);
  return date.getTime() === today.getTime();
};

const isTaskOverdue = (task) => {
  if (!task.dueDate || task.checked) return false;
  const today = startOfToday();
  const due = new Date(`${task.dueDate}T00:00:00`);
  return due.getTime() < today.getTime();
};

const isInputElement = (target) => {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
};

const normalizeTask = (taskInput) => ({
  id: taskInput.id,
  name: (taskInput.name ?? '').trim(),
  checked: Boolean(taskInput.checked),
  priority: taskInput.priority ?? 'medium',
  dueDate: taskInput.dueDate ?? '',
  category: (taskInput.category ?? 'General').trim() || 'General',
  notes: (taskInput.notes ?? '').trim(),
  repeat: taskInput.repeat ?? 'none',
  createdAt: taskInput.createdAt ?? null,
  completedAt: taskInput.completedAt ?? null
});

function App() {
  const [tasks, setTasks] = useState([]);
  const [activePanel, setActivePanel] = useLocalStorage('react-todo.panel', 'tasks');
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created-desc');
  const [density, setDensity] = useLocalStorage('react-todo.density', 'comfortable');
  const [lastDeletedBatch, setLastDeletedBatch] = useState([]);
  const [previousFocusEl, setPreviousFocusEl] = useState(null);
  const [editedTask, setEditedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState('');

  const taskInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const tabRefs = useRef([]);

  const setErrorFromUnknown = useCallback((error) => {
    setApiError(error instanceof Error ? error.message : 'Unexpected API error');
  }, []);

  const loadTasks = useCallback(async () => {
    setApiError('');
    setIsLoading(true);
    try {
      const remoteTasks = await getTasks();
      setTasks(Array.isArray(remoteTasks) ? remoteTasks.map(normalizeTask) : []);
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsLoading(false);
    }
  }, [setErrorFromUnknown]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const getNextDueDate = (dueDate, repeat) => {
    if (!dueDate || repeat === 'none') return '';
    const date = new Date(`${dueDate}T00:00:00`);
    if (repeat === 'daily') date.setDate(date.getDate() + 1);
    if (repeat === 'weekly') date.setDate(date.getDate() + 7);
    if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
  };

  const buildTaskFromText = (rawText) => {
    const cleaned = rawText.trim();
    const tokens = cleaned.split(/\s+/);
    const data = {
      priority: 'medium',
      category: 'General',
      dueDate: '',
      repeat: 'none'
    };
    const keep = [];

    tokens.forEach((token) => {
      const lower = token.toLowerCase();

      if (/^!(high|medium|low)$/.test(lower)) {
        data.priority = lower.slice(1);
        return;
      }
      if (/^#[\w-]+$/.test(token)) {
        data.category = token.slice(1);
        return;
      }
      if (lower === 'today') {
        data.dueDate = new Date().toISOString().slice(0, 10);
        return;
      }
      if (lower === 'tomorrow') {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        data.dueDate = date.toISOString().slice(0, 10);
        return;
      }
      if (/^due:\d{4}-\d{2}-\d{2}$/.test(lower)) {
        data.dueDate = lower.slice(4);
        return;
      }
      if (/^repeat:(none|daily|weekly|monthly)$/.test(lower)) {
        data.repeat = lower.split(':')[1];
        return;
      }

      keep.push(token);
    });

    return {
      name: keep.join(' '),
      checked: false,
      ...data
    };
  };

  const addTask = async (taskInput) => {
    const payload = normalizeTask(taskInput);
    if (!payload.name) return;
    setApiError('');
    setIsSyncing(true);
    try {
      const created = await createTask(payload);
      setTasks((prevState) => [...prevState, normalizeTask(created)]);
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const addTaskFromQuickInput = async (rawText) => {
    const parsed = buildTaskFromText(rawText);
    if (!parsed.name) return;
    await addTask(parsed);
  };

  const deleteTask = async (id) => {
    const removed = tasks.filter((task) => task.id === id);
    if (!removed.length) return;

    setApiError('');
    setIsSyncing(true);
    try {
      await deleteTaskApi(id);
      setLastDeletedBatch(removed);
      setTasks((prevState) => prevState.filter((task) => task.id !== id));
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    setApiError('');
    setIsSyncing(true);
    try {
      const toggled = await updateTaskApi(id, { checked: !task.checked });
      setTasks((prevState) => prevState.map((item) => (item.id === id ? normalizeTask(toggled) : item)));

      if (!task.checked && task.repeat && task.repeat !== 'none') {
        const recurringPayload = {
          ...task,
          checked: false,
          completedAt: null,
          createdAt: undefined,
          dueDate: getNextDueDate(task.dueDate, task.repeat)
        };
        delete recurringPayload.id;
        const recurring = await createTask(recurringPayload);
        setTasks((prevState) => [...prevState, normalizeTask(recurring)]);
      }
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const closeEditMode = () => {
    setIsEditing(false);
    previousFocusEl?.focus?.();
  };

  const updateTask = async (task) => {
    const normalized = normalizeTask(task);
    if (!normalized.id) return;

    const { id, ...payload } = normalized;
    setApiError('');
    setIsSyncing(true);
    try {
      const updated = await updateTaskApi(id, payload);
      setTasks((prevState) => prevState.map((item) => (item.id === id ? normalizeTask(updated) : item)));
      closeEditMode();
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const enterEditMode = (task) => {
    setEditedTask(task);
    setIsEditing(true);
    setPreviousFocusEl(document.activeElement);
  };

  const markAllComplete = async () => {
    const activeTasks = tasks.filter((task) => !task.checked);
    if (!activeTasks.length) return;

    setApiError('');
    setIsSyncing(true);
    try {
      const updates = await Promise.all(activeTasks.map((task) => updateTaskApi(task.id, { checked: true })));
      const byId = new Map(updates.map((task) => [task.id, normalizeTask(task)]));
      setTasks((prevState) => prevState.map((task) => byId.get(task.id) || task));
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearCompleted = async () => {
    const completedTasks = tasks.filter((task) => task.checked);
    if (!completedTasks.length) return;

    setApiError('');
    setIsSyncing(true);
    try {
      await Promise.all(completedTasks.map((task) => deleteTaskApi(task.id)));
      setLastDeletedBatch(completedTasks);
      setTasks((prevState) => prevState.filter((task) => !task.checked));
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const undoDelete = async () => {
    if (!lastDeletedBatch.length) return;

    setApiError('');
    setIsSyncing(true);
    try {
      const recreated = await Promise.all(lastDeletedBatch.map((task) => {
        const payload = { ...task };
        delete payload.id;
        return createTask(payload);
      }));

      setTasks((prevState) => [...prevState, ...recreated.map(normalizeTask)]);
      setLastDeletedBatch([]);
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetWorkspaceFilters = () => {
    setView('all');
    setSortBy('created-desc');
    setSearch('');
    setActivePanel('tasks');
  };

  const openFocusPanel = () => setActivePanel('focus');

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      const typing = isInputElement(event.target);
      if (!key) return;

      if (event.altKey && PANEL_SHORTCUTS[key]) {
        event.preventDefault();
        setActivePanel(PANEL_SHORTCUTS[key]);
        return;
      }

      if (!typing && key === 'n') {
        event.preventDefault();
        setActivePanel('tasks');
        taskInputRef.current?.focus();
      }

      if (!typing && event.key === '/') {
        event.preventDefault();
        setActivePanel('tasks');
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActivePanel]);

  const filteredTasks = useMemo(() => {
    const base = tasks.filter((task) => {
      if (view === 'completed') return task.checked;
      if (view === 'active') return !task.checked;
      if (view === 'today') return isTodayDate(task.dueDate);
      if (view === 'upcoming') {
        if (!task.dueDate || task.checked) return false;
        const today = startOfToday();
        const due = new Date(`${task.dueDate}T00:00:00`);
        return due.getTime() > today.getTime();
      }
      if (view === 'overdue') return isTaskOverdue(task);
      return true;
    });

    const query = search.trim().toLowerCase();
    const searched = query
      ? base.filter((task) => (
        task.name.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query) ||
        task.notes.toLowerCase().includes(query)
      ))
      : base;

    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const copy = [...searched];
    copy.sort((a, b) => {
      if (sortBy === 'created-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'created-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'priority-desc') return priorityWeight[b.priority] - priorityWeight[a.priority];
      if (sortBy === 'priority-asc') return priorityWeight[a.priority] - priorityWeight[b.priority];
      if (sortBy === 'due-asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === 'due-desc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate) - new Date(a.dueDate);
      }
      return 0;
    });

    return copy;
  }, [tasks, view, search, sortBy]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.checked).length;
    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;

    const now = new Date();
    const day = now.getDay();
    const mondayDiff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayDiff);
    weekStart.setHours(0, 0, 0, 0);
    const weekDone = tasks.filter((task) => task.completedAt && new Date(task.completedAt) >= weekStart).length;

    return {
      total: tasks.length,
      completed,
      active: tasks.length - completed,
      overdue,
      completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      weekDone
    };
  }, [tasks]);

  const todayTasks = useMemo(
    () => tasks.filter((task) => !task.checked && isTodayDate(task.dueDate)),
    [tasks]
  );

  const overdueTasks = useMemo(
    () => tasks.filter((task) => isTaskOverdue(task)),
    [tasks]
  );

  const upcomingTasks = useMemo(() => {
    const today = startOfToday();
    return tasks
      .filter((task) => task.dueDate && !task.checked)
      .map((task) => ({ ...task, dueValue: new Date(`${task.dueDate}T00:00:00`).getTime() }))
      .filter((task) => task.dueValue > today.getTime())
      .sort((a, b) => a.dueValue - b.dueValue)
      .slice(0, 6);
  }, [tasks]);

  const topCategories = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const key = task.category || 'General';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [tasks]);

  const handleViewTabKeyDown = (event, currentIndex) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + direction + VIEWS.length) % VIEWS.length;
    const nextView = VIEWS[nextIndex];
    setView(nextView.id);
    tabRefs.current[nextIndex]?.focus();
  };

  const isBusy = isLoading || isSyncing;

  return (
    <div className={`app-shell density-${density}`}>
      <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} stats={stats} />
      <main className="container main-panel">
        <header>
          <h1>TaskNest</h1>
          <p className="subtitle">Plan, prioritize, and finish your work with momentum.</p>
          <div className="pulse-strip" aria-label="Current workload highlights">
            <span className="pulse-chip">
              <strong>{todayTasks.length}</strong>
              due today
            </span>
            <span className="pulse-chip">
              <strong>{overdueTasks.length}</strong>
              overdue
            </span>
            <span className="pulse-chip">
              <strong>{upcomingTasks.length}</strong>
              upcoming
            </span>
            <span className="pulse-chip">
              <strong>{stats.weekDone}</strong>
              done this week
            </span>
          </div>
          <div className="sync-row" role="status" aria-live="polite">
            <p className={`sync-status ${apiError ? 'is-error' : ''}`}>
              {apiError ? `Backend sync error: ${apiError}` : isBusy ? 'Syncing with backend...' : 'All changes synced'}
            </p>
            <button className="btn" type="button" onClick={loadTasks} disabled={isBusy}>
              Refresh data
            </button>
          </div>
        </header>

        {isEditing && (
          <EditForm
            editedTask={editedTask}
            updateTask={updateTask}
            closeEditMode={closeEditMode}
          />
        )}

        {activePanel === 'overview' && (
          <section id="panel-overview" aria-label="Overview">
            <section className="stats-grid" aria-label="Task statistics">
              <StatCard value={stats.total} label="Total" />
              <StatCard value={stats.active} label="Active" />
              <StatCard value={stats.completed} label="Completed" />
              <StatCard value={stats.overdue} label="Overdue" />
              <StatCard value={`${stats.completionRate}%`} label="Completion" />
              <StatCard value={stats.weekDone} label="Done this week" />
            </section>
            <section className="panel-grid">
              <PanelCard title="Upcoming">
                <ul className="compact-list">
                  {upcomingTasks.map((task) => (
                    <li key={task.id}>{task.name} <small>{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}</small></li>
                  ))}
                  {!upcomingTasks.length && <li>{isLoading ? 'Loading upcoming tasks...' : 'No upcoming due dates.'}</li>}
                </ul>
              </PanelCard>
              <PanelCard title="Top categories">
                <ul className="compact-list">
                  {topCategories.map(([category, count]) => (
                    <li key={category}>{category} <small>{count} tasks</small></li>
                  ))}
                  {!topCategories.length && <li>{isLoading ? 'Loading categories...' : 'No categories yet.'}</li>}
                </ul>
              </PanelCard>
            </section>
          </section>
        )}

        {activePanel === 'tasks' && (
          <section id="panel-tasks" aria-label="Tasks">
            <CustomForm ref={taskInputRef} addTask={addTask} addTaskFromQuickInput={addTaskFromQuickInput} />
            <section className="controls" aria-label="Task controls">
              <div className="view-tabs" role="tablist" aria-label="Task views">
                {VIEWS.map((item, index) => (
                  <button
                    key={item.id}
                    ref={(el) => { tabRefs.current[index] = el; }}
                    className={`btn tab-btn ${view === item.id ? 'active' : ''}`}
                    role="tab"
                    id={`view-tab-${item.id}`}
                    aria-controls="task-list-panel"
                    aria-selected={view === item.id}
                    tabIndex={view === item.id ? 0 : -1}
                    onClick={() => setView(item.id)}
                    onKeyDown={(event) => handleViewTabKeyDown(event, index)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="toolbar">
                <input
                  ref={searchInputRef}
                  className="input"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks, category, notes"
                  aria-label="Search tasks"
                />
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort tasks"
                >
                  <option value="created-desc">Newest</option>
                  <option value="created-asc">Oldest</option>
                  <option value="priority-desc">Priority high-low</option>
                  <option value="priority-asc">Priority low-high</option>
                  <option value="due-asc">Due soonest</option>
                  <option value="due-desc">Due latest</option>
                </select>
              </div>

              <div className="bulk-actions">
                <button className="btn" type="button" onClick={markAllComplete} disabled={isBusy}>Complete all</button>
                <button className="btn" type="button" onClick={clearCompleted} disabled={isBusy}>Clear completed</button>
                <button className="btn" type="button" onClick={undoDelete} disabled={isBusy || !lastDeletedBatch.length}>Undo delete</button>
              </div>
            </section>
            <section id="task-list-panel" role="tabpanel" aria-labelledby={`view-tab-${view}`}>
              <TaskList
                tasks={filteredTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                emptyMessage={isLoading ? 'Loading tasks from backend...' : 'No tasks match this view.'}
              />
            </section>
          </section>
        )}

        {activePanel === 'focus' && (
          <section id="panel-focus" className="panel-grid" aria-label="Focus">
            <PanelCard title="Due today">
              <TaskList
                tasks={todayTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                emptyMessage={isLoading ? 'Loading...' : 'Nothing due today.'}
              />
            </PanelCard>
            <PanelCard title="Overdue">
              <TaskList
                tasks={overdueTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                emptyMessage={isLoading ? 'Loading...' : 'No overdue tasks.'}
              />
            </PanelCard>
          </section>
        )}

        {activePanel === 'settings' && (
          <section id="panel-settings">
            <SettingsPanel
              density={density}
              setDensity={setDensity}
              resetWorkspaceFilters={resetWorkspaceFilters}
              openFocusPanel={openFocusPanel}
              stats={stats}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
