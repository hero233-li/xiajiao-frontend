import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { SpaceIcon } from './SpaceIcon';
import { personalSpaces, switchTarget } from '../../spaces/registry';
import type { Directory } from '../../spaces/types';
export function SpaceSwitcher({ directory, close }: { directory: Directory; close: () => void }) {
  const [search, setSearch] = useState('');
  const spaces = personalSpaces(directory);
  const favorites = spaces.filter((x) => x.preference.favorite);
  const recent = [...spaces]
    .filter((x) => x.preference.visitedAt)
    .sort((a, b) => b.preference.visitedAt!.localeCompare(a.preference.visitedAt!))
    .slice(0, 3);
  const filtered = spaces.filter(
    ({ space }) => space.name.includes(search) || space.description.includes(search),
  );
  const rows = (list: typeof spaces) =>
    list.map(({ space, preference }) => (
      <Link
        key={space.id}
        className="switch-row"
        to={switchTarget(space, preference)}
        onClick={close}
      >
        <SpaceIcon icon={space.icon} accent={space.accent} />
        <span>
          <strong>{space.name}</strong>
          <small>{preference.lastPath ? '继续最近访问的位置' : '进入空间首页'}</small>
        </span>
      </Link>
    ));
  return (
    <Modal open title="切换空间" onClose={close}>
      <div className="switcher-body">
        <label>
          查找我的空间
          <input
            data-autofocus="true"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="输入空间名称"
          />
        </label>
        {!search && favorites.length > 0 && (
          <section>
            <h3>收藏</h3>
            {rows(favorites)}
          </section>
        )}
        {!search && recent.length > 0 && (
          <section>
            <h3>最近访问</h3>
            {rows(recent)}
          </section>
        )}
        <section>
          <h3>我的空间</h3>
          {rows(filtered)}
          {!filtered.length && <p>没有匹配的个人入口，可在目录中加入或恢复空间。</p>}
        </section>
        <Link className="button button-secondary" to="/spaces" onClick={close}>
          查看完整空间目录
        </Link>
      </div>
    </Modal>
  );
}
