import { createContext, useContext, useState } from 'react';
import definitions from './contracts.json';
import { createUuid } from '../../utils/uuid';
import type { Json, Row } from './api';
export interface Schema {
  $ref?: string;
  type?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: Json[];
  nullable?: boolean;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
}
const ReadOnly = createContext(false);
const schemas = definitions as Record<string, Schema>;
export function schema(name: string) {
  return resolve(schemas[name] ?? { type: 'object' });
}
function resolve(s: Schema): Schema {
  if (s.$ref) return { ...resolve(schemas[s.$ref.split('/').at(-1)!]), nullable: s.nullable };
  if (s.allOf) return { ...s, ...resolve(s.allOf[0]) };
  return s;
}
const labels: Record<string, string> = {
  id: '稳定标识',
  stableKey: '内容定位键',
  originalKey: '题目定位键',
  sourceLocator: '来源说明',
  gateOverride: '覆盖练习门槛',
  stars: '难度星级',
  question: '例题题干',
  formulas: '公式',
  latex: 'LaTeX 公式',
  startsAt: '考试开始时间',
  endsAt: '考试结束时间',
  source: '来源说明',
  original: '原创',
  verified: '已审核',
  number: '题号',
  referenceAnswer: '参考答案',
  maximum: '满分',
  description: '评分说明',
  name: '名称',
  code: '课程代码',
  courseType: '课程类型',
  active: '启用',
  startDate: '开始日期',
  endDate: '结束日期',
  courses: '考试安排',
  courseId: '课程',
  examDate: '考试日期',
  examStart: '开始时间',
  examEnd: '结束时间',
  title: '名称',
  sortOrder: '排序',
  chapters: '章节',
  items: '学习条目',
  points: '考点',
  participatesInAssessment: '参与检测',
  estimatedMinutes: '预计分钟数',
  resource: '关联资料',
  resources: '相关资料',
  modules: '知识模块',
  examples: '例题',
  body: '正文',
  content: '内容',
  stem: '题干',
  options: '选项',
  correctOption: '正确选项索引（从0开始）',
  correctAnswer: '正确答案文本',
  explanation: '解析',
  questions: '题目',
  chapterId: '所属章节',
  pointIds: '关联考点',
  mode: '题目用途',
  difficulty: '难度',
  eligibleOriginal: '审核为有效原创题',
  kind: '类型',
  label: '显示名称',
  url: '公开学习链接',
  fileId: '文件',
  questionFileId: '题目文件',
  answerFileId: '答案文件',
  paperMonth: '试卷年月',
  sourceCourseCode: '来源课程代码',
  questionPages: '题目页数',
  answerPages: '答案页数',
  note: '备注',
  reason: '原因',
  decision: '审核决定',
  approved: '审核通过',
  canonicalQuestionId: '映射当前题目',
  mappingReleaseId: '映射发布版本',
  confirm: '确认执行',
  gateRatio: '练习门槛比例',
  gateFloor: '门槛下限',
  gateCap: '门槛上限',
  chapterMinQuestions: '章节最少题数',
  chapterMaxQuestions: '章节最多题数',
  chapterLimitMinutes: '章节限时（分钟）',
  chapterPassScore: '章节通过分数',
  mockQuestionCount: '模拟题数',
  mockLimitMinutes: '模拟限时（分钟）',
  mockPassScore: '模拟通过分数',
  weights: '模拟章权重',
  weight: '权重',
  scoreShare: '分值占比',
  sourcePaperKeys: '参考试卷编号',
  confirmWeightReview: '确认已审核权重',
  sourceSha: '来源版本',
  manual: '实践手册',
  sections: '手册分区',
  answers: '答案',
  solution: '解答',
  sampleFrom: '样本起始年月',
  sampleTo: '样本结束年月',
  evidence: '权重依据',
};
export type Choices = Record<string, { value: string; label: string }[]>;
export function initial(s: Schema, key = ''): Json {
  s = resolve(s);
  if (key === 'id') return createUuid();
  if (s.nullable) return null;
  if (s.type === 'object')
    return Object.fromEntries(
      Object.entries(s.properties ?? {})
        .filter(([k]) => s.required?.includes(k))
        .map(([k, v]) => [k, initial(v, k)]),
    );
  if (s.type === 'array') return [];
  if (s.enum) return s.enum[0];
  if (s.type === 'boolean') return false;
  if (s.type === 'integer' || s.type === 'number') return s.minimum ?? 0;
  return '';
}
export function pick(name: string, value: Row): Row {
  return Object.fromEntries(
    Object.keys(schema(name).properties ?? {}).map((k) => [
      k,
      value[k] ?? initial(schema(name).properties![k], k),
    ]),
  );
}
export function Fields({
  name,
  value,
  onChange,
  choices = {},
  disabled = false,
  readOnly = false,
}: {
  name: string;
  value: Json;
  onChange: (v: Json) => void;
  choices?: Choices;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <ReadOnly.Provider value={readOnly}>
      <fieldset className="admin-fields" disabled={disabled}>
        <Field
          definition={schema(name)}
          value={value}
          change={onChange}
          choices={choices}
          label=""
          field=""
        />
      </fieldset>
    </ReadOnly.Provider>
  );
}
function Field({
  definition,
  value,
  change,
  choices,
  label,
  field,
  required = false,
}: {
  definition: Schema;
  value: Json;
  change: (v: Json) => void;
  choices: Choices;
  label: string;
  field: string;
  required?: boolean;
}) {
  const readOnly = useContext(ReadOnly);
  const s = resolve(definition);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  if (value === null && (s.type === 'object' || s.type === 'array'))
    return (
      <div className="admin-null">
        <span>{label} · 未设置</span>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => change(initial({ ...s, nullable: false }))}
        >
          设置{label}
        </button>
      </div>
    );
  if (s.type === 'object') {
    const row = (value ?? {}) as Row;
    return (
      <div className="admin-object">
        {label && (
          <h4>
            {label}
            {s.nullable && (
              <button type="button" disabled={readOnly} onClick={() => change(null)}>
                取消设置
              </button>
            )}
          </h4>
        )}
        {Object.entries(s.properties ?? {}).map(([k, d]) => (
          <Field
            key={k}
            definition={d}
            value={row[k] ?? null}
            field={k}
            required={!!s.required?.includes(k)}
            label={
              k === 'points' && d.items?.$ref?.endsWith('/LocalPoint') ? '评分点' : (labels[k] ?? k)
            }
            choices={choices}
            change={(v) => change({ ...row, [k]: v })}
          />
        ))}
      </div>
    );
  }
  if (s.type === 'array') {
    const rows = (value ?? []) as Json[];
    const nested = resolve(s.items ?? {}).type === 'object';
    const matching = rows
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !query || JSON.stringify(v).toLowerCase().includes(query.toLowerCase()));
    const pages = Math.max(1, Math.ceil(matching.length / 50));
    const currentPage = Math.min(page, pages);
    const visible =
      rows.length > 50 ? matching.slice((currentPage - 1) * 50, currentPage * 50) : matching;
    return (
      <section className="admin-array">
        <div className="admin-array-head">
          <strong>
            {label} · {rows.length}
          </strong>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              const next = initial(s.items ?? {});
              change([
                ...rows,
                typeof next === 'object' && next && !Array.isArray(next) && 'sortOrder' in next
                  ? { ...next, sortOrder: rows.length }
                  : next,
              ]);
            }}
          >
            新增{label}
          </button>
        </div>
        {rows.length > 10 && (
          <input
            aria-label={`筛选${label}`}
            placeholder="搜索名称或内容"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        )}
        {rows.length > 50 && (
          <div className="admin-actions">
            <span>
              筛选后 {matching.length} 项 · 第 {currentPage} / {pages} 页
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              上一页{label}
            </button>
            <button
              type="button"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              下一页{label}
            </button>
          </div>
        )}
        {visible.map(({ v, i }) => (
          <ArrayRow
            key={typeof v === 'object' && v && !Array.isArray(v) ? String(v.id ?? i) : i}
            label={label}
            index={i}
            value={v}
            nested={nested}
            remove={() => change(rows.filter((_, n) => n !== i))}
            move={(d) => {
              const r = [...rows];
              if (i + d < 0 || i + d >= r.length) return;
              [r[i], r[i + d]] = [r[i + d], r[i]];
              change(
                r.map((v, n) =>
                  typeof v === 'object' && v && !Array.isArray(v) && 'sortOrder' in v
                    ? { ...v, sortOrder: n }
                    : v,
                ),
              );
            }}
          >
            <Field
              definition={s.items ?? { type: 'string' }}
              field={field.replace(/Ids$/, 'Id')}
              label={`${label} ${i + 1}`}
              value={v}
              required
              change={(n) => change(rows.map((r, k) => (k === i ? n : r)))}
              choices={choices}
            />
          </ArrayRow>
        ))}
        {!rows.length && <p className="secondary">尚无{label}。</p>}
      </section>
    );
  }
  if (field === 'id' || field === 'releaseId') {
    return (
      <div className="admin-identity">
        {label}：{String(value ?? '')}
      </div>
    );
  }
  const options = choices[field];
  if (options || s.enum || s.type === 'boolean') {
    const opts = options ??
      s.enum?.map((v) => ({ value: String(v), label: String(v) })) ?? [
        { value: 'true', label: '是' },
        { value: 'false', label: '否' },
      ];
    return (
      <label>
        {label}
        <select
          disabled={readOnly}
          aria-label={label}
          required={required && !s.nullable}
          value={value === null ? '' : String(value)}
          onChange={(e) =>
            change(
              e.target.value === ''
                ? null
                : s.type === 'boolean'
                  ? e.target.value === 'true'
                  : e.target.value,
            )
          }
        >
          <option value="">{s.nullable ? '未指定' : '请选择'}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (s.format === 'uuid')
    return (
      <label>
        {label}
        <input readOnly value={String(value ?? '')} placeholder="请先加载可选择的关联内容" />
      </label>
    );
  const numeric = s.type === 'number' || s.type === 'integer';
  const long = ['body', 'content', 'stem', 'explanation', 'solution', 'note', 'evidence'].includes(
    field,
  );
  return (
    <label>
      {label}
      {long ? (
        <textarea
          readOnly={readOnly}
          value={String(value ?? '')}
          rows={5}
          required={required && !s.nullable}
          maxLength={s.maxLength}
          onChange={(e) => change(e.target.value)}
        />
      ) : (
        <input
          readOnly={readOnly}
          type={numeric ? 'number' : s.format === 'date' ? 'date' : 'text'}
          value={value === null ? '' : String(value)}
          required={required && !s.nullable}
          min={s.minimum}
          max={s.maximum}
          step={s.type === 'integer' ? 1 : numeric ? 'any' : undefined}
          minLength={s.minLength}
          maxLength={s.maxLength}
          pattern={s.pattern}
          placeholder={field === 'paperMonth' ? '例如 2026-04' : undefined}
          aria-label={label}
          onInput={
            s.format === 'date'
              ? (e) =>
                  change(s.nullable && e.currentTarget.value === '' ? null : e.currentTarget.value)
              : undefined
          }
          onChange={(e) =>
            change(
              numeric
                ? e.target.value === ''
                  ? null
                  : Number(e.target.value)
                : s.nullable && e.target.value === ''
                  ? null
                  : e.target.value,
            )
          }
        />
      )}
    </label>
  );
}
function ArrayRow({
  children,
  label,
  index,
  value,
  nested,
  remove,
  move,
}: {
  children: React.ReactNode;
  label: string;
  index: number;
  value: Json;
  nested: boolean;
  remove: () => void;
  move: (d: number) => void;
}) {
  const readOnly = useContext(ReadOnly);
  const r = typeof value === 'object' && value && !Array.isArray(value) ? value : {};
  const [expanded, setExpanded] = useState(
    !r.title && !r.name && !r.stem && !r.question && !r.description && !r.number,
  );
  return (
    <div className="admin-array-row">
      <div className="admin-row-tools">
        <button
          type="button"
          disabled={readOnly}
          aria-label={`上移${label}${index + 1}`}
          onClick={() => move(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={readOnly}
          aria-label={`下移${label}${index + 1}`}
          onClick={() => move(1)}
        >
          ↓
        </button>
        <button type="button" disabled={readOnly} onClick={remove}>
          移除{label}
          {index + 1}
        </button>
      </div>
      {nested ? (
        <>
          <button type="button" className="admin-expand" onClick={() => setExpanded(!expanded)}>
            {expanded ? '▾' : '▸'} {index + 1} ·{' '}
            {String(
              r.title || r.name || r.stem || r.question || r.description || r.number || label,
            ).slice(0, 90)}
          </button>
          {expanded && children}
        </>
      ) : (
        children
      )}
    </div>
  );
}
