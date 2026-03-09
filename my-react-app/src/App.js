import { useEffect, useMemo, useRef, useState } from 'react';

import useLocalStorage from './hooks/useLocalStorage';

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

function App() {
  const [tasks, setTasks] = useLocalStorage('react-todo.tasks', []);
  const [activePanel, setActivePanel] = useLocalStorage('react-todo.panel', 'tasks');
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created-desc');
  const [density, setDensity] = useLocalStorage('react-todo.density', 'comfortable');
  const [lastDeletedBatch, setLastDeletedBatch] = useState([]);
  const [previousFocusEl, setPreviousFocusEl] = useState(null);
  const [editedTask, setEditedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const taskInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const tabRefs = useRef([]);

  const createId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const getNextDueDate = (dueDate, repeat) => {
    if (!dueDate || repeat === 'none') return '';
    const date = new Date(`${dueDate}T00:00:00`);
    if (repeat === 'daily') date.setDate(date.getDate() + 1);
    if (repeat === 'weekly') date.setDate(date.getDate() + 7);
    if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
  };

  const normalizeTask = (taskInput) => ({
    id: taskInput.id ?? createId(),
    name: (taskInput.name ?? '').trim(),
    checked: Boolean(taskInput.checked),
    priority: taskInput.priority ?? 'medium',
    dueDate: taskInput.dueDate ?? '',
    category: (taskInput.category ?? 'General').trim() || 'General',
    notes: (taskInput.notes ?? '').trim(),
    repeat: taskInput.repeat ?? 'none',
    createdAt: taskInput.createdAt ?? new Date().toISOString(),
    completedAt: taskInput.completedAt ?? null
  });

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

    return normalizeTask({
      name: keep.join(' '),
      checked: false,
      ...data
    });
  };

  const addTask = (taskInput) => {
    const task = normalizeTask(taskInput);
    if (!task.name) return;
    setTasks((prevState) => [...prevState, task]);
  };

  const addTaskFromQuickInput = (rawText) => {
    const parsed = buildTaskFromText(rawText);
    if (!parsed.name) return;
    setTasks((prevState) => [...prevState, parsed]);
  };

  const deleteTask = (id) => {
    setTasks((prevState) => {
      const removed = prevState.filter((t) => t.id === id);
      setLastDeletedBatch(removed);
      return prevState.filter((t) => t.id !== id);
    });
  };

  const toggleTask = (id) => {
    setTasks((prevState) => {
      const toggled = prevState.find((t) => t.id === id);
      if (!toggled) return prevState;

      const nextChecked = !toggled.checked;
      const nextTasks = prevState.map((t) => (
        t.id === id
          ? { ...t, checked: nextChecked, completedAt: nextChecked ? new Date().toISOString() : null }
          : t
      ));

      if (!toggled.checked && toggled.repeat && toggled.repeat !== 'none') {
        const recurringTask = normalizeTask({
          ...toggled,
          id: createId(),
          checked: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
          dueDate: getNextDueDate(toggled.dueDate, toggled.repeat)
        });
        return [...nextTasks, recurringTask];
      }

      return nextTasks;
    });
  };

  const closeEditMode = () => {
    setIsEditing(false);
    previousFocusEl?.focus?.();
  };

  const updateTask = (task) => {
    const normalized = normalizeTask(task);
    setTasks((prevState) => prevState.map((t) => (
      t.id === normalized.id
        ? { ...t, ...normalized }
        : t
    )));
    closeEditMode();
  };

  const enterEditMode = (task) => {
    setEditedTask(task);
    setIsEditing(true);
    setPreviousFocusEl(document.activeElement);
  };

  const markAllComplete = () => {
    setTasks((prevState) => prevState.map((task) => (
      task.checked
        ? task
        : { ...task, checked: true, completedAt: new Date().toISOString() }
    )));
  };

  const clearCompleted = () => {
    setTasks((prevState) => {
      const removed = prevState.filter((task) => task.checked);
      setLastDeletedBatch(removed);
      return prevState.filter((task) => !task.checked);
    });
  };

  const undoDelete = () => {
    if (!lastDeletedBatch.length) return;
    setTasks((prevState) => [...prevState, ...lastDeletedBatch]);
    setLastDeletedBatch([]);
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
      const key = event.key.toLowerCase();
      const typing = isInputElement(event.target);

      if (event.altKey && PANEL_SHORTCUTS[event.key]) {
        event.preventDefault();
        setActivePanel(PANEL_SHORTCUTS[event.key]);
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
      if (sortBy === 'created-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'created-desc') return new Date(b.createdAt) - new Date(a.createdAt);
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
                  {!upcomingTasks.length && <li>No upcoming due dates.</li>}
                </ul>
              </PanelCard>
              <PanelCard title="Top categories">
                <ul className="compact-list">
                  {topCategories.map(([category, count]) => (
                    <li key={category}>{category} <small>{count} tasks</small></li>
                  ))}
                  {!topCategories.length && <li>No categories yet.</li>}
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
                <button className="btn" type="button" onClick={markAllComplete}>Complete all</button>
                <button className="btn" type="button" onClick={clearCompleted}>Clear completed</button>
                <button className="btn" type="button" onClick={undoDelete} disabled={!lastDeletedBatch.length}>Undo delete</button>
              </div>
            </section>
            <section id="task-list-panel" role="tabpanel" aria-labelledby={`view-tab-${view}`}>
              <TaskList
                tasks={filteredTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                emptyMessage="No tasks match this view."
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
                emptyMessage="Nothing due today."
              />
            </PanelCard>
            <PanelCard title="Overdue">
              <TaskList
                tasks={overdueTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                emptyMessage="No overdue tasks."
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
