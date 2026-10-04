import { useState } from 'react';
import {
  fitnessApi,
  localToday,
  useFitnessMutation,
  type Day,
  type Exercise,
} from '../../api/fitness';
import { ExerciseList } from './display';

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
      <p className="help">勾选保存实际完成进度，全部计划动作完成后才标记整次训练完成。</p>
      <ExerciseList
        rows={rows}
        completion={{ checked, disabled: mutation.isPending || day.date > localToday(), toggle }}
      />
      {error && <p role="alert">{error}。请刷新记录后重试。</p>}
    </>
  );
}
