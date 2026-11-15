
# -*- coding: utf-8 -*-
"""生成人工智能训练师三级实操练习素材包（数据集 / ipynb 骨架 / 答题卷 / 模型桩）。

输出：frontend-v2/public/ai-practical/<code>/<文件...> + <code>.zip
      以及 src/data/aiPracticalAssets.ts 清单。
"""
import json, os, random, sys, zipfile, datetime, zlib
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'ai-practical')
MAN_TS = os.path.join(ROOT, 'src', 'data', 'aiPracticalAssets.ts')
POOL = json.load(open('/tmp/ai3/pool.json', encoding='utf-8'))
rng = np.random.default_rng(20261115)
random.seed(20261115)

def rint(n, lo, hi):
    return rng.integers(lo, hi + 1, n)

def pick(n, opts):
    return rng.choice(opts, n)

# ---------------- 数据集 ----------------
def ds_patient():
    n = 1000
    d = pd.DataFrame({
        'PatientID': [f'P{i:04d}' for i in range(1, n + 1)],
        'Age': rint(n, 18, 90),
        'BMI': np.round(rng.normal(24, 4, n).clip(14, 42), 1),
        'BloodPressure': rint(n, 85, 180),
        'Cholesterol': rint(n, 120, 300),
        'DaysInHospital': np.where(rng.random(n) < 0.28, rint(n, 8, 20), rint(n, 0, 7)),
    })
    return {'patient_data.csv': d}

