import { useConfirmation } from '../../components/ConfirmationProvider';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExamCycle, FileMetadata } from '../../api/generated/models';
import { Fields, initial, pick, schema, type Choices } from './Fields';
import { all, paperPage, request, message, type AdminCourse, type Row, type Json } from './api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
const labels: Record<string, string> = {
  name: '名称',
  code: '代码',
  courseType: '类型',
  active: '启用',
  startDate: '开始',
  endDate: '结束',
  paperMonth: '试卷年月',
  sourceCourseCode: '来源课程',
  questionPages: '题目页数',
  answerPages: '答案页数',
  questionFile: '题目资料',
  answerFile: '答案资料',
  note: '备注',
  state: '状态',
  purpose: '用途',
  mimeType: '文件格式',
  sizeBytes: '字节数',
  containsAnswers: '含答案',
  alertCode: '告警类型',
  message: '问题',
  acknowledgedAt: '确认时间',
  oldScore: '原分数',
  oldThreshold: '原通过线',
  decision: '审核状态',
  reason: '原因',
  kind: '类型',
  title: '记录',
  attempts: '历史作答次数',
  oldQuestionId: '历史题目标识',
  correct: '作答正确',
  gateCreditApproved: '计入练习门槛',
  approved: '已审核',
  createdAt: '时间',
  occurredAt: '时间',
  actorId: '操作人',
  details: '原因与详情',
  action: '操作',
  targetType: '对象',
  targetId: '对象标识',
  actorUserId: '操作人',
};
const columns: Record<string, string[]> = {
  courses: ['code', 'name', 'courseType', 'active'],
  cycles: ['name', 'startDate', 'endDate'],
  papers: ['paperMonth', 'questionFile', 'answerFile', 'questionPages', 'note'],
  files: ['name', 'purpose', 'mimeType', 'sizeBytes', 'containsAnswers', 'state'],
  alerts: ['alertCode', 'message', 'createdAt', 'acknowledgedAt'],
  reviews: ['kind', 'oldScore', 'oldThreshold', 'decision', 'reason'],
  credits: ['oldQuestionId', 'attempts', 'correct', 'gateCreditApproved'],
  audit: ['occurredAt', 'action', 'targetType', 'targetId', 'actorId', 'details'],
};
export function Operations({
  mode,
  courses,
  directory,
  cycles,
  cycleId,
  courseId,
  setDirty,
}: {
  setDirty: (dirty: boolean) => void;
  mode: string;
  courses: AdminCourse[];
  directory: AdminCourse[];
  cycles: ExamCycle[];
  cycleId: string;
  courseId: string;
}) {
  const client = useQueryClient();
  const confirm = useConfirmation();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<{
    title: string;
    url: string;
    method: string;
    model: string;
    value: Row;
    original?: Row;
  }>();
  useEffect(() => {
    setDirty(!!editing);
    return () => setDirty(false);
  }, [editing, setDirty]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [upload, setUpload] = useState<File>();
  const [purpose, setPurpose] = useState('PAPER');
  const [answers, setAnswers] = useState(false);
  const endpoints: Record<string, string> = {
    papers: `/exams/courses/${courseId}/papers`,
    files: '/admin/files',
    alerts: `/admin/practice/alerts?courseId=${courseId}`,
    reviews: `/admin/exams/legacy-pass-reviews?courseId=${courseId}`,
    credits: `/admin/practice/legacy-credits?courseId=${courseId}`,
    audit: `/admin/dashboard/audit-events${filter ? '?action=' + encodeURIComponent(filter) : ''}`,
  };
  const url = endpoints[mode];
  const query = useQuery({
    queryKey: ['admin-operation', mode, courseId, cycleId, page, mode === 'audit' ? filter : ''],
    enabled: !!url && (mode === 'files' || mode === 'audit' || !!courseId),
    refetchOnWindowFocus: false,
    queryFn: () =>
      mode === 'papers'
        ? paperPage(courseId, { cycleId, page, size: 20 }).then((r) => ({
            ...r,
            items: r.items as unknown as Row[],
          }))
        : request<{ items: Row[]; total: number; size: number }>(
            `${url}${url.includes('?') ? '&' : '?'}page=${page}&size=20`,
          ),
  });
  const files = useQuery({
    queryKey: ['admin-files'],
    queryFn: () => all<FileMetadata>('/admin/files'),
    refetchOnWindowFocus: false,
  });
  const content = useQuery({
    queryKey: ['admin-associations', courseId, courses.find((c) => c.id === courseId)?.releaseId],
    enabled: !!courseId && !!courses.find((c) => c.id === courseId)?.releaseId,
    queryFn: async () => {
      const release = courses.find((c) => c.id === courseId)!.releaseId;
      const base = `/admin/courses/${courseId}/releases/${release}`;
      return {
        catalog: await request<Row>(base + '/catalog'),
        questions: await request<Row>(base + '/questions'),
      };
    },
  });
  const allowedCodes = (schema('CourseAdminWrite').properties?.code.enum ?? []).map(String);
  const availableCodes = allowedCodes.filter((code) => !directory.some((c) => c.code === code));
  const choices: Choices = {
    code: (editing?.original ? allowedCodes : availableCodes).map((value) => ({
      value,
      label: value,
    })),
    courseId: directory.map((c) => ({ value: c.id, label: c.name })),
    questionFileId: (files.data ?? [])
      .filter((f) => f.purpose === 'PAPER' && f.state === 'ACTIVE')
      .map((f) => ({ value: f.id, label: f.name })),
    answerFileId: (files.data ?? [])
      .filter((f) => f.purpose === 'PAPER' && f.state === 'ACTIVE')
      .map((f) => ({ value: f.id, label: f.name })),
    chapterId: ((content.data?.catalog.chapters ?? []) as Row[]).map((c) => ({
      value: String(c.id),
      label: String(c.title),
    })),
    mappingReleaseId: courses
      .filter((c) => c.id === courseId && c.releaseId)
      .map((c) => ({ value: c.releaseId!, label: `${c.name} · 当前发布版本` })),
    canonicalQuestionId: ((content.data?.questions.questions ?? []) as Row[])
      .filter((q) => q.mode === 'CHAPTER' && q.eligibleOriginal === true)
      .map((q) => ({ value: String(q.id), label: String(q.stem).slice(0, 90) })),
  };
  const source =
    mode === 'courses'
      ? (courses as unknown as Row[])
      : mode === 'cycles'
        ? (cycles as unknown as Row[])
        : (query.data?.items ?? []);
  const rows =
    mode === 'audit'
      ? source
      : source.filter(
          (r) => !filter || JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()),
        );
  async function refresh() {
    await client.invalidateQueries({
      predicate: (q) => String(q.queryKey[0]).startsWith('admin-'),
    });
    await client.invalidateQueries({ queryKey: ['cycle-context'] });
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function edit(row?: Row) {
    const id = String(row?.id ?? '');
    const config: Record<string, [string, string, string, string]> = {
      courses: [
        `/admin/courses${id ? '/' + id : ''}?cycleId=${cycleId}`,
        'CourseAdminWrite',
        '课程',
        id ? 'PUT' : 'POST',
      ],
      cycles: [
        `/admin/exams/cycles${id ? '/' + id : ''}`,
        'CycleWrite',
        '考试周期',
        id ? 'PUT' : 'POST',
      ],
      papers: [
        `/admin/exams/courses/${courseId}/papers${id ? '/' + id : ''}`,
        'PaperWrite',
        '试卷',
        id ? 'PUT' : 'POST',
      ],
      reviews: [
        `/admin/exams/legacy-pass-reviews/${id}/decision`,
        'LegacyReviewDecision',
        '历史通过审核',
        'POST',
      ],
      credits: [
        `/admin/practice/legacy-credits/${id}/decision`,
        'LegacyPracticeCreditDecision',
        '历史作答认领',
        'POST',
      ],
    };
    const [path, model, title, method] = config[mode];
    const paperRow =
      row && mode === 'papers'
        ? {
            ...row,
            questionFileId: (row.questionFile as Row)?.id ?? row.questionFileId,
            answerFileId: (row.answerFile as Row)?.id ?? row.answerFileId ?? null,
          }
        : row;
    const value = paperRow ? pick(model, paperRow) : (initial(schema(model)) as Row);
    if (mode === 'courses' && !row) value.code = availableCodes[0] ?? '';
    if (mode === 'reviews') value.courseId = courseId;
    if (mode === 'credits') {
      value.confirm = false;
      value.approved = row?.gateCreditApproved ?? false;
      value.canonicalQuestionId = row?.questionId ?? null;
    }
    setEditing({
      title: `${row ? '编辑' : '新增'}${title}`,
      url: path,
      model,
      method,
      value,
      original: row,
    });
  }
  return (
    <section className="admin-operations">
      <div className="admin-editor-heading">
        <h2>
          {
            {
              courses: '课程维护',
              cycles: '考试周期',
              papers: '试卷资料',
              files: '私有文件',
              alerts: '检测告警',
              reviews: '历史通过审核',
              credits: '历史作答审核',
              audit: '审计记录',
            }[mode]
          }
        </h2>
        {['courses', 'cycles', 'papers'].includes(mode) && (
          <Button
            type="button"
            disabled={
              (mode !== 'cycles' && !cycleId) || (mode === 'courses' && !availableCodes.length)
            }
            disabledReason={
              mode === 'courses' && !availableCodes.length
                ? '当前支持的科目均已建立，请编辑已有课程'
                : undefined
            }
            onClick={() => edit()}
          >
            新增{{ courses: '课程', cycles: '周期', papers: '试卷' }[mode]}
          </Button>
        )}
      </div>
      <label className="admin-filter">
        {mode === 'audit' ? '按操作类型筛选' : '筛选本页记录'}
        <input
          value={filter}
          placeholder={mode === 'audit' ? '例如 RELEASE_PUBLISHED' : '输入名称、时间或状态'}
          onChange={(e) => {
            setFilter(e.target.value);
            if (mode === 'audit') setPage(1);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="admin-error">
          {error}。请核对配置后重试。
        </p>
      )}
      {success && (
        <p role="status" className="admin-success">
          {success}
        </p>
      )}
      {mode === 'files' && (
        <p className="secondary">
          试卷接受 PDF，手册接受结构化 JSON；文件上限
          8MB。手册的课程、版本、章节与练习关联在内容发布时由后端校验。
        </p>
      )}
      {mode === 'files' && (
        <form
          className="admin-upload"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (!upload) throw new Error('请选择PDF文件');
              const form = new FormData();
              form.set('file', upload);
              form.set('purpose', purpose);
              form.set('containsAnswers', String(answers));
              await request(`/admin/files`, 'POST', form);
              setUpload(undefined);
              await refresh();
              setSuccess(
                '文件已上传。试卷 PDF 可在试卷维护中选择；手册 JSON 可在草稿资料关联中选择。',
              );
            });
          }}
        >
          <label>
            {purpose === 'MANUAL' ? '手册 JSON 文件' : '试卷 PDF 文件'}
            <input
              type="file"
              key={purpose}
              accept={purpose === 'MANUAL' ? 'application/json,.json' : 'application/pdf,.pdf'}
              required
              onChange={(e) => setUpload(e.target.files?.[0])}
            />
          </label>
          <label>
            用途
            <select
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                setUpload(undefined);
              }}
            >
              <option value="PAPER">试卷</option>
              <option value="MANUAL">手册（结构化 JSON）</option>
            </select>
          </label>
          <label>
            含答案
            <select value={String(answers)} onChange={(e) => setAnswers(e.target.value === 'true')}>
              <option value="false">不含答案</option>
              <option value="true">含答案</option>
            </select>
          </label>
          <Button type="submit" loading={busy}>
            上传文件
          </Button>
        </form>
      )}
      {url && query.isPending ? (
        <p role="status">正在加载管理记录…</p>
      ) : url && query.isError ? (
        <p role="alert">
          {message(query.error)}
          <Button onClick={() => void query.refetch()}>重试</Button>
        </p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {columns[mode].map((c) => (
                  <th key={c}>{labels[c]}</th>
                ))}
                {mode !== 'audit' && mode !== 'files' && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id ?? (row.summary as Row)?.id)}>
                  {columns[mode].map((k) => (
                    <td key={k} data-label={labels[k]}>
                      {k === 'details' ? (
                        <details>
                          <summary>查看详情</summary>
                          <p>{String(row.reason ?? '无备注')}</p>
                          <pre className="admin-audit-detail">{String(row.details ?? '')}</pre>
                        </details>
                      ) : (
                        format(row[k] ?? (row.summary as Row)?.[k])
                      )}
                    </td>
                  ))}
                  {!['audit', 'files'].includes(mode) && (
                    <td data-label="操作">
                      {mode === 'alerts' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy || !!row.acknowledgedAt}
                          onClick={() =>
                            void run(async () => {
                              await request(
                                `/admin/practice/alerts/${row.id}/acknowledgement`,
                                'POST',
                                { confirm: true },
                              );
                              await refresh();
                              setSuccess('已确认此告警；检测规则保持原状态。');
                            })
                          }
                        >
                          {row.acknowledgedAt ? '已确认' : '确认已处理'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy || (mode === 'reviews' && row.decision !== 'PENDING')}
                          disabledReason={
                            mode === 'reviews' && row.decision !== 'PENDING'
                              ? '已审核，不能重复修改决定'
                              : undefined
                          }
                          onClick={() =>
                            edit(mode === 'credits' ? { ...row, ...(row.summary as Row) } : row)
                          }
                        >
                          {mode === 'reviews' && row.decision !== 'PENDING'
                            ? '已审核'
                            : mode === 'reviews' || mode === 'credits'
                              ? '审核'
                              : '编辑'}
                        </Button>
                      )}
                      {mode === 'reviews' && row.passId && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setEditing({
                              title: '作废此通过记录',
                              model: 'InvalidatePass',
                              value: { reason: '', confirm: false },
                              method: 'POST',
                              url: `/admin/practice/passes/${row.passId}/invalidation`,
                            })
                          }
                        >
                          作废通过
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="admin-empty">暂无符合条件的记录。</p>}
        </div>
      )}
      {url && query.data && (
        <div className="admin-actions">
          <span>
            第 {page} 页 · 共 {query.data.total} 条
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={page * 20 >= query.data.total}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
      <Modal
        open={!!editing}
        title={editing?.title ?? ''}
        onClose={async () => {
          if (!busy && (await confirm('关闭编辑？尚未提交的修改将丢弃。'))) setEditing(undefined);
        }}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await request(editing.url, editing.method, editing.value);
                setEditing(undefined);
                await refresh();
                setSuccess('操作成功，列表已刷新。');
              });
            }}
          >
            <p>请核对填写内容与关联资料。审核或作废记录需说明原因，并确认执行。</p>
            {mode === 'credits' && !choices.canonicalQuestionId.length && (
              <p role="status">
                当前发布版本暂无已审核原创题。请先在内容发布中审核章节题目并发布，再进行认领。
              </p>
            )}
            <Fields
              name={editing.model}
              value={editing.value}
              disabled={busy}
              choices={choices}
              onChange={(v) => setEditing({ ...editing, value: v as Row })}
            />
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setEditing(undefined)}
              >
                取消
              </Button>
              <Button type="submit" loading={busy}>
                确认提交
              </Button>
            </div>
            {error && <p role="alert">{error}；修改仍保留。</p>}
          </form>
        )}
      </Modal>
    </section>
  );
}
function format(v: Json | undefined) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'object')
    return !Array.isArray(v) && typeof v.name === 'string' ? v.name : JSON.stringify(v);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v))
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(v));
  return String(v);
}
