/* 自动生成：20 道实操代码题（3.2 / 2.1 / 2.2 / 1.1）逐空盲填检测题库。
 * 每道题的模板来自官方 .ipynb，所有标准答案已通过 Python ast.parse 语法校验。 */

export type CodeDrillStage = '3.2' | '2.1' | '2.2' | '1.1';

export interface CodeBlank {
  answer: string;
  alts?: string[];
}

export interface CodeDrillItem {
  code: string;
  stage: CodeDrillStage;
  title: string;
  examScore: number;
  codeScore: number;
  tip: string;
  /** 含 {{0}}, {{1}} ... 占位符的完整代码模板 */
  template: string;
  blanks: CodeBlank[];
}

export const CODE_DRILL_STAGES: { id: CodeDrillStage; label: string; badge: string; desc: string }[] = [
  { id: '3.2', label: '3.2 ONNX 图像推理', badge: '必考 20 分', desc: '5 题套路高度重复，优先吃透拿稳 16–20 分' },
  { id: '2.1', label: '2.1 数据清洗规范', badge: '必考 15 分', desc: 'pandas 清洗 + 标准化 + 划分 + 保存' },
  { id: '2.2', label: '2.2 机器学习建模', badge: '必考 20 分', desc: 'fit / predict / 保存模型 / 评估与调优' },
  { id: '1.1', label: '1.1 业务数据处理', badge: '抽考 25 分', desc: 'np.where / pd.cut / groupby / fillna / between' },
];

