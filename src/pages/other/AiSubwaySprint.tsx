import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Keyboard,
  ListChecks,
  RotateCcw,
  Sparkles,
  TrainFront,
  X,
  Zap,
} from 'lucide-react';

interface WeakCard {
  id: string;
  tag: string;
  title: string;
  prompt: string;
  /** 用户在模考中真实踩过的错法提示 */
  pastMistake: string;
  answer: string;
  alts?: string[];
  /** 3 个高仿手滑干扰项 */
  distractors: string[];
  why: string;
}

const WEAK_CARDS: WeakCard[] = [
  {
    id: 'w1',
    tag: '高频手滑 · 错4次',
    title: '显示数据前 5 行',
    prompt: '打印 DataFrame（变量名 data）的前 5 行记录',
    pastMistake: '曾连续 3 题写成 print(data.head) 漏了括号',
    answer: 'print(data.head())',
    alts: ['data.head()'],
    distractors: ['print(data.head)', 'print(head(data))', 'print(data.head[5])'],
    why: 'head 是方法不是属性，后面必须带圆括号 ()！同理 data.info() 也必须带 ()。',
  },
  {
    id: 'w2',
    tag: '高频手滑 · 错2次',
    title: '读取 CSV 文件',
    prompt: '用 pandas（已 import pandas as pd）读取 patient_data.csv',
    pastMistake: '曾写成 data = data.read_csv(...) 导致 NameError',
    answer: "data = pd.read_csv('patient_data.csv')",
    distractors: [
      "data = data.read_csv('patient_data.csv')",
      "data = pd.read_excel('patient_data.csv')",
      "data = read_csv('patient_data.csv')",
    ],
    why: '读表永远是 pd.read_csv(...)，此时 data 还没创建，绝不能写 data.read_csv！中文乱码再加 encoding="gbk"。',
  },
  {
    id: 'w3',
    tag: '高频手滑 · 刚错',
    title: '读取 Excel 文件',
    prompt: '读取 大学生低碳生活行为的影响因素数据集.xlsx（2.1.2 / 2.2.4）',
    pastMistake: '2.2.4 写成了 pd.read_xlsx(...)',
    answer: "data = pd.read_excel('大学生低碳生活行为的影响因素数据集.xlsx')",
    distractors: [
      "data = pd.read_xlsx('大学生低碳生活行为的影响因素数据集.xlsx')",
      "data = pd.read_csv('大学生低碳生活行为的影响因素数据集.xlsx')",
      "data = data.read_excel('大学生低碳生活行为的影响因素数据集.xlsx')",
    ],
    why: 'pandas 里读 .xlsx/.xls 统一叫 pd.read_excel，没有 read_xlsx！',
  },
  {
    id: 'w4',
    tag: '高频手滑 · 错3次',
    title: '删除含缺失值的行',
    prompt: '删除 data 中所有包含缺失值的行，并重新赋给 data',
    pastMistake: '曾写成 data.dropno 或 data.dropna().isnull()',
    answer: 'data = data.dropna()',
    distractors: ['data = data.dropna().isnull()', 'data = data.dropno()', 'data = data.isnull().dropna()'],
    why: '只写 data.dropna() 就够了！后面再接 .isnull() 会把整张表变成 True/False 布尔表，后面全崩！',
  },
  {
    id: 'w5',
    tag: '高频手滑 · 错3次',
    title: '删除重复行',
    prompt: '删除 data_cleaned 中的重复行并保存回去',
    pastMistake: '曾写成 data_cleaned.duplicates() 或 duplicaties()',
    answer: 'data_cleaned = data_cleaned.drop_duplicates()',
    distractors: [
      'data_cleaned = data_cleaned.duplicates()',
      'data_cleaned = data_cleaned.duplicated()',
      'data_cleaned = data_cleaned.drop_duplicate()',
    ],
    why: '统计重复数用 duplicated().sum()；真正删除重复行是 drop_duplicates()（有 drop_ 且末尾有 s）！考场用 Tab 补全。',
  },
  {
    id: 'w6',
    tag: '高频手滑 · 错2次',
    title: '强制转换为数值列',
    prompt: "将 horsepower 列转为数值类型，无法转换的变成 NaN（2.1.1 / 2.2.2）",
    pastMistake: "曾写成 astype[int](data['horsepower'], errors='coerce') 或 pd.tonumeric",
    answer: "pd.to_numeric(data['horsepower'], errors='coerce')",
    distractors: [
      "pd.tonumeric(data['horsepower'], errors='coerce')",
      "astype[int](data['horsepower'], errors='coerce')",
      "data['horsepower'].astype(int, errors='coerce')",
    ],
    why: '带 errors="coerce" 的一定是 pd.to_numeric(列, errors="coerce")，注意下划线 _！',
  },
  {
    id: 'w7',
    tag: '高频手滑 · 错2次',
    title: '列数据类型转整数',
    prompt: "将 data['Age'] 列转换为 int 类型（1.1.4 / 1.1.5 / 2.1.5）",
    pastMistake: '曾把圆括号写成方括号 astype[int]',
    answer: "data['Age'] = data['Age'].astype(int)",
    distractors: [
      "data['Age'] = data['Age'].astype[int]",
      "data['Age'] = astype(data['Age'], int)",
      "data['Age'] = pd.astype(int)",
    ],
    why: 'astype 是函数调用，永远用圆括号 astype(int) / astype(float)，不是方括号 []！',
  },
  {
    id: 'w8',
    tag: '2.1.1 刚错',
    title: '特征列表与保存 CSV',
    prompt: '选中多列特征并保存清洗后数据（不带行索引）',
    pastMistake: '曾把列表写成花括号 {...}，且漏了 index=False',
    answer: "cleaned_data.to_csv('2.1.1_cleaned_data.csv', index=False)",
    distractors: [
      "cleaned_data('2.1.1_cleaned_data.csv', index=False)",
      "cleaned_data.to_csv('2.1.1_cleaned_data.csv')",
      "pd.to_csv('2.1.1_cleaned_data.csv', index=False)",
    ],
    why: '多列特征用方括号 [...]（不是集合 {}）；保存 CSV 固定写 表名.to_csv("文件名.csv", index=False)！',
  },
  {
    id: 'w9',
    tag: '1.1.1 刚错 · 3分',
    title: '条件二选一打标签（np.where）',
    prompt: '住院天数 > 7 标为“高风险患者”，否则标为“低风险患者”',
    pastMistake: '1.1.1 写成了 data.groupby(...) 导致报错',
    answer: "np.where(data['DaysInHospital'] > 7, '高风险患者', '低风险患者')",
    distractors: [
      "data.groupby(data['DaysInHospital'], '高风险患者', '低风险患者')",
      "pd.cut(data['DaysInHospital'] > 7, '高风险患者', '低风险患者')",
      "np.where(data['DaysInHospital'], '高风险患者', '低风险患者')",
    ],
    why: '“满足条件给 A，否则给 B” 永远用 np.where(条件, 真值, 假值)！注意条件要写全 > 7！',
  },
  {
    id: 'w10',
    tag: '1.1.1 刚错 · 8分大头',
    title: '数值按区间分箱（pd.cut）',
    prompt: '根据 bmi_bins 和 bmi_labels 把 BMI 划分为区间列（左闭右开）',
    pastMistake: '1.1.1 两处分箱都写成了 data.groupby(...)，一下丢了 8 分！',
    answer: "pd.cut(data['BMI'], bins=bmi_bins, labels=bmi_labels, right=False)",
    alts: ["pd.cut(data['BMI'], bmi_bins, labels=bmi_labels, right=False)"],
    distractors: [
      "data.groupby(data['BMI'], bins=bmi_bins, labels=bmi_labels, right=False)",
      "np.where(data['BMI'], bins=bmi_bins, labels=bmi_labels, right=False)",
      "data['BMI'].cut(bins=bmi_bins, labels=bmi_labels, right=False)",
    ],
    why: '看到 bins= 和 labels= 两个参数，100% 是 pd.cut(列, bins=..., labels=..., right=False)！1.1.1 光这一招就值 8 分！',
  },
  {
    id: 'w11',
    tag: '1.1.1 刚错 · 2分',
    title: '算占比的分母（总行数）',
    prompt: "已知 risk_counts = data['RiskLevel'].value_counts()，算高风险患者占比",
    pastMistake: "1.1.1 写成了 risk_counts['高风险患者'] / risk_counts",
    answer: "risk_counts['高风险患者'] / len(data)",
    alts: ["risk_counts['高风险患者'] / data.shape[0]"],
    distractors: [
      "risk_counts['高风险患者'] / risk_counts",
      "risk_counts['高风险患者'] / data",
      "risk_counts['高风险患者'] / data.count()",
    ],
    why: '总人数就是表的总行数：len(data)（或 data.shape[0]）！不能除以 Series 对象 risk_counts。',
  },
  {
    id: 'w12',
    tag: '2.1 / 2.2 必考',
    title: '划分训练集和测试集（8:2）',
    prompt: '把 X, y 按测试集 20% 划分（已导入 train_test_split）',
    pastMistake: '曾写成 train-test-split 或 spinsh-test-slit',
    answer: 'train_test_split(X, y, test_size=0.2, random_state=42)',
    alts: ['train_test_split(X, y, train_size=0.8, random_state=42)'],
    distractors: [
      'train-test-split(X, y, test_size=0.2, random_state=42)',
      'train_test_split(X, y, test-size=0.2, random_state=42)',
      'split_train_test(X, y, test_size=0.2, random_state=42)',
    ],
    why: 'Python 函数名和参数名全部用下划线 _，绝不用减号 -！考场直接从代码第 2 行复制。',
  },
  {
    id: 'w13',
    tag: '2.2 核心 · 必考',
    title: '删除指定列（drop）',
    prompt: "从 data 删除 ['序号', '所用时间'] 两列（2.2.4）",
    pastMistake: "2.2.4 写成了 data.dropna()(data[columns]=['序号', '所用时间'])",
    answer: "data.drop(columns=['序号', '所用时间'])",
    distractors: [
      "data.dropna(columns=['序号', '所用时间'])",
      "data.drop(['序号', '所用时间'])",
      "data.delete(columns=['序号', '所用时间'])",
    ],
    why: '删缺失行用 dropna()；删指定列用 drop(columns=[...])，两者别混！',
  },
  {
    id: 'w14',
    tag: '2.2 核心 · 必考',
    title: '训练与预测（fit / predict）',
    prompt: '用训练集训练 model，再用测试集预测得到 y_pred',
    pastMistake: '紧张时容易忘记传什么参数',
    answer: 'model.fit(X_train, y_train) 和 y_pred = model.predict(X_test)',
    distractors: [
      'model.fit(X_test, y_test) 和 y_pred = model.predict(X_train)',
      'model.fit(X_train, y_train) 和 y_pred = model.predict(X_test, y_test)',
      'model.train(X_train, y_train) 和 y_pred = model.test(X_test)',
    ],
    why: 'fit 永远喂 (X_train, y_train)；predict 永远只传 X_test（绝不传 y_test）！',
  },
  {
    id: 'w15',
    tag: '2.2 核心 · 必考',
    title: '保存模型（pickle vs joblib）',
    prompt: '2.2.1/2.2.2/2.2.3/2.2.5 用 pickle，2.2.4 用 joblib，正确写法分别是？',
    pastMistake: '2.2.4 留空没填',
    answer: 'pickle.dump(model, file) / joblib.dump(model, model_filename)',
    distractors: [
      'pickle.save(model, file) / joblib.save(model, model_filename)',
      'pickle.dump(file, model) / joblib.dump(model_filename, model)',
      'pickle.load(model, file) / joblib.load(model, model_filename)',
    ],
    why: '两个都叫 dump，而且永远是「先写模型，再写文件/文件名」：dump(模型, 文件)！',
  },
  {
    id: 'w16',
    tag: '2.2 核心 · 必考',
    title: '回归模型 2 个核心评估指标',
    prompt: '2.2.3 / 2.2.4 / 2.2.5 计算均方误差（MSE）和决定系数（R²）',
    pastMistake: '2.2.4 留空没填',
    answer: 'mean_squared_error(y_test, y_pred) 和 r2_score(y_test, y_pred)',
    distractors: [
      'mean_squared_error(X_test, y_pred) 和 r2_score(X_test, y_pred)',
      'mse(y_test, y_pred) 和 r2(y_test, y_pred)',
      'model.mse(y_test, y_pred) 和 model.r2(y_test, y_pred)',
    ],
    why: '函数名顶部 import 都有，直接复制！参数永远是 (真实值 y_test, 预测值 y_pred)。',
  },
  {
    id: 'w17',
    tag: '3.2.1 曾丢9分',
    title: '3.2.1 取 Top-5 索引和概率',
    prompt: '已通过 softmax 得到 probabilities，求前 5 个最高概率的索引和概率值',
    pastMistake: '曾写成 pd.argsort(probabilities()) 报 NameError 丢了 9 分',
    answer: 'top5_idx = np.argsort(probabilities[0])[-5:][::-1] 和 top5_prob = probabilities[0][top5_idx]',
    distractors: [
      'top5_idx = pd.argsort(probabilities())[-5:][::-1] 和 top5_prob = pd.argmax(probabilities[0, top5_idx])',
      'top5_idx = np.argmax(probabilities[0])[-5:][::-1] 和 top5_prob = probabilities[top5_idx]',
      'top5_idx = np.sort(probabilities[0])[-5:][::-1] 和 top5_prob = probabilities[0][top5_idx]',
    ],
    why: '3.2.1 没导入 pd！全程用 np：argsort 排序拿下标，probabilities[0][top5_idx] 按下标取概率！',
  },
  {
    id: 'w18',
    tag: '3.2.2 刚丢6分',
    title: '3.2.2 转 numpy 数组 + 两次升维',
    prompt: 'MNIST 灰度图 resize((28,28)) 之后，转 float32 数组并加 batch 和通道两个维度',
    pastMistake: '3.2.2 这 3 行写成了 image(..., dtype=np.float32) 和留空',
    answer: 'np.array(image, dtype=np.float32) + 两行 np.expand_dims(image_array, axis=0)',
    distractors: [
      'image(image_array, dtype=np.float32) + 两行 np.reshape(image_array, axis=0)',
      'np.array(image, dtype=np.float32) + 一行 np.expand_dims(image_array, axis=1)',
      'pd.array(image, dtype=np.float32) + 两行 np.expand_dims(image, axis=0)',
    ],
    why: '记死这 3 行：np.array(image, dtype=np.float32)，再连写两行一模一样的 np.expand_dims(image_array, axis=0)！',
  },
  {
    id: 'w19',
    tag: '3.2.3 刚丢7分',
    title: '3.2.3 加载预处理 + 解码表情名',
    prompt: '3.2.3 上面已定义 def preprocess(image_path):，下面两空怎么填？',
    pastMistake: '曾写成 Image.open("img_test.png").convert("RGB") 和 np.argmax[predicted_label]',
    answer: "input_data = preprocess('img_test.png') 和 predicted_emotion = list(emotion_table.keys())[predicted_label]",
    distractors: [
      "input_data = Image.open('img_test.png').convert('RGB') 和 predicted_emotion = np.argmax[predicted_label]",
      "input_data = preprocess_image('img_test.png') 和 predicted_emotion = emotion_table[predicted_label]",
      "input_data = Image.open('img_test.png').convert('L') 和 predicted_emotion = emotion_table.keys()[predicted_label]",
    ],
    why: '先抬头看上面有没有定义预处理函数！有就直接调 preprocess("img_test.png")；字典按键顺序取名用 list(emotion_table.keys())[predicted_label]；且第 11 行 Image.ANTIALIAS 记得改 Image.BILINEAR！',
  },
  {
    id: 'w20',
    tag: '2.1.3 曾忘 · 2分',
    title: 'IQR 四分位异常值 3 行',
    prompt: '用四分位距 IQR 检测 numeric_cols 异常值（2.1.3 专属）',
    pastMistake: '2.1.3 留空且下面把 IQR 写成了 0.25 / 0.75',
    answer: 'Q1 = data[numeric_cols].quantile(0.25)，Q3 = data[numeric_cols].quantile(0.75)，IQR = Q3 - Q1',
    distractors: [
      'Q1 = data.quantile(0.25)，Q3 = data.quantile(0.75)，IQR = Q1 - Q3',
      'Q1 = data[numeric_cols].mean(0.25)，Q3 = data[numeric_cols].mean(0.75)，IQR = Q3 - Q1',
      'Q1 = np.quantile(0.25)，Q3 = np.quantile(0.75)，IQR = Q3 + Q1',
    ],
    why: '下四分位 quantile(0.25)，上四分位 quantile(0.75)，IQR = Q3 - Q1，下面那行乘 1.5 的两个空都填 IQR！',
  },
];

