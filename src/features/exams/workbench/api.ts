import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPaper, getUnlock, listScores, getScoreTrend } from '../../../api/generated/exams/exams';
import {
  gradingRequest,
  type GradingTask,
  type GradingWorker,
  type PracticeInfo,
  type Rubric,
  type Submission,
} from '../../../api/grading';
import { sessionStore } from '../../../api/session';

const silent = { silent: true } as const;
const terminal = (task: GradingTask) => ['REVIEW', 'COMPLETED', 'FAILED'].includes(task.state);

/** 工作台依赖的只读查询。全部按 courseId + paperId 收敛，避免整页拉全量数据。 */
export function useWorkbenchPaper(courseId: string, paperId: string) {
  return useQuery({
    queryKey: ['exam-paper', sessionStore.getSnapshot()?.user.id, courseId, paperId],
    enabled: !!courseId && !!paperId,
    queryFn: async ({ signal }) =>
      (await getPaper(courseId, paperId, { ...silent, signal })).data,
  });
}

export function useWorkbenchUnlock(courseId: string, cycleId: string) {
  return useQuery({
    queryKey: ['exam-unlock', sessionStore.getSnapshot()?.user.id, courseId, cycleId],
    enabled: !!courseId && !!cycleId,
    queryFn: async ({ signal }) =>
      (await getUnlock(courseId, { cycleId }, { ...silent, signal })).data,
  });
}

export function usePaperScores(courseId: string, cycleId: string, paperId: string) {
  return useQuery({
    queryKey: [
      'exam-paper-scores',
      sessionStore.getSnapshot()?.user.id,
      courseId,
      cycleId,
      paperId,
    ],
    enabled: !!courseId && !!cycleId && !!paperId,
    queryFn: async ({ signal }) =>
      (await listScores(courseId, { cycleId, paperId, page: 1, size: 20 }, { ...silent, signal }))
        .data,
  });
}

export function useCourseTrend(courseId: string, cycleId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['exam-trend', sessionStore.getSnapshot()?.user.id, courseId, cycleId],
    enabled: enabled && !!courseId,
    queryFn: async ({ signal }) =>
      (await getScoreTrend(courseId, { limit: 12 }, { ...silent, signal })).data,
  });
}

export function useSubmissions(courseId: string, cycleId: string) {
  return useQuery({
    queryKey: ['grading-submissions', courseId, cycleId],
    enabled: !!courseId && !!cycleId,
    queryFn: () => gradingRequest<Submission[]>('GET', '/submissions', undefined, { courseId, cycleId }),
  });
}

export function useRubrics(courseId: string, cycleId: string, paperId: string, enabled = true) {
  return useQuery({
    queryKey: ['grading-rubrics', courseId, cycleId, paperId],
    enabled: enabled && !!paperId,
    queryFn: () =>
      gradingRequest<Rubric[]>('GET', '/rubrics', undefined, { courseId, cycleId, paperId }),
  });
}

export function useGradingWorkers() {
  return useQuery({
    queryKey: ['grading-workers'],
    queryFn: () => gradingRequest<GradingWorker[]>('GET', '/workers'),
    refetchInterval: 5000,
  });
}

export function useGradingTask(taskId: string) {
  return useQuery({
    queryKey: ['grading-task', taskId],
    enabled: !!taskId,
    queryFn: () => gradingRequest<GradingTask>('GET', `/tasks/${encodeURIComponent(taskId)}`),
    refetchInterval: (query) =>
      query.state.data && terminal(query.state.data) ? false : 5000,
  });
}

export function useSubmissionTasks(submissionId: string) {
  return useQuery({
    queryKey: ['grading-tasks', submissionId],
    enabled: !!submissionId,
    queryFn: () => gradingRequest<GradingTask[]>('GET', `/submissions/${submissionId}/tasks`),
    refetchInterval: (query) =>
      query.state.data?.some((task) => !terminal(task)) ? 5000 : false,
  });
}

/** 一次批改任务冻结的原始答卷图片。 */
export function useTaskInputs(taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['grading-inputs', taskId],
    enabled: enabled && !!taskId,
    queryFn: () =>
      gradingRequest<{ pages: { fileId: string; pageNo: number }[] }>(
        'GET',
        `/tasks/${taskId}/inputs`,
      ),
  });
}

export function useTaskMaterial(taskId: string, fileId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['grading-image', taskId, fileId],
    enabled,
    staleTime: Infinity,
    queryFn: () =>
      gradingRequest<{ mimeType: string; contentBase64: string }>(
        'GET',
        `/tasks/${taskId}/materials/${fileId}`,
      ),
  });
}

/** 工作台会把提交、批改、评分标准相关的写操作统一走这个动作器。 */
export function useWorkbenchActions(courseId: string, cycleId: string) {
  const client = useQueryClient();
  const refreshScores = () => {
    void client.invalidateQueries({
      queryKey: ['exam-paper-scores', sessionStore.getSnapshot()?.user.id, courseId],
    });
    void client.invalidateQueries({
      queryKey: ['exams', sessionStore.getSnapshot()?.user.id, courseId],
    });
  };
  const createSubmission = useMutation({
    mutationFn: (paperId: string) =>
      gradingRequest<Submission>('POST', '/submissions', { courseId, cycleId, paperId }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-submissions'] }),
  });
  const uploadPage = useMutation({
    mutationFn: ({ submission, file }: { submission: Submission; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return gradingRequest<Submission>('POST', `/submissions/${submission.id}/pages`, form, {
        expectedRevision: submission.revision,
      });
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-submissions'] }),
  });
  const reorderPages = useMutation({
    mutationFn: ({ submission, fileIds }: { submission: Submission; fileIds: string[] }) =>
      gradingRequest<Submission>('PUT', `/submissions/${submission.id}/pages`, {
        expectedRevision: submission.revision,
        fileIds,
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-submissions'] }),
  });
  const removePage = useMutation({
    mutationFn: ({ submission, fileId }: { submission: Submission; fileId: string }) =>
      gradingRequest<Submission>(
        'DELETE',
        `/submissions/${submission.id}/pages/${fileId}`,
        undefined,
        { expectedRevision: submission.revision },
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-submissions'] }),
  });
  const applyGrading = useMutation({
    mutationFn: ({
      submission,
      practice,
    }: {
      submission: Submission;
      practice: Omit<PracticeInfo, 'expectedRevision'>;
    }) =>
      gradingRequest<GradingTask>('POST', `/submissions/${submission.id}/tasks`, {
        ...practice,
        expectedRevision: submission.revision,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['grading-tasks'] });
      refreshScores();
    },
  });
  const pairWorker = useMutation({
    mutationFn: (label: string) =>
      gradingRequest<{ id: string; token: string }>('POST', '/workers', { label }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-workers'] }),
  });
  const revokeWorker = useMutation({
    mutationFn: (workerId: string) =>
      gradingRequest('DELETE', `/workers/${workerId}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-workers'] }),
  });
  return {
    createSubmission,
    uploadPage,
    reorderPages,
    removePage,
    applyGrading,
    pairWorker,
    revokeWorker,
    refreshScores,
  };
}
