import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFitnessList } from '../api/fitness';
import { Button } from '../components/Button';
import { FitnessEditor } from '../features/fitness/Editor';
export function Component() {
  const auth = useAuth(),
    query = useFitnessList('profile');
  const [edit, setEdit] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const entry = query.data?.[0];
  return (
    <main id="main-content" className="platform-main" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">个人账号</p>
          <h1>账号设置</h1>
          <p className="secondary">一个账号，管理你的全部空间。</p>
        </div>
      </div>
      <div className="account-desk">
        <aside className="account-identity account-profile">
          <h2>账号信息</h2>
          <dl>
            <dt>登录名称</dt>
            <dd>{auth.user?.username}</dd>
            <dt>邮箱</dt>
            <dd>{auth.user?.email}</dd>
            <dt>角色</dt>
            <dd>{auth.user?.role === 'ADMIN' ? '管理员' : '普通用户'}</dd>
          </dl>
        </aside>
        <section className="account-preferences">
          <div className="section-title">
            <h2>个人资料与显示偏好</h2>
            <Button disabled={query.isPending || query.isError} onClick={() => setEdit(true)}>
              编辑资料
            </Button>
          </div>
          {query.isPending ? (
            <p role="status">正在读取…</p>
          ) : query.error ? (
            <div role="alert">
              <p>{query.error.message}</p>
              <Button onClick={() => query.refetch()}>重试</Button>
            </div>
          ) : (
            <>
              <h3>{entry?.data?.displayName || auth.user?.username}</h3>
              <p>{entry?.data?.bio || '还没有填写个人介绍。'}</p>
              <p className="secondary">
                {entry?.data?.compact ? '紧凑显示' : '舒适显示'} · 日历从
                {entry?.data?.weekStartsMonday === false ? '周日' : '周一'}开始
              </p>
            </>
          )}
        </section>
      </div>
      <section className="account-session">
        <div className="section-title">
          <h2>登录会话</h2>
          <Button
            variant="secondary"
            loading={signingOut}
            onClick={() => {
              setSigningOut(true);
              void auth
                .signOut()
                .catch(() => undefined)
                .finally(() => setSigningOut(false));
            }}
          >
            退出登录
          </Button>
        </div>
        <p className="secondary">退出后可重新登录，已保存的学习与健身记录会保留。</p>
      </section>
      {edit && (
        <FitnessEditor
          spec={{
            kind: 'profile',
            key: 'current',
            entry,
            initial: entry?.data ?? {
              displayName: auth.user?.username ?? '',
              bio: null,
              compact: false,
              weekStartsMonday: true,
            },
          }}
          onClose={() => setEdit(false)}
        />
      )}
    </main>
  );
}