interface DocxTemplate {
  id: string;
  code: string;
  badge: string;
  title: string;
  note: string;
  blocks: {
    heading: string;
    /** 用 [[关键词]] 标出背诵模式可遮盖的得分关键词 */
    lines: string[];
  }[];
}

const DOCX_TEMPLATES: DocxTemplate[] = [
  {
    id: 'd21',
    code: '2.1.x.docx',
    badge: '白拿 5 分 · 0 依赖代码',
    title: '数据清洗规范 + 数据标注 / 特征工程规范',
    note: '哪怕 2.1 代码一行没跑通，把下面两段默写进 docx 直接稳拿 5/5 分！',
    blocks: [
      {
        heading: '数据清洗规范（写 3 条，拿满 2 分）',
        lines: [
          '1. 使用 [[pandas]] 加载数据，检查 [[字段类型]]、[[表结构]] 及 [[缺失值/重复值]] 分布；',
          '2. 删除含 [[缺失值]] 的行及 [[重复记录]]，记录清洗前后样本量变化；',
          '3. 转换 [[异常数据类型]]，过滤超出业务合理范围的 [[异常值]]，并对数值特征进行 [[标准化/归一化]]。',
        ],
      },
      {
        heading: '数据标注 / 特征工程规范（写 4 条，拿满 3 分）',
        lines: [
          '1. 明确 [[数据来源]]、各字段 [[业务含义]]、单位及 [[合法取值范围]]；',
          '2. 筛选有效 [[自变量特征 X]]，明确预测 [[目标变量 y]]；',
          '3. 按 [[8:2]] 划分训练集与测试集，固定 [[random_state=42]] 保证可复现；',
          '4. 导出 [[无索引 CSV]] 文件并核验 [[完整性]]。',
        ],
      },
    ],
  },
  {
    id: 'd22',
    code: '2.2.x.docx',
    badge: '白拿 2–3 分 · 后两项 0 依赖代码',
    title: '模型测试报告（性能评估 + 错误分析 + 改进建议）',
    note: '代码没跑通时第 1 格先空着，后两格照写稳拿 2 分；跑通了直接从 2.2.x_report.txt 抄数字拿满 3 分！',
    blocks: [
      {
        heading: '1. 模型性能（1 分）',
        lines: ['代码跑通了就打开生成的 [[2.2.x_report.txt]] 原样抄数字（准确率 / 精确率 / 召回率 / F1 / MSE / R²）；没跑通就空着这一格，下面两格照填！'],
      },
      {
        heading: '2. 错误分析（1 分，必写！）',
        lines: [
          '模型在部分样本上 [[拟合不足]] / 少数类 [[召回率偏低]]，主要受 [[特征维度有限]]、[[样本不平衡]] 及 [[异常噪声干扰]] 影响导致预测误差。',
        ],
      },
      {
        heading: '3. 改进建议（1 分，必写！）',
        lines: [
          '数据层面采用 [[SMOTE 过采样]] 与 [[特征工程优化]]；模型层面改用 [[随机森林]] 或 [[XGBoost]] 等集成算法，并结合 [[交叉验证]] 与 [[网格搜索]] 调优超参数。',
        ],
      },
    ],
  },
  {
    id: 'd32',
    code: '3.2.x.docx',
    badge: '白拿 1 分 · 0 依赖代码',
    title: '人机交互最优方式（3 条）',
    note: '3.2.1–3.2.4 都有这份 docx，30 秒写满这 3 条直接拿满 1 分！',
    blocks: [
      {
        heading: '人机交互的最优方式（写 3 条）',
        lines: [
          '1. 提供简洁直观的 [[图片上传/拍照]] 交互界面；',
          '2. 识别过程实时给出 [[进度反馈]]，并清晰可视化展示 [[类别与置信度]]；',
          '3. 提供识别错误的 [[人工反馈纠错入口]] 与 [[文字/语音引导提示]]。',
        ],
      },
    ],
  },
  {
    id: 'd12',
    code: '1.2.x.docx',
    badge: '抽考 25 分 · 别漏量化效果 4 分！',
    title: '业务模块效果优化（你已拿过 23/25，补上最后段拿满分！）',
    note: '前两次都只差最后一段「期望的优化效果」没写具体数字（扣了 2 分），明天务必单列一段写量化数字！',
    blocks: [
      {
        heading: '1.2.x-1 问题分析（12 分：3 问题 + 原因与体验影响）',
        lines: [
          '1. [[识别/分析准确性不高]]：导致误判/认知偏差，削弱用户 [[信任度]]、降低使用意愿；',
          '2. [[系统响应/预警速度慢]]：错过最佳时机，等待时间长引发 [[不满焦虑]]、用户流失；',
          '3. [[缺乏个性化服务 / 界面复杂]]：交互千人一面、使用门槛高，降低 [[平台粘性]]。',
        ],
      },
      {
        heading: '1.2.x-2 优化步骤 + 期望量化效果（13 分）',
        lines: [
          '步骤一（提准）：扩充高质量 [[标注语料/数据集]] + 升级 [[先进模型/预训练 NLP]] 与定期调优；',
          '步骤二（提速）：升级 [[GPU 算力]] + 后端 [[多线程并发 / 异步队列 / 缓存]] 降低延迟；',
          '步骤三（体验）：构建 [[用户画像]] 定制服务 + 简化界面、开放 [[API]] 与反馈通道；',
          '★ 期望的优化效果（必写 4 分！）：准确率提升 [[20%–30%]]（或达 [[99%+]]）；响应速度缩短至 [[秒级]]；用户满意度与留存率提升 [[5%–10%]]！',
        ],
      },
    ],
  },
  {
    id: 'd31',
    code: '3.1.x.docx',
    badge: '必考 15 分 · 你已连续满分！',
    title: '3.1 优化建议 6 分公式 + 4 个时段边界提醒',
    note: '你已经连续在 3.1.5 和 3.1.1 和 3.1.2 拿到 15/15 满分，只防一手时段开闭区间和影响因素！',
    blocks: [
      {
        heading: '4 个时段边界速查',
        lines: [
          '3.1.2 照明（[[左闭右开]]）：06:00-12:00 / 12:00-18:00 / 18:00-24:00；瓶颈写 [[系统处理能力、网络延迟]]',
          '3.1.3 手环（[[左闭右闭]] + [[步数为 0 不计入]]）：06:00-08:00 / 17:00-20:00 / 其余时段；因素写 [[蓝牙稳定性、复杂数据处理能力]]',
          '3.1.4 监测：血压 [[6:00-8:00]] 高风险；血糖 [[8-9 / 13-14 / 19-20]] 餐后高；安全时段 [[22:00-06:00]]',
          '3.1.5 家居（[[左闭右闭]]）：06:00-12:00 / 13:00-18:00 / 19:00-05:00；影响因素写 [[网络延迟、系统处理能力]]',
        ],
      },
      {
        heading: '优化方向及解决方案（6 分万能 3 组）',
        lines: [
          '1. [[优化响应速度]] → 升级后端并发架构、优化网络/蓝牙传输、高频功能加 [[缓存]]；',
          '2. [[提升冷门功能使用率]] → 优化入口布局与新手引导，在高频时段 [[主动推送提醒]]；',
          '3. [[个性化与智能节能]] → 建立 [[用户画像]] 自动切换场景，非高频时段 [[动态降能耗]]。',
        ],
      },
    ],
  },
  {
    id: 'd4x',
    code: '4.1 / 4.2.docx',
    badge: '抽考 5 分 · 你已满分',
    title: '培训大纲 & 采集标注指导方案',
    note: '务必填完 Ctrl+S 保存后，关掉重新打开确认里面有字！绝不再传空白原件！',
    blocks: [
      {
        heading: '拿满 5 分铁律',
        lines: [
          '抽到 4.1（学习目标）：直接把下面「内容」第一句改写成 [[理解 / 掌握 / 能够运用 + 章节核心工具与任务]]；',
          '抽到 4.2（横线填空）：按上下文补 [[数据源细节 / 缺失重复异常清洗 / 格式统一脱敏 / 标注质检 / 建模赋能提效]]，填满 5 处即满分。',
        ],
      },
    ],
  },
];

