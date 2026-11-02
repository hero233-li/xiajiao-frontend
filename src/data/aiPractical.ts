/** 人工智能训练师（三级）操作技能模拟卷（整卷 6 题 / 120 分钟 / 100 分）。
 *  题面、评分细则（M 项）与参考答案均取自官方《第 6 部分 操作技能模拟试卷》。
 *  页面上只展示题面与配分；评分细则与参考答案用于判卷与交卷后的对照。
 */

export interface PracticalRubric {
  id: string;
  score: number;
  desc: string;
}

export interface PracticalItem {
  code: string;
  title: string;
  minutes: string;
  score: number;
  /** 试题单原文（含任务说明与操作步骤）。 */
  sheet: string;
  rubric: PracticalRubric[];
  /** 官方参考答案（代码 / 作答要点）。 */
  ref: string;
}

export const AI_PRACTICAL_TOTAL = 100;
export const AI_PRACTICAL_MINUTES = 120;

export const AI_PRACTICAL_ITEMS: PracticalItem[] = [
  {
    code: "1.1.1",
    title: "智能医疗系统中的业务数据处理流程设计",
    minutes: "30min",
    score: 25,
    sheet: "1.场地设备要求\n人工智能训练师主机：CPU（intel i5 及以上）、内存（不少于 16GB）、操作系统（windows10）、支持深度学习训练；\n2.工作任务\n某医疗机构计划引入智能医疗系统，以提升诊断效率和准确性。通过分析患者的历史数据，使用机器学习算法预测患者的健康风险，从而辅助医生进行诊断和治疗。为此，该机构需要设计一套全面的业务数据处理流程，确保数据处理的高效性和准确性，为人工智能模型提供可靠的输入数据。\n我们提供一个患者数据集（patient_data.csv），包含以下字段：\nPatientID: 患者ID\nAge: 年龄\nBMI: 体重指数\nBloodPressure: 血压\nCholesterol: 胆固醇水平\nDaysInHospital: 住院天数\n你作为人工智能训练师，根据提供的数据集和Python代码框架（1.1.1.ipynb），完成以下数据的统计和分析，为智能医疗系统提供可靠的数据支持。\n（1）通过补全并运行Python代码（1.1.1.ipynb）分别统计住院天数超过7天的患者数量以及其占比。这类患者被定义为高风险患者，反之为低风险患者。将上述统计结果截图以JPG的格式保存，命名为“1.1.1-1”。\n（2）通过补全并运行Python代码（1.1.1. ipynb）统计不同BMI区间中高风险患者的比例和统计不同BMI区间中的患者数。BMI区间分类设置为：偏瘦（低于18.5），正常（18.5～23.9），超重（24.0～27.9），肥胖（28.0及以上），将上述统计结果截图以JPG的格式保存，命名为“1.1.1-2”。\n（3）通过补全并运行Python代码（1.1.1. ipynb）统计不同年龄区间中高风险患者的比例和统计不同年龄区间中的患者数。年龄区间分类设置为：年龄区间分类设置为：≤25岁，26-35岁，36-45岁，46-55岁，56-65岁，＞65岁，将上述统计结果截图以JPG的格式保存，命名为“1.1.1-3”。\n所有结果文件储存在桌面新建的考生文件夹中，文件夹命名为“准考证号+身份证号后六位”。\n3.技能要求\n（1）能结合人工智能技术要求和业务特征，设计整套业务数据处理流程；\n4.质量指标\n（1）设计出的业务数据底层逻辑清晰，有效合理。",
    rubric: [
      { id: "M1", score: 1, desc: "1.1.1-1.JPG中数据正确得1分；" },
      { id: "M2", score: 1, desc: "1.1.1-2.JPG中数据正确得1分；" },
      { id: "M3", score: 1, desc: "1.1.1-3.JPG中数据正确得1分；" },
      { id: "M4", score: 1, desc: "读取数据集代码正确得1分；" },
      { id: "M5", score: 3, desc: "创建新列'RiskLevel'，根据住院天数判断风险等级代码正确得3分；" },
      { id: "M6", score: 2, desc: "统计不同风险等级的患者数量代码正确得2分；" },
      { id: "M7", score: 1, desc: "计算高风险患者占比代码正确得1分；" },
      { id: "M8", score: 1, desc: "计算低风险患者占比代码正确得1分；" },
      { id: "M9", score: 4, desc: "根据年龄值划分指定区间代码正确得4分；" },
      { id: "M10", score: 2, desc: "计算每个BMI区间中高风险患者的比例代码正确得2分；" },
      { id: "M11", score: 1, desc: "统计每个BMI区间的患者数量代码正确得1分；" },
      { id: "M12", score: 4, desc: "根据年龄值分配年龄区间标签代码正确得4分；" },
      { id: "M13", score: 2, desc: "算每个年龄区间中高风险患者的比例代码正确得2分；" },
      { id: "M14", score: 1, desc: "统计每个年龄区间的患者数量代码正确得1分；" },
    ],
    ref: "Python参考代码（1.1.1.ipynb）：\nimport pandas as pd\nimport numpy as np\n# 读取数据集 1分\ndata = pd.read_csv('patient_data.csv')\n# 1. 统计住院天数超过7天的患者数量及其占比\n# 创建新列'RiskLevel'，根据住院天数判断风险等级 3分\ndata['RiskLevel'] = np.where(data['DaysInHospital'] > 7, '高风险患者', '低风险患者')\n# 统计不同风险等级的患者数量 2分\nrisk_counts = data['RiskLevel'].value_counts()\n# 计算高风险患者占比 1分\nhigh_risk_ratio = risk_counts['高风险患者'] / len(data)\n# 计算低风险患者占比 1分\nlow_risk_ratio = risk_counts['低风险患者'] / len(data)\n# 输出结果\nprint(\"高风险患者数量:\", risk_counts['高风险患者'])\nprint(\"低风险患者数量:\", risk_counts['低风险患者'])\nprint(\"高风险患者占比:\", high_risk_ratio)\nprint(\"低风险患者占比:\", low_risk_ratio)\n# 2. 统计不同BMI区间中高风险患者的比例和统计不同BMI区间中的患者数\n# 定义BMI区间和标签\nbmi_bins = [0, 18.5, 24, 28, np.inf]\nbmi_labels = ['偏瘦', '正常', '超重', '肥胖']\n# 根据BMI值划分指定区间 4分\ndata['BMIRange'] = pd.cut(data['BMI'], bins=bmi_bins, labels=bmi_labels, right=False) # 使用左闭右开区间\n# 计算每个BMI区间中高风险患者的比例 2分\nbmi_risk_rate = data.groupby('BMIRange')['RiskLevel'].apply(lambda x: (x == '高风险患者').mean())\n# 统计每个BMI区间的患者数量 1分\nbmi_patient_count = data['BMIRange'].value_counts()\n# 输出结果\nprint(\"BMI区间中高风险患者的比例和患者数:\")\nprint(bmi_risk_rate)\nprint(bmi_patient_count)\n# 3. 统计不同年龄区间中高风险患者的比例和统计不同年龄区间中的患者数\n# 定义年龄区间和标签\nage_bins = [0, 26, 36, 46, 56, 66, np.inf]\nage_labels = ['≤25岁', '26-35岁', '36-45岁', '46-55岁', '56-65岁', '＞65岁']\n# 根据年龄值划分指定区间 4分\ndata['AgeRange'] = pd.cut(data['Age'], bins=age_bins, labels=age_labels, right=False) # 使用左闭右开区间\n# 计算每个年龄区间中高风险患者的比例 2分\nage_risk_rate = data.groupby('AgeRange')['RiskLevel'].apply(lambda x: (x == '高风险患者').mean())\n# 统计每个年龄区间的患者数量 1分\nage_patient_count = data['AgeRange'].value_counts()\n# 输出结果\nprint(\"年龄区间中高风险患者的比例和患者数:\")\nprint(age_risk_rate)\nprint(age_patient_count)\n1.1.1-1.jpg\n1.1.1-2.jpg\n1.1.1-3.jpg\n人工智能训练师（三级）操作技能考核",
  },
  {
    code: "2.1.1",
    title: "智慧交通中燃油效率模型的数据清洗和标注流程设计",
    minutes: "20min",
    score: 15,
    sheet: "1.场地设备要求\n(1)人工智能训练师主机 1 台；  (2)Python 编译环境；  (3)汽车燃油效率数据集（auto-mpg.csv）；\n2.工作任务\n在现代交通中，燃油效率（MPG）是衡量汽车性能和交通系统优化的重要指标之一。高效的燃油利用不仅能够降低车辆运营成本，还能减少碳排放，促进环保。开发一个用于预测汽车燃油效率的模型可以帮助智慧交通系统优化路线规划和车辆调度，从而提升整体交通效率和减少能源消耗。此外，这样的模型还可以帮助消费者做出更明智的购车决策，并帮助厂商优化汽车设计。 现要求根据提供的汽车燃油效率数据集，补全2.1.1.ipynb代码。选择合适的特征，开发一个燃油效率预测模型。在开发预测模型之前，首先要对数据进行数据清洗和标注，请完成下面的数据预处理任务，并设计一套标注流程规范： (1)正确加载数据集，并显示前五行的数据及数据类型。 (2)检查数据集中的缺失值并删除缺失值所在的行。 (3)将“horsepower”列转换为数值类型，并处理转换中的异常值。 (4)对数值型数据进行标准化处理，确保数据在同一量纲下进行分析。 (5)根据业务需求和数据特性，选择对燃油效率预测最有用的特征：选择以下特征：'cylinders'、'displacement'、'horsepower'、'weight'、'acceleration'、'model year'、'origin' (6)将“mpg”设为目标变量并标注； (7)对数据进行标注和划分； (8)保存处理后的数据，并命名为：2.1.1_cleaned_data.csv，保存到考生文件夹； (9)制定数据清洗和标注规范，将答案写到答题卷文件中，答题卷文件命名为“2.1.1.docx”，保存到考生文件夹； (10)将以上代码以及运行结果，以html格式保存并命名为2.1.1.html，保存到考生文件夹，考生文件夹命名为“准考证号+身份证后6位”。\n3.技能要求\n（1）能结合人工智能技术要求和业务特征，设计数据清洗和标注流程；  （2）能结合人工智能技术要求和业务特征，制定数据清洗和标注规范。\n4.质量指标\n（1）深入理解业务，训练符合业务需求的模型",
    rubric: [
      { id: "M1", score: 1, desc: "数据集正确加载得1分；" },
      { id: "M2", score: 2, desc: "检查缺失值得1分，删除缺失值得1分，总计得2分；" },
      { id: "M3", score: 1, desc: "处理转换中的异常值得1分；" },
      { id: "M4", score: 1, desc: "对数据进行标准化处理得1分；" },
      { id: "M5", score: 1, desc: "选择特征得1分；" },
      { id: "M6", score: 2, desc: "创建自变量得1分，目标变量得1分，总计得2分；" },
      { id: "M7", score: 1, desc: "数据集划分得1分；" },
      { id: "M8", score: 1, desc: "保存处理后的数据得1分；" },
      { id: "M9", score: 2, desc: "回答数据清洗规范：每回答正确1个规范点，得1分，最高得2分" },
      { id: "M10", score: 3, desc: "回答数据标注规范：每回答正确1个规范点，得1分，最高得3分" },
    ],
    ref: "（1）2.1.1.ipynb：\nimport pandas as pd\n# 加载数据集并显示数据集的前五行 1分\ndata = pd.read_csv('auto-mpg.csv')\nprint(\"数据集的前五行:\")\nprint(data.head())\n# 显示每一列的数据类型\nprint(data.dtypes)\n# 检查缺失值并删除缺失值所在的行 2分\nprint(\"\\n检查缺失值:\")\nprint(data.isnull().sum()) #或者print(data.isna().sum())\ndata = data.dropna()\n# 将 'horsepower' 列转换为数值类型，并处理转换中的异常值 1分\ndata['horsepower'] = pd.to_numeric(data['horsepower'], errors='coerce')\ndata = data.dropna(subset=['horsepower'])\n# 显示每一列的数据类型\nprint(data.horsepower.dtypes)\n# 检查清洗后的缺失值\nprint(\"\\n检查清洗后的缺失值:\")\nprint(data.isnull().sum())\nfrom sklearn.preprocessing import StandardScaler\n# 对数值型数据进行标准化处理 1分\nnumerical_features = ['displacement', 'horsepower', 'weight', 'acceleration']\nscaler = StandardScaler()\ndata[numerical_features] = scaler.fit_transform(data[numerical_features])\nfrom sklearn.model_selection import train_test_split\n# 选择特征和目标变量 2分\nselected_features = ['cylinders', 'displacement', 'horsepower', 'weight', 'acceleration', 'model year', 'origin']\nX = data[selected_features]\ny = data['mpg']\n# 划分数据集为训练集和测试集 1分\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n# 将特征和目标变量合并到一个数据框中\ncleaned_data = X.copy()\ncleaned_data['mpg'] = y\n# 保存清洗和处理后的数据\ncleaned_data.to_csv('2.1.1_cleaned_data.csv', index=False)\n# 打印消息指示文件已保存\nprint(\"\\n清洗后的数据已保存到 2.1.1_cleaned_data.csv\")\n（2）数据清洗和标注规范 数据清洗规范（答对2点即可）\n1. 数据加载：使用 pandas 库加载数据集，检查数据的基本结构和类型。\n2. 检查缺失值：统计每列的缺失值数量，并删除包含缺失值的行以确保数据完整性。\n3. 转换与处理异常值: 将数值列（如“horsepower”）转换为数值类型，并处理无法转换的值（例如，将其变为缺失值）。\n4. 数据标准化: 对数值型数据进行标准化，以消除量纲影响，使用标准化方法。\n5. 保存清洗后的数据: 将经过清洗和处理后的数据保存为新的 CSV 文件，以便后续使用。 数据标注规范（答对3点即可）\n1. 数据来源：标注数据的来源，包括数据集的名称、获取日期和数据提供者。\n2. 数据描述：提供详细的数据描述，包括每列数据的含义、单位和可能的取值范围。\n3. 特征选择: 确定对目标变量预测最有用的特征。\n4. 目标变量设定: 将数据集中用于预测的目标变量定义为“mpg”（燃油效率）。\n5. 数据划分: 将数据分为训练集和测试集，通常采用 80/20 的比例，以便于模型的训练和评估。\n6. 保存处理后的数据：保存处理后的数据，并记录保存文件的路径和文件名。\n7. 数据清洗和标注规范文档\n人工智能训练师（三级）操作技能考核",
  },
  {
    code: "2.2.1",
    title: "智能信用评分Logistic回归模型开发与测试",
    minutes: "20min",
    score: 20,
    sheet: "1.场地设备要求\n（1）人工智能训练师主机 1 台；  （2）Python 编译环境；  （3）Finance数据集。\n2.工作任务\n互联网金融飞速发展，使得个人金融理财变得越来越容易。而其中信用评分技术是一种对贷款申请人（信用卡申请人）做风险评估分值的统计模型，可以根据客户提供的资料、客户的历史数据、第三方平台数据（芝麻分、京东、微信等），对客户的信用进行评估。现要求根据提供的finance数据集，补全2.2.1.ipynb代码。选择合适的特征，开发一个申请的评分模型，利用测试工具对模型进行测试，并对测试结果进行分析，完成测试报告，并运用工具对错误原因进行纠正。 （1）正确加载数据集，显示前五行的数据。 （2）使用Logistic模型进行模型训练，要求设定自变量和因变量，并根据自变量特征进行模型训练，最终将训练好的模型以文件名2.2.1_model.pkl保存到考生文件夹，结果文件以2.2.1_results.txt保存到考生文件夹。 （3）使用测试工具对模型进行测试，并记录测试结果，命名2.2.1_report.txt，保存到考生文件夹 （4）对测试结果进行详细分析，并编写测试报告，包括模型性能评估、错误分析及改进建议，将答案写到答题卷文件中，答题卷文件命名为“2.2.1.docx”，保存到考生文件夹。 （5）运用工具分析算法中错误案例产生的原因并进行纠正，重新得到模型训练结果，以文件名2.2.1_results_xg.txt保存到考生文件夹。 （6）将以上代码以及运行结果，以html格式保存并命名为2.2.1.html，保存到考生文件夹，考生文件夹命名为“准考证号+身份证后6位”。 数据集说明： Unnamed: 0 - 索引号。 SeriousDlqin2yrs - 个人在过去两年内是否出现过严重的拖欠（1 表示有严重拖欠，0 表示没有）。 RevolvingUtilizationOfUnsecuredLines - 这是指个人未偿还的信用额度与总信用额度的比例。 age - 客户的年龄。 NumberOfTime30-59DaysPastDueNotWorse - 在过去一段时间内，贷款逾期30至59天的次数。 DebtRatio - 债务比率。 MonthlyIncome - 客户的月收入。 NumberOfOpenCreditLinesAndLoans - 正在使用的信贷账户或贷款的数量。 NumberOfTimes90DaysLate - 贷款逾期超过90天的次数。 NumberRealEstateLoansOrLines - 持有的房地产相关贷款或信贷的数量。 NumberOfTime60-89DaysPastDueNotWorse - 贷款逾期60至89天的次数。 NumberOfDependents - 家庭中依赖该个人的人数。\n3.技能要求\n(1) 能维护日常训练集与测试集。  (2) 能使用工具对算法进行训练。  (3) 能使用测试工具对人工智能产品的使用进行测试。  (4) 能对测试结果进行分析，编写测试报告。  (5) 能运用工具，分析算法中错误案例产生的原因并进行纠正。\n4.质量指标\n(1) 深入理解业务，训练符合业务需求的模型。  (2) 数据预处理步骤完整，方法选择合理。  (3) 代码实现正确，结果符合预期。  (4) 测试结果分析全面，报告详细。",
    rubric: [
      { id: "M1", score: 2, desc: "正确加载数据集，得1分，显示前五行的数据，得1分，总计得2分；" },
      { id: "M2", score: 1, desc: "训练集与测试集的准确划分得1分；" },
      { id: "M3", score: 2, desc: "初始化 Logistic 回归模型得2分；" },
      { id: "M4", score: 2, desc: "训练 Logistic 回归模型得2分；" },
      { id: "M5", score: 1, desc: "正确保存Logistic 回归模型文件得1分；" },
      { id: "M6", score: 1, desc: "使用 Logistic 回归模型在测试集上进行预测得1分；" },
      { id: "M7", score: 2, desc: "正确计算Logistic 回归模型的准确率得2分；" },
      { id: "M8", score: 2, desc: "正确处理数据不平衡问题得2分；" },
      { id: "M9", score: 2, desc: "模型重新训练得2分" },
      { id: "M10", score: 1, desc: "正确生成新预测结果得1分；" },
      { id: "M11", score: 1, desc: "正确分析新的测试结果得1分；" },
      { id: "M12", score: 3, desc: "正确填写2.2.1.docx测试报告：其中模型性能评估得1分、错误分析得1分，改进建议得1分，总计得3分；" },
    ],
    ref: "（1）2.2.1.ipynb代码\nimport pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LogisticRegression\nimport pickle\nfrom sklearn.metrics import classification_report\nfrom imblearn.over_sampling import SMOTE\n# 加载数据\ndata = pd.read_csv('finance数据集.csv')\n# 显示前五行的数据\nprint(data.head())\n# 选择自变量和因变量\nX = data.drop(['SeriousDlqin2yrs', 'Unnamed: 0'], axis=1)\ny = data['SeriousDlqin2yrs']\n# 分割训练集和测试集\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n# 训练Logistic回归模型\nmodel = LogisticRegression(max_iter=1000)\nmodel.fit(X_train, y_train)\n# 保存模型\nwith open('2.2.1_model.pkl', 'wb') as file:\npickle.dump(model, file)\n# 预测并保存结果\ny_pred = model.predict(X_test)\npd.DataFrame(y_pred, columns=['预测结果']).to_csv('2.2.1_results.txt', index=False)\n# 生成测试报告\nreport = classification_report(y_test, y_pred, zero_division=1)\nwith open('2.2.1_report.txt', 'w') as file:\nfile.write(report)\n# 分析测试结果\naccuracy = (y_test == y_pred).mean()\nprint(f\"模型准确率: {accuracy:.2f}\")\n# 处理数据不平衡\nsmote = SMOTE(random_state=42)\nX_resampled, y_resampled = smote.fit_resample(X_train, y_train)\n# 重新训练模型\nmodel.fit(X_resampled, y_resampled)\n# 重新预测\ny_pred_resampled = model.predict(X_test)\n# 保存新结果\npd.DataFrame(y_pred_resampled, columns=['预测结果']).to_csv('2.2.1_results_xg.txt', index=False)\n# 生成新的测试报告\nreport_resampled = classification_report(y_test, y_pred_resampled, zero_division=1)\nwith open('2.2.1_report_xg.txt', 'w') as file:\nfile.write(report_resampled)\n# 分析新的测试结果\naccuracy_resampled = (y_test == y_pred_resampled).mean()\nprint(f\"重新采样后的模型准确率: {accuracy_resampled:.2f}\")\n（2）\nLogistic模型（说明：只要小数点后第一位正确即可得满分） 模型性能  precision recall f1-score support 0（没有严重逾期） 0.95 0.99 0.97 26779 1（有严重逾期） 0.57 0.14 0.22 1737  错误分析 0（没有严重逾期）： 准确率很高，召回率也很高，表明模型在这一类别上的性能非常好。 可能的错误主要来自于少数漏报情况，即极少数实际没有严重逾期的样本被错误预测为有严重逾期。 1（有严重逾期）： 准确率较低，召回率也很低，F1-Score仅为0.22，表明模型在这一类别上的性能较差。 主要问题在于大量的漏报（真正有严重逾期的样本被预测为没有）和一定的误报（将没有严重逾期的样本预测为有）。 改进建议 1. 数据处理策略调整 重采样技术：由于数据集存在明显的不平衡，可以考虑使用过采样（如SMOTE）或欠采样技术来平衡两个类别的数量。 2. 特征工程优化 特征选择：仔细审查现有特征，去除冗余或不相关的特征，可能有助于提升模型性能。 特征构造：尝试创建新的、更具区分力的特征，如基于现有特征的交互项或衍生指标。\n人工智能训练师（三级）操作技能考核",
  },
  {
    code: "3.1.1",
    title: "智能音箱产品的数据分析与优化",
    minutes: "20min",
    score: 15,
    sheet: "1.场地设备要求\n（1）人工智能训练师主机 1 台；  （2）Python 编译环境；  （3）智能音箱数据集。\n2.工作任务\n智能音箱作为智能家居生态的重要组成部分，近年来经历了爆炸式的增长。随着人工智能技术的成熟，尤其是自然语言处理（NLP）和语音识别技术的进步，智能音箱已经成为许多家庭中不可或缺的智能设备。它们不仅能够播放音乐、提供天气预报和新闻更新，还能控制家中的智能设备，设定提醒，甚至帮助用户购物。然而，随着市场竞争的加剧，智能音箱制造商面临着如何持续优化产品性能，提升用户体验的挑战。数据分析在智能音箱的持续优化中扮演着核心角色。通过对用户行为的深入挖掘，企业可以了解用户偏好、使用模式和潜在的痛点。例如，分析用户何时最常使用智能音箱、他们最喜欢的功能是什么、以及哪些功能的响应时间过长等问题，可以帮助企业做出有针对性的改进决策。 （1）你作为人工智能训练师，根据给定的数据集（智能音箱数据集.xlsx），从以下三方面： 用户使用习惯：分析哪些功能最常被使用； 功能使用频率：识别最受欢迎的功能和较少使用的功能； 响应时间：考察不同功能的平均响应时间，找出可能的瓶颈。 给出一份在用户使用习惯、功能使用频率和响应时间方面的分析报告，将其保存为docx文件，命名为3.1.1-1.docx。 （2）为了进一步提升用户体验，给出智能音箱产品的3个优化方向和对应解决方案，将其保存为docx文件，命名为3.1.1-2.docx。\n所有结果文件储存在桌面新建的考生文件夹中，文件夹命名为“准考证号+身份证号后六位”。\n3.技能要求\n（1）能对单一智能产品使用的数据进行全面分析，输出分析报告；  （2）能对单一智能产品提出优化需求；  （3）能为单一智能产品的应用设计智能解决方案。\n4.质量指标\n（1）分析报告全面可靠；  （2）优化方向合理，具有良好应用价值；  （3）解决方案切实可行。",
    rubric: [
      { id: "M1", score: 3, desc: "回答用户使用习惯中最常被使用的三个功能：每个功能得1分，本项最高得3分；" },
      { id: "M2", score: 3, desc: "回答最受欢迎的功能和较少使用的功能：最受欢迎的功能得1分，较少使用的功能每个得1分，本项最高得3分；" },
      { id: "M3", score: 3, desc: "回答不同功能的平均响应时间：响应时间较长的功能得1分；响应时间适中的功能得1分；响应时间较短的功能的1分；本项最高得3分；" },
      { id: "M4", score: 6, desc: "回答优化方向和该方向对应解决方案：每1个正确的优化方向得1分，对应解决方案得1分，本项最多得6分；" },
    ],
    ref: "（1）分析报告 一、用户使用习惯 最常被使用的功能：调整音量、查询新闻、查天气 二、功能使用频率 最受欢迎的功能：调整音量\n较少使用的功能：播放音乐、控制家居 三、响应时间分析 响应时间较长的功能：控制家居 响应时间适中的功能：提醒事项/调整音量/查询知识/设置闹钟/播放音乐/查天气 响应时间较短的功能：查询新闻 （2）优化方向及解决方案（仅需回答3个优化方向和对应解决方案） 1. 优化方向：网络连接与设备交互优化\n解决方案：强化网络连接稳定性，采用更高效的通信协议，减少控制家居功能的响应时间\n2. 优化方向：提升信息检索效率\n解决方案：优化查询知识的检索算法，加快数据处理速度，提升用户体验\n3. 优化方向：增强本地处理能力\n解决方案：增加本地缓存和预加载机制，尤其在播放音乐和查天气上，以减少对外部资源的依赖\n4. 优化方向：改善闹钟与提醒功能\n解决方案：设计更直观的闹钟和提醒事项设置流程，增加个性化选项，鼓励用户更频繁地使用这些功能\n5. 优化方向：用户界面与语音识别优化\n解决方案：提升语音识别准确率，简化用户界面设计，确保用户能够快速、准确地调用所需功能\n人工智能训练师（三级）操作技能考核",
  },
  {
    code: "3.2.1",
    title: "图像识别评估系统交互流程设计",
    minutes: "20min",
    score: 20,
    sheet: "1.场地设备要求\n（1）人工智能训练师主机 1 台；  （2）Python 编译环境；  （3）Pytorch框架。\n2.工作任务\n图像识别评估系统是在深度学习技术日益成熟的背景下发展起来的，旨在解决传统图像识别方法在面对复杂场景和大规模数据集时的局限性。随着互联网和物联网技术的飞速发展，图像数据量呈指数级增长，对图像内容的自动理解和智能分析提出了更高的要求。ResNet作为一种深度卷积神经网络架构，凭借其深度残差连接机制，能够有效缓解梯度消失问题，实现更深层次的网络结构，从而捕获更加丰富和抽象的图像特征，极大地提高了图像识别的准确性和效率，推动了人工智能技术在现实世界中的广泛应用和商业化进程。 AI模型说明：“resnet.onnx”模型是使用 Pytorch 框架和基于深度卷积神经网络网络训练得到的，专门用于进行图像识别。对应的标签文件为“labels.txt”。该模型的使用交互流程为： 1)加载“resnet.onnx”模型和“labels.txt”类别标签； 2)加载本地测试图片“img_test.jpg”，并进行预处理图像以符合模型输入要求； 3)使用“resnet.onnx”模型对加载的图片进行识别； 4)输出加载图片的识别结果（输出概率值最大的5组类别和对应概率值） 你作为一名人工智能训练师，请完成以下工作任务： （1）补全该模型的使用交互流程对应的Python代码（3.2.1.ipynb），实现本地测试图片“img_test.jpg”的识别，将其识别结果截图保存为jpg格式文件，命名为3.2.1-1.jpg。 （2）在上面的使用交互流程基础上，给出在图像识别评估系统中使用“resnet.onnx”模型的一种人机交互的最优方式，将其保存为docx文件，命名为3.2.1.docx。 所有结果文件储存在桌面新建的考生文件夹中，文件夹命名为“准考证号+身份证号后六位”。\n3.技能要求\n（1）能确保模型在单一场景下稳定运行；  （2）能通过分析，找到单一场景下人工和智能交互的最优方式。\n4.质量指标\n（1）模型运行稳定，使用正常；  （2）单一场景下人工和智能交互的最优方式切实可行。",
    rubric: [
      { id: "M1", score: 2, desc: "模型加载代码正确得2分；" },
      { id: "M2", score: 2, desc: "从指定路径加载一张图片代码正确得2分；" },
      { id: "M3", score: 2, desc: "预处理图片代码正确得2分；" },
      { id: "M4", score: 2, desc: "使用模型对图片进行识别代码得2分；" },
      { id: "M5", score: 2, desc: "获取识别分类后的概率代码正确得2分；" },
      { id: "M6", score: 3, desc: "获取最高的5个概率和对应的类别索引代码正确得3分；" },
      { id: "M7", score: 1, desc: "本地保存识别后的截图3.2.1-1.jpg：得1分；" },
      { id: "M8", score: 5, desc: "截图3.2.1-1.jpg中识别的前五个类别和概率正确：每个类别和概率正确得1分，总计得5分；" },
      { id: "M9", score: 1, desc: "人机交互最优流程（不少于3条）正确得1分；" },
    ],
    ref: "源代码（3.2.1.ipynb）： import onnxruntime as ort\nimport numpy as np\nimport scipy.special\nfrom PIL import Image\n# 预处理图像\ndef preprocess_image(image, resize_size=256, crop_size=224, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]):\nimage = image.resize((resize_size, resize_size), Image.BILINEAR)\nw, h = image.size\nleft = (w - crop_size) / 2\ntop = (h - crop_size) / 2\nimage = image.crop((left, top, left + crop_size, top + crop_size))\nimage = np.array(image).astype(np.float32)\nimage = image / 255.0\nimage = (image - mean) / std\nimage = np.transpose(image, (2, 0, 1))\nimage = image.reshape((1,) + image.shape)\nreturn image\n# 模型加载 2分\nsession = ort.InferenceSession('resnet.onnx')\n# 加载类别标签\nlabels_path = 'labels.txt'\nwith open(labels_path) as f:\nlabels = [line.strip() for line in f.readlines()]\n# 获取模型输入和输出的名称\ninput_name = session.get_inputs()[0].name\noutput_name = session.get_outputs()[0].name\n# 加载图片 2分\nimage = Image.open('img_test.jpg').convert('RGB')\n# 预处理图片 2分\nprocessed_image = preprocess_image(image)\n# 确保输入数据是 float32 类型\nprocessed_image = processed_image.astype(np.float32)\n# 进行图片识别 2分\noutput = session.run([output_name], {input_name: processed_image})[0]\n# 应用 softmax 函数获取概率 2分\nprobabilities = scipy.special.softmax(output, axis=-1)\n# 获取最高的5个概率和对应的类别索引 2分\ntop5_idx = np.argsort(probabilities[0])[-5:][::-1]\ntop5_prob = probabilities[0][top5_idx]\n# 打印结果\nprint(\"Top 5 predicted classes:\")\nfor i in range(5):\nprint(f\"{i+1}: {labels[top5_idx[i]]} - Probability: {top5_prob[i]}\")\n3.2.1.docx 人机交互最优方式为：\n用户界面设计：提供一个简洁直观的用户界面，方便用户上传图片和查看识别结果。\n模型加载：系统启动时预加载模型和标签，减少用户等待时间。\n图像上传与预处理：允许用户上传图片，并自动进行必要的预处理。\n图像识别：后台使用“resnet.onnx”模型处理预处理后的图片。\n结果展示：清晰展示识别结果，包括最可能的类别和概率。\n交互反馈：提供用户反馈选项，以改进模型性能。\n帮助与支持：内置帮助文档和客服支持，提升用户体验。\n性能优化：优化系统响应速度和模型处理能力。\n安全性考虑：确保用户数据安全和隐私保护。\n多语言支持：界面支持多语言，满足全球用户需求。\n可访问性：确保UI无障碍，方便所有用户操作。\n人工智能训练师（三级）操作技能考核",
  },
  {
    code: "4.2.1",
    title: "智能零售分析系统数据采集和处理指导",
    minutes: "10min",
    score: 5,
    sheet: "1.场地设备要求\n人工智能训练师主机：CPU（intel i5 及以上）、内存（不少于 16GB）、操作系统（windows10）、办公软件；\n2.工作任务\n在快速发展的零售行业中，商家面临着巨大的竞争压力，需要精准地了解消费者行为、优化库存管理、预测销售趋势以及提升顾客体验。为了应对这些挑战，某大型连锁超市决定部署一套智能零售分析系统，该系统将利用人工智能和大数据分析来提升其业务效率和客户满意度。\n智能零售分析系统的目标包括：\n提高销售转化率和客户忠诚度。\n减少库存成本，避免滞销和断货。\n降低运营成本，提高供应链效率。\n加强市场竞争力，快速响应市场变化。\n智能零售分析系统的业务需求包括：\n顾客行为分析：收集顾客购物习惯、偏好和购买频率，以便于定制个性化营销策略。\n库存优化：实时监测货架上的商品存量，预测补货需求，减少过度库存和缺货情况。\n销售预测：基于历史销售数据和市场趋势，预测未来销售，辅助决策。\n动态定价：根据供需关系、竞争对手价格变动等因素，动态调整商品价格。\n客户满意度提升：通过分析顾客反馈和评论，识别服务短板，改进服务质量。\n你作为一名人工智能训练师，根据上述的智能零售分析系统的系统目标和业务需求，补全智能零售分析系统的数据采集和处理指导方案（见素材文件夹中的4.2.1.docx）。\n所有结果文件储存在桌面新建的考生文件夹中，文件夹命名为“准考证号+身份证号后六位”。\n3.技能要求\n（1）能指导五级/初级工、四级/中级工解决数据采集、处理问题\n（2）能指导五级/初级工、四级/中级工优化数据采集、处理问题\n4.质量指标\n（1）数据采集和处理的指导方案内容合理、可行； （2）数据采集全面；\n（3）数据处理准确与完整。",
    rubric: [
      { id: "M1", score: 5, desc: "正确补充方案内容的每1个内容点得1分，总计得5分； 根据数据 第1个内容点正确，得1分 第2个内容点正确，得1分 第3个内容点正确，得1分 第4个内容点正确，得1分 第5个内容点正确，得1分" },
    ],
    ref: "智能零售分析系统数据采集和处理指导方案\n1. 数据源确定\n销售点（POS）数据：从收银系统获取交易记录，包括商品种类、数量、价格和购买时间。\n顾客信息：会员卡使用数据，包括会员基本信息、消费记录和积分兑换。\n库存管理系统：实时库存量、入库和出库记录。\n顾客反馈：在线评价、投诉和建议。\n外部数据：天气预报、节假日信息、竞争对手价格数据。\n2. 数据采集方法\nAPI接口：与内部系统（如POS、CRM）和外部数据提供商建立API连接，自动化数据抓取。\n传感器和物联网设备：在货架上安装RFID标签和重量传感器，监测商品存量。\n社交媒体监听：通过社交媒体API监听品牌相关的公众讨论和评价。\n顾客调查：定期发送电子问卷，收集顾客反馈。\n3. 数据预处理\n清洗：去除重复、错误或无关的数据项。\n标准化：统一数据格式，例如日期和时间的表示方式。\n整合：将来自不同来源的数据合并到单一数据库中，创建关联字段。\n4. 数据安全与合规\n加密传输：确保数据在传输过程中的安全。\n访问控制：限制对敏感数据的访问权限，只允许授权人员查看。\n匿名化处理：对个人信息进行去标识化，遵守GDPR等数据保护法规。\n5. 数据存储与管理\n云存储：选择可靠的云服务商，如AWS或Azure，存储海量数据。\n备份与恢复：定期备份数据，并测试恢复流程，以防数据丢失。\n6. 数据分析与应用\n建模：使用机器学习算法预测销售趋势、顾客偏好和库存需求。\n可视化：开发仪表板展示关键指标，帮助管理层做出决策。\n报告：定期生成销售、库存和顾客满意度报告，提供业务洞察。\n通过上述方案，智能零售分析系统能够有效地采集、处理和分析大量数据，为企业提供决策支持，最终达到提升业务效率和顾客满意度的目标。\n人工智能训练师（三级）操作技能模拟试卷\nPAGE \\* MERGEFORMAT 1 / NUMPAGES \\* MERGEFORMAT 34",
  },
];
