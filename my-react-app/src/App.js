import { useMemo, useRef, useState } from 'react'

// custom hooks
import useLocalStorage from './hooks/useLocalStorage'

// custom components
import CustomForm from './components/CustomForm'
import EditForm from './components/EditForm'
import Sidebar from './components/Sidebar'
import TaskList from './components/TaskList'
import ThemeSwitcher from './components/ThemeSwitcher'

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

function App() {
  const [tasks, setTasks] = useLocalStorage('react-todo.tasks', []);
  const [activePanel, setActivePanel] = useLocalStorage('react-todo.panel', 'tasks');
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created-desc');
  const [lastDeletedBatch, setLastDeletedBatch] = useState([]);
  const [previousFocusEl, setPreviousFocusEl] = useState(null);
  const [editedTask, setEditedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const importRef = useRef(null);

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
    setTasks(prevState => [...prevState, task])
  }

  const addTaskFromQuickInput = (rawText) => {
    const parsed = buildTaskFromText(rawText);
    if (!parsed.name) return;
    setTasks(prevState => [...prevState, parsed]);
  }

  const deleteTask = (id) => {
    setTasks(prevState => {
      const removed = prevState.filter((t) => t.id === id);
      setLastDeletedBatch(removed);
      return prevState.filter(t => t.id !== id);
    });
  }

  const toggleTask = (id) => {
    setTasks(prevState => {
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
  }

  const updateTask = (task) => {
    const normalized = normalizeTask(task);
    setTasks(prevState => prevState.map(t => (
      t.id === normalized.id
        ? { ...t, ...normalized }
        : t
    )))
    closeEditMode();
  }

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

  const exportTasks = () => {
    const payload = JSON.stringify(tasks, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasknest-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTasks = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Invalid file format');
      const normalized = parsed.map(normalizeTask).filter((task) => task.name);
      setTasks(normalized);
    } catch (error) {
      console.error(error);
      alert('Could not import tasks. Please use a valid TaskNest JSON export.');
    } finally {
      event.target.value = '';
    }
  };

  const closeEditMode = () => {
    setIsEditing(false);
    previousFocusEl?.focus?.();
  }

  const enterEditMode = (task) => {
    setEditedTask(task);
    setIsEditing(true);
    setPreviousFocusEl(document.activeElement);
  }

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
    const todayDone = tasks.filter((task) => task.completedAt && isTodayDate(task.completedAt.slice(0, 10))).length;

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
      todayDone,
      weekDone
    };
  }, [tasks]);

  const views = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' }
  ];

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

  return (
    <div className="app-shell">
      <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} stats={stats} />
      <div className="container main-panel">
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
        {
          isEditing && (
            <EditForm
              editedTask={editedTask}
              updateTask={updateTask}
              closeEditMode={closeEditMode}
            />
          )
        }

        {activePanel === 'overview' && (
          <>
            <section className="stats-grid" aria-label="Task statistics">
              <article className="stat-card"><strong>{stats.total}</strong><span>Total</span></article>
              <article className="stat-card"><strong>{stats.active}</strong><span>Active</span></article>
              <article className="stat-card"><strong>{stats.completed}</strong><span>Completed</span></article>
              <article className="stat-card"><strong>{stats.overdue}</strong><span>Overdue</span></article>
              <article className="stat-card"><strong>{stats.completionRate}%</strong><span>Completion</span></article>
              <article className="stat-card"><strong>{stats.weekDone}</strong><span>Done this week</span></article>
            </section>
            <section className="panel-grid">
              <article className="panel-card">
                <h2>Upcoming</h2>
                <ul className="compact-list">
                  {upcomingTasks.map((task) => (
                    <li key={task.id}>{task.name} <small>{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}</small></li>
                  ))}
                  {!upcomingTasks.length && <li>No upcoming due dates.</li>}
                </ul>
              </article>
              <article className="panel-card">
                <h2>Top categories</h2>
                <ul className="compact-list">
                  {topCategories.map(([category, count]) => (
                    <li key={category}>{category} <small>{count} tasks</small></li>
                  ))}
                  {!topCategories.length && <li>No categories yet.</li>}
                </ul>
              </article>
            </section>
          </>
        )}

        {activePanel === 'tasks' && (
          <>
            <CustomForm addTask={addTask} addTaskFromQuickInput={addTaskFromQuickInput} />
            <section className="controls" aria-label="Task controls">
              <div className="view-tabs" role="tablist" aria-label="Views">
                {views.map((item) => (
                  <button
                    key={item.id}
                    className={`btn tab-btn ${view === item.id ? 'active' : ''}`}
                    role="tab"
                    aria-selected={view === item.id}
                    onClick={() => setView(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="toolbar">
                <input
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
            <TaskList
              tasks={filteredTasks}
              deleteTask={deleteTask}
              toggleTask={toggleTask}
              enterEditMode={enterEditMode}
              emptyMessage="No tasks match this view."
            />
          </>
        )}

        {activePanel === 'focus' && (
          <section className="panel-grid">
            <article className="panel-card">
              <h2>Due today</h2>
              <TaskList
                tasks={todayTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                emptyMessage="Nothing due today."
              />
            </article>
            <article className="panel-card">
              <h2>Overdue</h2>
              <TaskList
                tasks={overdueTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                emptyMessage="No overdue tasks."
              />
            </article>
          </section>
        )}

        {activePanel === 'settings' && (
          <section className="panel-grid">
            <article className="panel-card">
              <h2>Data</h2>
              <div className="bulk-actions">
                <button className="btn" type="button" onClick={exportTasks}>Export JSON</button>
                <button className="btn" type="button" onClick={() => importRef.current?.click()}>Import JSON</button>
                <input ref={importRef} type="file" accept="application/json" hidden onChange={importTasks} />
              </div>
            </article>
            <article className="panel-card">
              <h2>Theme</h2>
              <ThemeSwitcher />
            </article>
          </section>
        )}
      </div>
    </div>
  )
}

export default App