const EXAM_CHECKLIST = [
  '桌面新建考生文件夹，命名严格为「准考证号+身份证号后六位」',
  '前 15 分钟先把卷子上所有 .docx（1.2 / 4.x / 2.1 / 2.2 / 3.2）按套话全填满并 Ctrl+S 保存',
  '每份 .docx 保存后重新双击打开扫一眼，确保绝不是空白模板',
  '写代码前先看顶部 import 直接复制函数名，敲方法名用 Tab 自动补全，head() / info() 必加括号 ()',
  '遇到 3.2.3 第 11 行 Image.ANTIALIAS 报错改 Image.BILINEAR；遇到 2.2.3 最后一行多余右括号 ) 直接删掉',
  '每道代码题改完按 Ctrl+S，再 File → Download as → HTML(.html)，连同 .jpg 截图（题号-序号.jpg）和生成的 .csv/.pkl/.txt 全部放进考生文件夹',
];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normPy(s: string): string {
  return s
    .trim()
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*([=,()[\]{}:+\-*/<>!&|.])\s*/g, '$1')
    .trim();
}

function ClozeLine({ text, mask, revealAll }: { text: string; mask: boolean; revealAll: boolean }) {
  const [opened, setOpened] = useState<Record<number, boolean>>({});
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <p className="text-ink text-[13px] leading-relaxed">
      {parts.map((p, idx) => {
        const m = p.match(/^\[\[(.*)\]\]$/);
        if (!m) return <span key={idx}>{p}</span>;
        const word = m[1];
        if (!mask || revealAll || opened[idx]) {
          return (
            <span
              key={idx}
              onClick={() => mask && setOpened((o) => ({ ...o, [idx]: false }))}
              className="bg-brand-soft text-brand-ink mx-0.5 inline-block rounded px-1.5 py-0.5 font-medium"
            >
              {word}
            </span>
          );
        }
        return (
          <button
            key={idx}
            type="button"
            onClick={() => setOpened((o) => ({ ...o, [idx]: true }))}
            className="border-brand/50 bg-surface-2 text-brand-ink mx-0.5 inline-block rounded border border-dashed px-2 py-0.5 text-[12px]"
          >
            点看关键词
          </button>
        );
      })}
    </p>
  );
}

