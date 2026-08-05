import { useId, useEffect, useState, useRef } from "react";
import "./Robot.css";

/**
 * The persistent robot judge — flat SVG, but shaded/layered to read as a
 * physical object (offset shadow duplicates for thickness, a genuinely
 * sunken chest screen, ambient-occlusion at the joints) rather than a
 * paper cutout. This is the single canonical version — the earlier
 * WebGL/three.js attempt was abandoned after repeated rendering issues
 * that couldn't be reliably previewed; everything worth keeping from
 * that exploration (sealed pose, talking nod + gesture) is ported here.
 *
 * `pose`: "reaching" (lobby, arms open), "closeup" (fate-sealed beat,
 * scaled up), "holding" (reveal, arms wrap around and grip something),
 * "sealed" (tight arms, barely any sway — a still "judge" stance for the
 * pre-verdict dread beat, paired with `ominous`).
 *
 * `heldContent`: when `pose="holding"`, pass the actual React content
 * here instead of positioning it separately next to the robot. It's
 * rendered via an SVG `<foreignObject>` INSIDE the robot's own
 * coordinate space, at the exact spot its hands reach — so the object
 * and the grip are locked together by construction. The holding-pose
 * arms hold a fixed grip angle instead of swaying while they're actually
 * holding something.
 *
 * `eyeState`: "idle" (default — always dimly lit, never fully off),
 * "survive" (green), "death" (red). Mouth design never changes between
 * these. `eyeGlow` (boolean) is a deprecated alias for `eyeState="survive"`.
 *
 * `ominous`: stiller head, rarer blink, barely-there creep-closer scale —
 * layered on top of any eyeState. Used for fate-sealed, not the verdict
 * reveal itself (which should stay fully expressive).
 *
 * `narrating`: mouth talks, head does an actual nod (not just idle tilt),
 * and every few seconds one arm does a brief, natural-looking gesture —
 * picked at random so it doesn't read as a looping animation.
 */
