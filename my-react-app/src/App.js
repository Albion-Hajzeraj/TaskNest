import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useLocalStorage from './hooks/useLocalStorage';
import { createTask, deleteTask as deleteTaskApi, getTasks, updateTask as updateTaskApi } from './services/tasks-api';
import { getStats as getStatsApi } from './services/stats-api';
import { getEffectivePriority } from './features/tasks/priority';

import CustomForm from './components/CustomForm';
import EditForm from './components/EditForm';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PomodoroTimer from './components/PomodoroTimer';
import GamificationPanel from './components/GamificationPanel';
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

const pad = (value) => String(value).padStart(2, '0');

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const WORK_DURATION_SECONDS = 25 * 60;
const BREAK_DURATION_SECONDS = 5 * 60;

const normalizeTask = (taskInput) => ({
  id: taskInput.id,
  name: (taskInput.name ?? '').trim(),
  checked: Boolean(taskInput.checked),
  priority: taskInput.priority ?? 'medium',
  priorityMode: taskInput.priorityMode ?? 'auto',
  status: taskInput.status ?? (taskInput.checked ? 'done' : 'todo'),
  dueDate: taskInput.dueDate ?? '',
  category: (taskInput.category ?? 'General').trim() || 'General',
  notes: (taskInput.notes ?? '').trim(),
  repeat: taskInput.repeat ?? 'none',
  timeSpentSeconds: Number.isFinite(taskInput.timeSpentSeconds) ? taskInput.timeSpentSeconds : 0,
  subtasks: Array.isArray(taskInput.subtasks)
    ? taskInput.subtasks.map((item) => ({
      id: item.id,
      title: (item.title ?? '').trim(),
      checked: Boolean(item.checked)
    }))
    : [],
  createdAt: taskInput.createdAt ?? null,
  completedAt: taskInput.completedAt ?? null
});

