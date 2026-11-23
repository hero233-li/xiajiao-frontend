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
    title: 'AI 应用（Python → FastAPI → MVP）',
    stageTitle: 'AI 应用实战（当前主线）',
    stageDetail: 'Python 工程化、异步并发、FastAPI、LLM / RAG 最小可上线服务',
    note: '配合 5 年 Java 后端经验，按 5h/周 以“可交付 AI 后端 MVP”为唯一目标推进。',
    route: '/code/ai',
    topics: [
      { id: 'code-ai-env', title: '11-12 月 · Python 工程基建', detail: 'uv / venv、类型注解、ruff、pytest 跑通最小脚本' },
      { id: 'code-ai-core', title: '12 月 · Python 进阶与数据校验', detail: '生成器、装饰器、dataclasses / pydantic 模型校验' },
      { id: 'code-ai-async', title: '12 月 · 异步并发与外部 API', detail: 'asyncio + httpx 并发请求、超时与重试控制' },
      { id: 'code-ai-llm', title: '12 月 · LLM API 客户端模块', detail: '结构化输出、错误处理、pytest mock 单测与 CLI 封装' },
      { id: 'code-ai-fastapi', title: '1 月 · FastAPI 服务骨架', detail: '异步路由、依赖注入、鉴权/限流、SSE 流式输出与日志' },
      { id: 'code-ai-rag', title: '2 月 · RAG / Agent 检索与评测', detail: '切块、向量检索、基础评测集与响应质量对比' },
      { id: 'code-ai-deploy', title: '2 月底 · Docker 部署与简历项目讲稿', detail: '一键部署、架构图 README、面向面试的工程难点复盘' },
    ],
  },
  backend: {
    key: 'backend',
    title: '后端',
    stageTitle: '后端基础（既有优势）',
    stageDetail: 'Java、Spring Boot、MySQL、Redis、工程部署与高可用',
    note: '5 年 Java 后端已有底子，按需勾出面试前要复盘的核心专题。',
    route: '/code/backend',
    topics: [
      { id: 'code-be-java', title: 'Java 语法、集合框架与并发基础' },
      { id: 'code-be-spring', title: 'Spring Boot 分层与依赖注入' },
      { id: 'code-be-mysql', title: 'MySQL 表设计、索引与事务隔离' },
      { id: 'code-be-redis', title: 'Redis 缓存、过期策略与一致性' },
      { id: 'code-be-auth', title: '接口设计、鉴权与限流' },
      { id: 'code-be-obs', title: '日志、监控与异常处理' },
      { id: 'code-be-docker', title: 'Docker 容器部署与回滚' },
    ],
  },
  frontend: {
    key: 'frontend',
    title: '前端',
    stageTitle: '前端与全栈配合',
    stageDetail: 'HTML/CSS/TS、React 组件与状态、数据请求与工程化',
    note: '辅助 AI 全栈项目演示，不作为当前主线，按需勾选。',
    route: '/code/frontend',
    topics: [
      { id: 'code-fe-html', title: 'HTML 与语义化结构' },
      { id: 'code-fe-css', title: 'CSS 布局与响应式' },
      { id: 'code-fe-js', title: 'JavaScript 基础与异步' },
      { id: 'code-fe-ts', title: 'TypeScript 类型与泛型' },
      { id: 'code-fe-react', title: 'React 组件与状态管理' },
      { id: 'code-fe-router', title: '路由与数据请求' },
      { id: 'code-fe-build', title: '构建工具与工程化' },
    ],
  },
};
