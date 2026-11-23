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
    title: 'AI Agent 工程实战（上海 3–4 月求职主攻）',
    stageTitle: 'AI Agent 工程主线（14h/周）',
    stageDetail: 'Python + FastAPI + LangGraph + MCP + 混合 RAG + 自动评测 + Java 网关 + 线上 Demo',
    note: '对标 2026–2027 上海 Agent 工程师硬核 JD，2 月底前做出可在线访问的工业级作品，直聊技术主管绕过学历初筛。',
    route: '/code/ai',
    topics: [
      { id: 'code-ai-env', title: 'W1 · Python 工程基建', detail: 'uv / venv、类型注解、ruff、pytest 跑通最小脚手架' },
      { id: 'code-ai-core', title: 'W2 · Python 进阶与 Pydantic 强校验', detail: '生成器、装饰器、Tool Call 入参严格校验与单测' },
      { id: 'code-ai-async', title: 'W3 · FastAPI 异步与 SSE 流式服务', detail: 'asyncio + httpx、超时重试、限流、结构化错误与流式对话' },
      { id: 'code-ai-llm', title: 'W4 · LangGraph 状态机与容错恢复', detail: 'Plan-and-Solve / ReAct 循环、Checkpointer 断点续跑、防死循环与幻觉兜底' },
      { id: 'code-ai-mcp', title: 'W5 · MCP Server 协议封装与记忆系统', detail: '标准 MCP 工具接入、Redis 短期窗口压缩 + 长期记忆持久化' },
      { id: 'code-ai-rag', title: '1 月 · 混合检索 RAG 与重排调优', detail: '向量检索 + BM25 混合召回 + Rerank 重排 + 切块优化' },
      { id: 'code-ai-eval', title: '2 月 · 可观测与自动评测（LLM-as-a-Judge）', detail: 'Trace 链路追踪、Token 成本统计、基准测试集与回归评测' },
      { id: 'code-ai-java-gw', title: '2 月 · Java Spring Boot 网关对接 Python Agent', detail: '把 5 年 Java 后端优势焊死进架构：鉴权/业务库在 Java，编排在 Python' },
      { id: 'code-ai-deploy', title: '2 月底 · 线上可体验 Demo + GitHub 架构图 + 简历定稿', detail: '部署到云服务器可点开体验 + 准备 2 个真实 Bad Case 排障面试故事' },
    ],
  },
  backend: {
    key: 'backend',
    title: 'Java 后端托底与面试复盘（双栈保底）',
    stageTitle: 'Java 后端托底 + 高频算法',
    stageDetail: '并发/JUC、JVM、MySQL、Redis、系统设计、60 道高频算法（与自考数构复用）',
    note: '用 5 年 Java 后端硬实力保证 3–4 月 100% 拿 Offer 离坑，同时给 Agent 岗提供企业级工程背书。',
    route: '/code/backend',
    topics: [
      { id: 'code-be-resume', title: 'W1 · 盘点 5 年 Java 经历与双栈简历框架', detail: '挑出 2 个最硬业务项目，提炼架构难点与量化结果' },
      { id: 'code-be-java', title: 'W2 · Java 集合与并发（JUC / 线程池 / 锁升级）' },
      { id: 'code-be-spring', title: 'W3 · JVM 内存/GC 与 Spring Boot 核心原理' },
      { id: 'code-be-mysql', title: 'W3 · MySQL 索引、MVCC 事务隔离与慢 SQL 调优' },
      { id: 'code-be-redis', title: 'W4 · Redis 缓存一致性、分布式锁与消息队列' },
      { id: 'code-be-auth', title: '1 月 · 分布式系统设计、接口鉴权与限流降级' },
      { id: 'code-be-algo', title: '12–2 月 · 高频面试算法 60 题（与自考数据结构 13003 合一）', detail: '数组/链表/栈队/二叉树/二分/排序/哈希/DP 高频题手敲 AC' },
      { id: 'code-be-docker', title: '2 月 · Docker 部署、线上排障与模拟面试复盘' },
    ],
  },
  frontend: {
    key: 'frontend',
    title: '前端（辅助演示，按需）',
    stageTitle: '前端与 Demo 展示',
    stageDetail: 'React + TS 做 Agent 项目交互演示页，不作主攻方向',
    note: '仅服务于把 Agent 项目做成直观可体验的线上 Demo，不抢主线时间。',
    route: '/code/frontend',
    topics: [
      { id: 'code-fe-html', title: 'HTML 与语义化结构' },
      { id: 'code-fe-css', title: 'CSS 布局与响应式' },
      { id: 'code-fe-js', title: 'JavaScript 基础与异步（含 SSE / Fetch 流式读取）' },
      { id: 'code-fe-ts', title: 'TypeScript 类型与泛型' },
      { id: 'code-fe-react', title: 'React 组件与状态管理' },
      { id: 'code-fe-router', title: '路由与数据请求' },
      { id: 'code-fe-build', title: '构建工具与工程化' },
    ],
  },
};
