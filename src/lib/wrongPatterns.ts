import type { AiQuestion } from '../data/aiTrainer';
import type { WrongItem } from './wrongbook';

export type WrongPatternId =
  | 'exam_pending'
  | 'stubborn'
  | 'tf_absolute'
  | 'tf_concept'
  | 'tf_all'
  | 'single_negative'
  | 'single_special'
  | 'single_ml'
  | 'single_biz_data'
  | 'all_wrongs';

export type WrongScope = 'all' | 'never_right' | 'multi_miss';

export interface WrongPatternDef {
  id: WrongPatternId;
  group: 'urgent' | 'tf' | 'single' | 'all';
  groupLabel: string;
  title: string;
  subtitle: string;
  tip: string;
  /** 是否只在命中题数 > 0 时展示 */
  hideWhenEmpty?: boolean;
}

const TF_ABSOLUTE_WORDS = [
  '只能',
  '只保护',
  '只针对',
  '只关注',
  '仅限于',
  '一定',
  '所有',
  '必须',
  '始终',
  '完全',
  '无法',
  '不能有效',
  '比其',
  '更重要',
  '第一步',
  '最后一步',
  '不经许可',
];

const SINGLE_NEGATIVE_WORDS = [
  '不是',
  '不包括',
  '不属于',
  '不可以',
  '错误的',
  '不适合',
  '不正确',
  '不会',
  '无关',
  '无效',
];

const SINGLE_SPECIAL_IDS = new Set([
  'ai3-single-250',
  'ai3-single-137',
  'ai3-single-3',
  'ai3-single-1',
  'ai3-single-36',
  'ai3-single-60',
  'ai3-single-225',
]);

const SINGLE_SPECIAL_WORDS = [
  '白化',
  '道德',
  '职业',
  '行为准则',
  '爱岗敬业',
  '诚实守信',
  '职业守则',
  '法律',
  '法规',
  '专利法',
  '关键信息基础设施',
  '知识产权',
  '著作权',
  '保密',
  '合规',
  '隐私',
  'Marvel',
  'Figma',
  'Sketch',
  'Axure',
  'BPM',
  'Word',
  'Excel',
  'Balsamiq',
];

const SINGLE_ML_WORDS = [
  '模型',
  '训练',
  '收敛',
  '参数',
  '损失',
  '过拟合',
  '欠拟合',
  '评估',
  '准确率',
  '召回率',
  '特征',
  '降维',
  'PCA',
  '贝叶斯',
  '关联规则',
  '随机森林',
  'RNN',
  'CNN',
  '神经网络',
  '时间序列',
  '差分',
  '剪枝',
  '分布',
  '框架',
  'PyTorch',
  'TensorFlow',
  'Spark',
  'NumPy',
  '算法',
  '机器学习',
  '学习率',
  '网格搜索',
  '验证',
  '泛化',
  '监控',
  '中心性',
  '网络分析',
  '决策树',
  '聚类',
  '回归',
];