function App() {
  const [tasks, setTasks] = useState([]);
  const [activePanel, setActivePanel] = useLocalStorage('react-todo.panel', 'tasks');
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('priority-desc');
  const [taskViewMode, setTaskViewMode] = useState('list');
  const [calendarViewMode, setCalendarViewMode] = useState('month');
  const [calendarCursor, setCalendarCursor] = useState(() => startOfToday());
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
  const [density, setDensity] = useLocalStorage('react-todo.density', 'comfortable');
  const [lastDeletedBatch, setLastDeletedBatch] = useState([]);
  const [previousFocusEl, setPreviousFocusEl] = useState(null);
  const [editedTask, setEditedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState('');
  const [gamification, setGamification] = useState({
    xp: 0,
    level: 1,
    currentLevelXp: 0,
    nextLevelXp: 100,
    progress: 0
  });
  const [pomodoroTaskId, setPomodoroTaskId] = useState(null);
  const [pomodoroMode, setPomodoroMode] = useState('work');
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(WORK_DURATION_SECONDS);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const taskInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const tabRefs = useRef([]);

  const setErrorFromUnknown = useCallback((error) => {
    setApiError(error instanceof Error ? error.message : 'Unexpected API error');
  }, []);

  const shouldRefreshForRecurring = (previousTask, updatedTask) => (
    previousTask
    && updatedTask
    && !previousTask.checked
    && updatedTask.checked
    && updatedTask.repeat
    && updatedTask.repeat !== 'none'
    && updatedTask.dueDate
  );

  const shouldRefreshGamification = (previousTask, updatedTask) => (
    previousTask
    && updatedTask
    && !previousTask.checked
    && updatedTask.checked
  );

  const loadTasks = useCallback(async () => {
    setApiError('');
    setIsLoading(true);
    try {
      const remoteTasks = await getTasks();
      setTasks(Array.isArray(remoteTasks) ? remoteTasks.map(normalizeTask) : []);
      const stats = await getStatsApi();
      if (stats) {
        setGamification(stats);
      }
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsLoading(false);
    }
  }, [setErrorFromUnknown]);

  const loadGamification = useCallback(async () => {
    try {
      const stats = await getStatsApi();
      if (stats) {
        setGamification(stats);
      }
    } catch (error) {
      setErrorFromUnknown(error);
    }
  }, [setErrorFromUnknown]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const buildTaskFromText = (rawText) => {
    const cleaned = rawText.trim();
    const tokens = cleaned.split(/\s+/);
    const data = {
      priority: 'medium',
      priorityMode: 'auto',
      category: 'General',
      dueDate: '',
      repeat: 'none',
      status: 'todo'
    };
    const keep = [];

    tokens.forEach((token) => {
      const lower = token.toLowerCase();

      if (/^!(high|medium|low)$/.test(lower)) {
        data.priority = lower.slice(1);
        data.priorityMode = 'manual';
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
      if (shouldRefreshForRecurring(task, toggled)) {
        await loadTasks();
        return;
      }
      if (shouldRefreshGamification(task, toggled)) {
        await loadGamification();
      }
      setTasks((prevState) => prevState.map((item) => (item.id === id ? normalizeTask(toggled) : item)));
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

  const updateTaskStatus = async (taskId, status) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;

    setApiError('');
    setIsSyncing(true);
    try {
      const updated = await updateTaskApi(taskId, { status });
      if (shouldRefreshForRecurring(task, updated)) {
        await loadTasks();
        return;
      }
      if (shouldRefreshGamification(task, updated)) {
        await loadGamification();
      }
      setTasks((prevState) => prevState.map((item) => (item.id === taskId ? normalizeTask(updated) : item)));
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const moveTaskToDate = async (taskId, dueDate) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.dueDate === dueDate) return;

    setApiError('');
    setIsSyncing(true);
    try {
      const updated = await updateTaskApi(taskId, { dueDate });
      setTasks((prevState) => prevState.map((item) => (item.id === taskId ? normalizeTask(updated) : item)));
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSubtasks = async (taskId, updater) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const nextSubtasks = updater(task.subtasks || []);
    const cleaned = nextSubtasks
      .map((item) => ({
        id: item.id || (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        title: (item.title || '').trim(),
        checked: Boolean(item.checked)
      }))
      .filter((item) => item.title);

    setApiError('');
    setIsSyncing(true);
    try {
      const updated = await updateTaskApi(taskId, { subtasks: cleaned });
      if (shouldRefreshForRecurring(task, updated)) {
        await loadTasks();
        return;
      }
      if (shouldRefreshGamification(task, updated)) {
        await loadGamification();
      }
      setTasks((prevState) => prevState.map((item) => (item.id === taskId ? normalizeTask(updated) : item)));
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const addSubtask = async (taskId, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    await updateSubtasks(taskId, (subtasks) => [
      ...subtasks,
      { title: trimmed, checked: false }
    ]);
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    await updateSubtasks(taskId, (subtasks) => subtasks.map((item) => (
      item.id === subtaskId ? { ...item, checked: !item.checked } : item
    )));
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    await updateSubtasks(taskId, (subtasks) => subtasks.filter((item) => item.id !== subtaskId));
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
      const shouldReload = updates.some((updated, index) => shouldRefreshForRecurring(activeTasks[index], updated));
      if (shouldReload) {
        await loadTasks();
        return;
      }
      const shouldReloadGamification = updates.some((updated, index) => shouldRefreshGamification(activeTasks[index], updated));
      if (shouldReloadGamification) {
        await loadGamification();
      }
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
    const now = new Date();
    const copy = [...searched];
    copy.sort((a, b) => {
      const aEffective = getEffectivePriority(a, now);
      const bEffective = getEffectivePriority(b, now);
      const priorityDelta = priorityWeight[bEffective] - priorityWeight[aEffective];
      if (priorityDelta !== 0) return priorityDelta;

      if (sortBy === 'created-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'created-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'priority-desc') return priorityWeight[bEffective] - priorityWeight[aEffective];
      if (sortBy === 'priority-asc') return priorityWeight[aEffective] - priorityWeight[bEffective];
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
    () => {
      const now = new Date();
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return tasks
        .filter((task) => !task.checked && isTodayDate(task.dueDate))
        .sort((a, b) => priorityWeight[getEffectivePriority(b, now)] - priorityWeight[getEffectivePriority(a, now)]);
    },
    [tasks]
  );

  const overdueTasks = useMemo(
    () => {
      const now = new Date();
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return tasks
        .filter((task) => isTaskOverdue(task))
        .sort((a, b) => priorityWeight[getEffectivePriority(b, now)] - priorityWeight[getEffectivePriority(a, now)]);
    },
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

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.checked).slice(0, 6),
    [tasks]
  );

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTasks.filter((task) => task.dueDate === selectedDate);
  }, [filteredTasks, selectedDate]);

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

  const navItems = useMemo(() => ([
    { id: 'overview', label: 'Dashboard', hint: `${stats.completionRate}% done` },
    { id: 'tasks', label: 'Tasks', hint: `${stats.total} total` },
    { id: 'calendar', label: 'Calendar', hint: 'Schedule' },
    { id: 'analytics', label: 'Analytics', hint: `Level ${gamification.level}` },
    { id: 'settings', label: 'Settings', hint: 'Preferences' }
  ]), [stats.completionRate, stats.total, gamification.level]);

  const addTimeToTask = useCallback(async (taskId, seconds) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || seconds <= 0) return;

    setApiError('');
    setIsSyncing(true);
    try {
      const nextTime = (task.timeSpentSeconds || 0) + seconds;
      const updated = await updateTaskApi(taskId, { timeSpentSeconds: nextTime });
      setTasks((prevState) => prevState.map((item) => (
        item.id === taskId ? normalizeTask(updated) : item
      )));
    } catch (error) {
      setErrorFromUnknown(error);
    } finally {
      setIsSyncing(false);
    }
  }, [tasks, setErrorFromUnknown]);

  const resetPomodoro = useCallback((mode = pomodoroMode) => {
    setPomodoroRunning(false);
    setPomodoroSecondsLeft(mode === 'break' ? BREAK_DURATION_SECONDS : WORK_DURATION_SECONDS);
  }, [pomodoroMode]);

  const startPomodoroForTask = useCallback((taskId) => {
    setPomodoroTaskId(taskId);
    setPomodoroMode('work');
    setPomodoroSecondsLeft(WORK_DURATION_SECONDS);
    setPomodoroRunning(true);
  }, []);

  useEffect(() => {
    if (!pomodoroRunning) return undefined;
    const interval = setInterval(() => {
      setPomodoroSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [pomodoroRunning]);

  useEffect(() => {
    if (pomodoroSecondsLeft > 0) return;
    if (pomodoroMode === 'work') {
      if (pomodoroTaskId) {
        addTimeToTask(pomodoroTaskId, WORK_DURATION_SECONDS);
      }
      setPomodoroMode('break');
      setPomodoroSecondsLeft(BREAK_DURATION_SECONDS);
      setPomodoroRunning(false);
      return;
    }
    setPomodoroMode('work');
    setPomodoroSecondsLeft(WORK_DURATION_SECONDS);
    setPomodoroRunning(false);
  }, [pomodoroSecondsLeft, pomodoroMode, pomodoroTaskId, addTimeToTask]);

  useEffect(() => {
    if (!pomodoroTaskId) return;
    const exists = tasks.some((task) => task.id === pomodoroTaskId);
    if (!exists) {
      setPomodoroTaskId(null);
      resetPomodoro('work');
    }
  }, [tasks, pomodoroTaskId, resetPomodoro]);

  return (
    <div className={`app-shell density-${density} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activePanel={activePanel}
        items={navItems}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onNavigate={(item) => {
          setActivePanel(item.id);
          if (item.id === 'calendar') {
            setTaskViewMode('calendar');
          }
        }}
      />
      <div className="main-shell">
        <header className="topbar" role="banner">
          <div className="topbar-left">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>TaskNest</h1>
            </div>
            <span className="topbar-chip">Focus mode ready</span>
          </div>
          <div className="topbar-right">
            <div className={`sync-status ${apiError ? 'is-error' : ''}`} role="status" aria-live="polite">
              {apiError ? `Backend sync error: ${apiError}` : isBusy ? 'Syncing...' : 'All changes synced'}
            </div>
            <button className="btn" type="button" onClick={loadTasks} disabled={isBusy}>
              Refresh
            </button>
          </div>
        </header>
        <main className="container main-panel">
          <header className="page-header">
            <div>
              <h2>{activePanel === 'tasks' ? 'Tasks' : activePanel === 'calendar' ? 'Calendar' : activePanel === 'analytics' ? 'Analytics' : activePanel === 'settings' ? 'Settings' : 'Dashboard'}</h2>
              <p className="subtitle">
                {activePanel === 'calendar'
                  ? 'Plan the week with a clear schedule.'
                  : activePanel === 'analytics'
                    ? 'Track momentum, streaks, and performance.'
                    : activePanel === 'tasks'
                      ? 'Capture, prioritize, and move work forward.'
                      : activePanel === 'settings'
                        ? 'Personalize your workspace.'
                        : 'Plan, prioritize, and finish your work with momentum.'}
              </p>
            </div>
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
          <section id="panel-overview" className="page-section panel-stack" aria-label="Overview">
            <section className="stats-grid" aria-label="Task statistics">
              <StatCard value={stats.total} label="Total" />
              <StatCard value={stats.active} label="Active" />
              <StatCard value={stats.completed} label="Completed" />
              <StatCard value={stats.overdue} label="Overdue" />
              <StatCard value={`${stats.completionRate}%`} label="Completion" />
              <StatCard value={stats.weekDone} label="Done this week" />
            </section>
            <PanelCard title="Gamification">
              <GamificationPanel stats={gamification} tasks={tasks} />
            </PanelCard>
            <PanelCard title="Productivity analytics">
              <AnalyticsDashboard tasks={tasks} />
            </PanelCard>
            <section className="panel-grid">
              <PanelCard title="Active tasks">
                <ul className="compact-list">
                  {activeTasks.map((task) => (
                    <li key={task.id}>{task.name} <small>{task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString() : 'No due date'}</small></li>
                  ))}
                  {!activeTasks.length && <li>{isLoading ? 'Loading active tasks...' : 'No active tasks yet.'}</li>}
                </ul>
              </PanelCard>
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

        {activePanel === 'analytics' && (
          <section id="panel-analytics" className="page-section panel-stack" aria-label="Analytics">
            <PanelCard title="Gamification">
              <GamificationPanel stats={gamification} tasks={tasks} />
            </PanelCard>
            <PanelCard title="Productivity analytics">
              <AnalyticsDashboard tasks={tasks} />
            </PanelCard>
          </section>
        )}

        {activePanel === 'calendar' && (
          <section id="panel-calendar" className="page-section panel-stack" aria-label="Calendar">
            <CalendarView
              tasks={filteredTasks}
              viewMode={calendarViewMode}
              onViewModeChange={setCalendarViewMode}
              cursorDate={calendarCursor}
              onNavigate={setCalendarCursor}
              selectedDate={selectedDate}
              onSelectDate={(dateKey) => {
                setSelectedDate(dateKey);
                const [year, month, day] = dateKey.split('-').map(Number);
                setCalendarCursor(new Date(year, month - 1, day));
              }}
              onMoveTask={moveTaskToDate}
              isBusy={isBusy}
            />
            <PanelCard title={`Tasks on ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString()}`}>
              <TaskList
                tasks={selectedDayTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                addSubtask={addSubtask}
                toggleSubtask={toggleSubtask}
                deleteSubtask={deleteSubtask}
                emptyMessage={isLoading ? 'Loading...' : 'No tasks scheduled for this day.'}
              />
            </PanelCard>
          </section>
        )}

        {activePanel === 'tasks' && (
          <section id="panel-tasks" className="page-section panel-stack" aria-label="Tasks">
            <PanelCard title="Create task">
              <CustomForm ref={taskInputRef} addTask={addTask} addTaskFromQuickInput={addTaskFromQuickInput} />
            </PanelCard>
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
                <div className="stack-inline">
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
                  <div className="segmented-control">
                    <button
                      className={`btn segment-btn ${taskViewMode === 'list' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setTaskViewMode('list')}
                    >
                      List
                    </button>
                    <button
                      className={`btn segment-btn ${taskViewMode === 'kanban' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setTaskViewMode('kanban')}
                    >
                      Kanban
                    </button>
                    <button
                      className={`btn segment-btn ${taskViewMode === 'calendar' ? 'active' : ''}`}
                      type="button"
                      onClick={() => setTaskViewMode('calendar')}
                    >
                      Calendar
                    </button>
                  </div>
                </div>
              </div>

              <div className="bulk-actions">
                <button className="btn" type="button" onClick={markAllComplete} disabled={isBusy}>Complete all</button>
                <button className="btn" type="button" onClick={clearCompleted} disabled={isBusy}>Clear completed</button>
                <button className="btn" type="button" onClick={undoDelete} disabled={isBusy || !lastDeletedBatch.length}>Undo delete</button>
              </div>
            </section>
            <section id="task-list-panel" role="tabpanel" aria-labelledby={`view-tab-${view}`}>
              {taskViewMode === 'list' ? (
                <TaskList
                  tasks={filteredTasks}
                  deleteTask={deleteTask}
                  toggleTask={toggleTask}
                  enterEditMode={enterEditMode}
                  addSubtask={addSubtask}
                  toggleSubtask={toggleSubtask}
                  deleteSubtask={deleteSubtask}
                  emptyMessage={isLoading ? 'Loading tasks from backend...' : 'No tasks match this view.'}
                />
              ) : (
                taskViewMode === 'kanban' ? (
                <KanbanBoard
                  tasks={filteredTasks}
                  onStatusChange={updateTaskStatus}
                  enterEditMode={enterEditMode}
                  deleteTask={deleteTask}
                  isBusy={isBusy}
                />
                ) : (
                  <>
                    <CalendarView
                      tasks={filteredTasks}
                      viewMode={calendarViewMode}
                      onViewModeChange={setCalendarViewMode}
                      cursorDate={calendarCursor}
                      onNavigate={setCalendarCursor}
                      selectedDate={selectedDate}
                      onSelectDate={(dateKey) => {
                        setSelectedDate(dateKey);
                        const [year, month, day] = dateKey.split('-').map(Number);
                        setCalendarCursor(new Date(year, month - 1, day));
                      }}
                      onMoveTask={moveTaskToDate}
                      isBusy={isBusy}
                    />
                    <PanelCard title={`Tasks on ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString()}`}>
                      <TaskList
                        tasks={selectedDayTasks}
                        deleteTask={deleteTask}
                        toggleTask={toggleTask}
                        enterEditMode={enterEditMode}
                        addSubtask={addSubtask}
                        toggleSubtask={toggleSubtask}
                        deleteSubtask={deleteSubtask}
                        emptyMessage={isLoading ? 'Loading...' : 'No tasks scheduled for this day.'}
                      />
                    </PanelCard>
                  </>
                )
              )}
            </section>
          </section>
        )}

        {activePanel === 'focus' && (
          <section id="panel-focus" className="page-section panel-grid" aria-label="Focus">
            <PanelCard title="Pomodoro focus">
              <PomodoroTimer
                tasks={tasks.filter((task) => !task.checked)}
                activeTaskId={pomodoroTaskId}
                mode={pomodoroMode}
                secondsLeft={pomodoroSecondsLeft}
                isRunning={pomodoroRunning}
                onStart={() => setPomodoroRunning(true)}
                onPause={() => setPomodoroRunning(false)}
                onReset={() => resetPomodoro()}
                onSkip={() => {
                  setPomodoroRunning(false);
                  if (pomodoroMode === 'work') {
                    setPomodoroMode('break');
                    setPomodoroSecondsLeft(BREAK_DURATION_SECONDS);
                    return;
                  }
                  setPomodoroMode('work');
                  setPomodoroSecondsLeft(WORK_DURATION_SECONDS);
                }}
                onStartTask={startPomodoroForTask}
              />
            </PanelCard>
            <PanelCard title="Due today">
              <TaskList
                tasks={todayTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                addSubtask={addSubtask}
                toggleSubtask={toggleSubtask}
                deleteSubtask={deleteSubtask}
                emptyMessage={isLoading ? 'Loading...' : 'Nothing due today.'}
              />
            </PanelCard>
            <PanelCard title="Overdue">
              <TaskList
                tasks={overdueTasks}
                deleteTask={deleteTask}
                toggleTask={toggleTask}
                enterEditMode={enterEditMode}
                addSubtask={addSubtask}
                toggleSubtask={toggleSubtask}
                deleteSubtask={deleteSubtask}
                emptyMessage={isLoading ? 'Loading...' : 'No overdue tasks.'}
              />
            </PanelCard>
          </section>
        )}

        {activePanel === 'settings' && (
          <section id="panel-settings" className="page-section">
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
    </div>
  );
}

export default App;
