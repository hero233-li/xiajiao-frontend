import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '../cycle/navigation';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { createUuid } from '../../utils/uuid';
import type {
  ContentRelease,
  TaskTemplate,
  Resource,
  ReleaseValidation,
  FileMetadata,
} from '../../api/generated/models';
import { all, message, request, titles, type Row, type Json } from './api';
import { Fields, pick, type Choices } from './Fields';
const sectionSchemas: Record<string, string> = {
  catalog: 'CatalogDraft',
  knowledge: 'KnowledgeDraft',
  questions: 'QuestionBankDraft',
  'assessment-policy': 'AssessmentPolicyWrite',
};
const sectionKeys = ['task-templates', 'catalog', 'knowledge', 'questions', 'assessment-policy'];
export function ContentEditor({
  courseId,
  release,
  onChanged,
  setDirty,
}: {
  courseId: string;
  release: ContentRelease;
  onChanged: () => Promise<void>;
  setDirty: (v: boolean) => void;
}) {
  const client = useQueryClient();
  const form = useRef<HTMLFormElement>(null);
  const base = `/admin/courses/${courseId}/releases/${release.id}`;
  const query = useQuery({
    queryKey: ['admin-content', release.id],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(sectionKeys.map(async (k) => [k, await request<Row>(`${base}/${k}`)])),
      ),
    refetchOnWindowFocus: false,
  });
  const files = useQuery({
    queryKey: ['admin-files'],
    queryFn: () => all<FileMetadata>('/admin/files'),
    refetchOnWindowFocus: false,
  });
  const [edits, setEdits] = useState<Record<string, Row>>({});
  const [undo, setUndo] = useState<Record<string, Row>[]>([]);
  const [section, setSection] = useState('task-templates');
  const [revision, setRevision] = useState(release.draftRevision ?? 0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validation, setValidation] = useState<ReleaseValidation>();
  const [publishOpen, setPublishOpen] = useState(false);
  const dirty = Object.keys(edits).length > 0;
  const editable = release.state === 'DRAFT';
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
  const data = { ...query.data, ...edits };
  function change(value: Row) {
    setUndo((prev) => [...prev.slice(-19), structuredClone(edits)]);
    setEdits((prev) => ({ ...prev, [section]: value }));
    setValidation(undefined);
    setSuccess('');
  }
  async function metadata() {
    const list = await all<ContentRelease>(`/admin/courses/${courseId}/releases`);
    const current = list.find((r) => r.id === release.id);
    if (!current || current.state !== 'DRAFT' || current.draftRevision !== revision)
      throw new Error('草稿版本已被其他操作修改。请保留当前修改，重新读取后再编辑。');
    return current;
  }
  async function save() {
    if (!form.current?.reportValidity()) throw new Error('请补齐当前编辑区的必填信息，再保存');
    let nextRevision = revision;
    for (const key of sectionKeys.filter((k) => edits[k])) {
      const body =
        key === 'assessment-policy' ? pick('AssessmentPolicyWrite', edits[key]) : edits[key];
      await request(`${base}/${key}`, 'PUT', body, nextRevision);
      const list = await all<ContentRelease>(`/admin/courses/${courseId}/releases`);
      nextRevision = list.find((r) => r.id === release.id)!.draftRevision ?? nextRevision + 1;
      setRevision(nextRevision);
      const saved = await request<Row>(`${base}/${key}`);
      client.setQueryData<Record<string, Row>>(['admin-content', release.id], (old) => ({
        ...old,
        [key]: saved,
      }));
      setEdits((old) => {
        const copy = { ...old };
        delete copy[key];
        return copy;
      });
    }
    setUndo([]);
    await onChanged();
    return nextRevision;
  }
  async function run(action: () => Promise<void>, label: string) {
    if (busy) return;
    if (['保存', '校验'].includes(label) && form.current && !form.current.reportValidity()) return;
    setBusy(label);
    setError('');
    setSuccess('');
    try {
      await action();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  }
  async function check() {
    await metadata();
    const rev = await save();
    const result = await request<ReleaseValidation>(`${base}/validation`);
    setRevision(rev);
    setValidation(result);
    setSuccess(result.valid ? '已保存最新修改，校验通过。' : '已保存草稿，请处理下方阻断问题。');
  }
  const choices: Choices = {};
  const catalogs = (data.catalog?.chapters ?? []) as Row[];
  choices.chapterId = catalogs.map((c) => ({ value: String(c.id), label: String(c.title) }));
  choices.pointId = catalogs.flatMap((c) =>
    ((c.points as Row[]) ?? []).map((p) => ({
      value: String(p.id),
      label: `${c.title} · ${p.title}`,
    })),
  );
  choices.fileId = (files.data ?? []).map((f) => ({ value: f.id, label: f.name }));
  const resources: Resource[] = [];
  function collect(v: Json) {
    if (!v || typeof v !== 'object') return;
    if (!Array.isArray(v) && 'kind' in v && 'label' in v && ('fileId' in v || 'url' in v)) {
      const r = v as unknown as Resource;
      if (!resources.some((x) => JSON.stringify(x) === JSON.stringify(r))) resources.push(r);
    }
    Object.values(v).forEach(collect);
  }
  if (query.data) {
    collect(data.catalog);
    collect(data.knowledge);
    collect(data['task-templates']);
  }
  if (query.isPending) return <p role="status">正在读取完整版本内容…</p>;
  if (query.isError)
    return (
      <div role="alert">
        {message(query.error)}
        <Button onClick={() => void query.refetch()}>重新读取内容</Button>
      </div>
    );
  return (
    <section className="admin-editor">
      <div className="admin-version-banner">
        <div>
          <strong>
            版本 {release.versionNo} · {editable ? '草稿' : '已发布 · 只读'}
          </strong>
          <small>
            {editable
              ? `草稿修订 ${revision} · ${dirty ? '有未保存修改' : '所有修改已保存'}`
              : '发布内容保持只读；修改请创建新草稿'}
          </small>
        </div>
        {editable && (
          <div className="admin-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={!!busy || !dirty}
              onClick={() =>
                void run(async () => {
                  await metadata();
                  await save();
                  setValidation(undefined);
                  setSuccess('完整清单已保存。');
                }, '保存')
              }
            >
              保存修改
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!!busy}
              onClick={() => void run(check, '校验')}
            >
              保存并校验
            </Button>
            <Button
              type="button"
              disabled={!!busy || dirty || !validation?.valid}
              disabledReason="先保存最新修改并通过校验"
              onClick={() => setPublishOpen(true)}
            >
              发布此版本
            </Button>
          </div>
        )}
      </div>
      {busy && <p role="status">正在{busy}，请稍候…</p>}
      {error && (
        <div role="alert" className="admin-error">
          <p>{error}。本地未保存内容仍保留。</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (window.confirm('重新读取会放弃尚未保存的修改。继续？'))
                void run(async () => {
                  setEdits({});
                  setUndo([]);
                  await onChanged();
                  const list = await all<ContentRelease>(`/admin/courses/${courseId}/releases`);
                  setRevision(list.find((r) => r.id === release.id)?.draftRevision ?? revision);
                  await query.refetch();
                  setValidation(undefined);
                }, '重新读取');
            }}
          >
            放弃修改并重新读取
          </Button>
        </div>
      )}
      {success && (
        <p role="status" className="admin-success">
          {success}
        </p>
      )}
      {validation && (
        <section className="admin-validation" aria-label="发布校验结果">
          <h3>{validation.valid ? '校验通过' : '发布前需要处理'}</h3>
          <p>
            {Object.entries(validation.contentCounts)
              .map(
                ([k, v]) =>
                  `${({ chapters: '章节', items: '学习条目', points: '考点', questions: '题目' } as Record<string, string>)[k] ?? k} ${v}`,
              )
              .join(' · ')}
          </p>
          {validation.issues.map((issue, i) => (
            <button
              type="button"
              key={i}
              onClick={() =>
                setSection(sectionKeys.find((k) => issue.path.includes(k)) ?? 'catalog')
              }
            >
              {issue.message}{' '}
              <small>
                前往 {titles[sectionKeys.find((k) => issue.path.includes(k)) ?? 'catalog']}
              </small>
            </button>
          ))}
        </section>
      )}
      <nav className="admin-section-nav" aria-label="版本编辑分区">
        {sectionKeys.map((k) => (
          <button
            type="button"
            key={k}
            aria-current={section === k ? 'page' : undefined}
            onClick={() => setSection(k)}
          >
            {titles[k]}
            {edits[k] ? ' · 未保存' : ''}
          </button>
        ))}
      </nav>
      {editable && undo.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setEdits(undo.at(-1)!);
            setUndo(undo.slice(0, -1));
            setValidation(undefined);
          }}
        >
          撤销上一步修改
        </Button>
      )}
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await metadata();
            await save();
            setValidation(undefined);
            setSuccess('完整内容已保存。');
          }, '保存');
        }}
      >
        <fieldset className="admin-fields" disabled={!editable || !!busy}>
          {section === 'task-templates' ? (
            <TemplateEditor
              templates={(data[section].templates ?? []) as unknown as TaskTemplate[]}
              resources={resources}
              onChange={(templates) => change({ templates: templates as unknown as Json })}
            />
          ) : (
            <Fields
              name={sectionSchemas[section]}
              value={
                section === 'assessment-policy'
                  ? pick('AssessmentPolicyWrite', data[section])
                  : data[section]
              }
              choices={choices}
              disabled={!editable || !!busy}
              onChange={(v) => change(v as Row)}
            />
          )}
        </fieldset>
        {editable && (
          <Button type="submit" disabled={!!busy || !dirty}>
            保存当前修改
          </Button>
        )}
      </form>
      {!editable && (
        <p className="secondary">已发布内容不能原地修改。请返回版本列表，基于该版本创建草稿。</p>
      )}
      <Modal
        open={publishOpen}
        title={`发布版本 ${release.versionNo}`}
        onClose={() => !busy && setPublishOpen(false)}
      >
        <p>
          此版本将成为该课程的当前发布版本。旧内容版本、学习记录和原计划仍保留；新计划预览会读取此版本的任务模板。
        </p>
        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!!busy}
            onClick={() => setPublishOpen(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            loading={busy === '发布'}
            onClick={() =>
              void run(async () => {
                await metadata();
                const result = await request<ReleaseValidation>(`${base}/validation`);
                setValidation(result);
                if (!result.valid) throw new Error('最新校验未通过，请先处理问题');
                const published = await request<ContentRelease>(
                  `${base}/publication`,
                  'POST',
                  { confirm: true },
                  revision,
                );
                setRevision(published.draftRevision ?? revision);
                setPublishOpen(false);
                await onChanged();
                await client.invalidateQueries({
                  predicate: (q) => !String(q.queryKey[0]).startsWith('admin-'),
                });
                setSuccess('发布成功。返回学习计划后重新预览，不会自动确认正式计划。');
              }, '发布')
            }
          >
            确认启用版本 {release.versionNo}
          </Button>
        </div>
      </Modal>
      {release.state === 'PUBLISHED' && (
        <Link className="button button-secondary" to="/study/schedule">
          返回学习计划预览
        </Link>
      )}
    </section>
  );
}
export function TemplateEditor({
  templates,
  resources,
  onChange,
}: {
  templates: TaskTemplate[];
  resources: Resource[];
  onChange: (v: TaskTemplate[]) => void;
}) {
  const [deleted, setDeleted] = useState<TaskTemplate>();
  function update(id: string, change: Partial<TaskTemplate>) {
    onChange(templates.map((t) => (t.id === id ? { ...t, ...change } : t)));
  }
  return (
    <div className="admin-templates">
      <div className="admin-editor-heading">
        <div>
          <h3>计划任务模板</h3>
          <p>五周计划要求每门理论课至少有一项 REVIEW。预计时间由管理员填写，不自动估时。</p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...templates,
              {
                id: createUuid(),
                kind: 'REVIEW',
                title: '',
                estimatedMinutes: null as unknown as number,
                resource: null,
                sortOrder: templates.length,
              },
            ])
          }
        >
          新增复习任务
        </button>
      </div>
      {!templates.length && (
        <p className="admin-empty">此版本暂无任务。新增 REVIEW 并填写名称和预计分钟数后保存。</p>
      )}
      <div className="admin-table-scroll">
        <table className="admin-table admin-template-table">
          <thead>
            <tr>
              <th>任务类型</th>
              <th>任务名称</th>
              <th>预计分钟</th>
              <th>关联资料</th>
              <th>排序与删除</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t, i) => (
              <tr key={t.id}>
                <td>
                  <label>
                    <span className="sr-only">任务类型</span>
                    <select
                      aria-label={`任务${i + 1}类型`}
                      value={t.kind}
                      onChange={(e) =>
                        update(t.id, { kind: e.target.value as TaskTemplate['kind'] })
                      }
                    >
                      <option value="REVIEW">REVIEW · 复习</option>
                      <option value="PAPER">PAPER · 真题</option>
                    </select>
                  </label>
                </td>
                <td>
                  <label>
                    <span className="sr-only">任务名称</span>
                    <input
                      aria-label={`任务${i + 1}名称`}
                      required
                      maxLength={500}
                      value={t.title}
                      onChange={(e) => update(t.id, { title: e.target.value })}
                    />
                  </label>
                </td>
                <td>
                  <input
                    aria-label={`任务${i + 1}预计分钟`}
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={t.estimatedMinutes ?? ''}
                    onChange={(e) =>
                      update(t.id, {
                        estimatedMinutes:
                          e.target.value === ''
                            ? (null as unknown as number)
                            : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`任务${i + 1}资料`}
                    value={t.resource ? JSON.stringify(t.resource) : ''}
                    onChange={(e) =>
                      update(t.id, {
                        resource: e.target.value ? (JSON.parse(e.target.value) as Resource) : null,
                      })
                    }
                  >
                    <option value="">不关联资料</option>
                    {resources.map((r) => (
                      <option key={JSON.stringify(r)} value={JSON.stringify(r)}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {t.resource && (
                    <small>
                      {t.resource.kind === 'FILE' ? '受控文件' : '已有学习链接'} ·{' '}
                      {t.resource.label}
                    </small>
                  )}
                </td>
                <td>
                  <div className="admin-actions">
                    <button
                      type="button"
                      aria-label={`上移任务${i + 1}`}
                      disabled={i === 0}
                      onClick={() => {
                        const r = [...templates];
                        [r[i - 1], r[i]] = [r[i], r[i - 1]];
                        onChange(r.map((v, n) => ({ ...v, sortOrder: n })));
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`下移任务${i + 1}`}
                      disabled={i === templates.length - 1}
                      onClick={() => {
                        const r = [...templates];
                        [r[i + 1], r[i]] = [r[i], r[i + 1]];
                        onChange(r.map((v, n) => ({ ...v, sortOrder: n })));
                      }}
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => setDeleted(t)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!deleted} title="删除此任务？" onClose={() => setDeleted(undefined)}>
        <p>
          将从当前草稿清单移除「{deleted?.title || '未命名任务'}
          」。保存前可撤销，旧计划任务不受影响。
        </p>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={() => setDeleted(undefined)}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              onChange(templates.filter((t) => t.id !== deleted?.id));
              setDeleted(undefined);
            }}
          >
            确认从清单移除
          </Button>
        </div>
      </Modal>
    </div>
  );
}