export function AiSubwaySprint({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<'weak' | 'docx' | 'check'>('weak');

  /* ---- Tab 1: 高频弱点快刷 ---- */
  const [queue, setQueue] = useState<string[]>(() => WEAK_CARDS.map((c) => c.id));
  const [mastered, setMastered] = useState<Record<string, boolean>>({});
  const [inputMode, setInputMode] = useState<'pick' | 'type'>('pick');
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [typeSubmitted, setTypeSubmitted] = useState(false);

  /* ---- Tab 2: 必交 docx 模板背诵 ---- */
  const [maskMode, setMaskMode] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openDraft, setOpenDraft] = useState<Record<string, boolean>>({});

  /* ---- Tab 3: 考场清单 ---- */
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const curId = queue[0];
  const card = useMemo(() => WEAK_CARDS.find((c) => c.id === curId) ?? null, [curId]);

  const options = useMemo(() => {
    if (!card) return [];
    return shuffle([card.answer, ...card.distractors]);
  }, [card]);

  const masteredCount = Object.values(mastered).filter(Boolean).length;

  const isCorrectNow = useMemo(() => {
    if (!card) return false;
    if (inputMode === 'pick') return picked === card.answer;
    if (!typeSubmitted) return false;
    const n = normPy(typed);
    return [card.answer, ...(card.alts ?? [])].some((t) => normPy(t) === n);
  }, [card, inputMode, picked, typed, typeSubmitted]);

  const answeredNow = inputMode === 'pick' ? picked !== null : typeSubmitted;

  const handlePick = (opt: string) => {
    if (picked !== null || !card) return;
    setPicked(opt);
    if (opt === card.answer) {
      setMastered((prev) => ({ ...prev, [card.id]: true }));
    }
  };

  const handleTypeSubmit = () => {
    if (!card || !typed.trim()) return;
    setTypeSubmitted(true);
    const n = normPy(typed);
    const ok = [card.answer, ...(card.alts ?? [])].some((t) => normPy(t) === n);
    if (ok) {
      setMastered((prev) => ({ ...prev, [card.id]: true }));
    }
  };

  const nextCard = () => {
    if (!card) return;
    setQueue((prev) => {
      const rest = prev.slice(1);
      if (isCorrectNow) return rest;
      // 选错的题插到 2 题后再考一遍，直到真正记住！
      const pos = Math.min(2, rest.length);
      return [...rest.slice(0, pos), card.id, ...rest.slice(pos)];
    });
    setPicked(null);
    setTyped('');
    setTypeSubmitted(false);
  };

  const restartWeak = () => {
    setQueue(shuffle(WEAK_CARDS.map((c) => c.id)));
    setMastered({});
    setPicked(null);
    setTyped('');
    setTypeSubmitted(false);
  };

  return (
    <div className="space-y-3">
      {/* 顶部栏 */}
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-brand-soft text-brand-ink grid size-8 place-items-center rounded-[10px]">
              <TrainFront size={17} />
            </span>
            <div>
              <h2 className="text-ink text-[15px] font-semibold">地铁考前冲刺 · 本次专享</h2>
              <p className="text-secondary text-[12px]">按你 3 场模考真实错因定制：手机单手速刷弱点 + 必交 docx 背诵</p>
            </div>
          </div>
          <button type="button" onClick={onExit} className="pill px-3 py-1.5 text-[12px]">
            返回实操首页
          </button>
        </div>

        {/* 3 个手机大标签 */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('weak')}
            className={`pill justify-center px-2 py-2 text-[12px] font-medium ${tab === 'weak' ? 'pill--solid' : ''}`}
          >
            <Zap size={13} className="mr-1 inline" />
            弱点快刷 ({masteredCount}/{WEAK_CARDS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('docx')}
            className={`pill justify-center px-2 py-2 text-[12px] font-medium ${tab === 'docx' ? 'pill--solid' : ''}`}
          >
            <FileText size={13} className="mr-1 inline" />
            必交 docx (6套)
          </button>
          <button
            type="button"
            onClick={() => setTab('check')}
            className={`pill justify-center px-2 py-2 text-[12px] font-medium ${tab === 'check' ? 'pill--solid' : ''}`}
          >
            <ListChecks size={13} className="mr-1 inline" />
            考场清单
          </button>
        </div>
      </section>

      {/* ================= TAB 1: 高频弱点快刷 ================= */}
      {tab === 'weak' ? (
        <section className="glass space-y-3 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-ink font-semibold tabular-nums">
                已攻克 {masteredCount} / {WEAK_CARDS.length} 个弱点
              </span>
              <span className="text-muted tabular-nums">队列剩余 {queue.length} 题</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setInputMode((m) => (m === 'pick' ? 'type' : 'pick'));
                  setPicked(null);
                  setTyped('');
                  setTypeSubmitted(false);
                }}
                className="pill px-2.5 py-1 text-[12px]"
              >
                <Keyboard size={12} className="mr-1 inline" />
                {inputMode === 'pick' ? '切到手动盲敲' : '切回单手点选'}
              </button>
              <button type="button" onClick={restartWeak} className="pill px-2.5 py-1 text-[12px]">
                <RotateCcw size={12} className="mr-1 inline" />
                洗牌重刷
              </button>
            </div>
          </div>

          {/* 进度条 */}
          <div className="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-brand h-full rounded-full transition-all"
              style={{ width: `${Math.round((masteredCount / WEAK_CARDS.length) * 100)}%` }}
            />
          </div>

          {!card ? (
            <div className="py-6 text-center">
              <Sparkles className="text-accent-green mx-auto size-8" />
              <p className="text-ink mt-2 text-[16px] font-semibold">20 个真实高频弱点全部通关！</p>
              <p className="text-secondary mt-1 text-[13px]">
                现在去「必交 docx」把 3 份白捡模板背一遍，8:00 实操稳稳过线！
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setTab('docx')} className="pill pill--solid px-4 py-2 text-[13px]">
                  去背必交 docx 模板
                </button>
                <button type="button" onClick={restartWeak} className="pill px-4 py-2 text-[13px]">
                  再洗牌刷一遍巩固
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-danger-soft text-danger rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                  {card.tag}
                </span>
                <span className="text-ink text-[15px] font-semibold">{card.title}</span>
              </div>

              <p className="text-ink text-[14px] leading-relaxed">{card.prompt}</p>
              <p className="bg-danger-soft/60 text-danger rounded-[10px] px-3 py-1.5 text-[12px]">
                避坑警醒：{card.pastMistake}
              </p>

              {inputMode === 'pick' ? (
                <div className="flex flex-col gap-2">
                  {options.map((opt, idx) => {
                    const isMine = picked === opt;
                    const isAns = opt === card.answer;
                    const showGood = answeredNow && isAns;
                    const showBad = answeredNow && isMine && !isAns;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePick(opt)}
                        className={`flex items-start gap-2.5 rounded-[12px] border px-3.5 py-3 text-left font-mono text-[12.5px] leading-relaxed transition ${
                          showGood
                            ? 'border-accent-green bg-accent-green/12 text-accent-green font-semibold'
                            : showBad
                              ? 'border-danger bg-danger-soft text-danger'
                              : 'border-line bg-surface hover:border-brand/60 text-ink'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0 font-sans text-[12px] font-semibold">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span className="min-w-0 flex-1 break-all">{opt}</span>
                        {showGood ? <Check size={15} className="shrink-0" /> : null}
                        {showBad ? <X size={15} className="shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={typed}
                    disabled={typeSubmitted}
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                    placeholder="直接敲出正确代码..."
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !typeSubmitted) handleTypeSubmit();
                    }}
                    className="border-line bg-surface text-ink focus:border-brand w-full rounded-[12px] border px-3.5 py-2.5 font-mono text-[13px] outline-none"
                  />
                  {!typeSubmitted ? (
                    <button
                      type="button"
                      onClick={handleTypeSubmit}
                      className="pill pill--solid w-full justify-center py-2 text-[13px]"
                    >
                      校验写法
                    </button>
                  ) : null}
                </div>
              )}

              {answeredNow ? (
                <div
                  className={`rounded-[12px] border px-3.5 py-3 text-[13px] leading-relaxed ${
                    isCorrectNow
                      ? 'border-accent-green/40 bg-accent-green/10 text-ink'
                      : 'border-danger/40 bg-danger-soft text-ink'
                  }`}
                >
                  <p className={`font-semibold ${isCorrectNow ? 'text-accent-green' : 'text-danger'}`}>
                    {isCorrectNow ? '答对了！这个坑已排除' : '又踩坑了！2 题后自动再考你一遍'}
                  </p>
                  {!isCorrectNow ? (
                    <p className="mt-1 font-mono text-[12px] break-all">
                      标准：<b className="text-accent-green">{card.answer}</b>
                    </p>
                  ) : null}
                  <p className="text-secondary mt-1 text-[12.5px]">{card.why}</p>
                  <button
                    type="button"
                    onClick={nextCard}
                    className="pill pill--solid mt-3 w-full justify-center py-2 text-[13px]"
                  >
                    下一题
                    <ChevronRight size={15} className="ml-1 inline" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {/* ================= TAB 2: 必交 docx 模板背诵 ================= */}
      {tab === 'docx' ? (
        <div className="space-y-3">
          <section className="glass flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
            <p className="text-secondary text-[12.5px]">
              铁律：<b className="text-ink">不管代码跑没跑通，这 6 套 docx 先填满保存，稳拿 25–45 分！</b>
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMaskMode((m) => !m);
                  setRevealKey((k) => k + 1);
                }}
                className={`pill px-3 py-1.5 text-[12px] ${maskMode ? 'pill--solid' : ''}`}
              >
                {maskMode ? <Eye size={13} className="mr-1 inline" /> : <EyeOff size={13} className="mr-1 inline" />}
                {maskMode ? '切回全文浏览' : '开启挖空背诵'}
              </button>
            </div>
          </section>

          {DOCX_TEMPLATES.map((tpl) => (
            <section key={tpl.id} className="glass space-y-2.5 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 font-mono text-[12px] font-semibold">
                    {tpl.code}
                  </span>
                  <h3 className="text-ink text-[14px] font-semibold">{tpl.title}</h3>
                </div>
                <span className="bg-accent-green/15 text-accent-green rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                  {tpl.badge}
                </span>
              </div>
              <p className="text-muted text-[12px]">{tpl.note}</p>

              <div key={`${tpl.id}-${revealKey}`} className="space-y-2.5 pt-1">
                {tpl.blocks.map((b, bi) => (
                  <div key={bi} className="border-line bg-surface-2/40 space-y-1.5 rounded-[12px] border p-3">
                    <p className="text-brand-ink text-[12.5px] font-semibold">{b.heading}</p>
                    {b.lines.map((ln, li) => (
                      <ClozeLine key={li} text={ln} mask={maskMode} revealAll={false} />
                    ))}
                  </div>
                ))}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setOpenDraft((o) => ({ ...o, [tpl.id]: !o[tpl.id] }))}
                  className="text-brand-ink text-[12px] font-medium hover:underline"
                >
                  {openDraft[tpl.id] ? '收起默写练习框' : '打开手机默写练习框（试默一遍）'}
                </button>
                {openDraft[tpl.id] ? (
                  <textarea
                    rows={4}
                    value={drafts[tpl.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [tpl.id]: e.target.value }))}
                    placeholder={`在这里凭记忆默写 ${tpl.code} 的核心得分点...`}
                    className="border-line bg-surface text-ink mt-2 w-full rounded-[10px] border p-2.5 text-[13px] leading-relaxed outline-none"
                  />
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {/* ================= TAB 3: 考场 120 分钟清单 ================= */}
      {tab === 'check' ? (
        <div className="space-y-3">
          <section className="glass space-y-2.5 px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[15px] font-semibold">8:00 实操考场 120 分钟黄金顺序</h3>
            <ol className="text-secondary list-decimal space-y-2 pl-5 text-[13px] leading-relaxed">
              <li>
                <b className="text-ink">08:00 – 08:18（前 18 分钟，先锁 25–40 分保底）</b>：桌面建好考生文件夹，一口气把卷子上{' '}
                <b className="text-ink">所有 `.docx`</b>（`1.2` / `4.x` / `2.1.docx` / `2.2.docx` / `3.2.docx`）全按模板写满、Ctrl+S 保存并重开验字！
              </li>
              <li>
                <b className="text-ink">08:18 – 08:38（20 分钟，拿满 15 分）</b>：做 <b className="text-ink">3.1 Excel 统计 + 3 组优化建议</b>（你已连续 15/15 满分，稳稳拿下）。
              </li>
              <li>
                <b className="text-ink">08:38 – 08:58（20 分钟，冲 16–20 分）</b>：做 <b className="text-ink">3.2 ONNX</b>（先看上面有无 preprocess 函数；3.2.3 改 `Image.BILINEAR`；3.2.1 用 `np.argsort`；跑通截 `.jpg` + 导 HTML）。
              </li>
              <li>
                <b className="text-ink">08:58 – 09:48（50 分钟，稳拿 25–40 分）</b>：依次做 <b className="text-ink">2.1 → 2.2 →（若抽到）1.1</b>：顶部复制函数名 + `Tab` 补全，优先填齐 6 句基础代码，2.2 默念「建→训→存→测→算」，跑完记得把 2.2 指标数字补回 docx！
              </li>
              <li>
                <b className="text-ink">09:48 – 10:00（最后 12 分钟，绝不丢低级分）</b>：逐题核对考生文件夹里的 `.ipynb` / `.html` / `.jpg` / `.docx` / `.csv` / `.pkl` 是否齐全！
              </li>
            </ol>
          </section>

          <section className="glass space-y-2.5 px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[15px] font-semibold">交卷前防丢分核对表（点一项勾一项）</h3>
            <div className="space-y-2">
              {EXAM_CHECKLIST.map((txt, idx) => {
                const done = !!checkedItems[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCheckedItems((p) => ({ ...p, [idx]: !p[idx] }))}
                    className={`flex w-full items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-left text-[13px] leading-relaxed transition ${
                      done
                        ? 'border-accent-green/40 bg-accent-green/10 text-muted line-through'
                        : 'border-line bg-surface text-ink'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${
                        done ? 'border-accent-green bg-accent-green text-white' : 'border-line'
                      }`}
                    >
                      {done ? <Check size={11} /> : null}
                    </span>
                    <span>{txt}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass space-y-1.5 px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[14px] font-semibold">10:00 考完实操 → 11:00 理论开考（1 小时提醒）</h3>
            <p className="text-secondary text-[13px] leading-relaxed">
              吃点东西缓口气，10:15–10:45 用手机刷一遍理论页置顶的 <b className="text-ink">「考卷待清错题（33 题）」</b>。进考场牢记：
              <b className="text-brand-ink"> 判断题先找茬疑罪从 F · 单选遇到「不是/不包括」停 1 秒 · 多选 3 分钟快速过不恋战！</b>
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