export const AI_PRACTICAL_CODE_DRILLS: CodeDrillItem[] = [
  {
    "code": "3.2.1",
    "stage": "3.2",
    "title": "图像识别评估系统交互流程设计（ResNet）",
    "examScore": 20,
    "codeScore": 13,
    "tip": "ResNet ONNX 标准流程：ort.InferenceSession → Image.open().convert('RGB') → preprocess_image(image) → session.run → scipy.special.softmax → np.argsort(probabilities[0])[-5:][::-1]",
    "template": "import onnxruntime as ort\nimport numpy as np\nimport scipy.special\nfrom PIL import Image\n\n\n# 预处理图像\ndef preprocess_image(image, resize_size=256, crop_size=224, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]):\n  image = image.resize((resize_size, resize_size), Image.BILINEAR)\n  w, h = image.size\n  left = (w - crop_size) / 2\n  top = (h - crop_size) / 2\n  image = image.crop((left, top, left + crop_size, top + crop_size))\n  image = np.array(image).astype(np.float32)\n  image = image / 255.0\n  image = (image - mean) / std\n  image = np.transpose(image, (2, 0, 1))\n  image = image.reshape((1,) + image.shape)\n  return image\n\n\n# 模型加载 2分\nsession = {{0}}\n\n\n# 加载类别标签\nlabels_path = 'labels.txt'\nwith open(labels_path) as f:\n  labels = [line.strip() for line in f.readlines()]\n\n\n# 获取模型输入和输出的名称\ninput_name = session.get_inputs()[0].name\noutput_name = session.get_outputs()[0].name\n\n\n# 加载图片 2分\nimage = {{1}}('RGB')\n\n\n# 预处理图片 2分\nprocessed_image = {{2}}\n\n\n# 确保输入数据是 float32 类型\nprocessed_image = processed_image.astype(np.float32)\n\n\n# 进行图片识别 2分\noutput = {{3}}([output_name], {input_name: processed_image})[0]\n\n\n# 应用 softmax 函数获取概率 2分\nprobabilities = {{4}}(output, axis=-1)\n\n\n# 获取最高的5个概率和对应的类别索引 3分\ntop5_idx = {{5}}[-5:][::-1]\ntop5_prob = {{6}}\n\n\n# 打印结果\nprint(\"Top 5 predicted classes:\")\nfor i in range(5):\n  print(f\"{i+1}: {labels[top5_idx[i]]} - Probability: {top5_prob[i]}\")",
    "blanks": [
      {
        "answer": "ort.InferenceSession('resnet.onnx')"
      },
      {
        "answer": "Image.open('img_test.jpg').convert"
      },
      {
        "answer": "preprocess_image(image)"
      },
      {
        "answer": "session.run"
      },
      {
        "answer": "scipy.special.softmax"
      },
      {
        "answer": "np.argsort(probabilities[0])"
      },
      {
        "answer": "probabilities[0][top5_idx]"
      }
    ]
  },
  {
    "code": "3.2.2",
    "stage": "3.2",
    "title": "手写数字识别系统交互流程设计（MNIST）",
    "examScore": 20,
    "codeScore": 18,
    "tip": "注意本题顶部是 import onnxruntime（没写 as ort）！灰度图 convert('L') → resize((28, 28)) → np.array → 两次 np.expand_dims(..., axis=0) → ort_session.get_inputs()[0].name → np.argmax(ort_outs[0])",
    "template": "import onnxruntime\nimport numpy as np\nfrom PIL import Image\n\n\n# 加载ONNX模型  2分\nort_session = {{0}}\n\n\n# 加载图像 2分\nimage = {{1}}('L')  # 转为灰度图\n\n\n#图像预处理 \nimage = {{2}}((28, 28))  # 调整大小为MNIST模型的输入尺寸2分\nimage_array = {{3}}({{4}}, dtype=np.float32)  # 转为numpy数组2分\nimage_array = {{5}}({{6}}, axis=0)  # 添加batch维度2分\nimage_array = {{7}}({{8}}, axis=0)  # 添加通道维度2分\n\n\n#返回模型输入列表 2分\nort_inputs = {{{9}}()[0].name: image_array}\n# 执行预测 2分\nort_outs = {{10}}(None, ort_inputs)\n\n\n# 获取预测结果 2分\npredicted_class = {{11}}\n\n\n# 输出预测结果\nprint(f\"Predicted class: {predicted_class}\")",
    "blanks": [
      {
        "answer": "onnxruntime.InferenceSession('mnist.onnx')"
      },
      {
        "answer": "Image.open('img_test.png').convert"
      },
      {
        "answer": "image.resize"
      },
      {
        "answer": "np.array"
      },
      {
        "answer": "image"
      },
      {
        "answer": "np.expand_dims"
      },
      {
        "answer": "image_array"
      },
      {
        "answer": "np.expand_dims"
      },
      {
        "answer": "image_array"
      },
      {
        "answer": "ort_session.get_inputs"
      },
      {
        "answer": "ort_session.run"
      },
      {
        "answer": "np.argmax(ort_outs[0])"
      }
    ]
  },
  {
    "code": "3.2.3",
    "stage": "3.2",
    "title": "面部表情识别系统交互流程设计（FERPlus）",
    "examScore": 20,
    "codeScore": 19,
    "tip": "必背 8 类情感映射字典 + list(emotion_table.keys())[predicted_label]；考场运行如报 Image.ANTIALIAS 错误，改成 Image.BILINEAR 或删掉该参数！",
    "template": "# 导入必要的库\nimport numpy as np\nfrom PIL import Image\nimport onnxruntime as ort\n\n\n# 定义预处理函数，用于将图片转换为模型所需的输入格式\ndef preprocess(image_path):\n    input_shape = (1, 1, 64, 64)    # 模型输入期望的形状，这里是 (N, C, H, W)，N=batch size, C=channels, H=height, W=width\n    img = Image.open(image_path).convert('L')    # 打开图像文件并将其转换为灰度图  1分\n    img = img.resize((64, 64), Image.ANTIALIAS)    # 调整图像大小到模型输入所需的尺寸\n    img_data = np.array(img, dtype=np.float32)    # 将PIL图像对象转换为numpy数组，并确保数据类型是float32\n    # 调整数组的形状以匹配模型输入的形状\n    img_data = np.expand_dims(img_data, axis=0)  # 添加 batch 维度\n    img_data = np.expand_dims(img_data, axis=1)  # 添加 channel 维度\n    assert img_data.shape == input_shape, f\"Expected shape {input_shape}, but got {img_data.shape}\"    # 确保最终的形状与模型输入要求的形状一致\n    return img_data    # 返回预处理后的图像数据\n\n\n# 定义情感类别与数字标签的映射表 3分\nemotion_table = {{{0}}}\n\n\n# 加载模型 3分\nort_session = {{1}}    # 使用onnxruntime创建一个会话，用于加载并运行模型\n\n\n# 加载本地图片并进行预处理 3分\ninput_data = {{2}}\n\n\n# 准备输入数据，确保其符合模型输入的要求\nort_inputs = {ort_session.get_inputs()[0].name: input_data}    # ort_session.get_inputs()[0].name 是获取模型的第一个输入的名字\n\n\n# 运行模型，进行预测 3分\nort_outs = {{3}}(None, {{4}})\n\n\n# 解码模型输出，找到预测概率最高的情感类别 3分\npredicted_label = {{5}}(ort_outs[0])\n\n\n# 根据预测的标签找到对应的情感名称 3分\npredicted_emotion = {{6}}[predicted_label]\n\n\n# 输出预测的情感\nprint(f\"Predicted emotion: {predicted_emotion}\")",
    "blanks": [
      {
        "answer": "'neutral':0, 'happiness':1, 'surprise':2, 'sadness':3, 'anger':4, 'disgust':5, 'fear':6, 'contempt':7"
      },
      {
        "answer": "ort.InferenceSession('emotion-ferplus.onnx')"
      },
      {
        "answer": "preprocess('img_test.png')"
      },
      {
        "answer": "ort_session.run"
      },
      {
        "answer": "ort_inputs"
      },
      {
        "answer": "np.argmax"
      },
      {
        "answer": "list(emotion_table.keys())"
      }
    ]
  },
  {
    "code": "3.2.4",
    "stage": "3.2",
    "title": "花朵智能识别系统交互流程设计",
    "examScore": 20,
    "codeScore": 18,
    "tip": "和 3.2.1 几乎同构！区别在于多了 with open('labels.txt') as f，且最后取 Top-1：np.argmax(accuracy[0])、accuracy[0, predicted_idx] * 100、labels[predicted_idx]",
    "template": "import onnxruntime as ort\nimport numpy as np\nimport scipy.special\nfrom PIL import Image\n\n\n# 预处理图像\ndef preprocess_image(image, resize_size=256, crop_size=224, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]):\n    image = image.resize((resize_size, resize_size), Image.BILINEAR)\n    w, h = image.size\n    left = (w - crop_size) / 2\n    top = (h - crop_size) / 2\n    image = image.crop((left, top, left + crop_size, top + crop_size))\n    image = np.array(image).astype(np.float32)\n    image = image / 255.0\n    image = (image - mean) / std\n    image = np.transpose(image, (2, 0, 1))\n    image = image.reshape((1,) + image.shape)\n    return image\n\n\n# 加载模型  2分\nsession = {{0}}\n\n\n# 加载类别标签 2分\nwith {{1}} as f:\n    labels = [line.strip() for line in f.readlines()]\n\n\n# 获取模型输入和输出的名称\ninput_name = session.get_inputs()[0].name\noutput_name = session.get_outputs()[0].name\n\n\n# 加载图片  2分\nimage = {{2}}('RGB')\n\n\n# 预处理图片  2分\nprocessed_image = {{3}}\n\n\n# 确保输入数据是 float32 类型\nprocessed_image = processed_image.astype(np.float32)\n\n\n# 进行图片识别  2分\noutput = {{4}}([output_name], {input_name: processed_image})[0]\n\n\n# 应用 softmax 函数获取识别分类后的准确率  2分\naccuracy = {{5}}(output, axis=-1)\n\n\n# 获取预测的类别索引\npredicted_idx =  {{6}}\n\n\n# 获取预测的准确值（转换为百分比）\nprob_percentage =  {{7}}\n\n\n# 获取预测的类别标签\npredicted_label = {{8}}\n\n\n# 输出预测结果，包含百分比形式的概率\nprint(f\"Predicted class: {predicted_label}, Accuracy: {prob_percentage:.2f}%\")",
    "blanks": [
      {
        "answer": "ort.InferenceSession('flower-detection.onnx')"
      },
      {
        "answer": "open('labels.txt')",
        "alts": [
          "open('labels.txt', 'r')",
          "open('labels.txt', encoding='utf-8')"
        ]
      },
      {
        "answer": "Image.open('flower_test.png').convert"
      },
      {
        "answer": "preprocess_image(image)"
      },
      {
        "answer": "session.run"
      },
      {
        "answer": "scipy.special.softmax"
      },
      {
        "answer": "np.argmax(accuracy[0])",
        "alts": [
          "np.argmax(accuracy)"
        ]
      },
      {
        "answer": "accuracy[0, predicted_idx] * 100",
        "alts": [
          "accuracy[0][predicted_idx] * 100"
        ]
      },
      {
        "answer": "labels[predicted_idx]"
      }
    ]
  },
  {
    "code": "3.2.5",
    "stage": "3.2",
    "title": "人脸AI智能检测系统交互流程设计（OpenCV + ONNX）",
    "examScore": 20,
    "codeScore": 17,
    "tip": "OpenCV 版 ONNX：name.strip()、ort.InferenceSession、ort_session.get_inputs、os.makedirs(result_path)、cv2.imread(img_path)、cv2.resize(image, (320, 240))、np.array([127, 127, 127])、np.expand_dims、ort_session.run",
    "template": "import os\nimport time\nimport cv2\nimport numpy as np\nimport vision.utils.box_utils_numpy as box_utils\nimport onnxruntime as ort\n\n# 定义预测函数，对模型输出的边界框和置信度进行后处理\ndef predict(width, height, confidences, boxes, prob_threshold, iou_threshold=0.3, top_k=-1):\n    boxes = boxes[0]\n    confidences = confidences[0]\n    picked_box_probs = []\n    picked_labels = []\n    for class_index in range(1, confidences.shape[1]):\n        probs = confidences[:, class_index]\n        mask = probs > prob_threshold\n        probs = probs[mask]\n        if probs.shape[0] == 0:\n            continue\n        subset_boxes = boxes[mask, :]\n        box_probs = np.concatenate([subset_boxes, probs.reshape(-1, 1)], axis=1)\n        box_probs = box_utils.hard_nms(box_probs,\n                                       iou_threshold=iou_threshold,\n                                       top_k=top_k,\n                                       )\n        picked_box_probs.append(box_probs)\n        picked_labels.extend([class_index] * box_probs.shape[0])\n    if not picked_box_probs:\n        return np.array([]), np.array([]), np.array([])\n    picked_box_probs = np.concatenate(picked_box_probs)\n    picked_box_probs[:, 0] *= width\n    picked_box_probs[:, 1] *= height\n    picked_box_probs[:, 2] *= width\n    picked_box_probs[:, 3] *= height\n    return picked_box_probs[:, :4].astype(np.int32), np.array(picked_labels), picked_box_probs[:, 4]\n\n# 从标签文件中读取每一行，并去除行首尾的空白字符，得到类别名称列表 2分\nclass_names = [{{0}} for name in open('voc-model-labels.txt').readlines()]\n\n# 创建 ONNX Runtime 的推理会话，用于运行模型进行推理 2分\nort_session = {{1}}('version-RFB-320.onnx')\n\n# 获取模型输入的名称 2分\ninput_name = {{2}}()[0].name\n\n# 定义保存检测结果图像的目录路径\nresult_path = \"./detect_imgs_results_onnx\"\n\n# 定义置信度阈值，用于筛选出置信度较高的检测结果\nthreshold = 0.7\n# 定义存储待检测图像的目录路径\npath = \"imgs\"\n# 用于统计所有图像中检测到的目标框总数，初始化为 0\nsum = 0\n\n# 如果保存结果的目录不存在，则创建该目录 2分\nif not os.path.exists(result_path):\n    os.{{3}}\n    \n# 获取指定目录下的所有文件和文件夹名称列表\nlistdir = os.listdir(path)\n\n# 遍历目录下的每个文件\nfor file_path in listdir:\n    # 拼接图像文件的完整路径\n    img_path = os.path.join(path, file_path)\n    # 使用 OpenCV 读取图像文件 2分\n    orig_image = {{4}}\n    # 将图像从 BGR 颜色空间转换为 RGB 颜色空间（许多模型要求输入为 RGB 格式）\n    image = cv2.cvtColor(orig_image, cv2.COLOR_BGR2RGB)\n    # 将图像调整为 320x240 的尺寸（符合模型输入的尺寸要求） 2分\n    image = {{5}}({{6}}, (320, 240))\n    # 定义图像归一化的均值数组 2分\n    image_mean = {{7}}([127, 127, 127])\n    # 对图像进行归一化处理，减去均值并除以 128\n    image = (image - image_mean) / 128\n    # 将图像的维度从 (高度, 宽度, 通道数) 转换为 (通道数, 高度, 宽度)\n    image = np.transpose(image, [2, 0, 1])\n    # 在第一个维度上扩展一个维度，将图像变为 (1, 通道数, 高度, 宽度)，以符合模型输入的维度要求  1分\n    image = {{8}}(image, axis=0)\n    # 将图像数据类型转换为 float32 类型\n    image = image.astype(np.float32)\n    # 记录开始时间，用于计算模型推理的耗时\n    time_time = time.time()\n    # 使用 ONNX Runtime 运行模型，输入图像数据，得到模型输出的置信度和边界框  2分\n    confidences, boxes = {{9}}(None, {input_name: image})\n    # 计算并打印模型推理的耗时\n    print(\"cost time:{}\".format(time.time() - time_time))\n    # 调用 predict 函数对模型输出的边界框和置信度进行后处理，得到最终的边界框、类别标签和置信度\n    boxes, labels, probs = predict(orig_image.shape[1], orig_image.shape[0], confidences, boxes, threshold)\n    # 遍历每个检测到的目标框\n    for i in range(boxes.shape[0]):\n        # 获取当前目标框的坐标\n        box = boxes[i, :]\n        # 生成当前目标框的标签字符串，包含类别名称和置信度\n        label = f\"{class_names[labels[i]]}: {probs[i]:.2f}\"\n\n        # 在原始图像上绘制目标框，颜色为 (255, 255, 0)，线条粗细为 4\n        cv2.rectangle(orig_image, (box[0], box[1]), (box[2], box[3]), (255, 255, 0), 4)\n        # 将绘制了目标框的图像保存到结果目录中\n        cv2.imwrite(os.path.join(result_path, file_path), orig_image)\n    # 累加当前图像中检测到的目标框数量到总数中\n    sum += boxes.shape[0]\n# 打印所有图像中检测到的目标框总数\nprint(\"sum:{}\".format(sum))",
    "blanks": [
      {
        "answer": "name.strip()"
      },
      {
        "answer": "ort.InferenceSession"
      },
      {
        "answer": "ort_session.get_inputs"
      },
      {
        "answer": "makedirs(result_path)",
        "alts": [
          "mkdir(result_path)",
          "makedirs(result_path, exist_ok=True)"
        ]
      },
      {
        "answer": "cv2.imread(img_path)"
      },
      {
        "answer": "cv2.resize"
      },
      {
        "answer": "image"
      },
      {
        "answer": "np.array"
      },
      {
        "answer": "np.expand_dims"
      },
      {
        "answer": "ort_session.run"
      }
    ]
  },
  {
    "code": "2.1.1",
    "stage": "2.1",
    "title": "智慧交通燃油效率数据清洗和标注流程设计",
    "examScore": 15,
    "codeScore": 10,
    "tip": "核心骨架：read_csv → head() → isnull().sum() → dropna() → pd.to_numeric(..., errors='coerce') → scaler.fit_transform → train_test_split(X, y, train_size=0.8, random_state=42) → to_csv(..., index=False)",
    "template": "import pandas as pd\n\n# 加载数据集并显示数据集的前五行 1分\ndata = {{0}}\nprint(\"数据集的前五行:\")\nprint({{1}})\n\n# 显示每一列的数据类型\nprint(data.dtypes)\n\n# 检查缺失值并删除缺失值所在的行  2分\nprint(\"\\n检查缺失值:\")\nprint({{2}}.{{3}}.{{4}})  \ndata = {{5}}\n\n# 将 'horsepower' 列转换为数值类型，并（删除）处理转换中的异常值 1分\ndata['horsepower'] = {{6}}(data['horsepower'], errors='coerce')\ndata = {{7}}\n\n# 显示每一列的数据类型\nprint(data.horsepower.dtypes)\n\n# 检查清洗后的缺失值\nprint(\"\\n检查清洗后的缺失值:\")\nprint(data.isnull().sum())\n\nfrom sklearn.preprocessing import StandardScaler\n# 对数值型数据进行标准化处理 1分\nnumerical_features = ['displacement', 'horsepower', 'weight', 'acceleration']\nscaler = StandardScaler()\ndata[numerical_features] = {{8}}\n\nfrom sklearn.model_selection import train_test_split\n# 选择特征、自变量和目标变量 2分\nselected_features = {{9}}\nX = {{10}}\ny = {{11}}\n\n# 划分数据集为训练集和测试集（训练集占8成） 1分\nX_train, X_test, y_train, y_test = {{12}}({{13}}, random_state=42)\n\n\n# 将特征和目标变量合并到一个数据框中\ncleaned_data = X.copy()\ncleaned_data['mpg'] = y\n\n# 保存清洗和处理后的数据（不存储额外的索引号） 1分\n{{14}}('2.1.1_cleaned_data.csv', {{15}})\n\n# 打印消息指示文件已保存\nprint(\"\\n清洗后的数据已保存到 2.1.1_cleaned_data.csv\")",
    "blanks": [
      {
        "answer": "pd.read_csv('auto-mpg.csv')"
      },
      {
        "answer": "data.head()"
      },
      {
        "answer": "data"
      },
      {
        "answer": "isnull()",
        "alts": [
          "isna()"
        ]
      },
      {
        "answer": "sum()"
      },
      {
        "answer": "data.dropna()"
      },
      {
        "answer": "pd.to_numeric"
      },
      {
        "answer": "data.dropna()",
        "alts": [
          "data.dropna(subset=['horsepower'])"
        ]
      },
      {
        "answer": "scaler.fit_transform(data[numerical_features])"
      },
      {
        "answer": "['cylinders', 'displacement', 'horsepower', 'weight', 'acceleration', 'model year', 'origin']",
        "alts": [
          "['displacement', 'horsepower', 'weight', 'acceleration']"
        ]
      },
      {
        "answer": "data[selected_features]"
      },
      {
        "answer": "data['mpg']"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "cleaned_data.to_csv"
      },
      {
        "answer": "index=False"
      }
    ]
  },
  {
    "code": "2.1.2",
    "stage": "2.1",
    "title": "低碳生活行为影响因素数据清洗和标注流程设计",
    "examScore": 15,
    "codeScore": 10,
    "tip": "读 Excel 用 pd.read_excel；行数用 data.shape[0] 或 len(data)；去重 drop_duplicates()；合并 X 和 y 用 pd.concat([X, y], axis=1)",
    "template": "import pandas as pd\n#读取一个Excel文件，并将读取到的数据存储在变量data中\ndata = {{0}}\n#打印出数据集的前5行\nprint(data.head())\n\n#处理数据集中的缺失值\ninitial_row_count = {{1}}   #处理前的数据行数\ndata = {{2}}                #删除缺失值所在行\nfinal_row_count = {{3}}     #处理后的数据行数\nprint(f'处理后数据行数: {final_row_count}, 删除的行数: {initial_row_count - final_row_count}')\n\n#删除重复行\ndata = {{4}}\n\nfrom sklearn.preprocessing import StandardScaler\nnumerical_features = ['4.您的月生活费○≦1,000元   ○1,001-2,000元   ○2,001-3,000元   ○≧3,001元']\nscaler = StandardScaler()\ndata[numerical_features] = {{5}}\n\n#选择特征\nselected_features = [{{6}}]\nX = {{7}}\n\n# 创建目标变量\ny = {{8}}\n\nfrom sklearn.model_selection import train_test_split\n# 数据划分（测试集取20%）\nX_train, X_test, y_train, y_test = {{9}}({{10}}, random_state=42)\n\n# 合并处理后得数据，并将其保存（保存中不用额外创建索引）\ncleaned_data = {{11}}({{12}}, axis=1)\n{{13}}('2.1.2_cleaned_data.csv', {{14}})",
    "blanks": [
      {
        "answer": "pd.read_excel('大学生低碳生活行为的影响因素数据集.xlsx')"
      },
      {
        "answer": "data.shape[0]",
        "alts": [
          "len(data)"
        ]
      },
      {
        "answer": "data.dropna()"
      },
      {
        "answer": "data.shape[0]",
        "alts": [
          "len(data)"
        ]
      },
      {
        "answer": "data.drop_duplicates()"
      },
      {
        "answer": "scaler.fit_transform(data[numerical_features])"
      },
      {
        "answer": "'1.您的性别○男性   ○女性', '2.您的年级○大一   ○大二   ○大三   ○大四', '3.您的生源地○农村   ○城镇（乡镇）   ○地县级城市  ○省会城市及直辖市', '4.您的月生活费○≦1,000元   ○1,001-2,000元   ○2,001-3,000元   ○≧3,001元', '5.您进行过绿色低碳的相关生活方式吗?', '6.您觉得“低碳”，与你的生活关系密切吗？', '7.低碳生活是否会成为未来的主流生活方式？', '8.您是否认为低碳生活会提高您的生活质量？'"
      },
      {
        "answer": "data[selected_features]"
      },
      {
        "answer": "data['低碳行为积极性']"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "pd.concat"
      },
      {
        "answer": "[X, y]"
      },
      {
        "answer": "cleaned_data.to_csv"
      },
      {
        "answer": "index=False"
      }
    ]
  },
  {
    "code": "2.1.3",
    "stage": "2.1",
    "title": "信用评分模型数据清洗和标注流程设计（IQR异常值）",
    "examScore": 15,
    "codeScore": 10,
    "tip": "重点记 IQR 四分位法：data[numeric_cols].quantile(0.25/0.75)、IQR = Q3 - Q1、data_cleaned.duplicated()、MinMaxScaler fit_transform、target_variable = 'SeriousDlqin2yrs'",
    "template": "import pandas as pd\n\n# 加载数据\ndata = {{0}}\n\n# 显示前五行的数据\n{{1}}\n\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\n# 设置图像尺寸\nplt.figure(figsize=(12, 8))\n\n# 识别数值列用于箱线图\nnumeric_cols = data.select_dtypes(include=['float64', 'int64']).columns\n\n# 创建箱线图\nfor i, col in enumerate(numeric_cols, 1):\n    plt.subplot(3, 4, i)\n    sns.boxplot(x=data[col])\n    plt.title(col)\n\nplt.tight_layout()\nplt.show()\n\n# 使用IQR处理异常值\nQ1 = {{2}}(0.25)\nQ3 = {{3}}(0.75)\nIQR = {{4}}\n\n# 移除异常值\ndata_cleaned = data[~((data[numeric_cols] < (Q1 - 1.5 * {{5}})) | (data[numeric_cols] > (Q3 + 1.5 * {{6}}))).any(axis=1)]\n\n# 检查处理重复值\nduplicates = {{7}}()\nnum_duplicates = duplicates.sum()\ndata_cleaned = data_cleaned[~duplicates]\n\nprint(f'删除的重复行数: {num_duplicates}')\n\n#对数据进行归一化处理\nfrom sklearn.preprocessing import MinMaxScaler\n\nscaler = MinMaxScaler()\ndata_cleaned[numeric_cols] = {{8}}\n\n# 设定目标变量\ntarget_variable = {{9}}\n\nfrom sklearn.model_selection import train_test_split\n\n# 定义特征和目标\nX = {{10}}(columns=[{{11}}])   #1分\ny = {{12}}                         #1分\n\n# 划分数据（训练集占80%）\nX_train, X_test, y_train, y_test = {{13}}({{14}}, random_state=42)\n\n# 显示划分后的数据形状\nprint(f'训练数据形状: {X_train.shape}')\nprint(f'测试数据形状: {X_test.shape}')\n\n# 保存清洗后的数据到CSV\ncleaned_file_path = '2.1.3_cleaned_data.csv'\n{{15}}({{16}}, index=False)",
    "blanks": [
      {
        "answer": "pd.read_csv('finance数据集.csv')"
      },
      {
        "answer": "print(data.head())",
        "alts": [
          "data.head()"
        ]
      },
      {
        "answer": "data[numeric_cols].quantile"
      },
      {
        "answer": "data[numeric_cols].quantile"
      },
      {
        "answer": "Q3 - Q1"
      },
      {
        "answer": "IQR"
      },
      {
        "answer": "IQR"
      },
      {
        "answer": "data_cleaned.duplicated"
      },
      {
        "answer": "scaler.fit_transform(data_cleaned[numeric_cols])"
      },
      {
        "answer": "'SeriousDlqin2yrs'"
      },
      {
        "answer": "data_cleaned.drop"
      },
      {
        "answer": "target_variable",
        "alts": [
          "'SeriousDlqin2yrs'"
        ]
      },
      {
        "answer": "data_cleaned[target_variable]",
        "alts": [
          "data_cleaned['SeriousDlqin2yrs']"
        ]
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "data_cleaned.to_csv"
      },
      {
        "answer": "cleaned_file_path",
        "alts": [
          "'2.1.3_cleaned_data.csv'"
        ]
      }
    ]
  },
  {
    "code": "2.1.4",
    "stage": "2.1",
    "title": "医疗研究数据清洗和标注设计（gbk + 日期差 + 绘图）",
    "examScore": 15,
    "codeScore": 10,
    "tip": "必记 4 个特色操作：encoding='gbk'、data.rename(columns={'病人ID': '患者ID'}, inplace=True)、(data['诊断日期'] - data['就诊日期']).dt.days、treatment_outcome_distribution.plot(kind='bar', stacked=True) 和 plt.scatter",
    "template": "import pandas as pd\n\n# 加载数据集并指定编码为gbk\ndata = {{0}}\n\n# 查看数据类型\nprint(data.dtypes)\n# 查看表结构基本信息\nprint({{1}})\n\n# 显示每一列的空缺值数量\nprint(data.isnull().sum())\n\n# 规范日期格式\ndata['就诊日期'] = pd.to_datetime(data['就诊日期'])\ndata['诊断日期'] = pd.to_datetime(data['诊断日期'])\n\n# 修改列名\n{{2}}({{3}}, inplace=True)\n\n# 查看修改后的表结构\nprint(data.head())\n\nfrom datetime import datetime\n\n# 增加诊断延迟和病程列\ndata['诊断延迟'] = {{4}}.dt.days\ndata['病程'] = (datetime(2024, 9, 1) - data['诊断日期']).dt.days\n\n# 删除不合理的数据\ndata = {{5}}[({{6}} >= 0) & ({{7}} > 0) & ({{8}} < 120)]\n\n# 查看修改后的数据\nprint(data.describe())\n\n# 删除重复值并记录删除的行数\ninitial_rows = data.shape[0]\n{{9}}(inplace=True)\ndeleted_rows = initial_rows - data.shape[0]\n\nprint(f'删除的重复行数: {deleted_rows}')\n\nfrom sklearn.preprocessing import MinMaxScaler\n\n# 对需要归一化的列进行处理\nscaler = MinMaxScaler()\ncolumns_to_normalize = [{{10}}]\ndata[columns_to_normalize] = {{11}}\n\n# 查看归一化后的数据\nprint(data.head())\n\nimport matplotlib.pyplot as plt\nimport matplotlib.font_manager as fm\n\n\n# 统计治疗结果分布\ntreatment_outcome_distribution = data.groupby('疾病类型')['治疗结果'].value_counts().unstack()\n\n# 设置中文字体\nfont_path = 'C:/Windows/Fonts/simhei.ttf'  # 根据你的系统调整字体路径\nmy_font = fm.FontProperties(fname=font_path)\n\n# 绘制柱状图\n{{12}}({{13}}, stacked=True)\nplt.title('不同疾病类型的治疗结果分布', fontproperties=my_font)\nplt.xlabel('疾病类型', fontproperties=my_font)\nplt.ylabel('治疗结果数量', fontproperties=my_font)\nplt.xticks(fontproperties=my_font)  # 设置x轴刻度标签的字体\nplt.yticks(fontproperties=my_font)  # 设置y轴刻度标签的字体\nplt.legend(prop=my_font)  # 设置图例字体\nplt.show()\n\n# 绘制散点图\n{{14}}({{15}}, {{16}})\nplt.title('年龄和疾病严重程度的关系', fontproperties=my_font)\nplt.xlabel('年龄', fontproperties=my_font)\nplt.ylabel('疾病严重程度', fontproperties=my_font)\nplt.xticks(fontproperties=my_font)  # 设置x轴刻度标签的字体\nplt.yticks(fontproperties=my_font)  # 设置y轴刻度标签的字体\nplt.legend(prop=my_font)  # 设置图例字体\nplt.show()\n\n# 保存处理后得数据\noutput_path = '2.1.4_cleaned_data.csv'\n{{17}}({{18}}, index=False)",
    "blanks": [
      {
        "answer": "pd.read_csv('medical_data.csv', encoding='gbk')"
      },
      {
        "answer": "data.info()"
      },
      {
        "answer": "data.rename"
      },
      {
        "answer": "columns={'病人ID': '患者ID'}"
      },
      {
        "answer": "(data['诊断日期'] - data['就诊日期'])"
      },
      {
        "answer": "data"
      },
      {
        "answer": "data['诊断延迟']"
      },
      {
        "answer": "data['年龄']"
      },
      {
        "answer": "data['年龄']"
      },
      {
        "answer": "data.drop_duplicates"
      },
      {
        "answer": "'年龄', '体重', '身高'"
      },
      {
        "answer": "scaler.fit_transform(data[columns_to_normalize])"
      },
      {
        "answer": "treatment_outcome_distribution.plot"
      },
      {
        "answer": "kind='bar'"
      },
      {
        "answer": "plt.scatter"
      },
      {
        "answer": "data['年龄']"
      },
      {
        "answer": "data['疾病严重程度']"
      },
      {
        "answer": "data.to_csv"
      },
      {
        "answer": "output_path",
        "alts": [
          "'2.1.4_cleaned_data.csv'"
        ]
      }
    ]
  },
  {
    "code": "2.1.5",
    "stage": "2.1",
    "title": "健康与营养咨询数据预处理与数据规范设计",
    "examScore": 15,
    "codeScore": 10,
    "tip": "重点：pd.to_numeric(data_cleaned['Your age'], errors='coerce')、astype(int)、LabelEncoder().fit_transform、exercise_frequency_counts.plot.pie(...)、train_test_split(data_filled, test_size=0.2, random_state=42)",
    "template": "import pandas as pd\n\n# 加载数据集\ndata = {{0}}\n\n# 查看表结构基本信息\nprint({{1}})\n\n# 显示每一列的空缺值数量\nprint({{2}})\n\n# 删除含有缺失值的行\ndata_cleaned = {{3}}\n\n# 转换 'Your age' 列的数据类型为整数类型，并处理异常值\ndata_cleaned.loc[:, 'Your age'] = {{4}}({{5}}, errors='coerce')\ndata_cleaned = data_cleaned.dropna(subset=['Your age'])\ndata_cleaned = data_cleaned[data_cleaned['Your age'] >= 0]\ndata_cleaned.loc[:, 'Your age'] = data_cleaned['Your age'].{{6}}\n\nprint(data_cleaned['Your age'].dtype)\n\n# 检查和删除重复值\nduplicates_removed = data_cleaned.duplicated().sum()\ndata_cleaned = {{7}}\n\nprint(f\"Removed {duplicates_removed} duplicate rows\")\n\nfrom sklearn.preprocessing import LabelEncoder\n\n# 归一化 'How do you describe your current level of fitness ?' 列\nlabel_encoder = LabelEncoder()\ndata_cleaned[{{8}}] = {{9}}\n\nprint(data_cleaned['How do you describe your current level of fitness ?'].unique())\n\nfrom sklearn.preprocessing import LabelEncoder\nimport matplotlib.pyplot as plt\n\n# 去掉列名中的空格\ndata.columns = data.columns.str.strip()\n# 显示数据集的列名\nprint(data.columns)\n\n# 删除包含缺失值的行\ndata_cleaned = data.dropna(subset=['How often do you exercise?'])\n\n# 统计不同健身频率的分布情况\nexercise_frequency_counts = data_cleaned['How often do you exercise?'].value_counts()\n\n# 绘制饼图\nplt.figure(figsize=(10, 6))\n{{10}}(autopct='%1.1f%%', startangle=90, colors=plt.cm.Paired.colors)\nplt.title('Distribution of Exercise Frequency')\nplt.ylabel('')\nplt.show()\n\nimport pandas as pd\nfrom sklearn.model_selection import train_test_split\nimport matplotlib.pyplot as plt\n\n# 填充缺失值\ndata_filled = data.apply(lambda x: x.fillna(x.mode()[0]))\n\n# 划分数据（测试集占比20%）\ntrain_data, test_data = {{11}}({{12}}, random_state=42)\n\n# 保存处理后的数据\ncleaned_file_path = '{{13}}'\n{{14}}({{15}}, index=False)",
    "blanks": [
      {
        "answer": "pd.read_csv('健康咨询客户数据集.csv')",
        "alts": [
          "pd.read_csv('健康咨询客户数据集.csv', encoding='gbk')"
        ]
      },
      {
        "answer": "data.info()"
      },
      {
        "answer": "data.isnull().sum()",
        "alts": [
          "data.isna().sum()"
        ]
      },
      {
        "answer": "data.dropna()"
      },
      {
        "answer": "pd.to_numeric"
      },
      {
        "answer": "data_cleaned['Your age']",
        "alts": [
          "data['Your age']"
        ]
      },
      {
        "answer": "astype(int)"
      },
      {
        "answer": "data_cleaned.drop_duplicates()"
      },
      {
        "answer": "'How do you describe your current level of fitness ?'"
      },
      {
        "answer": "label_encoder.fit_transform(data_cleaned['How do you describe your current level of fitness ?'])"
      },
      {
        "answer": "exercise_frequency_counts.plot.pie"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "data_filled, test_size=0.2",
        "alts": [
          "data_filled, train_size=0.8"
        ]
      },
      {
        "answer": "2.1.5_cleaned_data.csv"
      },
      {
        "answer": "data_filled.to_csv",
        "alts": [
          "data_cleaned.to_csv"
        ]
      },
      {
        "answer": "cleaned_file_path",
        "alts": [
          "'2.1.5_cleaned_data.csv'"
        ]
      }
    ]
  },
  {
    "code": "2.2.1",
    "stage": "2.2",
    "title": "智能信用评分 Logistic 回归模型开发与测试（含 SMOTE）",
    "examScore": 20,
    "codeScore": 17,
    "tip": "标准分类流水线：LogisticRegression(max_iter=1000) → fit → pickle.dump(model, file) → predict → (y_test == y_pred).mean() → smote.fit_resample(X_train, y_train) → 重新 fit & predict",
    "template": "import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LogisticRegression\nimport pickle\nfrom sklearn.metrics import classification_report\nfrom imblearn.over_sampling import SMOTE\n\n# 加载数据\ndata = {{0}}\n\n# 显示前五行的数据\nprint({{1}})\n\n# 选择自变量和因变量\nX = data.drop(['SeriousDlqin2yrs', 'Unnamed: 0'], axis=1)\ny = data['SeriousDlqin2yrs']\n\n# 分割训练集和测试集（测试集20%）\nX_train, X_test, y_train, y_test = {{2}}({{3}}, random_state=42)\n\n# 训练Logistic回归模型（最大迭代次数为1000次）\nmodel = {{4}}\n#训练 Logistic 回归模型\n{{5}}\n\n# 保存模型\nwith open('2.2.1_model.pkl', 'wb') as file:\n    pickle.{{6}}\n\n# 预测并保存结果\ny_pred = {{7}}\npd.DataFrame(y_pred, columns=['预测结果']).to_csv('2.2.1_results.txt', index=False)\n\n# 生成测试报告\nreport = classification_report(y_test, y_pred, zero_division=1)\nwith open('2.2.1_report.txt', 'w') as file:\n    file.write(report)\n\n# 分析测试结果\naccuracy = {{8}}\nprint(f\"模型准确率: {accuracy:.2f}\")\n\n# 处理数据不平衡\nsmote = SMOTE(random_state=42)\nX_resampled, y_resampled = {{9}}\n\n# 重新训练模型\n{{10}}\n# 重新预测\ny_pred_resampled = {{11}}\n\n# 保存新结果\npd.DataFrame(y_pred_resampled, columns=['预测结果']).to_csv('2.2.1_results_xg.txt', index=False)\n\n# 生成新的测试报告\nreport_resampled = classification_report(y_test, y_pred_resampled, zero_division=1)\nwith open('2.2.1_report_xg.txt', 'w') as file:\n    file.write(report_resampled)\n\n# 分析新的测试结果\naccuracy_resampled = {{12}}\nprint(f\"重新采样后的模型准确率: {accuracy_resampled:.2f}\")",
    "blanks": [
      {
        "answer": "pd.read_csv('finance数据集.csv')"
      },
      {
        "answer": "data.head()"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "LogisticRegression(max_iter=1000)"
      },
      {
        "answer": "model.fit(X_train, y_train)"
      },
      {
        "answer": "dump(model, file)"
      },
      {
        "answer": "model.predict(X_test)"
      },
      {
        "answer": "(y_test == y_pred).mean()",
        "alts": [
          "model.score(X_test, y_test)"
        ]
      },
      {
        "answer": "smote.fit_resample(X_train, y_train)"
      },
      {
        "answer": "model.fit(X_resampled, y_resampled)"
      },
      {
        "answer": "model.predict(X_test)"
      },
      {
        "answer": "(y_test == y_pred_resampled).mean()",
        "alts": [
          "model.score(X_test, y_test)"
        ]
      }
    ]
  },
  {
    "code": "2.2.2",
    "stage": "2.2",
    "title": "智慧交通燃油效率线性回归与随机森林模型开发与测试",
    "examScore": 20,
    "codeScore": 17,
    "tip": "重点记 Pipeline([('scaler', StandardScaler()), ('linreg', LinearRegression())]) 和 RandomForestRegressor(n_estimators=100, random_state=42)",
    "template": "import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.pipeline import Pipeline\nimport pickle\nfrom sklearn.ensemble import RandomForestRegressor\n\n# 加载数据集\ndf = {{0}}\n\n# 显示前五行数据\nprint({{1}})\n\n# 处理缺失值\n# 将 'horsepower' 列中的所有值转换为数值类型\ndf['horsepower'] = {{2}}({{3}}, errors='coerce')\n# 删除包含缺失值的行\ndf = {{4}}\n\n# 选择相关特征进行建模（定义自变量（返回一个DataFrame）和因变量）\nX = {{5}}\ny = {{6}}\n\n# 将数据集划分为训练集和测试集（测试集占比20%）\nX_train, X_test, y_train, y_test = {{7}}({{8}}, random_state=42)\n\n# 创建包含标准化和线性回归的管道\npipeline = {{9}}([('scaler', {{10}}),('linreg', {{11}})])\n\n# 训练模型\n{{12}}\n\n# 保存训练好的模型\nwith open('2.2.2_model.pkl', 'wb') as model_file:\n    pickle.{{13}}\n\n# 预测并保存结果\ny_pred = {{14}}\nresults_df = pd.DataFrame(y_pred, columns=['预测结果'])\n{{15}}('2.2.2_results.txt', index=False)\n\n# 测试模型\nwith open('2.2.2_report.txt', 'w') as results_file:\n    results_file.write(f'训练集得分: {pipeline.score(X_train, y_train)}\\n')\n    results_file.write(f'测试集得分: {pipeline.score(X_test, y_test)}\\n')\n\n# 创建随机森林回归模型实例（创建的决策树的数量为100）\nrf_model = {{16}}({{17}}, random_state=42)\n# 训练随机森林回归模型\n{{18}}\n\n# 使用随机森林模型进行预测\ny_pred_rf = {{19}}\n\n# 保存新的结果\nresults_rf_df = pd.DataFrame(y_pred_rf, columns=['预测结果'])\n{{20}}('2.2.2_results_rf.txt', index=False)\n\n# 测试模型并保存得分\nwith open('2.2.2_report_rf.txt', 'w') as results_rf_file:\n    results_rf_file.write(f'训练集得分: {rf_model.score(X_train, y_train)}\\n')\n    results_rf_file.write(f'测试集得分: {rf_model.score(X_test, y_test)}\\n')",
    "blanks": [
      {
        "answer": "pd.read_csv('auto-mpg.csv')"
      },
      {
        "answer": "df.head()"
      },
      {
        "answer": "pd.to_numeric"
      },
      {
        "answer": "df['horsepower']"
      },
      {
        "answer": "df.dropna()"
      },
      {
        "answer": "df[['cylinders', 'displacement', 'horsepower', 'weight', 'acceleration', 'model year', 'origin']]",
        "alts": [
          "df.drop(columns=['mpg', 'car name'])",
          "df.drop(['mpg', 'car name'], axis=1)"
        ]
      },
      {
        "answer": "df['mpg']"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "Pipeline"
      },
      {
        "answer": "StandardScaler()"
      },
      {
        "answer": "LinearRegression()"
      },
      {
        "answer": "pipeline.fit(X_train, y_train)"
      },
      {
        "answer": "dump(pipeline, model_file)"
      },
      {
        "answer": "pipeline.predict(X_test)"
      },
      {
        "answer": "results_df.to_csv"
      },
      {
        "answer": "RandomForestRegressor"
      },
      {
        "answer": "n_estimators=100"
      },
      {
        "answer": "rf_model.fit(X_train, y_train)"
      },
      {
        "answer": "rf_model.predict(X_test)"
      },
      {
        "answer": "results_rf_df.to_csv"
      }
    ]
  },
  {
    "code": "2.2.3",
    "stage": "2.2",
    "title": "健身人群随机森林与 XGBoost 回归模型开发与测试",
    "examScore": 20,
    "codeScore": 17,
    "tip": "重点：pd.get_dummies(X)、df['Your age'].apply(...)、RandomForestRegressor + xgb.XGBRegressor(n_estimators=100, random_state=42)、mean_squared_error(y_test, y_pred)、r2_score(y_test, y_pred)",
    "template": "import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestRegressor\nimport pickle\nfrom sklearn.metrics import mean_squared_error, r2_score\nimport xgboost as xgb\n\n# 加载数据集\ndf = {{0}}\n\n# 显示前五行数据\nprint({{1}})\n\n# 去除所有字符串字段的前后空格\ndf = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)\n\n# 检查和清理列名\ndf.columns = df.columns.str.strip()\n\n# 选择相关特征进行建模\nX = df[['Your gender', 'How important is exercise to you ?', 'How healthy do you consider yourself?']]\nX = {{2}}(X)  # 将分类变量转为数值变量\n\n# 将年龄段转为数值变量\ny = {{3}}(lambda x: int(x.split(' ')[0]))  # 假设年龄段为整数\n\n# 将数据集划分为训练集和测试集（测试集占比20%）\nX_train, X_test, y_train, y_test = {{4}}({{5}}, random_state=42)\n\n# 创建随机森林回归模型（创建的决策树的数量为100）\nrf_model = {{6}}({{7}}, random_state=42)\n# 训练随机森林回归模型\n{{8}}\n\n# 保存训练好的模型\nwith open('2.2.3_model.pkl', 'wb') as model_file:\n    pickle.{{9}}\n\n# 进行结果预测\ny_pred = {{10}}\nresults_df = pd.DataFrame(y_pred, columns=['预测结果'])\nresults_df.to_csv('2.2.3_results.txt', index=False)\n\n# 使用测试工具对模型进行测试，并记录测试结果\ntrain_score = {{11}}   #训练集分数\ntest_score = {{12}}    #测试集分数\nmse = {{13}}  #均方误差\nr2 = {{14}}  #决定系数\nwith open('2.2.3_report.txt', 'w') as report_file:\n    report_file.write(f'训练集得分: {train_score}\\n')\n    report_file.write(f'测试集得分: {test_score}\\n')\n    report_file.write(f'均方误差(MSE): {mse}\\n')\n    report_file.write(f'决定系数(R^2): {r2}\\n')\n\n# 运用工具分析算法中错误案例产生的原因并进行纠正\n# 初始化XGBoost回归模型（构建100棵树）\nxgb_model = {{15}}({{16}}, random_state=42)\n# 训练XGBoost回归模型\n{{17}}\n# 使用XGBoost回归模型在测试集上进行结果预测\ny_pred_xgb = {{18}}\n\nresults_df_xgb = pd.DataFrame(y_pred_xgb, columns=['预测结果'])\nresults_df_xgb.to_csv('2.2.3_results_xgb.txt', index=False)\n\nwith open('2.2.3_report_xgb.txt', 'w') as xgb_report_file:\n    xgb_report_file.write(f'XGBoost训练集得分: {{{19}}}\\n')\n    xgb_report_file.write(f'XGBoost测试集得分: {{{20}}}\\n')\n    xgb_report_file.write(f'XGBoost均方误差(MSE): {{{21}}}\\n')\n    xgb_report_file.write(f'XGBoost决定系数(R^2): {{{22}}}\\n')",
    "blanks": [
      {
        "answer": "pd.read_csv('fitness analysis.csv')"
      },
      {
        "answer": "df.head()"
      },
      {
        "answer": "pd.get_dummies"
      },
      {
        "answer": "df['Your age'].apply"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "RandomForestRegressor"
      },
      {
        "answer": "n_estimators=100"
      },
      {
        "answer": "rf_model.fit(X_train, y_train)"
      },
      {
        "answer": "dump(rf_model, model_file)"
      },
      {
        "answer": "rf_model.predict(X_test)"
      },
      {
        "answer": "rf_model.score(X_train, y_train)"
      },
      {
        "answer": "rf_model.score(X_test, y_test)"
      },
      {
        "answer": "mean_squared_error(y_test, y_pred)"
      },
      {
        "answer": "r2_score(y_test, y_pred)"
      },
      {
        "answer": "xgb.XGBRegressor"
      },
      {
        "answer": "n_estimators=100"
      },
      {
        "answer": "xgb_model.fit(X_train, y_train)"
      },
      {
        "answer": "xgb_model.predict(X_test)"
      },
      {
        "answer": "xgb_model.score(X_train, y_train)"
      },
      {
        "answer": "xgb_model.score(X_test, y_test)"
      },
      {
        "answer": "mean_squared_error(y_test, y_pred_xgb)"
      },
      {
        "answer": "r2_score(y_test, y_pred_xgb)"
      }
    ]
  },
  {
    "code": "2.2.4",
    "stage": "2.2",
    "title": "低碳生活行为线性回归与 XGBoost 模型开发与测试",
    "examScore": 20,
    "codeScore": 17,
    "tip": "注意本题 3 个细节：① pd.read_excel 读 xlsx；② 保存模型用 joblib.dump(model, model_filename)；③ XGBRegressor(n_estimators=1000, learning_rate=0.05, max_depth=5, subsample=0.8, colsample_bytree=0.8)",
    "template": "import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.metrics import mean_squared_error, r2_score\nimport joblib\nfrom xgboost import XGBRegressor\n\n# 加载数据集\ndata = {{0}}\n\n# 显示数据集的前五行\nprint({{1}})\n\n# 删除不必要的列并处理分类变量\ndata_cleaned = {{2}}({{3}}=['序号', '所用时间'])  # 删除不必要的列\ndata_cleaned = pd.get_dummies(data_cleaned, drop_first=True)  # 将分类变量转换为哑变量/指示变量\n\n# 定义目标变量和特征\ntarget = '5.您进行过绿色低碳的相关生活方式吗?'  # 确保这是目标变量\n\n# 定义自变量和因变量\nX = {{4}}({{5}}={{6}})\ny = {{7}}\n\n# 将数据拆分为训练集和测试集（测试集占20%）\nX_train, X_test, y_train, y_test = {{8}}({{9}}, random_state=42)\n\n# 初始化线性回归模型\nmodel = {{10}}\n# 训练线性回归模型\n{{11}}\n\n# 保存训练好的模型\nmodel_filename = '2.2.4_model.pkl'\njoblib.{{12}}\n\n# 进行预测\ny_pred = {{13}}\n\n# 将结果保存到文本文件中\nresults = pd.DataFrame({'实际值': y_test, '预测值': y_pred})\nresults_filename = '2.2.4_results.txt'\n{{14}}({{15}}, index=False, sep='\\t')  # 使用制表符分隔值保存到文本文件\n\n# 将测试结果保存到报告文件中\nreport_filename = '2.2.4_report.txt'\nwith open(report_filename, 'w') as f:\n    f.write(f'均方误差: {{{16}}}\\n')\n    f.write(f'决定系数: {{{17}}}\\n')\n    \n# 分析并纠正错误（示例：使用XGBoost）\n# 初始化XGBoost模型（设定树的数量为1000，学习率为0.05，每棵树的最大深度为5，）\nxgb_model = {{18}}({{19}}, subsample=0.8, colsample_bytree=0.8)\n# 训练XGBoost模型\n{{20}}\n\n# 使用XGBoost模型进行预测\ny_pred_xg = {{21}}\n\n# 将XGBoost结果保存到文本文件中\nresults_xg_filename = '2.2.4_results_xg.txt'\nresults_xg = pd.DataFrame({'实际值': y_test, '预测值': y_pred_xg})\nresults_xg.to_csv(results_xg_filename, index=False, sep='\\t')  # 使用制表符分隔值保存到文本文件\n\n# 将XGBoost测试结果保存到报告文件中\nreport_filename_xgb = '2.2.4_report_xgb.txt'\nwith open(report_filename_xgb, 'w') as f:\n    f.write(f'均方误差: {{{22}}}\\n')\n    f.write(f'决定系数: {{{23}}}\\n')",
    "blanks": [
      {
        "answer": "pd.read_excel('大学生低碳生活行为的影响因素数据集.xlsx')"
      },
      {
        "answer": "data.head()"
      },
      {
        "answer": "data.drop"
      },
      {
        "answer": "columns"
      },
      {
        "answer": "data_cleaned.drop"
      },
      {
        "answer": "columns"
      },
      {
        "answer": "[target]",
        "alts": [
          "target"
        ]
      },
      {
        "answer": "data_cleaned[target]"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "LinearRegression()"
      },
      {
        "answer": "model.fit(X_train, y_train)"
      },
      {
        "answer": "dump(model, model_filename)"
      },
      {
        "answer": "model.predict(X_test)"
      },
      {
        "answer": "results.to_csv"
      },
      {
        "answer": "results_filename",
        "alts": [
          "'2.2.4_results.txt'"
        ]
      },
      {
        "answer": "mean_squared_error(y_test, y_pred)"
      },
      {
        "answer": "r2_score(y_test, y_pred)"
      },
      {
        "answer": "XGBRegressor"
      },
      {
        "answer": "n_estimators=1000, learning_rate=0.05, max_depth=5"
      },
      {
        "answer": "xgb_model.fit(X_train, y_train)"
      },
      {
        "answer": "xgb_model.predict(X_test)"
      },
      {
        "answer": "mean_squared_error(y_test, y_pred_xg)"
      },
      {
        "answer": "r2_score(y_test, y_pred_xg)"
      }
    ]
  },
  {
    "code": "2.2.5",
    "stage": "2.2",
    "title": "智能步数预测决策树回归模型开发与测试",
    "examScore": 20,
    "codeScore": 17,
    "tip": "决策树回归短平快模板：DecisionTreeRegressor(random_state=42) → fit → pickle.dump → predict → 写 3 个指标（mean_squared_error / mean_absolute_error / r2_score）",
    "template": "import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeRegressor\nimport pickle\nfrom sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score\n\n# 加载数据集\ndf = {{0}}\n\n# 显示前五行数据\nprint({{1}})\n\n# 选择相关特征进行建模\nX = df[['Your gender ', 'How important is exercise to you ?', 'How healthy do you consider yourself?']]\nX = {{2}}(X)  # 将分类变量转为数值变量\n\n# 设置目标变量\ny = {{3}}  \n\n# 将数据集划分为训练集和测试集（测试集占20%）\nX_train, X_test, y_train, y_test = {{4}}({{5}}, random_state=42)\n\n# 创建并训练决策树回归模型\n{{6}} = {{7}}(random_state=42)\n# 训练决策树回归模型\n{{8}}\n\n# 保存训练好的模型\nwith open('2.2.5_model.pkl', 'wb') as model_file:\n    pickle.{{9}}\n\n# 进行预测\ny_pred = {{10}}\n\n# 将结果保存到文本文件中\nresults = pd.DataFrame({'实际值': y_test, '预测值': y_pred})\nresults_filename = '2.2.5_results.txt'\n{{11}}({{12}}, index=False, sep='\\t')  \n\n# 将测试结果保存到报告文件中\nreport_filename = '2.2.5_report.txt'\nwith open({{13}}) as f:\n    f.write(f'均方误差: {{{14}}}\\n')\n    f.write(f'平均绝对误差: {{{15}}}\\n')\n    f.write(f'决定系数: {{{16}}}\\n')",
    "blanks": [
      {
        "answer": "pd.read_csv('fitness analysis.csv')"
      },
      {
        "answer": "df.head()"
      },
      {
        "answer": "pd.get_dummies"
      },
      {
        "answer": "df['daily_steps']"
      },
      {
        "answer": "train_test_split"
      },
      {
        "answer": "X, y, test_size=0.2",
        "alts": [
          "X, y, train_size=0.8"
        ]
      },
      {
        "answer": "model",
        "alts": [
          "dt_model"
        ]
      },
      {
        "answer": "DecisionTreeRegressor"
      },
      {
        "answer": "model.fit(X_train, y_train)",
        "alts": [
          "dt_model.fit(X_train, y_train)"
        ]
      },
      {
        "answer": "dump(model, model_file)",
        "alts": [
          "dump(dt_model, model_file)"
        ]
      },
      {
        "answer": "model.predict(X_test)",
        "alts": [
          "dt_model.predict(X_test)"
        ]
      },
      {
        "answer": "results.to_csv"
      },
      {
        "answer": "results_filename",
        "alts": [
          "'2.2.5_results.txt'"
        ]
      },
      {
        "answer": "report_filename, 'w'",
        "alts": [
          "'2.2.5_report.txt', 'w'"
        ]
      },
      {
        "answer": "mean_squared_error(y_test, y_pred)"
      },
      {
        "answer": "mean_absolute_error(y_test, y_pred)"
      },
      {
        "answer": "r2_score(y_test, y_pred)"
      }
    ]
  },
  {
    "code": "1.1.1",
    "stage": "1.1",
    "title": "智能医疗系统业务数据处理流程设计",
    "examScore": 25,
    "codeScore": 22,
    "tip": "重点记 4 件套：np.where(data['DaysInHospital'] > 7, ...) 、value_counts() / len(data)、pd.cut(..., bins=..., labels=..., right=False)、data.groupby(...)['RiskLevel'].apply(...)",
    "template": "import pandas as pd\nimport numpy as np\n\n# 读取数据集 1分\ndata = {{0}}\n\n# 1. 统计住院天数超过7天的患者数量及其占比\n# 创建新列'RiskLevel'，根据住院天数判断风险等级 3分\n{{1}} = {{2}}({{3}}, '高风险患者', '低风险患者')\n# 统计不同风险等级的患者数量 2分\nrisk_counts = data{{4}}.{{5}}\n# 计算高风险患者占比 1分\nhigh_risk_ratio = risk_counts['高风险患者'] / {{6}}\n# 计算低风险患者占比 1分\nlow_risk_ratio = risk_counts['低风险患者'] / {{7}}\n\n# 输出结果\nprint(\"高风险患者数量:\", risk_counts['高风险患者'])\nprint(\"低风险患者数量:\", risk_counts['低风险患者'])\nprint(\"高风险患者占比:\", high_risk_ratio)\nprint(\"低风险患者占比:\", low_risk_ratio)\n\n# 2. 统计不同BMI区间中高风险患者的比例和统计不同BMI区间中的患者数\n# 定义BMI区间和标签\nbmi_bins = [0, 18.5, 24, 28, np.inf]\nbmi_labels = ['偏瘦', '正常', '超重', '肥胖']\n# 根据BMI值划分指定区间 4分\ndata['BMIRange'] = {{8}}({{9}}, {{10}}, {{11}}, right=False)  # 使用左闭右开区间\n# 计算每个BMI区间中高风险患者的比例 2分\nbmi_risk_rate = {{12}}({{13}})['RiskLevel'].apply(lambda x: (x == '高风险患者').mean())\n# 统计每个BMI区间的患者数量 1分\nbmi_patient_count = data{{14}}\n\n# 输出结果\nprint(\"BMI区间中高风险患者的比例和患者数:\")\nprint(bmi_risk_rate) \nprint(bmi_patient_count)\n\n# 3. 统计不同年龄区间中高风险患者的比例和统计不同年龄区间中的患者数\n# 定义年龄区间和标签\nage_bins = [0, 26, 36, 46, 56, 66, np.inf]\nage_labels = ['≤25岁', '26-35岁', '36-45岁', '46-55岁', '56-65岁', '＞65岁']\n# 根据年龄值划分指定区间 4分\ndata['AgeRange'] = {{15}}({{16}}, {{17}}, {{18}}, right=False)  # 使用左闭右开区间\n# 计算每个年龄区间中高风险患者的比例 2分\nage_risk_rate = {{19}}({{20}})['RiskLevel'].apply(lambda x: (x == '高风险患者').mean())\n# 统计每个年龄区间的患者数量 1分\nage_patient_count = data{{21}}\n\n# 输出结果\nprint(\"年龄区间中高风险患者的比例和患者数:\")\nprint(age_risk_rate) \nprint(age_patient_count)",
    "blanks": [
      {
        "answer": "pd.read_csv('patient_data.csv')",
        "alts": [
          "pd.read_csv('patient_data.csv', encoding='gbk')"
        ]
      },
      {
        "answer": "data['RiskLevel']"
      },
      {
        "answer": "np.where"
      },
      {
        "answer": "data['DaysInHospital'] > 7"
      },
      {
        "answer": "['RiskLevel']"
      },
      {
        "answer": "value_counts()"
      },
      {
        "answer": "len(data)",
        "alts": [
          "data.shape[0]"
        ]
      },
      {
        "answer": "len(data)",
        "alts": [
          "data.shape[0]"
        ]
      },
      {
        "answer": "pd.cut"
      },
      {
        "answer": "data['BMI']"
      },
      {
        "answer": "bins=bmi_bins",
        "alts": [
          "bmi_bins"
        ]
      },
      {
        "answer": "labels=bmi_labels",
        "alts": [
          "bmi_labels"
        ]
      },
      {
        "answer": "data.groupby"
      },
      {
        "answer": "'BMIRange'"
      },
      {
        "answer": "['BMIRange'].value_counts()"
      },
      {
        "answer": "pd.cut"
      },
      {
        "answer": "data['Age']"
      },
      {
        "answer": "bins=age_bins",
        "alts": [
          "age_bins"
        ]
      },
      {
        "answer": "labels=age_labels",
        "alts": [
          "age_labels"
        ]
      },
      {
        "answer": "data.groupby"
      },
      {
        "answer": "'AgeRange'"
      },
      {
        "answer": "['AgeRange'].value_counts()"
      }
    ]
  },
  {
    "code": "1.1.2",
    "stage": "1.1",
    "title": "智能农业系统传感器数据采集与处理流程设计",
    "examScore": 25,
    "codeScore": 20,
    "tip": "重点：groupby('SensorType')['Value'].agg(['count', 'mean'])、isin(['Temperature', 'Humidity'])、np.where 标异常、fillna(method='ffill', inplace=True) & bfill、drop(columns=['is_abnormal'])",
    "template": "import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n# 读取数据集 2分\ndata = {{0}}\n\n# 1. 传感器数据统计\n# 对传感器类型进行分组，并计算每个组的数据数量和平均值 3分\nsensor_stats = {{1}}({{2}})['Value'].{{3}}\n# 输出结果\nprint(\"传感器数据数量和平均值:\")\nprint(sensor_stats)\n\n# 2. 按位置统计温度和湿度数据\n# 筛选出温度和湿度数据，然后按位置和传感器类型分组，计算每个组的平均值 2分\nlocation_stats = data[data['SensorType'].{{4}}.{{5}}['Value'].mean().unstack()\n# 输出结果\nprint(\"每个位置的温度和湿度数据平均值:\")\nprint(location_stats)\n\n# 3. 数据清洗和异常值处理\n# 标记异常值 3分\ndata['is_abnormal'] = {{6}}(\n    (({{7}}) & ((data['Value'] < -10) | (data['Value'] > 50))) |\n    (({{8}}) & ((data['Value'] < 0) | (data['Value'] > 100))),\n    True, False\n)\n# 输出异常值数量 2分\nprint(\"异常值数量:\", data['is_abnormal'].{{9}})\n# 填补缺失值\n# 使用前向填充和后向填充的方法填补缺失值 4分\ndata['Value'].{{10}}({{11}}, inplace=True)\ndata['Value'].{{12}}({{13}}, inplace=True)\n# 保存清洗后的数据\n# 删除用于标记异常值的列，并将清洗后的数据保存到新的CSV文件中 4分\ncleaned_data = {{14}}({{15}}=['is_abnormal'])\n{{16}}('cleaned_sensor_data.csv', {{17}})\nprint(\"数据清洗完成，已保存为 'cleaned_sensor_data.csv'\")",
    "blanks": [
      {
        "answer": "pd.read_csv('sensor_data.csv')"
      },
      {
        "answer": "data.groupby"
      },
      {
        "answer": "'SensorType'"
      },
      {
        "answer": "agg(['count', 'mean'])"
      },
      {
        "answer": "isin(['Temperature', 'Humidity'])]"
      },
      {
        "answer": "groupby(['Location', 'SensorType'])"
      },
      {
        "answer": "np.where"
      },
      {
        "answer": "data['SensorType'] == 'Temperature'"
      },
      {
        "answer": "data['SensorType'] == 'Humidity'"
      },
      {
        "answer": "sum()"
      },
      {
        "answer": "fillna"
      },
      {
        "answer": "method='ffill'"
      },
      {
        "answer": "fillna"
      },
      {
        "answer": "method='bfill'"
      },
      {
        "answer": "data.drop"
      },
      {
        "answer": "columns"
      },
      {
        "answer": "cleaned_data.to_csv"
      },
      {
        "answer": "index=False"
      }
    ]
  },
  {
    "code": "1.1.3",
    "stage": "1.1",
    "title": "金融机构信用评估业务数据审核流程设计",
    "examScore": 25,
    "codeScore": 14,
    "tip": "最清爽的一题！就 4 个操作：isnull().sum()、duplicated().sum()、between(低, 高) / 比较运算符、cleaned_data.to_csv('cleaned_credit_data.csv', index=False)",
    "template": "import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n# 读取数据集\ndata = pd.read_csv('credit_data.csv')\n\n# 1. 数据完整性审核\nmissing_values = data.{{0}}       #数据缺失值统计 2分\nduplicate_values = data.{{1}}     #数据重复值统计 2分\n# 输出结果\nprint(\"缺失值统计:\")\nprint(missing_values)\nprint(\"重复值统计:\")\nprint(duplicate_values)\n\n# 2. 数据合理性审核\ndata['is_age_valid'] = {{2}}.{{3}}(18, 70)              #Age数据的合理性审核 2分\ndata['is_income_valid'] = {{4}} > {{5}}                 #Income数据的合理性审核 2分\ndata['is_loan_amount_valid'] = {{6}} < ({{7}} * 5)      #LoanAmount数据的合理性审核 2分\ndata['is_credit_score_valid'] = {{8}}.{{9}}(300, 850)   #CreditScore数据的合理性审核 2分\n# 合理性检查结果\nvalidity_checks = data[['is_age_valid', 'is_income_valid', 'is_loan_amount_valid', 'is_credit_score_valid']].all(axis=1)\ndata['is_valid'] = validity_checks\n# 输出结果\nprint(\"数据合理性检查:\")\nprint(data[['is_age_valid', 'is_income_valid', 'is_loan_amount_valid', 'is_credit_score_valid', 'is_valid']].describe())\n\n# 3. 数据清洗和异常值处理\n# 标记不合理数据\ninvalid_rows = data[~data['is_valid']]\n# 删除不合理数据行\ncleaned_data = data[data['is_valid']]\n# 删除标记列\ncleaned_data = cleaned_data.drop(columns=['is_age_valid', 'is_income_valid', 'is_loan_amount_valid', 'is_credit_score_valid', 'is_valid'])\n# 保存清洗后的数据\n{{10}}.{{11}}({{12}}, index=False)\nprint(\"数据清洗完成，已保存为 'cleaned_credit_data.csv'\")",
    "blanks": [
      {
        "answer": "isnull().sum()",
        "alts": [
          "isna().sum()"
        ]
      },
      {
        "answer": "duplicated().sum()"
      },
      {
        "answer": "data['Age']"
      },
      {
        "answer": "between"
      },
      {
        "answer": "data['Income']"
      },
      {
        "answer": "2000"
      },
      {
        "answer": "data['LoanAmount']"
      },
      {
        "answer": "data['Income']"
      },
      {
        "answer": "data['CreditScore']"
      },
      {
        "answer": "between"
      },
      {
        "answer": "cleaned_data"
      },
      {
        "answer": "to_csv"
      },
      {
        "answer": "'cleaned_credit_data.csv'"
      }
    ]
  },
  {
    "code": "1.1.4",
    "stage": "1.1",
    "title": "电商平台用户行为分析数据采集与处理流程设计",
    "examScore": 25,
    "codeScore": 21,
    "tip": "注意第 1 行是 import pandas（没写 as pd！），所以读 CSV 和 cut 要用 pandas.read_csv / pandas.cut；标准化用 (x - mean()) / std()",
    "template": "import pandas\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# 1. 数据采集\n# 从本地文件中读取数据  2分\ndata =  {{0}}\nprint(\"数据采集完成，已加载到DataFrame中\")\n\n# 打印数据的前5条记录  2分\nprint({{1}})\n\n# 2. 数据清洗与预处理\n# 处理缺失值（删除）  2分\ndata = {{2}}\n\n# 数据类型转换\ndata{{3}} = {{4}}(int)   # Age数据类型转换为int 2分\ndata{{5}} = {{6}}(float) # PurchaseAmount数据类型转换为float  2分\ndata{{7}} = {{8}}(int)   # ReviewScore数据类型转换为int 2分\n\n# 处理异常值  2分\ndata = data[({{9}}.{{10}}(18, 70)) & \n            (data['PurchaseAmount'] > 0) & \n            ({{11}}.{{12}}(1, 5))]\n\n# 数据标准化\ndata['PurchaseAmount'] = (data['PurchaseAmount'] - {{13}}) / {{14}}  # PurchaseAmount数据标准化 2分\ndata['ReviewScore'] = (data['ReviewScore'] - {{15}}) / {{16}}        # ReviewScore数据标准化 2分\n\n# 保存清洗后的数据  1分\n{{17}}('cleaned_user_behavior_data.csv', index=False)\nprint(\"数据清洗完成，已保存为 'cleaned_user_behavior_data.csv'\")\n\n# 3. 数据统计\n# 统计每个购买类别的用户数 2分\npurchase_category_counts = {{18}}.{{19}}\nprint(\"每个购买类别的用户数:\\n\", purchase_category_counts)\n\n# 统计不同性别的平均购买金额 2分\ngender_purchase_amount_mean = {{20}}({{21}})['PurchaseAmount'].mean()\nprint(\"不同性别的平均购买金额:\\n\", gender_purchase_amount_mean)\n\n# 统计不同年龄段的用户数 2分\nbins = [18, 26, 36, 46, 56, 66, np.inf]\nlabels = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+']\ndata['AgeGroup'] = pandas.{{22}}({{23}}, right=False)\nage_group_counts = data['AgeGroup'].value_counts().sort_index()\nprint(\"不同年龄段的用户数:\\n\", age_group_counts)",
    "blanks": [
      {
        "answer": "pandas.read_csv('user_behavior_data.csv')"
      },
      {
        "answer": "data.head()"
      },
      {
        "answer": "data.dropna()"
      },
      {
        "answer": "['Age']"
      },
      {
        "answer": "data['Age'].astype"
      },
      {
        "answer": "['PurchaseAmount']"
      },
      {
        "answer": "data['PurchaseAmount'].astype"
      },
      {
        "answer": "['ReviewScore']"
      },
      {
        "answer": "data['ReviewScore'].astype"
      },
      {
        "answer": "data['Age']"
      },
      {
        "answer": "between"
      },
      {
        "answer": "data['ReviewScore']"
      },
      {
        "answer": "between"
      },
      {
        "answer": "data['PurchaseAmount'].mean()"
      },
      {
        "answer": "data['PurchaseAmount'].std()"
      },
      {
        "answer": "data['ReviewScore'].mean()"
      },
      {
        "answer": "data['ReviewScore'].std()"
      },
      {
        "answer": "data.to_csv"
      },
      {
        "answer": "data['PurchaseCategory']"
      },
      {
        "answer": "value_counts()"
      },
      {
        "answer": "data.groupby"
      },
      {
        "answer": "'Gender'"
      },
      {
        "answer": "cut"
      },
      {
        "answer": "data['Age'], bins=bins, labels=labels",
        "alts": [
          "data['Age'], bins, labels"
        ]
      }
    ]
  },
  {
    "code": "1.1.5",
    "stage": "1.1",
    "title": "智能交通系统数据采集、处理和审核流程设计",
    "examScore": 25,
    "codeScore": 22,
    "tip": "与 1.1.4 同构，多了 4 个字段的 between 审核、groupby('Gender').agg({'Speed': 'mean', 'TravelDistance': 'mean', 'TravelTime': 'mean'}) 和 pd.cut 分龄统计",
    "template": "import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# 1. 数据采集\n# 从本地文件中读取数据  2分\ndata = {{0}}\nprint(\"数据采集完成，已加载到DataFrame中\")\n\n# 打印数据的前5条记录 2分\nprint({{1}})\n\n# 2. 数据清洗与预处理\n# 处理缺失值（删除）  2分\ndata = {{2}}\n\n# 数据类型转换\ndata{{3}} = {{4}}(int)       #Age数据类型转换为int 1分\ndata{{5}} = {{6}}(float)     #Speed数据类型转换为float 1分\ndata{{7}} = {{8}}(float)     #TravelDistance数据类型转换为float 1分\ndata{{9}} = {{10}}(float)     #TravelTime数据类型转换为float 1分\n\n# 处理异常值  2分\ndata = data[({{11}}(18, 70))  & \n            ({{12}}(0, 200)) & \n            ({{13}}(1, 1000)) & \n            ({{14}}(1, 1440))]\n\n# 保存清洗后的数据  1分\n{{15}}('cleaned_vehicle_traffic_data.csv', index=False)\nprint(\"数据清洗完成，已保存为 'cleaned_vehicle_traffic_data.csv'\")\n\n# 3. 数据合理性审核\n# 审核字段合理性 1分\nunreasonable_data = data[~(({{16}}(18, 70)) & \n                           ({{17}}(0, 200)) & \n                           ({{18}}(1, 1000)) & \n                           ({{19}}(1, 1440)))]\nprint(\"不合理的数据:\\n\", unreasonable_data)\n\n# 4. 数据统计\n# 统计每种交通事件的发生次数  2分\ntraffic_event_counts = {{20}}\nprint(\"每种交通事件的发生次数:\\n\", traffic_event_counts)\n\n# 统计不同性别的平均车速、行驶距离和行驶时间  2分\ngender_stats = data.{{21}}.{{22}}\nprint(\"不同性别的平均车速、行驶距离和行驶时间:\\n\", gender_stats)\n\n# 统计不同年龄段的驾驶员数  5分\nage_bins = [18, 26, 36, 46, 56, 66, np.inf]\nage_labels = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+']\ndata['AgeGroup'] = {{23}}({{24}},{{25}},{{26}}, right=False)\nage_group_counts = {{27}}\nprint(\"不同年龄段的驾驶员数:\\n\", age_group_counts)",
    "blanks": [
      {
        "answer": "pd.read_csv('vehicle_traffic_data.csv')"
      },
      {
        "answer": "data.head()"
      },
      {
        "answer": "data.dropna()"
      },
      {
        "answer": "['Age']"
      },
      {
        "answer": "data['Age'].astype"
      },
      {
        "answer": "['Speed']"
      },
      {
        "answer": "data['Speed'].astype"
      },
      {
        "answer": "['TravelDistance']"
      },
      {
        "answer": "data['TravelDistance'].astype"
      },
      {
        "answer": "['TravelTime']"
      },
      {
        "answer": "data['TravelTime'].astype"
      },
      {
        "answer": "data['Age'].between"
      },
      {
        "answer": "data['Speed'].between"
      },
      {
        "answer": "data['TravelDistance'].between"
      },
      {
        "answer": "data['TravelTime'].between"
      },
      {
        "answer": "data.to_csv"
      },
      {
        "answer": "data['Age'].between"
      },
      {
        "answer": "data['Speed'].between"
      },
      {
        "answer": "data['TravelDistance'].between"
      },
      {
        "answer": "data['TravelTime'].between"
      },
      {
        "answer": "data['TrafficEvent'].value_counts()"
      },
      {
        "answer": "groupby('Gender')"
      },
      {
        "answer": "agg({'Speed': 'mean', 'TravelDistance': 'mean', 'TravelTime': 'mean'})"
      },
      {
        "answer": "pd.cut"
      },
      {
        "answer": "data['Age']"
      },
      {
        "answer": "bins=age_bins",
        "alts": [
          "age_bins"
        ]
      },
      {
        "answer": "labels=age_labels",
        "alts": [
          "age_labels"
        ]
      },
      {
        "answer": "data['AgeGroup'].value_counts().sort_index()",
        "alts": [
          "data['AgeGroup'].value_counts()"
        ]
      }
    ]
  }
];