export default function Robot({
  pose = "reaching",
  eyeState,
  eyeGlow = false,
  ominous = false,
  narrating = false,
  heldContent = null,
  className = "",
}) {
  const uid = useId().replace(/:/g, "");
  const resolvedEyeState = eyeState || (eyeGlow ? "survive" : "idle");
  const isHolding = pose === "holding" && Boolean(heldContent);

  // random one-arm gesture while narrating — picks a side, holds a brief
  // CSS bump animation, clears, waits a random 2.5-5.5s, repeats
  const [gesture, setGesture] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGesture(null);
    if (!narrating) return undefined;

    let cancelled = false;
    const schedule = () => {
      const wait = 2500 + Math.random() * 3000;
      const t = setTimeout(() => {
        if (cancelled) return;
        setGesture(Math.random() < 0.5 ? "left" : "right");
        const clear = setTimeout(() => {
          if (!cancelled) setGesture(null);
        }, 800);
        timers.current.push(clear);
        schedule();
      }, wait);
      timers.current.push(t);
    };
    schedule();

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [narrating]);

  return (
    <svg
      className={[
        "robot",
        `robot-pose-${pose}`,
        `robot-eye-${resolvedEyeState}`,
        ominous ? "robot-ominous" : "",
        narrating ? "robot-narrating" : "",
        isHolding ? "robot-has-held" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      viewBox="0 0 300 320"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-metal`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#FFFEFA" />
          <stop offset="35%" stopColor="var(--cream, #F4EFE2)" />
          <stop offset="100%" stopColor="var(--cream-dim, #B8B1A0)" />
        </linearGradient>
        <linearGradient id={`${uid}-metal-arm`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="var(--cream, #F4EFE2)" />
          <stop offset="60%" stopColor="var(--cream-mute, #7C7668)" />
          <stop offset="100%" stopColor="#5E594E" />
        </linearGradient>
        <radialGradient id={`${uid}-eye`} cx="35%" cy="35%" r="70%">
          <stop className="robot-eye-grad-inner" offset="0%" />
          <stop className="robot-eye-grad-outer" offset="100%" />
        </radialGradient>
        <linearGradient id={`${uid}-visor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--violet-lo, #4C1D95)" />
          <stop offset="100%" stopColor="var(--ink, #08070C)" />
        </linearGradient>
        <radialGradient id={`${uid}-ao`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="robot-float">
        <g className="robot-body-scale">
          {/* arms sit behind torso/head so shoulders tuck under the body.
              Each has a darker offset duplicate behind it for a sense of
              physical thickness, instead of reading as a flat cutout. */}
          <g className={`robot-arm robot-arm-left ${gesture === "left" ? "robot-gesture-active" : ""}`}>
            <rect className="robot-arm-upper robot-shadow-dupe" x="12" y="182" width="102" height="30" rx="15" />
            <rect className="robot-arm-upper" x="8" y="176" width="102" height="30" rx="15" fill={`url(#${uid}-metal-arm)`} />
            <circle className="robot-arm-joint" cx="94" cy="191" r="7" />
            <circle className="robot-hand robot-shadow-dupe" cx="21" cy="196" r="24" />
            <circle className="robot-hand" cx="18" cy="191" r="24" fill={`url(#${uid}-metal-arm)`} />
            <Fingers cx={18} cy={191} dir={-1} />
            <circle className="robot-hand-shine" cx="10" cy="182" r="6" />
          </g>
          <g className={`robot-arm robot-arm-right ${gesture === "right" ? "robot-gesture-active" : ""}`}>
            <rect className="robot-arm-upper robot-shadow-dupe" x="186" y="182" width="102" height="30" rx="15" />
            <rect className="robot-arm-upper" x="190" y="176" width="102" height="30" rx="15" fill={`url(#${uid}-metal-arm)`} />
            <circle className="robot-arm-joint" cx="206" cy="191" r="7" />
            <circle className="robot-hand robot-shadow-dupe" cx="279" cy="196" r="24" />
            <circle className="robot-hand" cx="282" cy="191" r="24" fill={`url(#${uid}-metal-arm)`} />
            <Fingers cx={282} cy={191} dir={1} />
            <circle className="robot-hand-shine" cx="274" cy="182" r="6" />
          </g>

          {/* torso */}
          <g className="robot-torso">
            <rect className="robot-torso-body robot-shadow-dupe" x="85" y="157" width="140" height="104" rx="26" />
            <rect className="robot-torso-body" x="80" y="150" width="140" height="104" rx="26" fill={`url(#${uid}-metal)`} />
            <ellipse className="robot-ao" cx="150" cy="152" rx="26" ry="10" fill={`url(#${uid}-ao)`} />
            <rect className="robot-neck" x="136" y="128" width="28" height="26" rx="6" fill={`url(#${uid}-metal)`} />

            {/* chest screen: a real sunken well — bezel, lip, glass —
                instead of one flat rect, so it reads as an inset device
                rather than a sticker on the surface */}
            <rect className="robot-chest-bezel" x="103" y="167" width="94" height="52" rx="14" />
            <rect className="robot-chest-lip" x="109" y="172" width="82" height="42" rx="11" />
            <rect className="robot-chest-panel" x="115" y="177" width="70" height="32" rx="9" fill={`url(#${uid}-visor)`} />
            <circle className="robot-chest-ring" cx="150" cy="193" r="12" />
            <circle className="robot-chest-ring-hole" cx="150" cy="193" r="8" fill={`url(#${uid}-visor)`} />
            <g className="robot-chest-tick">
              <rect x="159" y="191.3" width="10" height="3" rx="1.5" />
            </g>

            <rect className="robot-vent robot-vent-l1" x="90" y="228" width="22" height="5" rx="2.5" />
            <rect className="robot-vent robot-vent-l2" x="90" y="239" width="22" height="5" rx="2.5" />
            <rect className="robot-vent robot-vent-r1" x="188" y="228" width="22" height="5" rx="2.5" />
            <rect className="robot-vent robot-vent-r2" x="188" y="239" width="22" height="5" rx="2.5" />

            <circle className="robot-bolt" cx="92" cy="160" r="4" />
            <circle className="robot-bolt" cx="208" cy="160" r="4" />
          </g>

          {/* head */}
          <g className="robot-head-group">
            <rect className="robot-head robot-shadow-dupe" x="99" y="50" width="110" height="96" rx="22" />
            <rect className="robot-head" x="95" y="44" width="110" height="96" rx="22" fill={`url(#${uid}-metal)`} />
            <ellipse className="robot-ao" cx="150" cy="141" rx="34" ry="8" fill={`url(#${uid}-ao)`} />
            <rect className="robot-head-shine" x="104" y="52" width="26" height="12" rx="6" />
            <rect className="robot-visor-housing" x="108" y="70" width="84" height="40" rx="14" />

            <g className="robot-eye robot-eye-left">
              <circle className="robot-eye-glow-ring" cx="132" cy="90" r="12" fill={`url(#${uid}-eye)`} />
              <circle className="robot-eye-iris" cx="132" cy="90" r="6" />
              <rect className="robot-eyelid" x="120" y="78" width="24" height="24" rx="8" />
            </g>
            <g className="robot-eye robot-eye-right">
              <circle className="robot-eye-glow-ring" cx="168" cy="90" r="12" fill={`url(#${uid}-eye)`} />
              <circle className="robot-eye-iris" cx="168" cy="90" r="6" />
              <rect className="robot-eyelid" x="156" y="78" width="24" height="24" rx="8" />
            </g>

            <rect className="robot-mouth-grille" x="120" y="122" width="60" height="13" rx="6.5" />
            <rect className="robot-mouth-bar robot-mouth-bar-1" x="127" y="124.5" width="8" height="8" rx="2" />
            <rect className="robot-mouth-bar robot-mouth-bar-2" x="140.7" y="124.5" width="8" height="8" rx="2" />
            <rect className="robot-mouth-bar robot-mouth-bar-3" x="154.3" y="124.5" width="8" height="8" rx="2" />
            <rect className="robot-mouth-bar robot-mouth-bar-4" x="168" y="124.5" width="8" height="8" rx="2" />
          </g>

          {/* antenna */}
          <g className="robot-antenna-group">
            <path className="robot-antenna-stem" d="M150 44 Q145 28 150 16" />
            <circle className="robot-antenna-tip" cx="150" cy="15" r="7" />
          </g>

          {/* held object: lives inside the robot's own coordinate space so
              the grip and the object can never visually drift apart.
              Sized to comfortably fit the full strategy text (up to 150
              characters) — this used to be a much smaller 190x130 slot
              that only had room for a handful of words before
              BoardCard.css's line-clamp cut the rest off.
              Hand cx values (26/274) are deliberately well outside the
              board's own edges (38/262) — only about 12 of the hand's 24
              radius should ever overlap onto the board itself, just
              enough to read as fingertips gripping the edge. They used
              to sit at 42/258, barely inside the board's edges at all,
              which meant roughly HALF of each hand circle sat on top of
              the board, covering the first couple characters of every
              line of text. */}
          {isHolding && (
            <>
              <foreignObject x="38" y="160" width="224" height="155" className="robot-held-slot">
                <div xmlns="http://www.w3.org/1999/xhtml" className="robot-held-content">
                  {heldContent}
                </div>
              </foreignObject>
              <circle className="robot-hand robot-hand-grip robot-hand-grip-left" cx="26" cy="240" r="24" fill={`url(#${uid}-metal-arm)`} />
              <Fingers cx={26} cy={240} dir={1} />
              <circle className="robot-hand robot-hand-grip robot-hand-grip-right" cx="274" cy="240" r="24" fill={`url(#${uid}-metal-arm)`} />
              <Fingers cx={274} cy={240} dir={-1} />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}

/** Small finger cluster near a hand's inner edge, curling toward whatever
    the hand is gripping — `dir` is 1 (left hand, fingers point right/
    inward toward the held object) or -1 (right hand, fingers point left/
    inward). This used to be backwards: both hands' fingers pointed
    outward, away from the board they're supposedly holding, rather than
    wrapping in toward it. */
function Fingers({ cx, cy, dir }) {
  const tipX = cx + dir * 20;
  return (
    <g className="robot-fingers">
      <circle cx={tipX} cy={cy - 9} r="4.5" />
      <circle cx={tipX + dir * 2} cy={cy} r="4.5" />
      <circle cx={tipX} cy={cy + 9} r="4.5" />
    </g>
  );
}
