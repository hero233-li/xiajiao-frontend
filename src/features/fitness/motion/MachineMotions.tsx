import {
  Arrow,
  Chain,
  Grip,
  Head,
  joint,
  Machine,
  mix,
  polar,
  Scene,
  Seat,
  Shoe,
  Stack,
  Torso,
} from './drawing';
export function legPressPose(p: number) {
  const hip = { x: 120, y: 280 },
    foot = { x: 235 + 45 * p, y: 245 - 45 * p };
  return { hip, foot, knee: joint(hip, foot, 95, 95, -1) };
}
export function LegPress({ pull = 0 }: { pull?: number }) {
  const { hip, foot, knee } = legPressPose(pull),
    shoulder = { x: 80, y: 190 };
  return (
    <Scene label="腿举：背部贴靠背，屈伸膝髋，脚掌与滑动踏板同步移动">
      <Machine>
        <path d="M70 345H365M88 335L54 175M110 292L85 350M210 315L342 183M236 333L368 201" />
        <path d="M55 177L102 284" strokeWidth="15" />
        <path d="M104 289H150" strokeWidth="12" />
      </Machine>
      <g data-part="carriage" transform={`translate(${foot.x} ${foot.y})`}>
        <path d="M-20 -25L31 26M5 0L39 34" stroke="#8b9592" strokeWidth="9" strokeLinecap="round" />
        <path d="M-20 -27L30 23" stroke="#b8c3bd" strokeWidth="13" />
      </g>
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={18} part="leg" />
      <Shoe at={foot} angle={-45} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 65, y: 150 }} angle={-20} />
      <Chain a={shoulder} middle={{ x: 73, y: 252 }} b={{ x: 122, y: 285 }} part="arm" />
      <Grip at={{ x: 122, y: 285 }} />
      <Arrow a={{ x: 276, y: 280 }} b={{ x: 321, y: 235 }} />
    </Scene>
  );
}
export function pressPose(p: number) {
  const shoulder = { x: 140, y: 174 },
    hand = { x: 190 + 80 * p, y: 187 };
  return { shoulder, hand, elbow: joint(shoulder, hand, 70, 70, 1) };
}
export function ChestPress({ pull = 0 }: { pull?: number }) {
  const { shoulder, hand, elbow } = pressPose(pull),
    hip = { x: 145, y: 272 };
  return (
    <Scene label="坐姿推胸：背部固定，双手推动胸前把手，肘逐渐伸展后缓慢收回">
      <Seat x={106} />
      <Stack pull={pull} />
      <Machine>
        <path d="M170 130H320M170 221H320M322 125V330" />
      </Machine>
      <g data-part="handle-carriage" transform={`translate(${hand.x} 0)`}>
        <path d="M0 132V220M-1 187H22" stroke="#8b9592" strokeWidth="7" strokeLinecap="round" />
        <path d="M0 175V200" stroke="#176b56" strokeWidth="8" strokeLinecap="round" />
      </g>
      <Chain
        a={hip}
        middle={{ x: 223, y: 284 }}
        b={{ x: 224, y: 348 }}
        color="#e0e5df"
        width={17}
        part="leg"
      />
      <Shoe at={{ x: 224, y: 349 }} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 139, y: 133 }} />
      <Chain a={shoulder} middle={elbow} b={hand} />
      <Grip at={hand} />
      <Arrow a={{ x: 192, y: 110 }} b={{ x: 274, y: 110 }} />
    </Scene>
  );
}
export function rowPose(p: number) {
  const shoulder = { x: 143, y: 173 },
    hand = { x: 270 - 92 * p, y: 205 + 25 * p };
  return { shoulder, hand, elbow: joint(shoulder, hand, 70, 70, 1) };
}
export function SeatedRow({ pull = 0 }: { pull?: number }) {
  const { shoulder, hand, elbow } = rowPose(pull),
    hip = { x: 146, y: 271 };
  const cableLift = Math.hypot(hand.x - 318, hand.y - 218) - Math.hypot(270 - 318, 205 - 218);
  return (
    <Scene label="坐姿划船：手柄拉向下胸与腹部，肘向后移动，躯干保持稳定">
      <Seat x={108} back={false} />
      <Stack pull={cableLift / 55} />
      <Machine>
        <path d="M318 155V345M298 344H345M274 326L299 309" />
      </Machine>
      <path
        data-part="cable"
        d={`M${hand.x} ${hand.y}L318 218V130H376V${285 - cableLift}`}
        stroke="#697773"
        strokeWidth="2"
        fill="none"
      />
      <Chain
        a={hip}
        middle={{ x: 226, y: 283 }}
        b={{ x: 286, y: 320 }}
        color="#e0e5df"
        width={17}
        part="leg"
      />
      <Shoe at={{ x: 282, y: 320 }} angle={-25} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 142, y: 133 }} />
      <Chain a={shoulder} middle={elbow} b={hand} />
      <path
        data-part="handle"
        d={`M${hand.x} ${hand.y - 13}V${hand.y + 13}`}
        stroke="#176b56"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <Grip at={hand} />
      <Arrow a={{ x: 275, y: 153 }} b={{ x: 198, y: 153 }} />
    </Scene>
  );
}
export function curlPose(p: number) {
  const knee = { x: 226, y: 263 };
  return { knee, foot: polar(knee, 83, mix(-8, 100, p)), pad: polar(knee, 68, mix(-8, 100, p)) };
}
export function LegCurl({ pull = 0 }: { pull?: number }) {
  const { knee, foot, pad } = curlPose(pull),
    hip = { x: 143, y: 263 },
    shoulder = { x: 136, y: 163 };
  return (
    <Scene label="坐姿腿弯举：膝关节对齐器械转轴，小腿与滚垫一起向下向后转动">
      <Seat x={109} y={276} />
      <Stack pull={pull} />
      <Machine>
        <path d="M228 264V346M204 348H287" />
        <circle cx="226" cy="263" r="9" fill="#c4cdca" />
      </Machine>
      <path
        data-part="moving-lever"
        d={`M${knee.x} ${knee.y}L${pad.x} ${pad.y}`}
        stroke="#8b9592"
        strokeWidth="7"
      />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 134, y: 123 }} />
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={18} part="leg" />
      <Shoe at={foot} angle={mix(-8, 100, pull)} />
      <g
        data-part="shin-pad"
        transform={`translate(${pad.x} ${pad.y}) rotate(${mix(-8, 100, pull)})`}
      >
        <rect
          x="-5"
          y="-12"
          width="12"
          height="24"
          rx="6"
          fill="#b8c3bd"
          stroke="#7c8883"
          strokeWidth="2"
        />
      </g>
      <Machine>
        <path d="M170 249H216" strokeWidth="14" />
      </Machine>
      <Chain a={shoulder} middle={{ x: 116, y: 223 }} b={{ x: 167, y: 269 }} />
      <Grip at={{ x: 167, y: 269 }} />
      <Arrow a={{ x: 326, y: 266 }} b={{ x: 308, y: 325 }} />
    </Scene>
  );
}
export function hipThrustPose(p: number) {
  const shoulder = { x: 120, y: 223 },
    hip = polar(shoulder, 105, mix(43, 0, p)),
    foot = { x: 311, y: 335 };
  return { shoulder, hip, foot, knee: joint(hip, foot, 88, 92, -1) };
}
export function HipThrust({ pull = 0 }: { pull?: number }) {
  const { shoulder, hip, foot, knee } = hipThrustPose(pull),
    angle = mix(43, 0, pull);
  const hand = polar(shoulder, 87, angle),
    elbow = joint(shoulder, hand, 64, 64, 1);
  return (
    <Scene label="臀推机：上背支撑固定，髋部带动安全带和负重臂抬起，脚掌保持在踏板上">
      <Machine>
        <path d="M69 350H370M97 229V347M78 232H137M274 347L343 321" />
        <rect x="78" y="220" width="58" height="17" rx="8" fill="#c4cdca" />
        <path d="M120 229V331" />
      </Machine>
      <g data-part="weighted-lever" transform={`translate(120 223) rotate(${angle})`}>
        <path d="M0 12H109" stroke="#8b9592" strokeWidth="9" />
        <circle cx="73" cy="22" r="20" fill="#c6ceca" stroke="#7c8883" strokeWidth="3" />
        <circle cx="73" cy="22" r="6" fill="#f8f5ee" />
      </g>
      <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={18} part="leg" />
      <Shoe at={foot} angle={-12} />
      <Torso shoulder={shoulder} hip={hip} />
      <Head at={{ x: 91, y: 207 }} angle={-65 + angle} />
      <g data-part="hip-strap" transform={`translate(${hip.x} ${hip.y}) rotate(${angle})`}>
        <rect
          x="-16"
          y="-23"
          width="21"
          height="46"
          rx="8"
          fill="#b8c3bd"
          stroke="#7c8883"
          strokeWidth="2"
        />
      </g>
      <Chain a={shoulder} middle={elbow} b={hand} />
      <Grip at={hand} />
      <Arrow a={{ x: 240, y: 292 }} b={{ x: 240, y: 244 }} />
    </Scene>
  );
}
export function abductionPose(p: number, side: number) {
  const hip = { x: 220 + side * 17, y: 253 };
  const knee = { x: 220 + side * (36 + 50 * p), y: 286 - 12 * p };
  return { hip, knee, foot: { x: knee.x + side * 5, y: knee.y + 66 } };
}
export function HipAbduction({ pull = 0 }: { pull?: number }) {
  return (
    <Scene label="髋外展：坐稳后双腿向外打开，外侧压垫与脚踏跟随腿部，缓慢收回">
      <Seat x={164} y={277} back={false} />
      <Machine>
        <rect x="184" y="133" width="71" height="131" rx="8" fill="#c4cdca" strokeWidth="2" />
      </Machine>
      <Stack pull={pull} />
      {[-1, 1].map((side) => {
        const { hip, knee, foot } = abductionPose(pull, side);
        return (
          <g key={side}>
            <path
              data-part="moving-lever"
              d={`M220 285L${knee.x} ${knee.y + 15}V${foot.y + 7}`}
              stroke="#8b9592"
              strokeWidth="6"
              fill="none"
            />
            <Chain a={hip} middle={knee} b={foot} color="#e0e5df" width={18} part="leg" />
            <Shoe at={foot} />
            <rect
              data-part="outer-thigh-pad"
              x={knee.x + side * 11 - 6}
              y={knee.y - 16}
              width="12"
              height="30"
              rx="5"
              fill="#b8c3bd"
              stroke="#7c8883"
              strokeWidth="2"
            />
          </g>
        );
      })}
      <Torso shoulder={{ x: 220, y: 171 }} hip={{ x: 220, y: 248 }} />
      <Head at={{ x: 220, y: 126 }} />
      {[-1, 1].map((side) => (
        <Chain
          key={side}
          a={{ x: 220 + side * 18, y: 174 }}
          middle={{ x: 220 + side * 43, y: 218 }}
          b={{ x: 220 + side * 48, y: 268 }}
        />
      ))}
      <Arrow a={{ x: 141, y: 228 }} b={{ x: 103, y: 228 }} />
      <Arrow a={{ x: 299, y: 228 }} b={{ x: 337, y: 228 }} />
    </Scene>
  );
}
