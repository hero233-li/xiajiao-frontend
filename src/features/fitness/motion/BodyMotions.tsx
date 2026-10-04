import { Arrow, Chain, Head, joint, mix, polar, Scene, Segment, Shoe, Torso } from './drawing';
export function deadBugPose(p: number, side: number) {
  const shoulder = { x: 154, y: 310 + side * 5 },
    hip = { x: 235, y: 310 + side * 5 };
  // Opposite arm and leg: side +1 extends the arm while side -1 extends the leg.
  const armAmount = side === 1 ? p : 0,
    legAmount = side === -1 ? p : 0;
  const elbow = polar(shoulder, 51, -90 - 80 * armAmount),
    hand = polar(elbow, 49, -90 - 80 * armAmount);
  const knee = polar(hip, 60, -90 + 70 * legAmount),
    foot = polar(knee, 65, 0 + 15 * legAmount);
  return { shoulder, hip, elbow, hand, knee, foot };
}
export function DeadBug({ pull = 0, seconds = 0 }: { pull?: number; seconds?: number }) {
  const swap = Math.floor(seconds / 6) % 2 === 1 ? -1 : 1;
  return (
    <Scene label="Dead Bug：仰卧保持腰背稳定，交替伸出对侧手臂和腿，再回到双膝抬起的位置">
      <path d="M65 340H381" stroke="#b8c3bd" strokeWidth="10" strokeLinecap="round" />
      {[-1, 1].map((side) => {
        const pose = deadBugPose(pull, side * swap);
        return (
          <g key={side} opacity={side === -1 ? 0.65 : 1}>
            <Chain
              a={pose.hip}
              middle={pose.knee}
              b={pose.foot}
              color="#e0e5df"
              width={15}
              part="leg"
            />
            <Shoe at={pose.foot} angle={-70} />
            <Chain a={pose.shoulder} middle={pose.elbow} b={pose.hand} />
          </g>
        );
      })}
      <Torso shoulder={{ x: 154, y: 313 }} hip={{ x: 235, y: 313 }} />
      <Head at={{ x: 113, y: 309 }} angle={-90} />
      <Arrow a={{ x: 94, y: 220 }} b={{ x: 75, y: 273 }} />
      <Arrow a={{ x: 296, y: 263 }} b={{ x: 330, y: 286 }} />
    </Scene>
  );
}
export function Plank({ pull = 0 }: { pull?: number }) {
  const shoulder = { x: 148, y: 242 },
    hip = { x: 233, y: 279.5 },
    foot = { x: mix(310, 350, pull), y: 331 };
  const elbow = { x: 148, y: 327 },
    hand = { x: 101, y: 327 },
    knee = joint(hip, foot, 64, 64, 1);
  return (
    <Scene label="平板支撑：前臂与脚尖支撑，膝盖离地后保持身体稳定成直线，结束时缓慢落膝">
      <path d="M65 341H389" stroke="#b8c3bd" strokeWidth="9" strokeLinecap="round" />
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={16} part="leg" />
      <Shoe at={foot} angle={-28} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 113, y: shoulder.y - 5 }} angle={-55} />
      <Chain a={shoulder} middle={elbow} b={hand} />
      <path
        data-part="alignment-guide"
        d={`M144 ${shoulder.y}L350 331`}
        stroke="#176b56"
        strokeWidth="1.5"
        strokeDasharray="5 7"
        opacity={pull}
        fill="none"
      />
    </Scene>
  );
}
export function walkingPose(seconds: number, side: number, incline = 0) {
  const t = (((seconds / 2 + (side === 1 ? 0 : 0.5)) % 1) + 1) % 1;
  const x = t < 0.6 ? mix(250, 184, t / 0.6) : mix(184, 250, (t - 0.6) / 0.4);
  const ground = 345 - Math.tan((incline * Math.PI) / 180) * (x - 220);
  const foot = { x, y: ground - (t < 0.6 ? 0 : 30 * Math.sin((Math.PI * (t - 0.6)) / 0.4)) };
  const hip = { x: 215, y: incline ? 229 : 223 };
  return { hip, foot, knee: joint(hip, foot, 64, 64, -1), t };
}
function WalkScene({
  seconds = 0,
  incline = 0,
  treadmill = true,
}: {
  seconds?: number;
  incline?: number;
  treadmill?: boolean;
}) {
  const hip = { x: 215, y: incline ? 229 : 223 },
    shoulder = { x: 211, y: hip.y - 96 };
  return (
    <Scene
      label={
        incline
          ? '跑步机爬坡：身体稳定，双腿交替迈步，手臂自然摆动，脚接触倾斜跑带'
          : '走路：双腿交替迈步与落地，手臂对侧摆动'
      }
    >
      {treadmill && (
        <g
          data-part="fixed-machine"
          transform={`rotate(${-incline} 220 345)`}
          stroke="#8b9592"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        >
          <path d="M80 353H355M83 339H348M344 340V158H310M346 167L385 175" />
          <rect x="294" y="137" width="52" height="20" rx="5" fill="#c4cdca" strokeWidth="2" />
          <g data-part="belt" strokeWidth="2">
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M${86 + ((i * 32 + seconds * 32) % 255)} 341l-5 9`} />
            ))}
          </g>
        </g>
      )}
      {[-1, 1].map((side) => {
        const pose = walkingPose(seconds, side, incline);
        return (
          <g key={side} opacity={side === -1 ? 0.6 : 1}>
            <Chain
              a={pose.hip}
              middle={pose.knee}
              b={pose.foot}
              color="#e0e5df"
              width={15}
              part="leg"
            />
            <Shoe at={pose.foot} angle={-incline} />
          </g>
        );
      })}
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 208, y: shoulder.y - 42 }} />
      {[-1, 1].map((side) => {
        const swing = side * 25 * Math.sin(seconds * Math.PI),
          elbow = polar(shoulder, 47, 90 + swing),
          hand = polar(elbow, 44, 65 + swing);
        return (
          <g key={side} opacity={side === -1 ? 0.6 : 1}>
            <Chain a={shoulder} middle={elbow} b={hand} />
          </g>
        );
      })}
      <Arrow a={{ x: 290, y: 270 }} b={{ x: 330, y: 270 }} />
    </Scene>
  );
}
export function TreadmillWalk(props: { pull?: number; seconds?: number }) {
  return <WalkScene {...props} />;
}
export function InclineWalk(props: { pull?: number; seconds?: number }) {
  return <WalkScene {...props} incline={8} />;
}
export function FlatWalk(props: { pull?: number; seconds?: number }) {
  return <WalkScene {...props} treadmill={false} />;
}

export function squatPose(p: number) {
  const hip = { x: mix(234, 167, p), y: mix(216, 281, p) },
    foot = { x: 244, y: 347 };
  return {
    hip,
    foot,
    knee: joint(hip, foot, 65, 67, -1),
    shoulder: polar(hip, 87, mix(-90, -60, p)),
  };
}
export function Squat({ pull = 0 }: { pull?: number }) {
  const { hip, foot, knee, shoulder } = squatPose(pull),
    hand = { x: shoulder.x + 75, y: shoulder.y + 20 };
  return (
    <Scene label="徒手深蹲：髋向后坐，膝髋一起弯曲，脚掌固定，随后站起">
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={18} part="leg" />
      <Shoe at={foot} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={polar(shoulder, 39, mix(-90, -60, pull))} angle={pull * 20} />
      <Chain a={shoulder} middle={joint(shoulder, hand, 48, 48, 1)} b={hand} />
      <Arrow a={{ x: 142, y: 230 }} b={{ x: 142, y: 280 }} />
    </Scene>
  );
}
export function hingePose(p: number) {
  const hip = { x: mix(230, 183, p), y: mix(220, 234, p) },
    shoulder = polar(hip, 88, mix(-90, -45, p)),
    foot = { x: 238, y: 347 };
  return { hip, shoulder, foot, knee: joint(hip, foot, 64, 65, -1) };
}
export function HipHinge({ pull = 0 }: { pull?: number }) {
  const { hip, shoulder, foot, knee } = hingePose(pull),
    elbow = polar(shoulder, 46, 85),
    hand = polar(elbow, 43, 85);
  return (
    <Scene label="髋铰链：髋部向后，躯干作为整体前倾，膝微屈后缓慢站直">
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={18} part="leg" />
      <Shoe at={foot} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={polar(shoulder, 38, mix(-90, -45, pull))} angle={45 * pull} />
      <Chain a={shoulder} middle={elbow} b={hand} />
      <Arrow a={{ x: 204, y: 279 }} b={{ x: 166, y: 279 }} />
    </Scene>
  );
}
export function CalfRaise({ pull = 0 }: { pull?: number }) {
  const foot = { x: 225, y: 348 },
    ankle = polar(foot, 23, mix(180, 220, pull)),
    hip = { x: ankle.x, y: ankle.y - 119 },
    shoulder = { x: hip.x, y: hip.y - 89 };
  return (
    <Scene label="提踵：前脚掌留在地面，脚跟抬起，踝关节转动，缓慢落下">
      <Chain
        a={hip}
        middle={{ x: ankle.x, y: ankle.y - 61 }}
        b={ankle}
        color="#e0e5df"
        width={18}
        part="leg"
      />
      <Segment a={ankle} b={foot} width={13} color="#f8f5ee" part="foot" />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: shoulder.x, y: shoulder.y - 42 }} />
      <Chain
        a={shoulder}
        middle={{ x: shoulder.x + 13, y: shoulder.y + 43 }}
        b={{ x: hip.x + 15, y: hip.y + 3 }}
      />
      <Arrow a={{ x: 171, y: 346 }} b={{ x: 171, y: 321 }} />
    </Scene>
  );
}
export function ShoulderCircles({ seconds = 0, pull = 0 }: { seconds?: number; pull?: number }) {
  const time = ((seconds % 8) + 8) % 8;
  const phase = seconds ? (time < 4 ? time : 8 - time) * Math.PI : pull * Math.PI;
  const shoulders = [
    { x: 205 + 8 * Math.cos(phase), y: 148 + 7 * Math.sin(phase) },
    { x: 235 + 8 * Math.cos(phase), y: 148 + 7 * Math.sin(phase) },
  ];
  return (
    <Scene label="肩部绕环：手臂放松，肩部缓慢向前或向后绕圈，躯干稳定">
      <Torso shoulder={{ x: 220, y: 153 }} hip={{ x: 220, y: 245 }} />
      <Head at={{ x: 220, y: 110 }} />
      {[-1, 1].map((side, i) => {
        const shoulder = shoulders[i],
          elbow = polar(shoulder, 48, side === -1 ? 103 : 77),
          hand = polar(elbow, 47, side === -1 ? 98 : 82);
        return (
          <g key={side}>
            <Chain
              a={{ x: 220 + side * 13, y: 245 }}
              middle={{ x: 220 + side * 15, y: 294 }}
              b={{ x: 220 + side * 17, y: 348 }}
              color="#e0e5df"
              width={17}
              part="leg"
            />
            <Shoe at={{ x: 220 + side * 17, y: 348 }} />
            <Chain a={shoulder} middle={elbow} b={hand} />
          </g>
        );
      })}
      <path
        d="M167 129a23 23 0 1 1-9 33l-5 2 0-11 10 4"
        stroke="#176b56"
        strokeWidth="2.5"
        fill="none"
      />
    </Scene>
  );
}
export function HipCircles({ seconds = 0, pull = 0 }: { seconds?: number; pull?: number }) {
  const angle = seconds ? seconds * Math.PI : pull * Math.PI,
    hip = { x: 220 + 11 * Math.sin(angle), y: 246 + 5 * Math.cos(angle) },
    shoulder = { x: 220, y: 152 };
  return (
    <Scene label="髋部绕环：脚掌固定，以小幅度让骨盆绕圈，膝盖微屈，上身稳定">
      {[-1, 1].map((side) => {
        const a = { x: hip.x + side * 12, y: hip.y },
          foot = { x: 220 + side * 34, y: 348 };
        return (
          <g key={side}>
            <Chain
              a={a}
              middle={joint(a, foot, 56, 56, side)}
              b={foot}
              color="#e0e5df"
              width={17}
              part="leg"
            />
            <Shoe at={foot} />
          </g>
        );
      })}
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 220, y: 109 }} />
      {[-1, 1].map((side) => (
        <Chain
          key={side}
          a={{ x: 220 + side * 14, y: 158 }}
          middle={{ x: 220 + side * 48, y: 204 }}
          b={{ x: hip.x + side * 17, y: hip.y - 3 }}
        />
      ))}
      <ellipse
        cx="220"
        cy="276"
        rx="53"
        ry="15"
        stroke="#176b56"
        strokeWidth="2"
        strokeDasharray="5 5"
        fill="none"
      />
    </Scene>
  );
}
