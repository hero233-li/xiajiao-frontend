import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCourseByCode } from './generated/courses/courses';
import * as api from './generated/exams/exams';
import type { ScoreWrite, ScoreUpdate, FileDownload, ScoreRecord } from './generated/models';
import { sessionStore } from './session';

const options = { silent: true };
export function useExamCourse(code: string, cycleId: string) {
  return useQuery({
    queryKey: ['exam-course', sessionStore.getSnapshot()?.user.id, code, cycleId],
    enabled: !!code && !!cycleId,
    queryFn: async ({ signal }) =>
      (await getCourseByCode(code, { cycleId }, { ...options, signal })).data,
  });
}
export function useExamCycles() {
  return useQuery({
    queryKey: ['exam-cycles', sessionStore.getSnapshot()?.user.id],
    queryFn: async ({ signal }) => {
      const first = (await api.listCycles({ page: 1, size: 100 }, { ...options, signal })).data;
      const items = [...first.items];
      for (let page = 2; items.length < first.total; page++) {
        const next = (await api.listCycles({ page, size: 100 }, { ...options, signal })).data;
        if (!next.items.length) break;
        items.push(...next.items);
      }
      return items;
    },
  });
}
export function useExamData(
  courseId: string,
  cycleId: string,
  historyOpen: boolean,
  scorePage: number,
  historyPage: number,
) {
  const root = ['exams', sessionStore.getSnapshot()?.user.id, courseId];
  const enabled = !!courseId && !!cycleId;
  const unlock = useQuery({
    queryKey: [...root, 'unlock', cycleId],
    enabled,
    queryFn: async ({ signal }) =>
      (await api.getUnlock(courseId, { cycleId }, { ...options, signal })).data,
  });
  const papers = useQuery({
    queryKey: [...root, 'papers', cycleId],
    enabled,
    queryFn: async ({ signal }) => {
      const first = (
        await api.listPapers(courseId, { cycleId, page: 1, size: 100 }, { ...options, signal })
      ).data;
      const items = [...first.items];
      for (let page = 2; items.length < first.total; page++) {
        const next = (
          await api.listPapers(courseId, { cycleId, page, size: 100 }, { ...options, signal })
        ).data;
        if (!next.items.length) break;
        items.push(...next.items);
      }
      return items;
    },
  });
  const scores = useQuery({
    queryKey: [...root, 'scores', cycleId, scorePage],
    enabled,
    queryFn: async ({ signal }) =>
      (
        await api.listScores(
          courseId,
          { cycleId, page: scorePage, size: 20 },
          { ...options, signal },
        )
      ).data,
  });
  const prediction = useQuery({
    queryKey: [...root, 'prediction'],
    enabled,
    queryFn: async ({ signal }) => (await api.getPrediction(courseId, { ...options, signal })).data,
  });
  const trend = useQuery({
    queryKey: [...root, 'trend'],
    enabled,
    queryFn: async ({ signal }) =>
      (await api.getScoreTrend(courseId, { limit: 12 }, { ...options, signal })).data,
  });
  const history = useQuery({
    queryKey: [...root, 'history', historyPage],
    enabled: enabled && historyOpen,
    queryFn: async ({ signal }) => {
      const result = (
        await api.listLegacyHistory(
          { courseId, page: historyPage, size: 20 },
          { ...options, signal },
        )
      ).data;
      const items = await Promise.all(
        result.items.map(
          async (row) => (await api.getLegacyHistory(row.id, { ...options, signal })).data,
        ),
      );
      return { ...result, items };
    },
  });
  return { unlock, papers, scores, prediction, trend, history };
}
export function useExamActions(courseId: string, cycleId: string) {
  const client = useQueryClient();
  const refresh = async () => {
    await client.invalidateQueries({
      queryKey: ['exams', sessionStore.getSnapshot()?.user.id, courseId],
    });
  };
  const skip = useMutation({
    mutationFn: async (revision: number | null) =>
      revision === null
        ? (await api.confirmUnlockOverride(courseId, cycleId, { confirm: true }, options)).data
        : (
            await api.revokeUnlockOverride(
              courseId,
              cycleId,
              { confirm: true, expectedRevision: revision },
              options,
            )
          ).data,
    onSettled: refresh,
  });
  const save = useMutation({
    mutationFn: async (request: {
      body: ScoreWrite;
      record?: Pick<ScoreRecord, 'id' | 'revision'>;
    }) => {
      if (request.record) {
        const { cycleId: _cycle, paperId: _paper, ...fields } = request.body;
        const body: ScoreUpdate = { ...fields, expectedRevision: request.record.revision };
        return (await api.updateScore(courseId, request.record.id, body, options)).data;
      }
      return (await api.createScore(courseId, request.body, options)).data;
    },
    onSettled: refresh,
  });
  const upload = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) =>
      (await api.uploadScoreImage(courseId, id, { file }, options)).data,
    onSettled: refresh,
  });
  const download = useMutation({
    mutationFn: async ({ id, part }: { id: string; part: 'QUESTION' | 'ANSWER' }) =>
      (await api.downloadPaper(courseId, id, { cycleId, part }, options)).data,
  });
  return { skip, save, upload, download };
}
export function saveExamFile(result: FileDownload) {
  const bytes = Uint8Array.from(atob(result.contentBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: result.file.mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = result.file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
