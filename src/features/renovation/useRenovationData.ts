import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { makeSeedContributions, seedRenovationData, seedTasks } from './seed';
import type {
  RenovationContribution,
  RenovationData,
  RenovationSettings,
  RenovationTask,
} from './types';

const STORAGE_KEY = 'renovationPlannerV1';
const HOUSEHOLD_ID = 'derby-road';
const supabaseEnabled = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const cloneSeed = (): RenovationData => JSON.parse(JSON.stringify(seedRenovationData));

const taskToRow = (task: RenovationTask) => ({
  id: task.id,
  household_id: HOUSEHOLD_ID,
  title: task.title,
  area: task.area,
  estimated_cost: task.estimatedCost,
  scheduled_month: `${task.scheduledMonth}-01`,
  status: task.status,
  sort_order: task.sortOrder,
  pinned: task.pinned,
  contingency_percent: task.contingencyPercent,
  deposit_amount: task.depositAmount,
  deposit_month: task.depositMonth ? `${task.depositMonth}-01` : null,
  depends_on: task.dependsOn,
  notes: task.notes,
});

const rowToTask = (row: Record<string, unknown>): RenovationTask => ({
  id: String(row.id),
  title: String(row.title),
  area: String(row.area ?? ''),
  estimatedCost: Number(row.estimated_cost),
  scheduledMonth: String(row.scheduled_month).slice(0, 7),
  status: row.status as RenovationTask['status'],
  sortOrder: Number(row.sort_order),
  pinned: Boolean(row.pinned),
  contingencyPercent: Number(row.contingency_percent ?? 0),
  depositAmount: Number(row.deposit_amount ?? 0),
  depositMonth: row.deposit_month ? String(row.deposit_month).slice(0, 7) : null,
  dependsOn: row.depends_on ? String(row.depends_on) : null,
  notes: String(row.notes ?? ''),
});

const contributionToRow = (contribution: RenovationContribution) => ({
  id: contribution.id,
  household_id: HOUSEHOLD_ID,
  month: `${contribution.month}-01`,
  amount: contribution.amount,
  status: contribution.status,
});

const settingsToRow = (settings: RenovationSettings) => ({
  id: HOUSEHOLD_ID,
  safety_buffer: settings.safetyBuffer,
  plan_start: `${settings.planStart}-01`,
  plan_end: `${settings.planEnd}-01`,
});

