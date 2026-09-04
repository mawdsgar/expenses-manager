import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarRange,
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GripVertical,
  HardHat,
  Pencil,
  PiggyBank,
  Pin,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import {
  buildForecast,
  compareTasksByTimeline,
  formatMonth,
  lowestForecast,
  rebuildTimelineFromOrder,
  taskTotal,
} from './forecast';
import { monthRange } from './seed';
import type {
  RenovationContribution,
  RenovationStatus,
  RenovationTask,
} from './types';
import { useRenovationData } from './useRenovationData';
import './RenovationPlanner.css';

interface RenovationPlannerProps {
  currentSavings: number;
}

const money = (amount: number, decimals = true) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals && amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

const addMonths = (month: string, count: number) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const emptyTask = (month: string): RenovationTask => ({
  id: '',
  title: '',
  area: '',
  estimatedCost: 0,
  scheduledMonth: month,
  status: 'planning',
  sortOrder: 0,
  pinned: false,
  contingencyPercent: 0,
  depositAmount: 0,
  depositMonth: null,
  dependsOn: null,
  notes: '',
});

const statusLabels: Record<RenovationStatus, string> = {
  planning: 'Planning',
  quote_received: 'Quote received',
  booked: 'Booked',
  in_progress: 'In progress',
  complete: 'Complete',
};

