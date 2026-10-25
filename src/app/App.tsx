import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useSession } from '../lib/useSession';
import { DailyPage } from '../pages/DailyPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { Placeholder } from '../pages/Placeholder';
import { CoursesPage } from '../pages/zikao/CoursesPage';
import { SchedulePage } from '../pages/zikao/SchedulePage';
import { LabPage } from '../pages/zikao/LabPage';
import { PostgradSubjectsPage } from '../pages/kaoyan/SubjectsPage';
import { EnglishSchedulePage } from '../pages/english/EnglishSchedulePage';
import { RoadmapPage } from '../pages/code/RoadmapPage';
import { TrackPage } from '../pages/code/TrackPage';
import { CertPage } from '../pages/other/CertPage';

function RequireAuth() {
  const session = useSession();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <AppShell />;
}

function NotFound() {
  return <Placeholder title="页面不存在" note="地址可能已经调整，请从左侧导航重新进入。" />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<HomePage />} />
        <Route path="/daily" element={<DailyPage />} />
        <Route path="/zikao/courses" element={<CoursesPage />} />
        <Route path="/zikao/schedule" element={<SchedulePage />} />
        <Route path="/zikao/exams" element={<Placeholder title="历年试卷" note="历年真题与答案解析，稍后补充。" />} />
        <Route path="/zikao/plan" element={<Placeholder title="学习计划" note="按考期倒排的学习安排，稍后补充。" />} />
        <Route path="/zikao/lab" element={<LabPage />} />
        <Route path="/courses" element={<Navigate to="/zikao/courses" replace />} />
        <Route path="/kaoyan/subjects" element={<PostgradSubjectsPage />} />
        <Route path="/english/schedule" element={<EnglishSchedulePage />} />
        <Route path="/code/roadmap" element={<RoadmapPage />} />
        <Route
          path="/code/frontend"
          element={
            <TrackPage
              title="前端"
              note="从页面结构到数据请求。"
              topics={[
                'HTML 与语义化结构',
                'CSS 布局与响应式',
                'JavaScript 基础与异步',
                'TypeScript 类型与泛型',
                'React 组件与状态管理',
                '路由与数据请求',
                '构建工具与工程化',
              ]}
            />
          }
        />
        <Route
          path="/code/backend"
          element={
            <TrackPage
              title="后端"
              note="从语言基础到上线部署。"
              topics={[
                'Java 语法与集合',
                'Spring Boot 分层与依赖注入',
                'MySQL 表设计与索引',
                'Redis 缓存与过期策略',
                '接口设计与鉴权',
                '日志与异常处理',
                'Docker 部署与回滚',
              ]}
            />
          }
        />
        <Route
          path="/code/ai"
          element={
            <TrackPage
              title="AI"
              note="从数值计算到大模型应用。"
              topics={[
                'Python 与 NumPy',
                '机器学习基础',
                '深度学习与常见网络',
                '向量检索与 RAG',
                '提示词与 Agent 编排',
                '模型服务与部署',
              ]}
            />
          }
        />
        <Route path="/other/ai-trainer" element={<CertPage />} />
        <Route path="/exams" element={<Placeholder title="历年试卷" note="试卷列表、成绩与工作台。" />} />
        <Route path="/settings" element={<Placeholder title="设置" note="账号与偏好。" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