const SINGLE_BIZ_DATA_WORDS = [
  '业务',
  '流程',
  '可扩展',
  '架构',
  '可视化',
  '设计',
  '原型',
  '可用性',
  '可访问性',
  '网络拓扑',
  '交互',
  '需求分析',
  '项目管理',
  '任务分解',
  '敏捷',
  '性能',
  '容器',
  '系统',
  '跨云',
  '产品',
  '标注',
  '缺失值',
  '异常值',
  '箱线图',
  '去重',
  '归一化',
  '拆解',
  '采集',
  '数据处理',
  '图像读取',
  '解码',
  '培训',
  '员工',
  '异常',
  '工具库',
  '抓取',
  '格式转换',
  '用户体验',
];

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export const WRONG_PATTERNS: WrongPatternDef[] = [
  {
    id: 'exam_pending',
    group: 'urgent',
    groupLabel: '优先清扫',
    title: '考卷待清错题',
    subtitle: '上次模拟考做错、卡着下一次考试解锁的题',
    tip: '先把这批考卷错题全做对，立刻解锁下一次模拟考试。',
    hideWhenEmpty: true,
  },
  {
    id: 'stubborn',
    group: 'urgent',
    groupLabel: '优先清扫',
    title: '高频顽固题（错 ≥3 次）',
    subtitle: '反复踩坑的“死磕题”，提分最立竿见影',
    tip: '这批题你总在常识和题库标准答案之间摇摆：别临场推理，直接把「题干关键词 → 答案」绑死。',
  },
  {
    id: 'tf_absolute',
    group: 'tf',
    groupLabel: '规律 A · 判断题疑罪从 F',
    title: '判断 · 绝对词与片面比较',
    subtitle: '含「只能 / 仅限于 / 一定 / 所有 / 更重要 / 第一步」等信号词',
    tip: '你的判断错题 88% 是把错(F)选成对(T)！遇到绝对限定词、“A 比 B 更重要”、“第一步/最后一步”，优先判错（F）。',
  },
  {
    id: 'tf_concept',
    group: 'tf',
    groupLabel: '规律 A · 判断题疑罪从 F',
    title: '判断 · 概念偷换与张冠李戴',
    subtitle: '主语/宾语被偷换的隐蔽错题（CNN/归一化/NumPy/决策树等）',
    tip: '别看顺眼就选对！重点核对概念绑定：CNN=图像、RNN=序列；归一化改量纲不改数据类型；NumPy 同构；决策树单父节点。',
  },
  {
    id: 'tf_all',
    group: 'tf',
    groupLabel: '规律 A · 判断题疑罪从 F',
    title: '判断 · 全部判断错题连刷',
    subtitle: '一次性把所有判断错题拉出来，彻底治好“顺眼选对”惯性',
    tip: '先找茬、疑罪从 F：每题先扫描有没有绝对词、片面比较或概念偷换，没有硬伤才选正确（T）。',
  },
  {
    id: 'single_negative',
    group: 'single',
    groupLabel: '规律 B · 单选题高频避坑',
    title: '单选 · 反向问法陷阱',
    subtitle: '题干带「不是 / 不包括 / 不可以 / 无效」的反向选择题',
    tip: '看到「不是 / 不包括 / 不可以 / 无效」强制停顿 1 秒！先排除 3 个明显正确的，再选反向项。',
  },
  {
    id: 'single_special',
    group: 'single',
    groupLabel: '规律 B · 单选题高频避坑',
    title: '单选 · 题库特供与冷门工具',
    subtitle: '反常识特供答案 + 职业道德法规 + Marvel / Figma / Sketch / Excel',
    tip: '死记绑定：数据白化→保护隐私；提升性能人机交互→数据标注；职业道德形成→奴隶社会；流程优化→Oracle BPM Suite；Marvel评审→原型测试；Figma→设计界面UI。',
  },
  {
    id: 'single_ml',
    group: 'single',
    groupLabel: '规律 B · 单选题高频避坑',
    title: '单选 · 模型训练、调优与算法',
    subtitle: '收敛 / 参数调优 / 损失 / 评估指标 / 特征 / RNN / 随机森林 / 框架',
    tip: '记清核心绑定：更快收敛→学习率调整；选最佳参数→网格搜索；训练目标→最小化损失；分布式训练→TensorFlow；快速原型→PyTorch；减少推理时间→剪枝；非平稳消趋势→差分。',
  },
  {
    id: 'single_biz_data',
    group: 'single',
    groupLabel: '规律 B · 单选题高频避坑',
    title: '单选 · 业务流程、架构与数据处理',
    subtitle: '业务优化 / 可扩展性 / 数据清洗标注 / 缺失值异常值 / 系统交互',
    tip: '记清高频词：提高响应速度→消除非增值活动；可扩展性→提高负载增加时性能；自动处理提速→数据收集；分类缺失值→众数填充；数据可视化→展示数据。',
  },
  {
    id: 'all_wrongs',
    group: 'all',
    groupLabel: '兜底总清扫',
    title: '全部错题集（不限模式）',
    subtitle: '当前错题集里所有单选 + 判断一次全拉出来，不再限制 10 题',
    tip: '综合实战：用上「判断疑罪从 F + 反向题停 1 秒 + 关键词绑定」，把整本错题集一次清扫干净。',
  },
];

export function patternById(id: WrongPatternId): WrongPatternDef | undefined {
  return WRONG_PATTERNS.find((p) => p.id === id);
}

export function matchWrongPattern(
  patternId: WrongPatternId,
  q: AiQuestion,
  item: WrongItem | undefined,
  examPendingIds: Set<string>,
): boolean {
  if (q.type === 'multi') return false;
  const stem = q.stem ?? '';
  switch (patternId) {
    case 'exam_pending':
      return examPendingIds.has(q.id);
    case 'stubborn':
      return (item?.misses ?? 0) >= 3;
    case 'tf_absolute':
      return q.type === 'tf' && hasAny(stem, TF_ABSOLUTE_WORDS);
    case 'tf_concept':
      return q.type === 'tf' && !hasAny(stem, TF_ABSOLUTE_WORDS);
    case 'tf_all':
      return q.type === 'tf';
    case 'single_negative':
      return q.type === 'single' && hasAny(stem, SINGLE_NEGATIVE_WORDS);
    case 'single_special':
      return q.type === 'single' && (SINGLE_SPECIAL_IDS.has(q.id) || hasAny(stem, SINGLE_SPECIAL_WORDS));
    case 'single_ml':
      return q.type === 'single' && hasAny(stem, SINGLE_ML_WORDS);
    case 'single_biz_data':
      return q.type === 'single' && hasAny(stem, SINGLE_BIZ_DATA_WORDS);
    case 'all_wrongs':
      return true;
  }
}

export function passWrongScope(scope: WrongScope, item: WrongItem | undefined, patternId: WrongPatternId): boolean {
  if (patternId === 'exam_pending') return true;
  if (!item) return true;
  if (scope === 'never_right') return item.right === 0;
  if (scope === 'multi_miss') return item.misses >= 2;
  return true;
}