export function RenovationPlanner({ currentSavings }: RenovationPlannerProps) {
  const {
    data,
    syncState,
    syncMessage,
    saveTask,
    saveTasks,
    deleteTask,
    saveContribution,
    saveSettings,
  } = useRenovationData();
  const { tasks, contributions, settings } = data;
  const [notice, setNotice] = useState(
    'Drag a job onto a month. I’ll be the boring one who checks the maths.',
  );
  const [noticeTone, setNoticeTone] = useState<'info' | 'warning' | 'success'>('info');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [queueDropId, setQueueDropId] = useState<string | null>(null);
  const [editingContribution, setEditingContribution] = useState<string | null>(null);
  const [contributionDraft, setContributionDraft] = useState('0');
  const [contributionStatus, setContributionStatus] =
    useState<RenovationContribution['status']>('planned');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDraft, setTaskDraft] = useState<RenovationTask>(emptyTask(settings.planStart));
  const timelineRef = useRef<HTMLDivElement>(null);

  const months = useMemo(
    () => monthRange(settings.planStart, settings.planEnd),
    [settings.planEnd, settings.planStart],
  );
  const forecast = useMemo(
    () => buildForecast(currentSavings, tasks, contributions, settings),
    [contributions, currentSavings, settings, tasks],
  );
  const lowest = lowestForecast(forecast, currentSavings);
  const plannedWork = tasks
    .filter((task) => task.status !== 'complete')
    .reduce((sum, task) => sum + taskTotal(task), 0);
  const completedWork = tasks
    .filter((task) => task.status === 'complete')
    .reduce((sum, task) => sum + taskTotal(task), 0);
  const priorityOrderedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    [tasks],
  );
  const timelineOrderedTasks = useMemo(
    () => [...tasks].sort(compareTasksByTimeline),
    [tasks],
  );
  const activeTasks = timelineOrderedTasks.filter((task) => task.status !== 'complete');
  const completedTasks = timelineOrderedTasks.filter((task) => task.status === 'complete');
  const completedCount = completedTasks.length;

  const contributionFor = (month: string) =>
    contributions.find((item) => item.month === month) ?? {
      id: crypto.randomUUID(),
      month,
      amount: month.endsWith('-12') ? 0 : 1800,
      status: 'planned' as const,
    };

  const openContributionEditor = (month: string) => {
    const contribution = contributionFor(month);
    setEditingContribution(month);
    setContributionDraft(String(contribution.amount));
    setContributionStatus(contribution.status);
  };

  const commitContribution = () => {
    if (!editingContribution) return;
    const existing = contributionFor(editingContribution);
    saveContribution({
      ...existing,
      amount: Math.max(0, Number(contributionDraft) || 0),
      status: contributionStatus,
    });
    setEditingContribution(null);
    setNotice('Monthly savings updated. The timeline has done its sums again.');
    setNoticeTone('success');
  };

  const attemptMove = (taskId: string, month: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    saveTask({ ...task, scheduledMonth: month });
    setNotice(`${task.title} moved to ${formatMonth(month)}. The spreadsheet may now retire.`);
    setNoticeTone('success');
  };

  const handleMonthDrop = (event: DragEvent, month: string) => {
    event.preventDefault();
    if (draggedTaskId) attemptMove(draggedTaskId, month);
    setDraggedTaskId(null);
  };

  const reorderTask = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const next = [...activeTasks];
    const fromIndex = next.findIndex((task) => task.id === fromId);
    const toIndex = next.findIndex((task) => task.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    if (next[fromIndex].pinned) {
      setNotice(`${next[fromIndex].title} is pinned. Unpin it before changing its place in the queue.`);
      setNoticeTone('warning');
      return;
    }
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const prioritisedTasks = [...next, ...completedTasks].map((task, sortOrder) => ({
      ...task,
      sortOrder,
    }));
    saveTasks(
      rebuildTimelineFromOrder(
        prioritisedTasks,
        settings,
      ),
    );
    setNotice('Work order updated and the remaining timeline rebuilt to match.');
    setNoticeTone('success');
  };

  const nudgeTask = (id: string, direction: -1 | 1) => {
    const index = activeTasks.findIndex((task) => task.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= activeTasks.length) return;
    reorderTask(id, activeTasks[target].id);
  };

  const rebuildTimeline = () => {
    const result = rebuildTimelineFromOrder(
      priorityOrderedTasks,
      settings,
    );
    saveTasks(result);
    setNotice('Remaining timeline rebuilt from your work order. Completed work and pinned bookings stayed exactly where you left them.');
    setNoticeTone('success');
  };

  const openAddTask = () => {
    setTaskDraft(emptyTask(settings.planStart));
    setShowTaskModal(true);
  };

  const openEditTask = (task: RenovationTask) => {
    setTaskDraft({
      ...task,
      status: task.pinned && task.status !== 'complete' ? 'booked' : task.status,
    });
    setShowTaskModal(true);
  };

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    const savedTask: RenovationTask = {
      ...taskDraft,
      id: taskDraft.id || crypto.randomUUID(),
      estimatedCost: Math.max(0, Number(taskDraft.estimatedCost) || 0),
      contingencyPercent: Math.max(0, Number(taskDraft.contingencyPercent) || 0),
      depositAmount: Math.max(0, Number(taskDraft.depositAmount) || 0),
      sortOrder: taskDraft.id ? taskDraft.sortOrder : tasks.length,
      pinned:
        taskDraft.status === 'complete'
          ? false
          : taskDraft.pinned || taskDraft.status === 'booked',
    };
    saveTask(savedTask);
    setShowTaskModal(false);
    setNotice(`${savedTask.title} added to the plan. Another small victory over renovation chaos.`);
    setNoticeTone('success');
  };

  const removeTask = () => {
    if (!taskDraft.id) return;
    if (!window.confirm(`Remove ${taskDraft.title} from the renovation plan?`)) return;
    deleteTask(taskDraft.id);
    setShowTaskModal(false);
    setNotice(`${taskDraft.title} removed. Hopefully because it is no longer needed, not merely hiding.`);
    setNoticeTone('info');
  };

  const extendPlan = () => {
    const nextEnd = addMonths(settings.planEnd, 6);
    saveSettings({ ...settings, planEnd: nextEnd });
    for (const month of monthRange(addMonths(settings.planEnd, 1), nextEnd)) {
      saveContribution({
        id: crypto.randomUUID(),
        month,
        amount: month.endsWith('-12') ? 0 : 1800,
        status: 'planned',
      });
    }
    setNotice(`Plan extended to ${formatMonth(nextEnd)}. Optimism, but with room for snagging.`);
    setNoticeTone('success');
  };

  const modalForecast = useMemo(() => {
    if (!showTaskModal || !taskDraft.title || taskDraft.estimatedCost <= 0) return null;
    const candidate = taskDraft.id
      ? tasks.map((task) => (task.id === taskDraft.id ? taskDraft : task))
      : [...tasks, { ...taskDraft, id: 'preview' }];
    const preview = buildForecast(currentSavings, candidate, contributions, settings);
    return lowestForecast(preview, currentSavings);
  }, [contributions, currentSavings, settings, showTaskModal, taskDraft, tasks]);

  return (
    <div className="renovation-planner">
      <div className="renovation-topbar">
        <div>
          <div className="eyebrow">Derby Road</div>
          <h1>Renovation planner</h1>
          <p>Plan the work around the money you actually have—not the money the house wishes you had.</p>
        </div>
        <button className="renovation-primary" onClick={openAddTask}>
          <Plus size={17} /> Add work item
        </button>
      </div>

      <section className="renovation-metrics" aria-label="Renovation summary">
        <article>
          <span className="renovation-metric-icon green"><PiggyBank size={21} /></span>
          <div><strong>{money(currentSavings)}</strong><span>Live savings</span></div>
        </article>
        <article>
          <span className="renovation-metric-icon blue"><ClipboardList size={21} /></span>
          <div><strong>{money(plannedWork)}</strong><span>Planned work</span></div>
        </article>
        <article>
          <span className="renovation-metric-icon green"><CircleCheck size={21} /></span>
          <div><strong>{money(completedWork)}</strong><span>Completed Work</span></div>
        </article>
        <article>
          <span className={`renovation-metric-icon ${lowest < 0 ? 'red' : 'amber'}`}>
            <CalendarRange size={21} />
          </span>
          <div><strong>{money(lowest)}</strong><span>Lowest forecast</span></div>
        </article>
      </section>

      <section className="renovation-progress">
        <div>
          <span className="progress-icon"><HardHat size={19} /></span>
          <div>
            <strong>Derby Road progress</strong>
            <span>{completedCount} of {tasks.length} jobs complete</span>
          </div>
        </div>
        <div className="progress-track" aria-label={`${completedCount} of ${tasks.length} jobs complete`}>
          <span style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }} />
        </div>
        <strong>{tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%</strong>
      </section>

      <div className="renovation-layout">
        <section className="timeline-panel">
          <div className="timeline-toolbar">
            <div>
              <h2>Timeline</h2>
              <span>Savings are set month by month · scrolls through {formatMonth(settings.planEnd)}</span>
            </div>
            <div className="timeline-actions">
              <button onClick={() => timelineRef.current?.scrollBy({ left: -900, behavior: 'smooth' })} aria-label="Earlier months">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => timelineRef.current?.scrollBy({ left: 900, behavior: 'smooth' })} aria-label="Later months">
                <ChevronRight size={18} />
              </button>
              <button className="extend-plan" onClick={extendPlan}>Extend 6 months</button>
            </div>
          </div>

          <div className="timeline-scroll" ref={timelineRef}>
            <div className="timeline-grid" style={{ gridTemplateColumns: `repeat(${months.length}, 226px)` }}>
              {forecast.map((monthData) => {
                const contribution = contributionFor(monthData.month);
                const isEditing = editingContribution === monthData.month;
                return (
                  <article
                    key={monthData.month}
                    className="timeline-month"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleMonthDrop(event, monthData.month)}
                  >
                    <header>
                      <strong>{formatMonth(monthData.month, true)}</strong>
                      {!isEditing && (
                        <button onClick={() => openContributionEditor(monthData.month)} aria-label={`Edit savings for ${formatMonth(monthData.month)}`}>
                          <Pencil size={13} />
                        </button>
                      )}
                    </header>
                    {isEditing ? (
                      <div className="contribution-editor">
                        <label>
                          Savings added
                          <span className="compact-money-input">
                            <span>£</span>
                            <input
                              autoFocus
                              type="number"
                              min="0"
                              step="100"
                              value={contributionDraft}
                              onChange={(event) => setContributionDraft(event.target.value)}
                            />
                          </span>
                        </label>
                        <label>
                          Treatment
                          <select
                            value={contributionStatus}
                            onChange={(event) =>
                              setContributionStatus(event.target.value as RenovationContribution['status'])
                            }
                          >
                            <option value="planned">Still to come</option>
                            <option value="received">Already in live balance</option>
                          </select>
                        </label>
                        <div>
                          <button onClick={() => setEditingContribution(null)}>Cancel</button>
                          <button className="save" onClick={commitContribution}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={`contribution-pill ${contribution.status === 'received' ? 'received' : ''}`}
                        onClick={() => openContributionEditor(monthData.month)}
                      >
                        {contribution.status === 'received'
                          ? 'Already in balance'
                          : `+${money(contribution.amount)}`}
                      </button>
                    )}
                    <div className="month-task-list">
                      {monthData.tasks.map((task) => (
                        <button
                          key={task.id}
                          className={`month-task ${task.status === 'complete' ? 'complete' : ''}`}
                          draggable={task.status !== 'complete'}
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onDragEnd={() => setDraggedTaskId(null)}
                          onClick={() => openEditTask(task)}
                        >
                          {task.status === 'complete'
                            ? <CircleCheck size={15} className="task-complete-icon" />
                            : <GripVertical size={14} />}
                          <span><strong>{task.title}</strong><small>{money(taskTotal(task))}</small></span>
                          {task.status !== 'complete' && task.pinned && (
                            <Pin size={13} className="task-pin" />
                          )}
                        </button>
                      ))}
                      {monthData.tasks.length === 0 && (
                        <span className="empty-month">Drop work here</span>
                      )}
                    </div>
                    <footer>
                      <span>Ending balance</span>
                      <strong className={monthData.endingBalance < 0 ? 'negative-balance' : ''}>
                        {money(monthData.endingBalance)}
                      </strong>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="work-queue">
          <div className="queue-heading">
            <div>
              <h2>Work queue</h2>
              <span><strong>{activeTasks.length}</strong> {activeTasks.length === 1 ? 'job' : 'jobs'} · need doing</span>
            </div>
            <button className="queue-add-button" onClick={openAddTask}>
              <Plus size={14} /> Add work
            </button>
          </div>
          <p>Matches the Timeline. Drag to reprioritise and rebuild the remaining plan.</p>
          <div className="queue-list">
            {activeTasks.map((task, index) => (
              <div
                key={task.id}
                className={`queue-task ${queueDropId === task.id ? 'drop-target' : ''}`}
                draggable
                onDragStart={() => setDraggedTaskId(task.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setQueueDropId(task.id);
                }}
                onDragLeave={() => setQueueDropId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedTaskId) reorderTask(draggedTaskId, task.id);
                  setDraggedTaskId(null);
                  setQueueDropId(null);
                }}
              >
                <GripVertical size={15} />
                <span className="queue-number">{index + 1}</span>
                <button className="queue-task-main" onClick={() => openEditTask(task)}>
                  <strong>{task.title}</strong>
                  <span>
                    {money(taskTotal(task))} · {formatMonth(task.scheduledMonth, true)}
                    {task.pinned ? ' · Booked / fixed' : ''}
                  </span>
                </button>
                <div className="queue-controls">
                  <button onClick={() => nudgeTask(task.id, -1)} disabled={task.pinned || index === 0} aria-label={`Move ${task.title} up`}>
                    <ArrowUp size={13} />
                  </button>
                  <button onClick={() => nudgeTask(task.id, 1)} disabled={task.pinned || index === activeTasks.length - 1} aria-label={`Move ${task.title} down`}>
                    <ArrowDown size={13} />
                  </button>
                  <button
                    className={task.pinned ? 'pinned' : ''}
                    onClick={() => saveTask({ ...task, pinned: !task.pinned })}
                    aria-label={`${task.pinned ? 'Unpin' : 'Pin'} ${task.title}`}
                  >
                    <Pin size={14} />
                  </button>
                </div>
              </div>
            ))}
            {activeTasks.length === 0 && (
              <div className="queue-empty">No work left to plan.</div>
            )}
          </div>
          {completedTasks.length > 0 && (
            <details className="completed-work-section">
              <summary>
                <span><CircleCheck size={15} /> Completed ({completedTasks.length})</span>
                <strong>{money(completedWork)}</strong>
              </summary>
              <div className="completed-work-list">
                {completedTasks.map((task) => (
                  <div key={task.id} className="queue-task complete">
                    <CircleCheck size={15} />
                    <button className="queue-task-main" onClick={() => openEditTask(task)}>
                      <strong>{task.title}</strong>
                      <span>{money(taskTotal(task))} · {formatMonth(task.scheduledMonth, true)}</span>
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
          <button className="rebuild-button" onClick={rebuildTimeline}>
            <RefreshCw size={16} /> Rebuild remaining timeline from this order
          </button>
          <div className={`sync-state ${syncState}`}>
            {syncState === 'synced' && <><Check size={13} /> Shared plan synced</>}
            {syncState === 'loading' && 'Loading shared plan…'}
            {syncState === 'local' && 'Saved on this device'}
            {syncState === 'error' && syncMessage}
          </div>
        </aside>
      </div>

      <div className={`renovation-notice ${noticeTone}`} role="status">
        {noticeTone === 'warning' ? <AlertTriangle size={20} /> : noticeTone === 'success' ? <Check size={20} /> : <HardHat size={20} />}
        <span>{notice}</span>
      </div>

      {showTaskModal && (
        <div className="renovation-modal-backdrop" onMouseDown={() => setShowTaskModal(false)}>
          <form className="renovation-modal" onSubmit={submitTask} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{taskDraft.id ? 'Edit renovation cost' : 'Add renovation cost'}</h2>
                <p>Give it a sensible estimate now. Future-you can revise it when the quote arrives.</p>
              </div>
              <button type="button" onClick={() => setShowTaskModal(false)} aria-label="Close"><X size={20} /></button>
            </header>
            <div className="renovation-form-grid">
              <label>
                Job name
                <input
                  required
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })}
                  placeholder="Replace garden gate"
                />
              </label>
              <label>
                Room or area
                <input
                  required
                  value={taskDraft.area}
                  onChange={(event) => setTaskDraft({ ...taskDraft, area: event.target.value })}
                  placeholder="Outside"
                />
              </label>
              <label>
                Estimated cost £
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={taskDraft.estimatedCost || ''}
                  onChange={(event) => setTaskDraft({ ...taskDraft, estimatedCost: Number(event.target.value) })}
                  placeholder="750"
                />
              </label>
              <label>
                Planned month
                <select
                  required
                  value={taskDraft.scheduledMonth}
                  onChange={(event) => setTaskDraft({ ...taskDraft, scheduledMonth: event.target.value })}
                >
                  {months.map((month) => (
                    <option key={month} value={month}>{formatMonth(month)}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={taskDraft.status}
                  onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value as RenovationStatus })}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                Optional contingency %
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={taskDraft.contingencyPercent || ''}
                  onChange={(event) => setTaskDraft({ ...taskDraft, contingencyPercent: Number(event.target.value) })}
                  placeholder="0"
                />
              </label>
              <label>
                Optional deposit £
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taskDraft.depositAmount || ''}
                  onChange={(event) => setTaskDraft({ ...taskDraft, depositAmount: Number(event.target.value) })}
                  placeholder="0"
                />
              </label>
              <label>
                Deposit month
                <input
                  type="month"
                  min={settings.planStart}
                  max={settings.planEnd}
                  value={taskDraft.depositMonth ?? ''}
                  onChange={(event) => setTaskDraft({ ...taskDraft, depositMonth: event.target.value || null })}
                />
              </label>
              <label>
                Depends on another job
                <select
                  value={taskDraft.dependsOn ?? ''}
                  onChange={(event) => setTaskDraft({ ...taskDraft, dependsOn: event.target.value || null })}
                >
                  <option value="">None</option>
                  {priorityOrderedTasks.filter((task) => task.id !== taskDraft.id).map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </label>
              <label className="notes-field">
                Notes
                <textarea
                  rows={3}
                  value={taskDraft.notes}
                  onChange={(event) => setTaskDraft({ ...taskDraft, notes: event.target.value })}
                  placeholder="Quote details, materials, or the name of the suspiciously cheerful builder…"
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={taskDraft.pinned}
                  onChange={(event) => {
                    const pinned = event.target.checked;
                    setTaskDraft({
                      ...taskDraft,
                      pinned,
                      status: pinned
                        ? 'booked'
                        : taskDraft.status === 'booked'
                          ? 'planning'
                          : taskDraft.status,
                    });
                  }}
                />
                Booked in — keep this month fixed
              </label>
            </div>
            {modalForecast !== null && (
              <div className={`modal-forecast ${modalForecast < 0 ? 'unsafe' : ''}`}>
                <CalendarRange size={18} />
                {`Lowest projected balance: ${money(modalForecast)}.`}
              </div>
            )}
            <footer>
              {taskDraft.id ? (
                <button type="button" className="delete-task" onClick={removeTask}><Trash2 size={15} /> Delete</button>
              ) : <span />}
              <div>
                <button type="button" className="modal-cancel" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="renovation-primary">{taskDraft.id ? 'Save changes' : 'Add to plan'}</button>
              </div>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
