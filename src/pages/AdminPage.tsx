import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams, useBlocker } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ExamCycle, ContentRelease, TaskTemplate } from '../api/generated/models';
import { all, request, message, courseDirectory } from '../features/admin/api';
import { ContentEditor } from '../features/admin/ContentEditor';
import { Rubrics } from '../features/admin/Rubrics';
import { Operations } from '../features/admin/Operations';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import '../features/admin/admin.css';
const modes = [
  ['content', '内容发布'],
  ['courses', '课程维护'],
  ['cycles', '考试周期'],
  ['files', '文件资料'],
  ['papers', '试卷维护'],
  ['rubrics', '评分标准'],
  ['alerts', '检测告警'],
  ['reviews', '历史通过审核'],
  ['credits', '历史作答审核'],
  ['audit', '审计记录'],
];
export function Component() {
  const [search, setSearch] = useSearchParams();
  const mode = search.get('view') ?? 'content';
  const [dirty, updateDirty] = useState(false);
  const setDirty = useCallback((v: boolean) => updateDirty(v), []);
  const blocker = useBlocker(dirty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  const cycles = useQuery({
    queryKey: ['admin-cycles'],
    queryFn: () => all<ExamCycle>('/exams/cycles'),
    refetchOnWindowFocus: false,
  });
  const cycleId = search.get('cycleId') ?? cycles.data?.[0]?.id ?? '';
  const courses = useQuery({
    queryKey: ['admin-courses', cycleId],
    enabled: !!cycleId,
    queryFn: () => courseDirectory(cycleId),
    refetchOnWindowFocus: false,
  });
  const directory = useQuery({
    queryKey: ['admin-course-directory'],
    queryFn: () => courseDirectory(),
  });
  const courseId = search.get('courseId') ?? courses.data?.[0]?.id ?? '';
  const course = courses.data?.find((c) => c.id === courseId);
  const releases = useQuery({
    queryKey: ['admin-releases', courseId],
    enabled: !!courseId && mode === 'content',
    queryFn: () => all<ContentRelease>(`/admin/courses/${courseId}/releases`),
    refetchOnWindowFocus: false,
  });
  const releaseId = search.get('releaseId') ?? course?.releaseId ?? releases.data?.[0]?.id;
  const release = releases.data?.find((r) => r.id === releaseId);
  const coverage = useQuery({
    queryKey: ['admin-review-coverage', courses.data?.map((c) => [c.id, c.releaseId])],
    enabled: !!courses.data,
    refetchOnWindowFocus: false,
    queryFn: async () =>
      Promise.all(
        courses
          .data!.filter((c) => c.active && c.courseType === 'THEORY')
          .map(async (c) => ({
            course: c,
            templates: c.releaseId
              ? (
                  await request<{ templates: TaskTemplate[] }>(
                    `/admin/courses/${c.id}/releases/${c.releaseId}/task-templates`,
                  )
                ).templates
              : [],
          })),
      ),
  });
  function choose(key: string, value: string) {
    setSearch((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      if (key === 'courseId' || key === 'cycleId') next.delete('releaseId');
      if (key === 'cycleId') next.delete('courseId');
      return next;
    });
  }
  const reload = async () => {
    await releases.refetch();
    await courses.refetch();
    await coverage.refetch();
  };
  return (
    <div className="admin-workspace">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">管理工作台</p>
          <h1>管理员工作台</h1>
          <p>维护课程与资料，完成内容校验，再启用新版本。</p>
        </div>
        <Link className="button button-secondary" to="/study">
          返回学习端
        </Link>
      </header>
      <label className="admin-mode-picker">
        管理任务
        <select value={mode} onChange={(e) => choose('view', e.target.value)}>
          {modes.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-context">
        <label>
          考试周期
          <select
            aria-label="管理考试周期"
            value={cycleId}
            onChange={(e) => choose('cycleId', e.target.value)}
          >
            {cycles.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {!['cycles', 'files', 'audit'].includes(mode) && (
          <label>
            课程
            <select
              aria-label="管理课程"
              value={courseId}
              onChange={(e) => choose('courseId', e.target.value)}
            >
              {courses.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                  {!c.active ? '（已停用）' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {(cycles.isError || courses.isError) && (
        <p role="alert">
          基础列表加载失败。
          <Button
            onClick={() => {
              void cycles.refetch();
              void courses.refetch();
            }}
          >
            重新加载
          </Button>
        </p>
      )}
      {cycles.isPending || (!!cycleId && courses.isPending) ? (
        <p role="status">正在加载课程与考试周期…</p>
      ) : mode === 'content' && !courseId ? (
        <section>
          <h2>此周期尚未关联课程</h2>
          <p>进入“考试周期”编辑考试安排，从已有课程中选择；若课程尚未建立，请先进入课程维护。</p>
          <Link className="button button-secondary" to="/admin?view=cycles">
            维护考试周期
          </Link>
        </section>
      ) : mode === 'content' ? (
        <>
          <details className="admin-coverage">
            <summary>已发布复习任务覆盖 · 计划前置条件</summary>
            <h2>五周计划 · 已发布复习任务覆盖</h2>
            <p>后端当前规则要求每门所选理论课存在 REVIEW 模板；PAPER 不替代复习任务。</p>
            {coverage.isPending ? (
              <p role="status">正在核对已发布模板…</p>
            ) : coverage.isError ? (
              <p role="alert">
                核对失败 <Button onClick={() => void coverage.refetch()}>重试</Button>
              </p>
            ) : (
              <div>
                {coverage.data?.map(({ course: c, templates }) => (
                  <button type="button" key={c.id} onClick={() => choose('courseId', c.id)}>
                    <strong>{c.name}</strong>
                    <span
                      className={
                        templates.some((t) => t.kind === 'REVIEW')
                          ? 'admin-success'
                          : 'admin-warning'
                      }
                    >
                      {templates.filter((t) => t.kind === 'REVIEW').length} 项 REVIEW ·{' '}
                      {templates.some((t) => t.kind === 'REVIEW') ? '已覆盖' : '待维护发布'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </details>
          <div className="admin-editor-heading">
            <div>
              <h2>{course?.name ?? '请选择课程'} · 内容版本</h2>
              <p>
                当前发布版本{' '}
                {releases.isPending
                  ? '读取中…'
                  : (releases.data?.find((r) => r.id === course?.releaseId)?.versionNo ?? '暂无')}
                。草稿编辑不会更改学习端。
              </p>
            </div>
            <Button
              type="button"
              disabled={busy || dirty || !courseId}
              onClick={async () => {
                if (!courseId) return;
                setBusy(true);
                setError('');
                try {
                  const created = await request<ContentRelease>(
                    `/admin/courses/${courseId}/releases`,
                    'POST',
                    { basedOnReleaseId: course?.releaseId ?? null, sourceSha: null },
                  );
                  await releases.refetch();
                  choose('releaseId', created.id);
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {course?.releaseId ? '基于当前版本创建草稿' : '建立首个草稿'}
            </Button>
          </div>
          {error && (
            <p role="alert" className="admin-error">
              {error}。请重试。
            </p>
          )}
          {releases.isPending ? (
            <p role="status">正在加载版本…</p>
          ) : releases.isError ? (
            <p role="alert">
              {message(releases.error)}
              <Button onClick={() => void releases.refetch()}>重试</Button>
            </p>
          ) : (
            <div className="admin-version-list">
              {releases.data?.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  aria-current={r.id === releaseId ? 'page' : undefined}
                  onClick={() => choose('releaseId', r.id)}
                >
                  v{r.versionNo}
                  <span>
                    {r.state === 'DRAFT'
                      ? '草稿'
                      : r.id === course?.releaseId
                        ? '当前发布'
                        : '历史发布'}
                  </span>
                </button>
              ))}
              {!releases.data?.length && <p>暂无发布内容。点击“建立首个草稿”开始维护。</p>}
            </div>
          )}
          {release && (
            <ContentEditor
              key={release.id}
              courseId={courseId}
              release={release}
              onChanged={reload}
              setDirty={setDirty}
            />
          )}
        </>
      ) : mode === 'rubrics' ? (
        <Rubrics
          key={courseId + cycleId}
          courseId={courseId}
          cycleId={cycleId}
          setDirty={setDirty}
        />
      ) : (
        <Operations
          key={`${mode}-${courseId}-${cycleId}`}
          setDirty={setDirty}
          mode={columnsMode(mode)}
          courses={courses.data ?? []}
          directory={directory.data ?? courses.data ?? []}
          cycles={cycles.data ?? []}
          cycleId={cycleId}
          courseId={courseId}
        />
      )}
      <Modal
        open={blocker.state === 'blocked'}
        title="有未保存的修改"
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
      >
        <p>离开会丢弃尚未保存的修改。已保存的草稿和已发布内容不会改变。</p>
        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => blocker.state === 'blocked' && blocker.reset()}
          >
            继续编辑
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (blocker.state === 'blocked') {
                updateDirty(false);
                blocker.proceed();
              }
            }}
          >
            放弃未保存修改并离开
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function columnsMode(value: string) {
  return modes.some(([k]) => k === value) ? value : 'courses';
}
