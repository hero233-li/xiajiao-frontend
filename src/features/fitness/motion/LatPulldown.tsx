/** A six-second cycle: setup .7s, pull 1.6s, hold .7s, return 2.5s, settle .5s. */
export function cyclePose(seconds: number) {
  const time = ((seconds % 6) + 6) % 6;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (time < 0.7) return { pull: 0, phase: 0 };
  if (time < 2.3) return { pull: smooth((time - 0.7) / 1.6), phase: 1 };
  if (time < 3) return { pull: 1, phase: 2 };
  if (time < 5.5) return { pull: 1 - smooth((time - 3) / 2.5), phase: 3 };
  return { pull: 0, phase: 0 };
}
export type Point = { x: number; y: number };
/** Two equal rigid segments, solved from shoulder and grip; outward elbow branch. */
export function elbowFor(shoulder: Point, hand: Point, side: -1 | 1): Point {
  const dx = hand.x - shoulder.x,
    dy = hand.y - shoulder.y;
  const distance = Math.hypot(dx, dy);
  const height = Math.sqrt(72 ** 2 - (distance / 2) ** 2);
  return {
    x: (shoulder.x + hand.x) / 2 - ((side * dy) / distance) * height,
    y: (shoulder.y + hand.y) / 2 + ((side * dx) / distance) * height,
  };
}
export function LatPulldown({ pull = 0 }: { pull?: number }) {
  const barY = 40 + pull * 140,
    stackY = 286 - pull * 140;
  return (
    <svg
      className="motion-illustration"
      viewBox="0 0 440 400"
      role="img"
      aria-label="高位下拉胸前动作示意：双手握杆、肘向下，配重随下拉升起"
    >
      <g
        data-part="fixed-machine"
        stroke="#8b9592"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M82 360H398M350 356V18H209V25M386 357V18H350" />
        <path d="M350 26V342M385 26V342" strokeWidth="2" />
        <path d="M211 300V356M174 357H250" />
        <rect x="170" y="290" width="84" height="12" rx="6" fill="#c4cdca" strokeWidth="2" />
      </g>
      <g data-part="cable" fill="none" stroke="#697773" strokeWidth="2.5">
        <path d={`M210 ${barY}V30Q210 22 218 22H359Q367 22 367 30V${stackY}`} />
        <circle cx="218" cy="29" r="9" fill="#f6f3eb" />
        <circle cx="359" cy="29" r="9" fill="#f6f3eb" />
      </g>
      <g
        data-part="weight-stack"
        transform={`translate(0 ${stackY})`}
        stroke="#7c8883"
        strokeWidth="2"
        fill="#c6ceca"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x="353" y={i * 9} width="28" height="8" rx="2" />
        ))}
        <path d="M355 20H363" stroke="#176b56" strokeWidth="3" />
      </g>
      <ellipse cx="217" cy="364" rx="71" ry="5" fill="#e8e4da" />
      <g data-part="legs" stroke="#46564f" strokeWidth="3" strokeLinejoin="round">
        <path
          d="M187 277L179 298L177 352H196L199 312L202 297H222L231 310L235 351H254L249 298L236 278Z"
          fill="#e0e5df"
        />
        <path
          d="M177 350L163 357Q157 364 166 364H196V351M235 351V363H267Q274 359 252 350"
          fill="#f6f3eb"
        />
      </g>
      <g
        data-part="torso"
        stroke="#46564f"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M199 153V169M222 153V169" fill="none" />
        <path
          d="M180 174Q192 163 199 165Q210 173 223 165Q234 165 240 174L233 233L239 282Q211 291 181 281L188 230Z"
          fill="#d9eadf"
        />
        <path
          d="M194 183Q208 191 226 183M200 266L227 266"
          stroke="#a4bdb0"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M191 124Q190 105 210 104Q231 104 232 125L229 147Q211 168 194 148Z"
          fill="#f1e6d6"
        />
        <path d="M192 122Q188 101 209 100Q232 99 233 121L223 115Q207 122 199 114Z" fill="#53645a" />
        <path d="M201 133H202M220 133H221M207 146Q212 149 217 146" fill="none" strokeWidth="2" />
      </g>
      <g data-part="arms" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {([-1, 1] as const).map((side) => {
          const shoulder = { x: side === -1 ? 180 : 240, y: 176 };
          const hand = { x: side === -1 ? 132 : 288, y: barY + 3 };
          const elbow = elbowFor(shoulder, hand, side);
          return (
            <g key={side}>
              <path
                data-part="upper-arm"
                d={`M${shoulder.x} ${shoulder.y}L${elbow.x} ${elbow.y}`}
                stroke="#46564f"
                strokeWidth="15"
              />
              <path
                d={`M${shoulder.x} ${shoulder.y}L${elbow.x} ${elbow.y}`}
                stroke="#f1e6d6"
                strokeWidth="10"
              />
              <path
                data-part="forearm"
                d={`M${elbow.x} ${elbow.y}L${hand.x} ${hand.y}`}
                stroke="#46564f"
                strokeWidth="13"
              />
              <path
                d={`M${elbow.x} ${elbow.y}L${hand.x} ${hand.y}`}
                stroke="#f1e6d6"
                strokeWidth="8"
              />
            </g>
          );
        })}
      </g>
      <g data-part="thigh-pad" stroke="#7c8883" strokeWidth="3" fill="#b8c3bd">
        <path d="M252 291H276V300" fill="none" />
        <rect x="173" y="284" width="85" height="14" rx="7" />
      </g>
      <g data-part="bar" transform={`translate(0 ${barY})`} fill="none" strokeLinecap="round">
        <path d="M100 11L124 0H296L320 11" stroke="#53645a" strokeWidth="7" />
        <path d="M121 1H144M277 1H300" stroke="#176b56" strokeWidth="7" />
        <g data-part="hands" fill="#f1e6d6" stroke="#46564f" strokeWidth="2">
          <rect x="127" y="-4" width="10" height="13" rx="4" />
          <rect x="283" y="-4" width="10" height="13" rx="4" />
        </g>
      </g>
      <g
        data-part="direction-arrow"
        stroke="#176b56"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M76 121V183M69 175L76 183L83 175" />
      </g>
    </svg>
  );
}
