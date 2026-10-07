import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Star, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useSpaces, useSpacePreference, useSpaceOrder } from '../spaces/api';
import { moduleFor, switchTarget } from '../spaces/registry';
import { SpaceIcon } from '../features/platform/SpaceIcon';
import { DirectoryState } from '../features/platform/DirectoryState';
import { Button } from '../components/Button';
import type { Preference } from '../spaces/types';
export function Component() {
  const d = useSpaces();
  const mutation = useSpacePreference();
  const order = useSpaceOrder();
  const busy = mutation.isPending || order.isPending;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const save = async (p: Preference) => {
    setNotice('');
    try {
      await mutation.mutateAsync(p);
      setNotice('空间偏好已保存');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '保存失败，请重试');
    }
  };
  const available =
    d.data?.spaces
      .filter((s) => s.status === 'AVAILABLE')
      .sort(
        (a, b) =>
          (d.data!.preferences.find((p) => p.spaceId === a.id)?.position ?? a.order) -
            (d.data!.preferences.find((p) => p.spaceId === b.id)?.position ?? b.order) ||
          a.order - b.order,
      ) ?? [];
  // Move across positions without rewriting every space or requiring pointer dragging.
  const move = async (p: Preference, delta: number) => {
    const ordered = available.map((s) => d.data!.preferences.find((p) => p.spaceId === s.id)!);
    const index = ordered.findIndex((x) => x.spaceId === p.spaceId);
    if (!ordered[index + delta]) return;
    [ordered[index], ordered[index + delta]] = [ordered[index + delta], ordered[index]];
    setNotice('');
    try {
      await order.mutateAsync(ordered);
      setNotice('空间顺序已保存');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '排序失败，请重试');
    }
  };
  const list =
    d.data?.spaces
      .filter((s) => {
        const p = d.data!.preferences.find((p) => p.spaceId === s.id);
        return (
          `${s.name} ${s.description}`.toLowerCase().includes(query.trim().toLowerCase()) &&
          (filter === 'all' ||
            (filter === 'joined' && p?.joined) ||
            (filter === 'favorite' && p?.favorite) ||
            (filter === 'hidden' && p?.hidden) ||
            (filter === 'soon' && s.status === 'COMING_SOON'))
        );
      })
      .sort(
        (a, b) =>
          (d.data!.preferences.find((p) => p.spaceId === a.id)?.position ?? a.order) -
            (d.data!.preferences.find((p) => p.spaceId === b.id)?.position ?? b.order) ||
          a.order - b.order,
      ) ?? [];
  return (
    <main id="main-content" className="platform-main directory-main" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">个人成长平台</p>
          <h1>空间目录</h1>
          <p className="secondary">
            选择长期投入的方向，为自己整理入口。隐藏或退出空间会保留所有记录。
          </p>
        </div>
        <span className="directory-count">{d.data?.spaces.length ?? '—'} 个空间</span>
      </div>
      <div className="directory-tools">
        <label className="directory-search">
          <span>查找空间</span>
          <input
            type="search"
            value={query}
            placeholder="按名称或介绍搜索"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span>显示范围</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">全部空间</option>
            <option value="joined">已加入</option>
            <option value="favorite">已收藏</option>
            <option value="hidden">已隐藏</option>
            <option value="soon">即将开放</option>
          </select>
        </label>
      </div>
      {notice && (
        <p
          role={mutation.isError || order.isError ? 'alert' : 'status'}
          className="platform-notice"
        >
          {notice}
        </p>
      )}
      <DirectoryState pending={d.isPending} error={d.error} retry={() => void d.refetch()}>
        <div className="directory-grid">
          {list.map((s) => {
            const p = d.data!.preferences.find((p) => p.spaceId === s.id)!;
            const ready = s.status === 'AVAILABLE' && !!moduleFor(s.id);
            return (
              <article key={s.id} className={`directory-card ${ready ? '' : 'coming-soon'}`}>
                <header>
                  <SpaceIcon icon={s.icon} accent={s.accent} />
                  <span className="space-status">
                    {ready
                      ? p.joined
                        ? p.hidden
                          ? '入口已隐藏'
                          : '已加入'
                        : '可加入'
                      : '即将开放'}
                  </span>
                </header>
                <h2>{s.name}</h2>
                <p>{s.description}</p>
                {ready ? (
                  <>
                    <div className="directory-primary">
                      {p.joined ? (
                        <Link className="button button-secondary" to={switchTarget(s, p)}>
                          进入空间 <ArrowUpRight size={16} />
                        </Link>
                      ) : (
                        <Button
                          disabled={busy}
                          onClick={() => void save({ ...p, joined: true, hidden: false })}
                        >
                          加入空间
                        </Button>
                      )}
                    </div>
                    {p.joined && (
                      <div className="directory-controls">
                        <button
                          disabled={busy}
                          aria-label={`${p.favorite ? '取消收藏' : '收藏'}${s.name}`}
                          aria-pressed={p.favorite}
                          onClick={() => void save({ ...p, favorite: !p.favorite })}
                        >
                          <Star size={18} fill={p.favorite ? 'currentColor' : 'none'} />
                          收藏
                        </button>
                        <button
                          disabled={busy}
                          aria-label={`${p.hidden ? '显示' : '隐藏'}${s.name}入口`}
                          onClick={() => void save({ ...p, hidden: !p.hidden })}
                        >
                          {p.hidden ? <Eye size={18} /> : <EyeOff size={18} />}{' '}
                          {p.hidden ? '显示' : '隐藏'}
                        </button>
                        <button
                          disabled={busy || available[0]?.id === s.id}
                          aria-label={`上移${s.name}`}
                          onClick={() => void move(p, -1)}
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button
                          disabled={busy || available.at(-1)?.id === s.id}
                          aria-label={`下移${s.name}`}
                          onClick={() => void move(p, 1)}
                        >
                          <ArrowDown size={18} />
                        </button>
                      </div>
                    )}
                    {p.joined && (
                      <button
                        className="leave-space"
                        disabled={busy}
                        onClick={() => void save({ ...p, joined: false, favorite: false })}
                      >
                        退出个人入口
                      </button>
                    )}
                  </>
                ) : (
                  <p className="coming-caption">准备中，开放后可加入。</p>
                )}
              </article>
            );
          })}
        </div>
        {!list.length && (
          <div className="ledger-empty">
            <h2>没有匹配的空间</h2>
            <p>换一个关键词或显示范围。</p>
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              重置筛选
            </Button>
          </div>
        )}
      </DirectoryState>
    </main>
  );
}
