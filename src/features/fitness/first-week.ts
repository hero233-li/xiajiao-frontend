import { createUuid } from '../../utils/uuid';
import type { Exercise, Food, Meals, TrainingPlan } from '../../api/fitness';

// User supplied content, never actual records or an inferred nutrition database.
export interface FirstWeekDay {
  title: string;
  training: TrainingPlan;
  meals: Meals;
}
const exercise = (
  name: string,
  type: Exercise['type'],
  note: string,
  values: Partial<Exercise> = {},
): Exercise => ({
  id: createUuid(),
  name,
  type,
  sets: null,
  reps: null,
  kg: null,
  minutes: null,
  km: null,
  note,
  completed: false,
  ...values,
});
const strength = (name: string, reps: number | null, note: string, kg: number | null = null) =>
  exercise(name, 'STRENGTH', note, { sets: 2, reps, kg });
const walk = (name: string, minutes: number | null, note: string) =>
  exercise(name, 'CARDIO', note, { minutes });
const warm = () => [
  walk(
    '跑步机热身',
    8,
    '只走不跑。0～3分钟：坡度0、速度4.0km/h；3～6分钟：坡度1、速度4.5；6～8分钟：坡度2、速度4.8。',
  ),
  exercise(
    '动态热身',
    'MOBILITY',
    '肩膀向前、向后各绕10圈；髋部左右各8次；徒手深蹲10次；提踵15次；髋铰链10次。',
    { minutes: 4 },
  ),
];
const leg = () =>
  strength(
    '腿举 Leg Press',
    12,
    '原文试20kg。双脚与肩同宽，膝盖跟脚尖同向；下去2秒，推出1～2秒，不锁膝。组间休息90秒。不同器械重量以现场确认和实际记录为准。',
    20,
  );
const pull = (reps: number | null = 12) =>
  strength(
    '高位下拉 Lat Pulldown',
    reps,
    '原文试10～15kg，2组×10～12次（Day 3/5为12次）。握距稍宽于肩，手肘往下拉到锁骨附近，再慢慢回去；休息60～90秒。重量范围保留在备注，请自行填写确定值。',
  );
const press = (reps: number | null = null) =>
  strength(
    '坐姿推胸 Chest Press',
    reps,
    '原文试5～10kg；Day 1为10次，Day 3/5为10～12次。把手与胸口同高，后背贴紧，不锁肘。',
  );
const row = () =>
  strength('坐姿划船 Seated Row', 12, '原文试10～15kg。胸口挺起，手肘往后，不前后甩身体。');
const curl = () =>
  strength('坐姿腿弯举 Leg Curl', 12, '原文试10～15kg。小腿往下、往后卷，停1秒再慢慢回来。');
const hip = () =>
  strength(
    '臀推机 Hip Thrust / Glute Drive',
    12,
    '原文最低档～20kg试起。垫子压在髋部，脚约肩宽；脚后跟踩住，臀部收紧，顶到肩—髋—膝大致一直线，停1秒。腰部不适时停止并检查动作。',
  );
const abduct = () =>
  strength(
    '髋外展 Hip Abduction',
    15,
    '原文试15～25kg。大腿外侧顶住垫子，向外打开，停1秒，慢慢收回。',
  );
const slope = () =>
  walk(
    '跑步机爬坡',
    null,
    '原文15～20分钟：前3分钟坡度2、速度4.2；中间12～15分钟坡度5～6、速度4.3～4.7km/h；最后2分钟坡度1、速度4.0。原文分段与总时长存在差异，可在编辑中确定实际安排。',
  );
const cool = () => walk('慢走冷身', 5, '坡度0，速度从4.0慢慢降到3.5km/h。');
const food = (
  meal: Food['meal'],
  name: string,
  quantity: number | null = null,
  unit: string | null = null,
  note: string | null = null,
): Food => ({
  meal,
  name,
  quantity,
  unit,
  note,
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
});
const B: Food['meal'] = 'BREAKFAST',
  L: Food['meal'] = 'LUNCH',
  D: Food['meal'] = 'DINNER',
  S: Food['meal'] = 'SNACK';
const common =
  '来源：你提供的第一周计划。第一周以熟悉器械和适应为主；力量动作2组。重量范围不自动选值；记录实际完成时填写现场重量。做完仍能再做2～3次且动作稳定。出现关节或腰部尖锐疼痛时停止该动作。';
const mealNote = (estimate: string) =>
  `来源：你提供的食谱。原文全天粗估${estimate} kcal，不计入精确营养统计；未逐项填写的营养均为未知。米饭、红薯、肉类按熟重理解。可调整份量、替换食物；不是系统个性化健康建议。`;
