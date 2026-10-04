// Merge the authoritative record model schema with the existing API without changing its paths.
import { readFileSync, writeFileSync } from 'node:fs';
import YAML from 'yaml';
const types = readFileSync('src/api/fitness-models.ts', 'utf8');
const schemas = {};
for (const match of types.matchAll(/export type (\w+) = ([^;]+);/g))
  schemas[match[1]] = {
    type: 'string',
    enum: [...match[2].matchAll(/'([^']+)'/g)].map((v) => v[1]),
  };
for (const match of types.matchAll(/export interface (\w+) \{([^}]+)\}/g)) {
  const properties = {},
    required = [];
  for (const field of match[2].matchAll(/(\w+): ([^;]+);/g)) {
    let type = field[2],
      nullable = type.includes(' | null');
    type = type.replace(' | null', '');
    let value = ['string', 'number', 'boolean'].includes(type)
      ? { type }
      : type.endsWith('[]')
        ? {
            type: 'array',
            items: { $ref: `#/components/schemas/${type.slice(0, -2)}` },
            maxItems: type === 'TrainingPlan[]' ? 7 : 100,
          }
        : { $ref: `#/components/schemas/${type}` };
    if (nullable)
      value = value.$ref ? { allOf: [value], nullable: true } : { ...value, nullable: true };
    else required.push(field[1]);
    if (field[1].endsWith('Date')) value = { ...value, format: 'date' };
    properties[field[1]] = value;
  }
  schemas[match[1]] = { type: 'object', additionalProperties: false, properties, required };
}
const kindMap = {
  goal: 'Goal',
  weight: 'Weight',
  'training-plan': 'TrainingPlan',
  training: 'Training',
  'meal-plan': 'Meals',
  meals: 'Meals',
  checkin: 'Checkin',
  water: 'Water',
  'training-template': 'TrainingTemplate',
  'meal-template': 'MealTemplate',
  'week-template': 'WeekTemplate',
  profile: 'Profile',
};
const kinds = Object.keys(kindMap);
const payload = {
  oneOf: [...new Set(Object.values(kindMap))].map((v) => ({ $ref: `#/components/schemas/${v}` })),
};
schemas.FitnessEntry = {
  type: 'object',
  required: ['kind', 'key', 'revision', 'data'],
  properties: {
    kind: { type: 'string', enum: kinds },
    key: { type: 'string' },
    revision: { type: 'integer', format: 'int64', minimum: 0 },
    data: { ...payload, nullable: true },
  },
};
schemas.FitnessWrite = {
  type: 'object',
  additionalProperties: false,
  required: ['expectedRevision', 'data'],
  properties: {
    expectedRevision: { type: 'integer', format: 'int64', minimum: -1 },
    expectedGoalRevision: {
      type: 'integer',
      format: 'int64',
      minimum: -1,
      nullable: true,
      description: 'goal写入必填，来自summary.goalRevision',
    },
    data: payload,
  },
};
schemas.FitnessNutrient = {
  type: 'object',
  properties: {
    knownTotal: { type: 'number', nullable: true },
    complete: { type: 'boolean' },
    knownCount: { type: 'integer' },
    foodCount: { type: 'integer' },
  },
  required: ['knownTotal', 'complete', 'knownCount', 'foodCount'],
};
schemas.FitnessNutrition = {
  type: 'object',
  properties: Object.fromEntries(
    ['kcal', 'protein', 'carbs', 'fat'].map((k) => [
      k,
      { $ref: '#/components/schemas/FitnessNutrient' },
    ]),
  ),
};
schemas.FitnessWeightWindow = {
  type: 'object',
  properties: {
    mean: { type: 'number', nullable: true },
    samples: { type: 'integer' },
    from: { type: 'string', format: 'date' },
    to: { type: 'string', format: 'date' },
  },
};
schemas.FitnessDay = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date' },
    records: {
      type: 'object',
      additionalProperties: { $ref: '#/components/schemas/FitnessEntry' },
    },
    checkedIn: { type: 'boolean' },
    rest: { type: 'boolean' },
    partial: { type: 'boolean' },
    state: {
      type: 'string',
      enum: ['CHECKED_IN', 'FUTURE', 'TODAY_PENDING', 'PARTIAL_RECORDS', 'PAST_MISSING'],
    },
    trainingState: {
      type: 'string',
      enum: ['PENDING', 'UNPLANNED', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'REST'],
    },
    nutrition: { $ref: '#/components/schemas/FitnessNutrition' },
    plannedNutrition: { $ref: '#/components/schemas/FitnessNutrition' },
  },
};
schemas.FitnessSummary = {
  type: 'object',
  properties: {
    today: { type: 'string', format: 'date' },
    currentGoal: { allOf: [{ $ref: '#/components/schemas/FitnessEntry' }], nullable: true },
    goalRevision: { type: 'integer', format: 'int64' },
    latestWeight: { allOf: [{ $ref: '#/components/schemas/FitnessEntry' }], nullable: true },
    streak: { type: 'integer' },
    weekCheckins: { type: 'integer' },
    weekElapsedDays: { type: 'integer' },
    weekRate: { type: 'number' },
    sevenDayWeight: { $ref: '#/components/schemas/FitnessWeightWindow' },
  },
};
schemas.FitnessStats = {
  type: 'object',
  properties: {
    from: { type: 'string', format: 'date' },
    to: { type: 'string', format: 'date' },
    ...Object.fromEntries(
      [
        'checkinDays',
        'dietDays',
        'plannedTrainingDays',
        'completedTrainingDays',
        'partialTrainingDays',
        'skippedTrainingDays',
        'restDays',
      ].map((k) => [k, { type: 'integer' }]),
    ),
    trainingRate: { type: 'number', nullable: true },
    sevenDayWeight: { $ref: '#/components/schemas/FitnessWeightWindow' },
    nutrition: { $ref: '#/components/schemas/FitnessNutrition' },
  },
};
schemas.FitnessPage = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { $ref: '#/components/schemas/FitnessEntry' } },
    total: { type: 'integer' },
    page: { type: 'integer' },
    size: { type: 'integer' },
  },
};
const parameters = {
  kind: { name: 'kind', in: 'path', required: true, schema: { type: 'string', enum: kinds } },
  key: {
    name: 'key',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: '每日记录为YYYY-MM-DD，模板/目标为UUID，profile为current',
  },
  date: { name: 'date', in: 'path', required: true, schema: { type: 'string', format: 'date' } },
  page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  size: {
    name: 'size',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
  },
  from: { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
  to: { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
  idempotency: {
    name: 'Idempotency-Key',
    in: 'header',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  },
};
const paths = {};
function endpoint(path, method, summary, data, params = [], body) {
  const response = {
    type: 'object',
    required: ['code', 'message', 'data'],
    properties: { code: { type: 'integer', enum: [0] }, message: { type: 'string' }, data },
  };
  const item = {
    tags: ['fitness'],
    summary,
    security: [{ bearerAuth: [] }],
    parameters: params.map((p) => (typeof p === 'string' ? parameters[p] : p)),
    responses: {
      200: {
        description: '成功，Cache-Control: no-store',
        content: { 'application/json': { schema: response } },
      },
      400: { description: '40001 非法参数' },
      401: { description: '40101 未登录或令牌失效' },
      404: { description: '40401 本人资源不存在' },
      409: { description: '40901 修订冲突 / 40904 幂等键与请求不符' },
      422: { description: '42203 未来实际记录 / 42202 关联错误' },
    },
  };
  if (body)
    item.requestBody = { required: true, content: { 'application/json': { schema: body } } };
  (paths[path] ??= {})[method] = item;
}
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
endpoint('/api/v1/fitness/summary', 'get', '当前用户今日健身摘要', ref('FitnessSummary'));
endpoint('/api/v1/fitness/days/{date}', 'get', '指定日期详情与统一状态', ref('FitnessDay'), [
  'date',
]);
endpoint(
  '/api/v1/fitness/history',
  'get',
  '日期日历（最多367天）',
  { type: 'array', items: ref('FitnessDay') },
  ['from', 'to'],
);
endpoint('/api/v1/fitness/statistics', 'get', '周/月或自定义范围统计', ref('FitnessStats'), [
  'from',
  'to',
]);
endpoint(
  '/api/v1/fitness/records/{kind}',
  'get',
  '按当前用户分页，更新时间和标识倒序',
  ref('FitnessPage'),
  ['kind', 'page', 'size'],
);
endpoint(
  '/api/v1/fitness/records/{kind}/{key}',
  'get',
  '单条记录，不存在返回null',
  { allOf: [ref('FitnessEntry')], nullable: true },
  ['kind', 'key'],
);
endpoint(
  '/api/v1/fitness/records/{kind}/{key}',
  'put',
  '按类型保存记录，目标新增历史版本',
  ref('FitnessEntry'),
  ['kind', 'key', 'idempotency'],
  ref('FitnessWrite'),
);
endpoint(
  '/api/v1/fitness/records/{kind}/{key}',
  'delete',
  '事务删除本人记录（保留冲突版本）',
  { nullable: true },
  [
    'kind',
    'key',
    { name: 'revision', in: 'query', required: true, schema: { type: 'integer', minimum: 0 } },
  ],
);
endpoint(
  '/api/v1/fitness/copy',
  'post',
  '源计划/模板复制为独立日期快照',
  ref('FitnessEntry'),
  ['idempotency'],
  {
    type: 'object',
    additionalProperties: false,
    required: ['sourceKind', 'sourceKey', 'destination', 'expectedRevision'],
    properties: {
      sourceKind: {
        type: 'string',
        enum: ['training-plan', 'training-template', 'meal-plan', 'meal-template'],
      },
      sourceKey: { type: 'string' },
      destination: { type: 'string', format: 'date' },
      expectedRevision: { type: 'integer', minimum: -1 },
    },
  },
);
endpoint(
  '/api/v1/fitness/weeks/generate',
  'post',
  '周模板生成7天安排，任一天冲突整体回滚',
  { type: 'object', properties: { items: { type: 'array', items: ref('FitnessEntry') } } },
  ['idempotency'],
  {
    type: 'object',
    additionalProperties: false,
    required: ['templateKey', 'monday', 'expectedRevisions'],
    properties: {
      templateKey: { type: 'string', format: 'uuid' },
      monday: { type: 'string', format: 'date' },
      expectedRevisions: {
        type: 'array',
        minItems: 7,
        maxItems: 7,
        items: { type: 'integer', minimum: -1 },
      },
    },
  },
);
endpoint(
  '/api/v1/fitness/goals/end',
  'post',
  '结束当前目标并新增历史事件',
  { type: 'object', properties: { ended: { type: 'boolean' }, revision: { type: 'integer' } } },
  ['idempotency'],
  {
    type: 'object',
    additionalProperties: false,
    required: ['expectedGoalRevision'],
    properties: { expectedGoalRevision: { type: 'integer', minimum: 0 } },
  },
);
endpoint(
  '/api/v1/fitness/goals/history',
  'get',
  '目标创建/调整/结束事件分页',
  {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            version: { type: 'integer' },
            goalKey: { type: 'string' },
            action: { type: 'string', enum: ['CREATED', 'ADJUSTED', 'ENDED'] },
            createdAt: { type: 'string' },
          },
        },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      total: { type: 'integer' },
    },
  },
  ['page', 'size'],
);
endpoint('/api/v1/personal/summary', 'get', '统一个人首页：复用学习聚合与本人健身聚合', {
  type: 'object',
  properties: {
    today: { type: 'string', format: 'date' },
    study: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        message: { type: 'string' },
        target: { type: 'object', nullable: true },
      },
    },
    fitness: ref('FitnessSummary'),
    fitnessToday: ref('FitnessDay'),
  },
});
const doc = {
  openapi: '3.0.3',
  info: { title: '知途个人平台增量接口', version: '1.0.0' },
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
  },
};
writeFileSync('../backend/docs/platform/openapi.yaml', YAML.stringify(doc));
writeFileSync('docs/platform/openapi.yaml', YAML.stringify(doc));
