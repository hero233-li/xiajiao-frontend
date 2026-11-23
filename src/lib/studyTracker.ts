import { useEffect, useState } from 'react';
import { cloudPullStrict, cloudPut } from './aiSync';

export type WeeklyCategory = 'zikao' | 'english' | 'tech' | 'admin';

export interface CustomWeeklyTask {
  id: string;
  weekId: string;
  category: WeeklyCategory;
  title: string;
}

export interface EnglishMockRecord {
  id: string;
  exam: 'PETS-3' | 'IELTS';
  /** YYYY-MM-DD */
  date: string;
  score: string;
  note?: string;
}

export interface StudyTrackerDoc {
  checked: Record<string, boolean>;
  customTasks: CustomWeeklyTask[];
  englishMocks: EnglishMockRecord[];
  updatedAt?: number;
}

export type SyncState = 'loading' | 'ready' | 'saving' | 'saved' | 'offline';

const CLOUD_KEY = 'study-tracker';

const EMPTY_DOC: StudyTrackerDoc = {
  checked: {},
  customTasks: [],
  englishMocks: [],
};

let doc: StudyTrackerDoc = { ...EMPTY_DOC, checked: {}, customTasks: [], englishMocks: [] };
let syncState: SyncState = 'loading';
let blocked = false;
let booting: Promise<void> | null = null;
let flushTimer: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function normalize(raw: unknown): StudyTrackerDoc {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<StudyTrackerDoc>;
  return {
    checked: obj.checked && typeof obj.checked === 'object' ? { ...obj.checked } : {},
    customTasks: Array.isArray(obj.customTasks) ? obj.customTasks : [],
    englishMocks: Array.isArray(obj.englishMocks) ? obj.englishMocks : [],
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : undefined,
  };
}

function ensureLoaded() {
  if (booting) return booting;
  booting = (async () => {
    try {
      const res = await cloudPullStrict<StudyTrackerDoc>(CLOUD_KEY);
      if (res?.data) doc = normalize(res.data);
      syncState = 'ready';
    } catch {
      blocked = true;
      syncState = 'offline';
    }
    emit();
  })();
  return booting;
}

async function flushNow() {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (blocked) return;
  syncState = 'saving';
  emit();
  const ok = await cloudPut(CLOUD_KEY, {
    checked: doc.checked,
    customTasks: doc.customTasks,
    englishMocks: doc.englishMocks,
  });
  if (ok) {
    doc = { ...doc, updatedAt: Date.now() };
    syncState = 'saved';
  } else {
    blocked = true;
    syncState = 'offline';
  }
  emit();
}

function scheduleFlush(immediate = false) {
  if (blocked || syncState === 'loading') return;
  if (immediate) {
    void flushNow();
    return;
  }
  syncState = 'saving';
  emit();
  if (flushTimer !== null) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushNow();
  }, 450);
}

export function toggleTrackerItem(id: string) {
  if (blocked || syncState === 'loading') return;
  const nextChecked = { ...doc.checked };
  if (nextChecked[id]) {
    delete nextChecked[id];
  } else {
    nextChecked[id] = true;
  }
  doc = { ...doc, checked: nextChecked };
  emit();
  scheduleFlush(false);
}

export function addCustomWeeklyTask(weekId: string, category: WeeklyCategory, title: string) {
  if (blocked || syncState === 'loading') return;
  const clean = title.trim();
  if (!clean) return;
  const item: CustomWeeklyTask = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    weekId,
    category,
    title: clean,
  };
  doc = { ...doc, customTasks: [...doc.customTasks, item] };
  emit();
  scheduleFlush(true);
}

export function removeCustomWeeklyTask(id: string) {
  if (blocked || syncState === 'loading') return;
  const nextChecked = { ...doc.checked };
  delete nextChecked[id];
  doc = {
    ...doc,
    checked: nextChecked,
    customTasks: doc.customTasks.filter((t) => t.id !== id),
  };
  emit();
  scheduleFlush(true);
}

export function addEnglishMock(record: Omit<EnglishMockRecord, 'id'>) {
  if (blocked || syncState === 'loading') return;
  const item: EnglishMockRecord = {
    ...record,
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  doc = { ...doc, englishMocks: [item, ...doc.englishMocks] };
  emit();
  scheduleFlush(true);
}

export function removeEnglishMock(id: string) {
  if (blocked || syncState === 'loading') return;
  doc = { ...doc, englishMocks: doc.englishMocks.filter((r) => r.id !== id) };
  emit();
  scheduleFlush(true);
}

export function useStudyTracker() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    listeners.add(onChange);
    void ensureLoaded();
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return {
    doc,
    syncState,
    blocked,
    toggle: toggleTrackerItem,
    addCustomTask: addCustomWeeklyTask,
    removeCustomTask: removeCustomWeeklyTask,
    addEnglishMock,
    removeEnglishMock,
  };
}
