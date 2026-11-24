export interface TrackTopic {
  id: string;
  title: string;
  detail?: string;
}

export interface CodeTrackDef {
  key: 'frontend' | 'backend' | 'ai';
  title: string;
  stageTitle: string;
  stageDetail: string;
  note: string;
  route: string;
  topics: TrackTopic[];
}

export const CODE_TRACKS: Record<CodeTrackDef['key'], CodeTrackDef> = {
  ai: {
    key: 'ai',
    title: 'AI Agent 应用开发实战（上海 3–4 月主攻）',
    stageTitle: 'AI Agent 工程主线',
    stageDetail: 'Python + FastAPI/SSE + LangGraph + MCP + 混合 RAG + 自动评测 + 线上 Demo',
    note: '砍掉无关技术栈，全力用 Python 做出 1 个可在线演示、带完整评测闭环的工业级 Agent 项目。',
    route: '/code/ai',
    topics: [
      { id: 'code-ai-env', title: 'W1 · Python 环境与大模型 API 跑通', detail: 'uv / venv + pytest，20 行脚本调通 1 次大模型 API' },
      { id: 'code-ai-core', title: 'W2 · Python 进阶与 Pydantic 强校验', detail: '类型注解、装饰器、Tool Call 入参严格校验与 pytest 单测' },
      { id: 'code-ai-async', title: 'W3 · FastAPI 异步与 SSE 流式服务', detail: 'asyncio + httpx、超时重试、限流、结构化错误与流式对话' },
      { id: 'code-ai-llm', title: 'W4 · LangGraph 状态机与容错恢复', detail: 'Plan-and-Solve / ReAct 循环、Checkpointer 断点续跑、防幻觉与防死循环' },
      { id: 'code-ai-mcp', title: 'W5 · MCP Server 协议封装与记忆系统', detail: '标准 MCP 工具接入、短期窗口压缩 + 长期记忆持久化' },
      { id: 'code-ai-rag', title: '1 月 · 混合检索 RAG 与重排调优', detail: '向量检索 + BM25 混合召回 + Rerank 重排 + 切块策略对比' },
      { id: 'code-ai-eval', title: '2 月 · 可观测与自动评测（LLM-as-a-Judge）', detail: 'Trace 链路追踪、Token 成本统计、基准测试集与回归评测面板' },
      { id: 'code-ai-deploy', title: '2 月底 · Docker 线上可体验 Demo + GitHub 架构图', detail: '部署到云服务器可点开体验，直聊技术主管直接发链接' },
    ],
  },
  backend: {
    key: 'backend',
    title: 'AI 测开 / Agent 评测与工程基本功（2 年测试无缝升级）',
    stageTitle: 'AI 测开与 Agent 评测（天然优势）',
    stageDetail: '2 年软件测试底子 + pytest 自动化评测 + RAG/Agent 质量治理 + Python 高频算法 60 题',
    note: '上海 AI 公司极缺能给 Agent 做自动化回归评测与质量治理的人，结合 2 年测试经验形成最高过筛率的双投保底。',
    route: '/code/backend',
    topics: [
      { id: 'code-be-resume', title: 'W1 · 盘点 2 年测试最硬经历 + 现有 Agent/自动批改素材', detail: '提炼接口自动化、质量保障与 Rubric 自动评分经验' },
      { id: 'code-be-qa-auto', title: 'W2 · 测试开发复盘（接口自动化 / CI / 抓包与线上排障）' },
      { id: 'code-be-eval-fw', title: 'W3 · Agent 自动化回归评测框架（pytest + 断言 + 评分细则）' },
      { id: 'code-be-badcase', title: 'W4 · Agent Bad Case 归因与数据集构建（幻觉/工具调用失败/越界）' },
      { id: 'code-be-resume-v1', title: 'W5 · 双投简历 v1（AI 测开评测 & Agent 应用开发）' },
      { id: 'code-be-mysql', title: '1 月 · SQL / Redis / Linux 排查与压测基本功复盘' },
      { id: 'code-be-algo', title: '12–2 月 · Python 高频算法 60 题（与自考数据结构 13003 合一）', detail: '数组/链表/栈队/二叉树/二分/排序/哈希高频题手敲 AC' },
      { id: 'code-be-docker', title: '2 月 · Docker 容器部署与 2 个真实排障面试故事打磨' },
    ],
  },
  frontend: {
    key: 'frontend',
    title: '前端（辅助 Demo 展示，按需）',
    stageTitle: '前端与 Demo 展示',
    stageDetail: '仅用于给 Agent 与评测系统做直观展示界面，不抢主线时间',
    note: '按需勾选，不做主攻。',
    route: '/code/frontend',
    topics: [
      { id: 'code-fe-html', title: 'HTML 与语义化结构' },
      { id: 'code-fe-css', title: 'CSS 布局与响应式' },
      { id: 'code-fe-js', title: 'JavaScript 基础与异步（含 SSE 流式读取）' },
      { id: 'code-fe-ts', title: 'TypeScript 类型与泛型' },
      { id: 'code-fe-react', title: 'React 组件与状态管理' },
      { id: 'code-fe-router', title: '路由与数据请求' },
      { id: 'code-fe-build', title: '构建工具与工程化' },
    ],
  },
};
