import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useSession } from '../lib/useSession';
import { CODE_TRACKS } from '../data/codeTracks';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { Placeholder } from '../pages/Placeholder';
import { CoursesPage } from '../pages/zikao/CoursesPage';
import { PlanPage } from '../pages/zikao/PlanPage';
import { SchedulePage } from '../pages/zikao/SchedulePage';
import { PostgradSubjectsPage } from '../pages/kaoyan/SubjectsPage';
import { EnglishSchedulePage } from '../pages/english/EnglishSchedulePage';
import { RoadmapPage } from '../pages/code/RoadmapPage';
import { TrackPage } from '../pages/code/TrackPage';
import { AiTrainerPage } from '../pages/other/AiTrainerPage';

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
        <Route path="/zikao/courses" element={<CoursesPage />} />
        <Route path="/zikao/schedule" element={<SchedulePage />} />
        <Route path="/zikao/exams" element={<Placeholder title="历年试卷" note="历年真题与答案解析，稍后补充。" />} />
        <Route path="/zikao/plan" element={<PlanPage />} />
        <Route path="/courses" element={<Navigate to="/zikao/courses" replace />} />
        <Route path="/kaoyan/subjects" element={<PostgradSubjectsPage />} />
        <Route path="/english/schedule" element={<EnglishSchedulePage />} />
        <Route path="/code/roadmap" element={<RoadmapPage />} />
        <Route
          path="/code/frontend"
          element={
            <TrackPage
              title={CODE_TRACKS.frontend.title}
              note={CODE_TRACKS.frontend.note}
              topics={CODE_TRACKS.frontend.topics}
            />
          }
        />
        <Route
          path="/code/backend"
          element={
            <TrackPage
              title={CODE_TRACKS.backend.title}
              note={CODE_TRACKS.backend.note}
              topics={CODE_TRACKS.backend.topics}
            />
          }
        />
        <Route
          path="/code/ai"
          element={
            <TrackPage
              title={CODE_TRACKS.ai.title}
              note={CODE_TRACKS.ai.note}
              topics={CODE_TRACKS.ai.topics}
            />
          }
        />
        <Route path="/other/ai-trainer" element={<AiTrainerPage />} />
        <Route path="/exams" element={<Placeholder title="历年试卷" note="试卷列表、成绩与工作台。" />} />
        <Route path="/settings" element={<Placeholder title="设置" note="账号与偏好。" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