export function createFirstWeek(): FirstWeekDay[] {
  const training: TrainingPlan[] = [
    {
      rest: false,
      exercises: [
        ...warm(),
        leg(),
        pull(null),
        press(10),
        row(),
        curl(),
        abduct(),
        slope(),
        cool(),
      ],
      note: `Day 1｜全身适应 + 爬坡，原文约65～75分钟。${common}`,
    },
    {
      rest: false,
      exercises: [
        walk('跑步机热身', 5, '坡度0～1，速度4.0～4.5km/h。'),
        walk('开始爬坡', 5, '坡度3～4，速度4.3～4.5。'),
        walk(
          '正式爬坡',
          20,
          '坡度5～7，速度4.3～4.8；呼吸加快但能说完整句子。需要抓扶手时降低坡度。',
        ),
        walk('降坡', 5, '坡度2～3，速度4.2。'),
        walk('冷身', 5, '坡度0，速度3.8～4.0。'),
      ],
      note: `Day 2｜纯爬坡有氧，40分钟，不练器械。${common}`,
    },
    {
      rest: false,
      exercises: [
        ...warm(),
        { ...leg(), kg: null, note: '2×12，使用Day 1实际确认的合适重量；请填写自己的重量。' },
        pull(),
        press(),
        row(),
        hip(),
        abduct(),
        strength('Dead Bug', null, '每侧8次×2组，徒手；次数按每侧说明保留。'),
        slope(),
        cool(),
      ],
      note: `Day 3｜全身力量 + 短爬坡，原文约65～75分钟。${common}`,
    },
    {
      rest: false,
      exercises: [
        walk('平地快走热身', 5, '速度4.0km/h。'),
        walk('平地快走', 25, '坡度0～2，速度4.5～5.0。'),
        walk('慢走', 5, '放慢速度。'),
        exercise(
          '恢复拉伸',
          'MOBILITY',
          '大腿前侧、后侧，小腿、臀部、胸、背，每个动作20～30秒；以舒服为目标。',
          { minutes: 10 },
        ),
      ],
      note: `Day 4｜恢复活动，40～45分钟，包含轻活动，不等同完全休息。${common}`,
    },
    {
      rest: false,
      exercises: [
        ...warm(),
        hip(),
        { ...leg(), kg: null, note: '2×12，使用自己确认的合适重量。' },
        row(),
        pull(),
        press(),
        curl(),
        abduct(),
        strength('平板支撑', null, '2组×20～30秒；时长范围记在备注中，不按次数解释。'),
        walk('坡走', 20, '坡度5～7、速度4.3～4.8km/h。'),
        cool(),
      ],
      note: `Day 5｜第三次全身力量，原文约65～75分钟，仍只做2组。${common}`,
    },
    {
      rest: false,
      exercises: [
        walk('长爬坡：热身', 5, '0～5分钟：坡度0～2，速度4.0～4.5km/h。'),
        walk('长爬坡：升坡', 5, '5～10分钟：坡度3～4，速度4.3～4.5。'),
        walk('长爬坡：坡度5', 10, '10～20分钟：坡度5，速度4.5～4.8。'),
        walk('长爬坡：坡度6', 10, '20～30分钟：坡度6，速度4.3～4.8；过难继续坡度5。'),
        walk('长爬坡：降至坡度5', 5, '30～35分钟：坡度5，速度4.3～4.5。'),
        walk('长爬坡：降坡', 5, '35～40分钟：坡度2～3，速度4.0～4.3。'),
        walk('长爬坡：冷身', 5, '40～45分钟：坡度0，速度3.5～4.0。'),
      ],
      note: `Day 6｜最长一次爬坡，45分钟。不需要冲坡度10或13。${common}`,
    },
    {
      rest: true,
      exercises: [],
      note: 'Day 7｜休息 / 超轻活动。默认保存为休息日，仍可打卡。原文另一选项：身体舒服时随意散步30分钟、不追心率、不爬大坡；如选择散步，可取消休息并添加活动。',
    },
  ];
  const foods: Food[][] = [
    [
      food(B, '鸡蛋', 2, '个', '08:00；水煮或少油煎。'),
      food(B, '纯牛奶', 250, 'ml'),
      food(B, '全麦面包', 2, '片'),
      food(B, '苹果', 1, '个', '可换橙子。'),
      food(L, '熟米饭', 150, 'g', '12:00～13:00'),
      food(L, '鸡胸肉', 160, 'g', '原文详细说明可150～180g；可煎、烤、炒，少油。'),
      food(L, '西兰花 / 青菜', 300, 'g'),
      food(L, '食用油', null, null, '少量，未提供精确份量。'),
      food(S, '香蕉', 1, '根', '若18:30训练，约17:00加餐。'),
      food(S, '无糖酸奶', 150, 'g', '不喜欢香蕉可用全麦面包+牛奶，或苹果+酸奶。'),
      food(D, '熟米饭', 100, 'g', '训练后正常晚饭；原文80～100g，特别饿可120g。'),
      food(D, '虾仁', 180, 'g', '原文150～180g，可换鸡胸、鱼或瘦牛肉。'),
      food(D, '蔬菜', 300, 'g'),
    ],
    [
      food(B, '燕麦', 40, 'g'),
      food(B, '牛奶', 250, 'ml'),
      food(B, '鸡蛋', 2, '个'),
      food(B, '蓝莓 / 草莓', null, null, '一小份，原文未给克数。'),
      food(L, '熟米饭', 130, 'g'),
      food(L, '牛肉', 150, 'g'),
      food(L, '青椒 / 菌菇', 300, 'g'),
      food(S, '苹果', 1, '个'),
      food(S, '无糖酸奶'),
      food(D, '红薯', 180, 'g'),
      food(D, '鱼', 180, 'g'),
      food(D, '青菜', 300, 'g'),
    ],
    [
      food(B, '鸡蛋', 2, '个'),
      food(B, '全麦面包', 2, '片'),
      food(B, '牛奶', 250, 'ml'),
      food(B, '香蕉', 0.5, '根'),
      food(L, '熟米饭', 150, 'g'),
      food(L, '去皮鸡腿肉', 160, 'g'),
      food(L, '蔬菜', 300, 'g'),
      food(S, '香蕉', 1, '根'),
      food(S, '酸奶', 150, 'g'),
      food(D, '熟米饭', 100, 'g'),
      food(D, '豆腐', 150, 'g'),
      food(D, '虾', 120, 'g'),
      food(D, '青菜'),
    ],
    [
      food(B, '燕麦', 40, 'g'),
      food(B, '无糖酸奶', 200, 'g'),
      food(B, '鸡蛋', 2, '个'),
      food(B, '苹果'),
      food(L, '熟米饭', 120, 'g'),
      food(L, '鱼', 160, 'g'),
      food(L, '蔬菜', 300, 'g'),
      food(S, '牛奶 / 水果', null, null, '二选一：牛奶250ml或水果1份。'),
      food(D, '玉米', 1, '根'),
      food(D, '鸡胸肉', 150, 'g'),
      food(D, '蔬菜', null, null, '大量，原文未给克数。'),
    ],
    [
      food(B, '鸡蛋', 2, '个'),
      food(B, '牛奶', 250, 'ml'),
      food(B, '全麦面包', 2, '片'),
      food(B, '橙子'),
      food(L, '熟米饭', 150, 'g'),
      food(L, '瘦牛肉', 160, 'g'),
      food(L, '蔬菜', 300, 'g'),
      food(S, '香蕉'),
      food(S, '无糖酸奶'),
      food(D, '熟米饭', 100, 'g'),
      food(D, '三文鱼', 150, 'g'),
      food(D, '蔬菜', 300, 'g'),
    ],
    [
      food(B, '燕麦', 40, 'g'),
      food(B, '牛奶'),
      food(B, '鸡蛋', 2, '个'),
      food(B, '香蕉'),
      food(L, '熟米饭', 130, 'g'),
      food(L, '鸡胸肉', 160, 'g'),
      food(L, '蔬菜', 300, 'g'),
      food(S, '酸奶', 150, 'g'),
      food(S, '苹果'),
      food(D, '红薯', 150, 'g'),
      food(D, '虾', 180, 'g'),
      food(D, '蔬菜', 300, 'g'),
    ],
    [
      food(B, '鸡蛋', 2, '个'),
      food(B, '牛奶', 250, 'ml'),
      food(B, '全麦面包', null, null, '1～2片，按需修改为确定份量。'),
      food(B, '水果'),
      food(L, '熟米饭', 120, 'g'),
      food(L, '牛肉 / 鱼', 150, 'g', '二选一。'),
      food(L, '蔬菜', 300, 'g'),
      food(S, '无糖酸奶 / 水果', null, null, '二选一。'),
      food(D, '玉米 / 红薯', 150, 'g', '二选一。'),
      food(D, '豆腐', 150, 'g'),
      food(D, '鸡蛋', 1, '个'),
      food(D, '蔬菜'),
    ],
  ];
  return [
    '全身适应 + 爬坡',
    '纯爬坡有氧',
    '全身力量 + 短爬坡',
    '恢复活动',
    '全身力量',
    '长爬坡',
    '休息 / 轻活动',
  ].map((title, i) => ({
    title,
    training: training[i],
    meals: {
      foods: foods[i],
      note: mealNote(
        [
          '1650～1750',
          '1600～1700',
          '1650～1750',
          '1550～1650',
          '1650～1750',
          '1600～1700',
          '1550～1650',
        ][i],
      ),
    },
  }));
}
