import { Chain, Grip, Head, joint, Machine, mix, polar, Scene, Shoe, Torso } from './drawing';
export function QuadStretch({ pull = 0 }: { pull?: number }) {
  const hip = { x: 220, y: 235 },
    shoulder = { x: 220, y: 146 },
    knee = polar(hip, 59, mix(90, 98, pull)),
    foot = polar(knee, 58, mix(90, 225, pull)),
    hand = { x: mix(242, foot.x, pull), y: mix(234, foot.y, pull) };
  return (
    <Scene label="大腿前侧拉伸：扶稳支撑，弯曲一侧膝盖，手轻扶脚踝，膝靠近另一侧膝盖后保持">
      <Machine>
        <path d="M292 114V350" />
      </Machine>
      <Chain
        a={hip}
        middle={{ x: 217, y: 293 }}
        b={{ x: 217, y: 347 }}
        color="#e0e5df"
        width={16}
        part="support-leg"
      />
      <Shoe at={{ x: 217, y: 348 }} />
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={16} part="stretch-leg" />
      <Shoe at={foot} angle={mix(0, 110, pull)} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 220, y: 103 }} />
      <Chain a={shoulder} middle={joint(shoulder, hand, 70, 70, 1)} b={hand} />
      <Grip at={hand} />
      <Chain
        a={shoulder}
        middle={joint(shoulder, { x: 292, y: 172 }, 51, 51, -1)}
        b={{ x: 292, y: 172 }}
      />
    </Scene>
  );
}
export function HamstringStretch({ pull = 0 }: { pull?: number }) {
  const hip = { x: 177, y: 322 },
    shoulder = polar(hip, 86, mix(-90, -57, pull)),
    hand = { x: mix(255, 290, pull), y: 312 };
  return (
    <Scene label="大腿后侧拉伸：坐姿伸腿，从髋部轻轻前倾，背部保持长而直，进入后保持">
      <path d="M87 342H383" stroke="#b8c3bd" strokeWidth="9" strokeLinecap="round" />
      <Chain
        a={hip}
        middle={{ x: 257, y: 323 }}
        b={{ x: 335, y: 323 }}
        color="#e0e5df"
        width={17}
        part="leg"
      />
      <Shoe at={{ x: 335, y: 325 }} angle={-65} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={polar(shoulder, 38, mix(-90, -57, pull))} angle={33 * pull} />
      <Chain a={shoulder} middle={joint(shoulder, hand, 60, 60, 1)} b={hand} />
    </Scene>
  );
}
export function CalfStretch({ pull = 0 }: { pull?: number }) {
  const backFoot = { x: 150, y: 348 },
    frontFoot = { x: 291, y: 348 };
  const hip = polar(backFoot, 130, mix(-63, -50, pull));
  const shoulder = polar(hip, 92, mix(-88, -73, pull));
  const backKnee = { x: (hip.x + backFoot.x) / 2, y: (hip.y + backFoot.y) / 2 };
  return (
    <Scene label="小腿拉伸：扶墙前后站立，后脚跟踩地，身体轻向前移并保持，不反复弹动">
      <Machine>
        <path d="M334 107V350" />
      </Machine>
      <Chain a={hip} middle={backKnee} b={backFoot} color="#e0e5df" width={17} part="rear-leg" />
      <Shoe at={backFoot} />
      <Chain
        a={hip}
        middle={joint(hip, frontFoot, 73, 73, -1)}
        b={frontFoot}
        color="#e0e5df"
        width={17}
        part="front-leg"
      />
      <Shoe at={frontFoot} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: shoulder.x + 1, y: shoulder.y - 40 }} angle={15 * pull} />
      <Chain
        a={shoulder}
        middle={joint(shoulder, { x: 334, y: 170 }, 66, 66, 1)}
        b={{ x: 334, y: 170 }}
      />
      <Grip at={{ x: 334, y: 170 }} />
    </Scene>
  );
}
export function GluteStretch({ pull = 0 }: { pull?: number }) {
  const shoulder = { x: 148, y: 313 },
    hip = { x: 234, y: 313 };
  const knee = { x: mix(282, 249, pull), y: mix(268, 243, pull) },
    foot = { x: mix(324, 313, pull), y: mix(331, 283, pull) };
  const crossKnee = { x: mix(288, 296, pull), y: mix(277, 249, pull) },
    crossFoot = { x: hip.x + (knee.x - hip.x) * 0.75, y: hip.y + (knee.y - hip.y) * 0.75 };
  const hand = { x: mix(215, 249, pull), y: mix(286, 275, pull) };
  return (
    <Scene label="臀部四字拉伸：仰卧，一侧脚踝搭在另一侧大腿上，手轻带支撑腿靠近胸部后保持">
      <path d="M75 340H374" stroke="#b8c3bd" strokeWidth="9" strokeLinecap="round" />
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={17} part="support-leg" />
      <Shoe at={foot} angle={-55} />
      <Chain
        a={hip}
        middle={crossKnee}
        b={crossFoot}
        color="#e0e5df"
        width={15}
        part="crossed-leg"
      />
      <Shoe at={crossFoot} angle={-55} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 108, y: 310 }} angle={-90} />
      <Chain a={shoulder} middle={joint(shoulder, hand, 56, 56, -1)} b={hand} />
      <Grip at={hand} />
    </Scene>
  );
}
export function ChestStretch({ pull = 0 }: { pull?: number }) {
  // Frontal view makes the forearm support and doorway easy to distinguish.
  const hip = { x: 218 - 10 * pull, y: 245 },
    shoulder = { x: 218 - 10 * pull, y: 154 };
  return (
    <Scene label="胸部拉伸：一侧前臂扶门框，躯干轻轻远离支撑侧，胸部打开后保持">
      <Machine>
        <path d="M96 350V82H324V350" />
      </Machine>
      {[-1, 1].map((side) => (
        <g key={side}>
          <Chain
            a={{ x: hip.x + side * 12, y: 245 }}
            middle={{ x: 220 + side * 20, y: 293 }}
            b={{ x: 220 + side * 29, y: 348 }}
            color="#e0e5df"
            width={17}
            part="leg"
          />
          <Shoe at={{ x: 220 + side * 29, y: 348 }} />
        </g>
      ))}
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: shoulder.x, y: 111 }} />
      <Chain
        a={{ x: shoulder.x + 18, y: 159 }}
        middle={{ x: 319, y: 162 }}
        b={{ x: 319, y: 112 }}
      />
      <Chain
        a={{ x: shoulder.x - 18, y: 159 }}
        middle={{ x: shoulder.x - 24, y: 206 }}
        b={{ x: hip.x - 29, y: 250 }}
      />
    </Scene>
  );
}
export function BackStretch({ pull = 0 }: { pull?: number }) {
  const hip = { x: 169, y: mix(265, 315, pull) },
    hand = { x: 384, y: 333 };
  const shoulder = joint(hip, hand, 105, 125, -1);
  const elbow = { x: (shoulder.x + hand.x) / 2, y: (shoulder.y + hand.y) / 2 };
  return (
    <Scene label="背部拉伸：跪姿髋向脚跟坐，双手向前伸，躯干降低后保持自然呼吸">
      <path d="M86 347H400" stroke="#b8c3bd" strokeWidth="9" strokeLinecap="round" />
      <Chain
        a={hip}
        middle={{ x: 222, y: 327 }}
        b={{ x: 139, y: 332 }}
        color="#e0e5df"
        width={17}
        part="leg"
      />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: shoulder.x + 27, y: shoulder.y + 13 }} angle={65} />
      <Chain a={shoulder} middle={elbow} b={hand} />
      <Grip at={hand} />
    </Scene>
  );
}
