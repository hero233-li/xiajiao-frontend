import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { Paper, ScoreRecord, Unlock } from '../../../api/generated/models';
import type { Submission } from '../../../api/grading';
import { Link } from '../../cycle/navigation';
import { ScoreDialog } from '../ScoreDialog';
import { formatShanghaiDate } from '../../../utils/date';
import { PaperPreviewPanel } from './PaperPreviewPanel';
import { SubmissionUploader } from './SubmissionUploader';
import { GradingLauncher, type PracticeDraft } from './GradingLauncher';
import { TaskPanel } from './TaskPanel';
import { ScoreSummary } from './ScoreSummary';
import { PaperAnalysis } from './PaperAnalysis';
import {
  useCourseTrend,
  useGradingTask,
  useGradingWorkers,
  usePaperScores,
  useRubrics,
  useSubmissionTasks,
  useSubmissions,
  useWorkbenchActions,
  useWorkbenchPaper,
  useWorkbenchUnlock,
} from './api';
import '../exams.css';
import './workbench.css';

const unlockedOf = (unlock?: Unlock) => !!unlock?.canDownloadPapers;
const writableOf = (unlock?: Unlock) => !!unlock?.canWriteScores;

export function Workbench({
  courseId,
  cycleId,
  code,
  paperId,
}: {
  courseId: string;
  cycleId: string;
  code: string;
  paperId: string;
}) {
  const [search] = useSearchParams();
  const initialTaskId = search.get('taskId') ?? '';
  const paper = useWorkbenchPaper(courseId, paperId);
  const unlock = useWorkbenchUnlock(courseId, cycleId);
  const scores = usePaperScores(courseId, cycleId, paperId);
  const submissions = useSubmissions(courseId, cycleId);
  const actions = useWorkbenchActions(courseId, cycleId);
  const workers = useGradingWorkers();
  const canWrite = writableOf(unlock.data);
  const rubrics = useRubrics(courseId, cycleId, paperId, canWrite);
  const trend = useCourseTrend(courseId, cycleId, !!unlock.data);
  const linkedTask = useGradingTask(initialTaskId);

  const [submissionId, setSubmissionId] = useState('');
  const [taskId, setTaskId] = useState(initialTaskId);
  const [dialog, setDialog] = useState<{ record?: ScoreRecord }>();
  const [notice, setNotice] = useState('');

  const mine = useMemo(
    () => (submissions.data ?? []).filter((item) => item.paperId === paperId),
    [submissions.data, paperId],
  );
  const selected: Submission | undefined =
    mine.find((item) => item.id === submissionId) ?? mine[0];
  const live = useRef<Submission | undefined>(undefined);
  useEffect(() => {
    live.current = selected;
  }, [selected]);
  useEffect(() => {
    if (!submissionId && mine[0]) setSubmissionId(mine[0].id);
  }, [submissionId, mine]);

  const tasks = useSubmissionTasks(selected?.id ?? '');
  useEffect(() => {
    if (!tasks.data?.length) return;
    if (!taskId || !tasks.data.some((task) => task.id === taskId)) setTaskId(tasks.data[0].id);
  }, [tasks.data, taskId]);
  useEffect(() => {
    const linked = linkedTask.data;
    if (!initialTaskId || !linked?.submissionId) return;
    setSubmissionId(linked.submissionId);
    setTaskId(linked.id);
  }, [initialTaskId, linkedTask.data]);

  const task = tasks.data?.find((item) => item.id === taskId) ?? (linkedTask.data?.id === taskId ? linkedTask.data : undefined);
  const publishedRubric = rubrics.data?.find((rubric) => rubric.state === 'PUBLISHED');
  const workerOnline = !!workers.data?.some(
    (worker) => worker.online && !worker.paused && !worker.revoked,
  );
  const records = scores.data?.items ?? [];

  if (paper.isPending || unlock.isPending)
    return (
      <p className="wb-page" role="status">
        正在加载试卷…
      </p>
    );
  if (paper.isError || !paper.data)
    return (
      <section className="wb-page wb-state">
        <h1>试卷加载失败</h1>
        <p>这份试卷可能已经下线，或本周期没有收录。</p>
        <Link className="button button-secondary" to={`/study/course/${code}/exams`}>
          返回真题列表
        </Link>
      </section>
    );

  const data: Paper = paper.data;
  const unlocked = unlockedOf(unlock.data);

  async function create() {
    const created = await actions.createSubmission.mutateAsync(data.id);
    live.current = created;
    setSubmissionId(created.id);
    setTaskId('');
    setNotice('已新建一份答卷，可以开始上传答题照片。');
  }

  async function upload(file: File) {
    const current = live.current;
    if (!current) throw new Error('请先新建一份答卷');
    const updated = await actions.uploadPage.mutateAsync({ submission: current, file });
    live.current = updated;
  }

  async function reorder(fileIds: string[]) {
    const current = live.current;
    if (!current) return;
    live.current = await actions.reorderPages.mutateAsync({ submission: current, fileIds });
  }

  async function remove(fileId: string) {
    const current = live.current;
    if (!current) return;
    live.current = await actions.removePage.mutateAsync({ submission: current, fileId });
  }

  async function applyGrading(practice: PracticeDraft) {
    const current = live.current;
    if (!current) throw new Error('请先新建一份答卷');
    const created = await actions.applyGrading.mutateAsync({ submission: current, practice });
    setTaskId(created.id);
    setNotice('批改已提交，进度会实时更新。');
    await tasks.refetch();
  }

  return (
    <div className="wb-page">
      <header className="wb-head">
        <Link className="wb-back" to={`/study/course/${code}/exams`}>
          <ArrowLeft size={16} aria-hidden="true" />
          返回真题列表
        </Link>
        <div className="wb-title">
          <div>
            <p className="eyebrow">考卷工作台</p>
            <h1>
              <FileText size={22} aria-hidden="true" />
              {data.paperMonth} 真题
            </h1>
            <p className="secondary">
              {data.sourceCourseCode && data.sourceCourseCode !== code
                ? `补充资料 · 来源课程 ${data.sourceCourseCode}`
                : `课程 ${code}`}
              {records[0] ? ` · 最近成绩 ${records[0].score} 分（${formatShanghaiDate(records[0].practicedOn)}）` : ' · 尚未批改'}
            </p>
          </div>
          {!unlocked && (
            <span className="wb-badge is-locked">
              真题权限未开放，先回到列表页解锁
            </span>
          )}
        </div>
        <nav className="wb-anchors" aria-label="工作台区块">
          <a href="#wb-paper">试卷</a>
          <a href="#wb-submission">答卷</a>
          <a href="#wb-grading">批改</a>
          <a href="#wb-task">进度</a>
          <a href="#wb-score">成绩</a>
          <a href="#wb-analysis">分析</a>
        </nav>
      </header>

      {notice && (
        <p role="status" className="wb-notice">
          {notice}
        </p>
      )}

      <div id="wb-paper">
        <PaperPreviewPanel
          courseId={courseId}
          cycleId={cycleId}
          code={code}
          paper={data}
          unlocked={unlocked}
        />
      </div>

      <div id="wb-submission">
        <SubmissionUploader
          submission={selected}
          submissions={mine}
          canWrite={canWrite}
          busy={actions.uploadPage.isPending || actions.reorderPages.isPending || actions.removePage.isPending || actions.createSubmission.isPending}
          onPick={(id) => {
            setSubmissionId(id);
            setTaskId('');
          }}
          onCreate={() => void create().catch(() => setNotice('新建答卷失败，请重试。'))}
          onUpload={upload}
          onReorder={reorder}
          onRemove={remove}
        />
      </div>

      <div id="wb-grading">
        <GradingLauncher
          submission={selected}
          published={!!publishedRubric}
          workerOnline={workerOnline}
          busy={actions.applyGrading.isPending}
          canWrite={canWrite}
          onApply={applyGrading}
        />
      </div>

      <div id="wb-task">
        <TaskPanel
          task={task}
          canWrite={canWrite}
          analysisLink={`/study/course/${code}/knowledge`}
          onRefreshed={() => {
            void tasks.refetch();
            void scores.refetch();
            void actions.refreshScores();
          }}
        />
      </div>

      <div id="wb-score">
        <ScoreSummary records={records} canWrite={canWrite} onRecord={(record) => setDialog({ record })} />
      </div>

      <div id="wb-analysis">
        <PaperAnalysis
          result={task?.result ?? undefined}
          rubric={publishedRubric}
          trend={trend.data?.records}
          paperId={paperId}
        />
      </div>

      {dialog && canWrite && (
        <ScoreDialog
          paperId={data.id}
          record={dialog.record}
          courseId={courseId}
          cycleId={cycleId}
          papers={[data]}
          onClose={() => setDialog(undefined)}
        />
      )}
    </div>
  );
}