def ds_sensor():
    n = 1200
    types = ['Temperature', 'Humidity', 'SoilMoisture', 'SoilPH', 'Light']
    locs = ['大棚A', '大棚B', '露天C']
    t0 = datetime.datetime(2026, 3, 1, 8, 0)
    ts = [t0 + datetime.timedelta(minutes=5 * i) for i in range(n // len(types))]
    rows = []
    for t in ts:
        for ty in types:
            if ty == 'Temperature':
                v = round(rng.normal(24, 5), 1)
            elif ty == 'Humidity':
                v = round(rng.normal(60, 12), 1)
            elif ty == 'SoilMoisture':
                v = round(rng.normal(45, 10), 1)
            elif ty == 'SoilPH':
                v = round(rng.normal(6.5, 0.6), 2)
            else:
                v = round(rng.normal(800, 200), 0)
            rows.append([f'S{len(rows)+1:05d}', t.strftime('%Y-%m-%d %H:%M:%S'), ty, v, locs[len(rows) % 3]])
    d = pd.DataFrame(rows, columns=['SensorID', 'Timestamp', 'SensorType', 'Value', 'Location'])
    idx = rng.choice(len(d), 24, replace=False)
    d.loc[idx[:6], 'Value'] = np.nan
    d.loc[idx[6:10], 'Value'] = 88.0
    d.loc[idx[10:14], 'Value'] = -35.0
    d.loc[idx[14:18], 'Value'] = 130.0
    return {'sensor_data.csv': d}

def ds_credit():
    n = 800
    age = rint(n, 18, 70)
    income = rint(n, 3000, 60000)
    loan = (income * rng.uniform(0.2, 3.0, n)).round(0)
    d = pd.DataFrame({
        'CustomerID': [f'C{i:04d}' for i in range(1, n + 1)],
        'Name': [f'客户{i:04d}' for i in range(1, n + 1)],
        'Age': age,
        'Income': income,
        'LoanAmount': loan,
        'LoanTerm': pick(n, [12, 24, 36, 48, 60]),
        'CreditScore': rint(n, 300, 850),
        'Default': (rng.random(n) < 0.18).astype(int),
        'TransactionHistory': ['{"count": %d, "amount": %d}' % (int(rng.integers(1, 60)), int(rng.integers(500, 90000))) for _ in range(n)],
    })
    bad = rng.choice(n, 10, replace=False)
    d.loc[bad[:3], 'Age'] = [12, 15, 95]
    d.loc[bad[3:6], 'Income'] = [800, 1200, 1500]
    d.loc[bad[6:8], 'LoanAmount'] = d.loc[bad[6:8], 'Income'] * 8
    d.loc[bad[8:], 'CreditScore'] = [200, 900]
    d = pd.concat([d, d.iloc[:5]], ignore_index=True)
    d.loc[rng.choice(len(d), 15, replace=False), 'Income'] = np.nan
    return {'credit_data.csv': d}

def ds_user_behavior():
    n = 1000
    cats = ['电子产品', '服装', '食品', '图书', '家居']
    d = pd.DataFrame({
        'UserID': [f'U{i:05d}' for i in range(1, n + 1)],
        'UserName': [f'用户{i:05d}' for i in range(1, n + 1)],
        'Age': rint(n, 18, 65),
        'Gender': pick(n, ['Male', 'Female']),
        'Location': pick(n, ['上海', '北京', '广州', '成都']),
        'LastLogin': [(datetime.datetime(2026, 3, 1) + datetime.timedelta(hours=int(h))).strftime('%Y-%m-%d %H:%M:%S') for h in rint(n, 0, 2000)],
        'PurchaseAmount': np.round(rng.gamma(2.0, 150, n), 2),
        'PurchaseCategory': pick(n, cats),
        'ReviewScore': rint(n, 1, 5),
        'LoginFrequency': pick(n, ['每日', '每周', '每月']),
    })
    bad = rng.choice(n, 20, replace=False)
    d.loc[bad[:5], 'Age'] = [-3, 0, 120, 150, 200]
    d.loc[bad[5:10], 'PurchaseAmount'] = [-50, -1, 9e6, 5e6, 3e6]
    d.loc[bad[10:15], 'ReviewScore'] = [0, 9, 11, -2, 7]
    d.loc[bad[15:], 'PurchaseAmount'] = np.nan
    return {'user_behavior_data.csv': d}

def ds_vehicle():
    n = 1000
    d = pd.DataFrame({
        'VehicleID': [f'V{i:05d}' for i in range(1, n + 1)],
        'DriverName': [f'驾驶员{i:05d}' for i in range(1, n + 1)],
        'Age': rint(n, 18, 70),
        'Gender': pick(n, ['Male', 'Female']),
        'Speed': np.round(rng.normal(65, 18, n).clip(0, 180), 1),
        'TravelDistance': np.round(rng.gamma(4, 30, n), 1),
        'TravelTime': np.round(rng.gamma(4, 12, n), 1),
        'TrafficEvent': pick(n, ['Normal', 'Accident', 'Traffic Jam', 'Breakdown']),
    })
    bad = rng.choice(n, 18, replace=False)
    d.loc[bad[:4], 'Age'] = [10, 15, 80, 90]
    d.loc[bad[4:9], 'Speed'] = [-20, 260, 300, 220, -5]
    d.loc[bad[9:13], 'TravelDistance'] = [0, 1500, 2000, 1300]
    d.loc[bad[13:], 'TravelTime'] = np.nan
    return {'vehicle_traffic_data.csv': d}

def ds_autompg():
    n = 398
    cyl = pick(n, [3, 4, 5, 6, 8])
    disp = np.round(cyl * 30 + rng.normal(0, 25, n), 1).clip(60, 460)
    hp = np.round(disp * 0.3 + rng.normal(0, 8, n), 0).clip(45, 230)
    wt = np.round(disp * 7 + rng.normal(0, 300, n), 0).clip(1600, 5200)
    acc = np.round(rng.normal(15.5, 2.8, n).clip(8, 25), 1)
    my = rint(n, 70, 82)
    mpg = np.round(46 - 0.05 * disp - 0.004 * wt + 0.3 * (my - 70) + rng.normal(0, 1.8, n), 1).clip(6, 47)
    d = pd.DataFrame({
        'mpg': mpg, 'cylinders': cyl, 'displacement': disp,
        'horsepower': [str(int(h)) if rng.random() > 0.015 else '?' for h in hp],
        'weight': wt, 'acceleration': acc, 'model year': my,
        'origin': pick(n, [1, 2, 3]),
        'car name': ['car_%03d' % i for i in range(1, n + 1)],
    })
    return {'auto-mpg.csv': d}

def ds_lowcarbon():
    n = 340
    d = pd.DataFrame({
        '性别': pick(n, ['男', '女']),
        '生源地': pick(n, ['城市', '乡镇', '农村']),
        '月生活费': rint(n, 800, 4000),
        '主观规范': rint(n, 1, 5),
        '知觉行为控制': rint(n, 1, 5),
        '低碳行为态度': rint(n, 1, 5),
        '行为意愿': rint(n, 1, 5),
        '低碳生活行为': rint(n, 1, 5),
    })
    d.loc[rng.choice(n, 12, replace=False), '低碳行为态度'] = np.nan
    return {'低碳生活行为数据.csv': d}

def ds_finance():
    n = 15000
    d = pd.DataFrame({
        'SeriousDlqin2yrs': (rng.random(n) < 0.067).astype(int),
        'RevolvingUtilizationOfUnsecuredLines': np.round(rng.gamma(1.2, 0.4, n), 4),
        'age': rint(n, 21, 95),
        'NumberOfTime30-59DaysPastDueNotWorse': rng.poisson(0.3, n),
        'DebtRatio': np.round(rng.gamma(2, 0.3, n), 4),
        'MonthlyIncome': np.where(rng.random(n) < 0.2, np.nan, rint(n, 0, 30000).astype(float)),
        'NumberOfOpenCreditLinesAndLoans': rng.poisson(8, n),
        'NumberOfTimes90DaysLate': rng.poisson(0.1, n),
        'NumberRealEstateLoansOrLines': rng.poisson(1, n),
        'NumberOfTime60-89DaysPastDueNotWorse': rng.poisson(0.1, n),
        'NumberOfDependents': np.where(rng.random(n) < 0.02, np.nan, rng.poisson(0.8, n).astype(float)),
    })
    return {'finance数据集.csv': d}

def ds_medical():
    n = 5441
    start = datetime.datetime(2024, 1, 1)
    adm = [start + datetime.timedelta(days=int(x)) for x in rint(n, 0, 900)]
    dates_1 = [d.strftime('%Y-%m-%d') for d in adm]
    dates_2 = [d.strftime('%Y/%m/%d') for d in adm]
    dates_3 = [d.strftime('%Y年%m月%d日') for d in adm]
    dx = []
    for i in range(n):
        k = i % 3
        if k == 0: dx.append((adm[i] + datetime.timedelta(days=int(rng.integers(1, 9)))).strftime('%Y-%m-%d'))
        elif k == 1: dx.append((adm[i] + datetime.timedelta(days=int(rng.integers(1, 9)))).strftime('%Y/%m/%d'))
        else: dx.append((adm[i] + datetime.timedelta(days=int(rng.integers(1, 9)))).strftime('%Y年%m月%d日'))
    d = pd.DataFrame({
        '病人ID': [f'MR{i:05d}' for i in range(1, n + 1)],
        '就诊日期': [x if i % 3 == 0 else (dates_2[i] if i % 3 == 1 else dates_3[i]) for i, x in enumerate(dates_1)],
        '诊断日期': dx,
        '年龄': rint(n, 1, 95),
        '性别': pick(n, ['男', '女']),
        '治疗方案': pick(n, ['方案A', '方案B', '方案C']),
        '治疗费用': np.round(rng.gamma(3, 2600, n), 2),
        '住院天数': rng.poisson(6, n),
        '治疗效果': pick(n, ['痊愈', '好转', '无变化', '恶化']),
    })
    return {'医疗研究数据集.csv': d}

def ds_health_consult():
    n = 520
    d = pd.DataFrame({
        'ClientID': [f'H{i:04d}' for i in range(1, n + 1)],
        'Your age': [str(int(a)) if rng.random() > 0.03 else 'unknown' for a in rint(n, 16, 70)],
        'How do you describe your current level of fitness ?': pick(n, ['poor', 'below average', 'average', 'above average', 'excellent']),
        'How often do you exercise ?': pick(n, ['never', '1-2 times a week', '3-4 times a week', 'every day']),
        'How important is exercise to you ?': pick(n, ['not important', 'somewhat important', 'important', 'very important']),
        'How healthy do you consider yourself ?': rint(n, 1, 10),
    })
    d = pd.concat([d, d.iloc[rng.choice(n, 18, replace=False)]], ignore_index=True)
    d.loc[rng.choice(len(d), 10, replace=False), 'How healthy do you consider yourself ?'] = np.nan
    return {'健康咨询客户数据集.csv': d}

def ds_exercise():
    n = 600
    d = pd.DataFrame({
        '性别': pick(n, ['男', '女']),
        '对运动的看法': pick(n, ['不喜欢', '一般', '喜欢', '非常喜欢']),
        '健康评价': rint(n, 1, 5),
        '年龄': rint(n, 18, 65),
    })
    return {'日常运动量数据集.csv': d}

def ds_fitness():
    n = 1200
    d = pd.DataFrame({
        'user_id': [f'F{i:05d}' for i in range(1, n + 1)],
        'gender': pick(n, ['male', 'female']),
        'age': rint(n, 16, 70),
        'active_minutes': np.round(rng.gamma(3, 12, n), 0),
        'calories': np.round(rng.gamma(3, 120, n), 0),
        'sleep_hours': np.round(rng.normal(7, 1.2, n).clip(3, 11), 1),
        'heart_rate': rint(n, 55, 110),
        'daily_steps': np.round(3000 + rng.gamma(2.2, 2200, n), 0),
    })
    return {'fitness_analysis.csv': d}

def ds_smart(hint):
    n = 1500
    feats = hint['features']
    rows = {}
    rows['用户ID'] = [f'A{i:05d}' for i in range(1, n + 1)]
    rows['使用日期'] = [(datetime.date(2026, 2, 1) + datetime.timedelta(days=int(x))).strftime('%Y-%m-%d') for x in rint(n, 0, 60)]
    rows['功能名称'] = pick(n, feats)
    rows['使用次数'] = rint(n, 1, 40)
    rows['使用时长(分钟)'] = np.round(rng.gamma(2, 3, n), 1)
    base = {f: rng.normal(hint['rt'][0], hint['rt'][1]) for f in feats}
    rows['响应时间(秒)'] = np.round([max(0.05, base[f]) for f in rows['功能名称']], 2)
    rows['用户满意度'] = rint(n, 1, 5)
    return pd.DataFrame(rows)

DATASETS = {
    'patient': ds_patient, 'sensor': ds_sensor, 'credit': ds_credit,
    'user_behavior': ds_user_behavior, 'vehicle': ds_vehicle, 'autompg': ds_autompg,
    'lowcarbon': ds_lowcarbon, 'finance': ds_finance, 'medical': ds_medical,
    'health': ds_health_consult, 'exercise': ds_exercise, 'fitness': ds_fitness,
}

# ---------------- 题目素材清单 ----------------
SMART = {
    '智能音箱数据集.xlsx': {'features': ['播放音乐', '语音助手问答', '智能家居控制', '闹钟提醒', '新闻播报', '购物下单'],
                       'rt': (1.2, 0.6)},
    '智能照明系统数据集.xlsx': {'features': ['开关灯', '亮度调节', '色温调节', '定时开关', '场景模式', '语音控制'],
                         'rt': (0.6, 0.3)},
    '智能健康手环数据集.xlsx': {'features': ['心率监测', '睡眠记录', '步数统计', '久坐提醒', '血氧检测', '运动模式'],
                         'rt': (0.8, 0.4)},
    '智能健康监测系统数据集.xlsx': {'features': ['体温监测', '血压监测', '血糖记录', '用药提醒', '异常预警', '家属通知'],
                            'rt': (1.5, 0.8)},
    '智能家居环境控制系统数据集.xlsx': {'features': ['空调控制', '新风控制', '加湿控制', '窗帘控制', '空气质量显示', '能耗统计'],
                             'rt': (1.0, 0.5)},
}

ITEMS = {
    '1.1.1': {'data': [('patient_data.csv', 'patient')], 'ipynb': True},
    '1.1.2': {'data': [('sensor_data.csv', 'sensor')], 'ipynb': True},
    '1.1.3': {'data': [('credit_data.csv', 'credit')], 'ipynb': True},
    '1.1.4': {'data': [('user_behavior_data.csv', 'user_behavior')], 'ipynb': True},
    '1.1.5': {'data': [('vehicle_traffic_data.csv', 'vehicle')], 'ipynb': True},
    '1.2.1': {'docx': ['1.2.1.docx']}, '1.2.2': {'docx': ['1.2.2.docx']},
    '1.2.3': {'docx': ['1.2.3.docx']}, '1.2.4': {'docx': ['1.2.4.docx']},
    '1.2.5': {'docx': ['1.2.5.docx']},
    '2.1.1': {'data': [('auto-mpg.csv', 'autompg')], 'ipynb': True, 'docx': ['2.1.1.docx']},
    '2.1.2': {'data': [('低碳生活行为数据.csv', 'lowcarbon')], 'ipynb': True, 'docx': ['2.1.2.docx']},
    '2.1.3': {'data': [('finance数据集.csv', 'finance')], 'ipynb': True, 'docx': ['2.1.3.docx']},
    '2.1.4': {'data': [('医疗研究数据集.csv', 'medical')], 'ipynb': True, 'docx': ['2.1.4.docx']},
    '2.1.5': {'data': [('健康咨询客户数据集.csv', 'health')], 'ipynb': True, 'docx': ['2.1.5.docx']},
    '2.2.1': {'data': [('finance数据集.csv', 'finance')], 'ipynb': True, 'docx': ['2.2.1.docx']},
    '2.2.2': {'data': [('auto-mpg.csv', 'autompg')], 'ipynb': True, 'docx': ['2.2.2.docx']},
    '2.2.3': {'data': [('日常运动量数据集.csv', 'exercise')], 'ipynb': True, 'docx': ['2.2.3.docx']},
    '2.2.4': {'data': [('低碳生活行为数据.csv', 'lowcarbon')], 'ipynb': True, 'docx': ['2.2.4.docx']},
    '2.2.5': {'data': [('fitness_analysis.csv', 'fitness')], 'ipynb': True, 'docx': ['2.2.5.docx']},
    '3.1.1': {'xlsx': ['智能音箱数据集.xlsx'], 'docx': ['3.1.1-1.docx', '3.1.1-2.docx']},
    '3.1.2': {'xlsx': ['智能照明系统数据集.xlsx'], 'docx': ['3.1.2-1.docx', '3.1.2-2.docx']},
    '3.1.3': {'xlsx': ['智能健康手环数据集.xlsx'], 'docx': ['3.1.3-1.docx', '3.1.3-2.docx']},
    '3.1.4': {'xlsx': ['智能健康监测系统数据集.xlsx'], 'docx': ['3.1.4-1.docx', '3.1.4-2.docx']},
    '3.1.5': {'xlsx': ['智能家居环境控制系统数据集.xlsx'], 'docx': ['3.1.5-1.docx', '3.1.5-2.docx']},
    '3.2.1': {'onnx': [('resnet.onnx', (3, 224, 224, 1000))], 'txt': [('labels.txt', 1000)],
              'img': [('img_test.jpg', (224, 224))], 'ipynb': True, 'docx': ['3.2.1.docx']},
    '3.2.2': {'onnx': [('mnist.onnx', (1, 28, 28, 10))], 'img': [('img_test.png', (28, 28))],
              'ipynb': True, 'docx': ['3.2.2.docx']},
    '3.2.3': {'onnx': [('emotion-ferplus.onnx', (1, 64, 64, 8))], 'img': [('img_test.png', (64, 64))],
              'ipynb': True, 'docx': ['3.2.3.docx']},
    '3.2.4': {'onnx': [('flower-detection.onnx', (3, 224, 224, 5))], 'txt': [('labels.txt', 5)],
              'img': [('flower_test.png', (224, 224))], 'ipynb': True, 'docx': ['3.2.4.docx']},
    '3.2.5': {'txt': [('voc-model-labels.txt', 21)], 'img': [('img_test.jpg', (240, 320))],
              'ipynb': True, 'docx': ['3.2.5.docx']},
    '4.1.1': {'docx': ['4.1.1.docx']}, '4.1.2': {'docx': ['4.1.2.docx']},
    '4.1.3': {'docx': ['4.1.3.docx']}, '4.1.4': {'docx': ['4.1.4.docx']},
    '4.1.5': {'docx': ['4.1.5.docx']},
    '4.2.1': {'docx': ['4.2.1.docx']}, '4.2.2': {'docx': ['4.2.2.docx']},
    '4.2.3': {'docx': ['4.2.3.docx']}, '4.2.4': {'docx': ['4.2.4.docx']},
    '4.2.5': {'docx': ['4.2.5.docx']},
}

def steps_of(sheet, limit=14):
    import re
    m = re.search(r'2[.．]\s*工作任务(.*?)(3[.．]\s*技能要求|所有结果文件|4[.．]\s*质量指标)', sheet, re.S)
    region = m.group(1) if m else sheet
    region = re.sub(r'\s+', ' ', region)
    parts = re.split(r'[（(]\s*(\d{1,2})\s*[）)]', region)
    out = []
    for i in range(1, len(parts) - 1, 2):
        text = parts[i + 1].strip(' 　;；')
        if len(text) < 8:
            continue
        out.append(text)
        if len(out) >= limit:
            break
    return out or ['按试题单要求完成本题任务']

def write_ipynb(path, code, title, minutes, score, sheet):
    steps = steps_of(sheet)
    cells = [{'cell_type': 'markdown', 'metadata': {},
              'source': [f'# {code} {title}\n', '\n', f'考核时间：{str(minutes).replace("min", "").strip()} 分钟　卷面分值：{score} 分\n', '\n',
                         '> 练习素材：本文件为代码框架，需按试题单要求补全。考场环境同样提供该框架。\n']},
             {'cell_type': 'markdown', 'metadata': {}, 'source': ['## 任务要求\n', '\n'] + [s + '\n' for s in steps]},
             {'cell_type': 'code', 'metadata': {}, 'execution_count': None, 'outputs': [],
              'source': ['import pandas as pd\n', 'import numpy as np\n', '\n', '# 按试题单要求逐项补全下方代码\n']}]
    for i, s in enumerate(steps, 1):
        cells.append({'cell_type': 'markdown', 'metadata': {}, 'source': [f'### （{i}）{s}\n']})
        cells.append({'cell_type': 'code', 'metadata': {}, 'execution_count': None, 'outputs': [],
                      'source': [f'# （{i}）在此处补全代码\n']})
    nb = {'cells': cells, 'metadata': {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
                                       'language_info': {'name': 'python', 'version': '3.10'}},
          'nbformat': 4, 'nbformat_minor': 5}
    json.dump(nb, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def write_docx(path, code, title, sheet):
    from docx import Document
    doc = Document()
    doc.add_heading(f'{code} {title}', level=1)
    doc.add_paragraph('准考证号：____________　身份证号后六位：____________')
    doc.add_heading('一、任务要求', level=2)
    for i, s in enumerate(steps_of(sheet), 1):
        doc.add_paragraph(f'（{i}）{s}')
    doc.add_heading('二、答题区', level=2)
    doc.add_paragraph('（在此填写你的答案）')
    fixed = datetime.datetime(2026, 1, 1)
    doc.core_properties.created = fixed
    doc.core_properties.modified = fixed
    doc.core_properties.last_modified_by = 'ai3-practice'
    doc.core_properties.author = 'ai3-practice'
    doc.save(path)

def write_labels(path, n):
    if n == 21:
        names = ['background', 'aeroplane', 'bicycle', 'bird', 'boat', 'bottle', 'bus', 'car', 'cat', 'chair',
                 'cow', 'diningtable', 'dog', 'horse', 'motorbike', 'person', 'pottedplant', 'sheep', 'sofa',
                 'train', 'tvmonitor']
    elif n == 5:
        names = ['daisy', 'dandelion', 'rose', 'sunflower', 'tulip']
    else:
        names = [f'class_{i:04d}' for i in range(n)]
    open(path, 'w', encoding='utf-8').write('\n'.join(names) + '\n')

def write_img(path, size):
    from PIL import Image
    w, h = size
    arr = (np.random.default_rng(zlib.crc32(path.encode()) % 2**31).random((h, w, 3)) * 255).astype('uint8')
    mode = 'RGB' if path.endswith(('.jpg', '.jpeg', '.png')) else 'L'
    Image.fromarray(arr, 'RGB').save(path, quality=92)

def write_onnx(path, spec):
    import onnx
    from onnx import helper, TensorProto, numpy_helper
    c, h, w, classes = spec
    r = np.random.default_rng(len(path) + classes)
    def const(name, arr):
        return numpy_helper.from_array(arr.astype('float32'), name)
    w1 = const('w1', r.normal(0, 0.1, (8, c, 3, 3)))
    b1 = const('b1', np.zeros(8))
    w2 = const('w2', r.normal(0, 0.1, (16, 8, 3, 3)))
    b2 = const('b2', np.zeros(16))
    w3 = const('w3', r.normal(0, 0.05, (16, classes)))
    b3 = const('b3', np.zeros(classes))
    nodes = [
        helper.make_node('Conv', ['input', 'w1', 'b1'], ['c1'], pads=[1, 1, 1, 1]),
        helper.make_node('Relu', ['c1'], ['r1']),
        helper.make_node('MaxPool', ['r1'], ['p1'], kernel_shape=[2, 2], strides=[2, 2]),
        helper.make_node('Conv', ['p1', 'w2', 'b2'], ['c2'], pads=[1, 1, 1, 1]),
        helper.make_node('Relu', ['c2'], ['r2']),
        helper.make_node('GlobalAveragePool', ['r2'], ['gap']),
        helper.make_node('Flatten', ['gap'], ['flat']),
        helper.make_node('Gemm', ['flat', 'w3', 'b3'], ['logits']),
        helper.make_node('Softmax', ['logits'], ['output'], axis=1),
    ]
    graph = helper.make_graph(nodes, 'practice-net',
                              [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, c, h, w])],
                              [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, classes])],
                              [w1, b1, w2, b2, w3, b3])
    model = helper.make_model(graph, producer_name='ai3-practice', opset_imports=[helper.make_opsetid('', 13)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    onnx.save(model, path)

# ---------------- 主流程 ----------------
os.makedirs(OUT, exist_ok=True)
manifest = {}
cache = {}
missing = []
titles = {i['code']: i for i in POOL}
for code, spec in ITEMS.items():
    item = titles[code]
    d = os.path.join(OUT, code)
    os.makedirs(d, exist_ok=True)
    names = []
    for fname, key in spec.get('data', []):
        if key not in cache:
            cache[key] = DATASETS[key]()
        df = cache[key][fname]
        df.to_csv(os.path.join(d, fname), index=False, encoding='utf-8-sig')
        names.append((fname, os.path.getsize(os.path.join(d, fname))))
    for fname in spec.get('xlsx', []):
        df = ds_smart(SMART[fname])
        df.to_excel(os.path.join(d, fname), index=False)
        names.append((fname, os.path.getsize(os.path.join(d, fname))))
    for fname, size in spec.get('img', []):
        write_img(os.path.join(d, fname), size)
        names.append((fname, os.path.getsize(os.path.join(d, fname))))
    for fname, n in spec.get('txt', []):
        write_labels(os.path.join(d, fname), n)
        names.append((fname, os.path.getsize(os.path.join(d, fname))))
    for fname, ospec in spec.get('onnx', []):
        p_onnx = os.path.join(d, fname)
        if os.environ.get('AI3_SKIP_ONNX'):
            if os.path.exists(p_onnx):
                names.append((fname, os.path.getsize(p_onnx)))
            continue
        write_onnx(p_onnx, ospec)
        names.append((fname, os.path.getsize(p_onnx)))
    if spec.get('ipynb'):
        f = f'{code}.ipynb'
        write_ipynb(os.path.join(d, f), code, item['title'], item['minutes'], item['score'], item['sheet'])
        names.append((f, os.path.getsize(os.path.join(d, f))))
    for fname in spec.get('docx', []):
        write_docx(os.path.join(d, fname), code, item['title'], item['sheet'])
        names.append((fname, os.path.getsize(os.path.join(d, fname))))
    if not names:
        missing.append(code)
        continue
    zp = os.path.join(OUT, code + '.zip')
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, _ in names:
            info = zipfile.ZipInfo(n, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, open(os.path.join(d, n), 'rb').read())
    manifest[code] = names
    print(code, len(names), 'files', sum(s for _, s in names) // 1024, 'KB')

lines = ["// 由 scripts/gen-ai-practice-assets.py 生成，勿手工修改", '',
         'export interface PracticalAsset {', '  name: string', '  label: string', '  bytes: number', '}', '',
         'export const AI_PRACTICAL_ASSETS: Record<string, PracticalAsset[]> = {']
LABELS = {'csv': '数据集', 'xlsx': '数据集', 'ipynb': '代码框架', 'docx': '答题卷', 'onnx': '模型文件',
          'txt': '标签文件', 'jpg': '测试图片', 'png': '测试图片'}
import re as _re
for code, names in manifest.items():
    lines.append(f"  '{code}': [")
    for n, s in names:
        ext = n.rsplit('.', 1)[-1].lower()
        lines.append(f"    {{ name: '{n}', label: '{LABELS.get(ext, '素材')}', bytes: {s} }},")
    lines.append('  ],')
lines.append('}')
lines.append('')
lines.append('export function practicalAssets(code: string): PracticalAsset[] {')
lines.append('  return AI_PRACTICAL_ASSETS[code] ?? []')
lines.append('}')
lines.append('')
open(MAN_TS, 'w', encoding='utf-8').write('\n'.join(lines))
print('manifest items', len(manifest), 'missing', missing)
