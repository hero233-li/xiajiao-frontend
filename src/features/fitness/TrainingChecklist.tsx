import { useState } from 'react';
import {
  fitnessApi,
  localToday,
  useFitnessMutation,
  type Day,
  type Exercise,
} from '../../api/fitness';
import { ExerciseList } from './display';

// Keep one list, preserving edited weights and any additional completed exercises.
export function trainingRows(day: Day): Exercise[] {
  const planned = day.records['training-plan']?.data?.exercises ?? [];
  const recorded = day.records.training?.data?.exercises ?? [];
  return [
    ...planned.map((row) => recorded.find((item) => item.id === row.id) ?? row),
    ...recorded.filter((row) => !planned.some((item) => item.id === row.id)),
  ];
}

export function TrainingChecklist({ day, rows }: { day: Day; rows: Exercise[] }) {
  const mutation = useFitnessMutation();
  const [error, setError] = useState('');
  const checked = new Set(
    day.records.training?.data?.exercises.filter((row) => row.completed).map((row) => row.id),
  );
  const toggle = async (exercise: Exercise, completed: boolean) => {
    setError('');
    try {
      await mutation.mutateAsync(async () => {
        const latest = await fitnessApi.get('training', day.date);
        const snapshot = latest?.data?.planSnapshot ?? day.records['training-plan']?.data ?? null;
        const exercises = (latest?.data?.exercises ?? snapshot?.exercises ?? rows).map((row) => ({
          ...row,
          completed: latest?.data ? row.completed === true : false,
        }));
        const index = exercises.findIndex((row) => row.id === exercise.id);
        if (index < 0) exercises.push({ ...exercise, completed });
        else exercises[index] = { ...exercises[index], completed };
        const allDone =
          (snapshot?.exercises ?? exercises).length > 0 &&
          (snapshot?.exercises ?? exercises).every((row) =>
            exercises.some((item) => item.id === row.id && item.completed),
          );
        return fitnessApi.save(
          'training',
          day.date,
          {
            status: allDone ? 'COMPLETED' : 'PARTIAL',
            exercises,
            note: latest?.data?.note ?? null,
            planSnapshot: snapshot,
          },
          latest?.revision ?? -1,
        );
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试');
    }
  };
  return (
    <>
      <p className="help">
        {day.date > localToday()
          ? '当天开始后可逐项勾选；现在可以查看动作和安排。'
          : '完成一项勾选一项，进度自动保存。'}
      </p>
      <ExerciseList
        rows={rows}
        completion={{ checked, disabled: mutation.isPending || day.date > localToday(), toggle }}
      />
      {error && <p role="alert">{error}。请刷新记录后重试。</p>}
    </>
  );
}
