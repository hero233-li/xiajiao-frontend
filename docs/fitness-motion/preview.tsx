import React from 'react';
import { createRoot } from 'react-dom/client';
import { ExerciseList } from '../../src/features/fitness/display';
import { motions } from '../../src/features/fitness/motion/catalog';
import type { Exercise } from '../../src/api/fitness';
import '../../src/styles/global.css';
import '../../src/styles/platform.css';
const groups = [
  {
    name: '器械力量与核心',
    ids: [
      'lat-pulldown',
      'leg-press',
      'chest-press',
      'seated-row',
      'leg-curl',
      'hip-thrust',
      'hip-abduction',
      'dead-bug',
      'plank',
    ],
  },
  { name: '走路与爬坡', ids: ['treadmill-walk', 'incline-walk', 'flat-walk'] },
  {
    name: '动态热身',
    ids: ['dynamic-warmup', 'hip-circles', 'bodyweight-squat', 'calf-raise', 'hip-hinge'],
  },
  {
    name: '恢复拉伸',
    ids: [
      'recovery-stretch',
      'hamstring-stretch',
      'calf-stretch',
      'glute-stretch',
      'chest-stretch',
      'back-stretch',
    ],
  },
];
const gallery = new URLSearchParams(location.search).get('gallery');
createRoot(document.getElementById('root')!).render(
  gallery ? (
    <main style={{ maxWidth: 1200, margin: 'auto', padding: 24 }}>
      <h1>全部动作 · {gallery === 'end' ? '关键姿势' : '起始姿势'}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {Object.values(motions).map((motion) => {
          const Illustration = motion.Illustration;
          return (
            <section
              key={motion.id}
              style={{
                background: '#f8f5ee',
                border: '1px solid #e8e7dd',
                borderRadius: 8,
                padding: 8,
              }}
            >
              <h2 style={{ fontSize: 16, margin: 0 }}>{motion.name}</h2>
              <Illustration
                pull={gallery === 'end' ? 1 : 0}
                seconds={gallery === 'end' ? motion.stillSeconds : 0}
              />
            </section>
          );
        })}
      </div>
    </main>
  ) : (
    <React.StrictMode>
      <main className="platform-main fitness-main" style={{ maxWidth: 900 }}>
        <div className="page-heading">
          <div>
            <p className="eyebrow">动作示意 / 本地预览</p>
            <h1>训练动作动画</h1>
            <p className="secondary">
              现有第一周计划全部项目已接入。列表保持静态，点击查看后播放；此页面不会保存记录。
            </p>
          </div>
        </div>
        {groups.map((group) => (
          <section className="platform-section" key={group.name}>
            <h2>{group.name}</h2>
            <ExerciseList
              rows={group.ids.map((id) => {
                const motion = motions[id as keyof typeof motions];
                return {
                  id,
                  name: motion.name,
                  type: motion.types[0],
                  sets: null,
                  reps: null,
                  kg: null,
                  minutes: null,
                  km: null,
                  completed: null,
                  note: motion.subtitle,
                } as Exercise;
              })}
            />
          </section>
        ))}
        <section className="platform-section">
          <h2>未收录的自定义动作</h2>
          <ExerciseList
            rows={[
              {
                id: 'preview-unknown',
                name: '我的自定义训练',
                type: 'OTHER',
                sets: 2,
                reps: 10,
                kg: null,
                minutes: null,
                km: null,
                note: '保留记录与编辑，不猜测动作含义。',
                completed: null,
              },
            ]}
          />
        </section>
      </main>
    </React.StrictMode>
  ),
);