export const useRenovationData = () => {
  const [data, setData] = useState<RenovationData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneSeed();
    try {
      const parsed = JSON.parse(saved) as RenovationData;
      return {
        ...parsed,
        settings: {
          ...parsed.settings,
          safetyBuffer: parsed.settings?.safetyBuffer ?? 2500,
          planEnd: parsed.settings?.planEnd ?? '2028-06',
        },
      };
    } catch {
      return cloneSeed();
    }
  });
  const [syncState, setSyncState] = useState<'local' | 'loading' | 'synced' | 'error'>(
    supabaseEnabled ? 'loading' : 'local',
  );
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!supabaseEnabled) return;

    const load = async () => {
      const [settingsResult, tasksResult, contributionsResult] = await Promise.all([
        supabase.from('renovation_settings').select('*').eq('id', HOUSEHOLD_ID).maybeSingle(),
        supabase.from('renovation_tasks').select('*').eq('household_id', HOUSEHOLD_ID).order('sort_order'),
        supabase.from('renovation_contributions').select('*').eq('household_id', HOUSEHOLD_ID).order('month'),
      ]);

      const firstError = settingsResult.error || tasksResult.error || contributionsResult.error;
      if (firstError) {
        setSyncState('error');
        setSyncMessage('Planner is saved on this device until the renovation database tables are installed.');
        return;
      }

      if (!settingsResult.data) {
        const seed = cloneSeed();
        const [settingsSeed, tasksSeed, contributionsSeed] = await Promise.all([
          supabase.from('renovation_settings').upsert(settingsToRow(seed.settings)),
          supabase.from('renovation_tasks').upsert(seedTasks.map(taskToRow)),
          supabase.from('renovation_contributions').upsert(makeSeedContributions().map(contributionToRow)),
        ]);
        const seedError = settingsSeed.error || tasksSeed.error || contributionsSeed.error;
        if (seedError) {
          setSyncState('error');
          setSyncMessage('The planner works locally, but its starter data could not be shared yet.');
          return;
        }
        setData(seed);
        setSyncState('synced');
        return;
      }

      setData({
        settings: {
          safetyBuffer: Number(settingsResult.data.safety_buffer),
          planStart: String(settingsResult.data.plan_start).slice(0, 7),
          planEnd: String(settingsResult.data.plan_end).slice(0, 7),
        },
        tasks: (tasksResult.data ?? []).map((row) => rowToTask(row)),
        contributions: (contributionsResult.data ?? []).map((row) => ({
          id: String(row.id),
          month: String(row.month).slice(0, 7),
          amount: Number(row.amount),
          status: row.status as RenovationContribution['status'],
        })),
      });
      setSyncState('synced');
      setSyncMessage('');
    };

    load();
  }, []);

  const saveTask = useCallback(async (task: RenovationTask) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.some((item) => item.id === task.id)
        ? current.tasks.map((item) => (item.id === task.id ? task : item))
        : [...current.tasks, task],
    }));
    if (!supabaseEnabled) return;
    const { error } = await supabase.from('renovation_tasks').upsert(taskToRow(task));
    if (error) {
      setSyncState('error');
      setSyncMessage('Saved on this device; sharing is temporarily unavailable.');
    } else {
      setSyncState('synced');
    }
  }, []);

  const saveTasks = useCallback(async (tasks: RenovationTask[]) => {
    setData((current) => ({ ...current, tasks }));
    if (!supabaseEnabled) return;
    const { error } = await supabase.from('renovation_tasks').upsert(tasks.map(taskToRow));
    if (error) {
      setSyncState('error');
      setSyncMessage('The new order is safe locally, but has not synced yet.');
    } else {
      setSyncState('synced');
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks
        .filter((item) => item.id !== id)
        .map((item) => (item.dependsOn === id ? { ...item, dependsOn: null } : item)),
    }));
    if (!supabaseEnabled) return;
    const { error } = await supabase.from('renovation_tasks').delete().eq('id', id);
    if (error) {
      setSyncState('error');
      setSyncMessage('Removed locally; the shared plan still needs to catch up.');
    }
  }, []);

  const saveContribution = useCallback(async (contribution: RenovationContribution) => {
    setData((current) => ({
      ...current,
      contributions: current.contributions.some((item) => item.month === contribution.month)
        ? current.contributions.map((item) =>
            item.month === contribution.month ? contribution : item,
          )
        : [...current.contributions, contribution],
    }));
    if (!supabaseEnabled) return;
    const { error } = await supabase
      .from('renovation_contributions')
      .upsert(contributionToRow(contribution), { onConflict: 'household_id,month' });
    if (error) {
      setSyncState('error');
      setSyncMessage('Monthly saving updated locally; sharing is temporarily unavailable.');
    } else {
      setSyncState('synced');
    }
  }, []);

  const saveSettings = useCallback(async (settings: RenovationSettings) => {
    setData((current) => ({ ...current, settings }));
    if (!supabaseEnabled) return;
    const { error } = await supabase.from('renovation_settings').upsert(settingsToRow(settings));
    if (error) {
      setSyncState('error');
      setSyncMessage('Plan settings are saved locally, but have not synced yet.');
    } else {
      setSyncState('synced');
    }
  }, []);

  return {
    data,
    syncState,
    syncMessage,
    saveTask,
    saveTasks,
    deleteTask,
    saveContribution,
    saveSettings,
  };
};
