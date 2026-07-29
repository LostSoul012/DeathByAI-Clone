// Polished blob character. Shape + shading are shared; per-avatar
// `accent`, `face`, `prop`, and `pattern` produce strong visual
// distinction between the 12 preset characters.

const INK = "#0B0A12";

function Face({ face }) {
  switch (face) {
    case "surprised":
      return (
        <>
          <circle cx="38" cy="52" r="5" fill={INK} />
          <circle cx="62" cy="52" r="5" fill={INK} />
          <ellipse cx="50" cy="67" rx="5" ry="6" fill={INK} />
        </>
      );
    case "sly":
      return (
        <>
          <path d="M32 51 L44 53" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M68 51 L56 53" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M40 65 Q50 68 62 62" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "cool":
      return (
        <>
          <rect x="30" y="48" width="16" height="8" rx="2" fill={INK} />
          <rect x="54" y="48" width="16" height="8" rx="2" fill={INK} />
          <rect x="46" y="52" width="8" height="2" fill={INK} />
          <path d="M40 66 Q50 71 60 66" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "wink":
      return (
        <>
          <circle cx="38" cy="52" r="4.5" fill={INK} />
          <path d="M56 52 Q62 49 68 52" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M40 64 Q50 71 60 64" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "grin":
      return (
        <>
          <path d="M32 50 L44 50" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M56 50 L68 50" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M36 62 Q50 76 64 62 Z" fill={INK} />
          <path d="M40 65 L60 65" stroke="#FF6B8B" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "kiss":
      return (
        <>
          <path d="M34 50 Q38 46 44 50" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M56 50 Q62 46 66 50" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="66" rx="4" ry="5" fill="#FF6B8B" stroke={INK} strokeWidth="2" />
        </>
      );
    case "happy":
    default:
      return (
        <>
          <circle cx="38" cy="52" r="4.5" fill={INK} />
          <circle cx="62" cy="52" r="4.5" fill={INK} />
          <path d="M40 64 Q50 72 60 64" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

function Prop({ prop, accent }) {
  switch (prop) {
    case "antenna":
      return (
        <>
          <line x1="50" y1="30" x2="50" y2="18" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="15" r="4" fill={accent} stroke={INK} strokeWidth="2" />
        </>
      );
    case "hornsL":
      return (
        <>
          <path d="M28 32 L22 18 L32 26 Z" fill={accent} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M72 32 L78 18 L68 26 Z" fill={accent} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    case "crown":
      return (
        <path d="M28 30 L34 20 L42 28 L50 16 L58 28 L66 20 L72 30 Z" fill="#FFC94D" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      );
    case "cap":
      return (
        <>
          <path d="M20 34 Q50 12 80 34 L80 38 L20 38 Z" fill={accent} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="50" cy="20" r="3" fill={INK} />
        </>
      );
    case "bowtie":
      return (
        <path d="M38 84 L50 78 L62 84 L62 90 L50 84 L38 90 Z" fill={accent} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      );
    case "leaf":
      return (
        <path d="M50 28 Q40 18 46 12 Q56 18 50 28 Z" fill={accent} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      );
    case "heart":
      return (
        <path d="M74 30 a5 5 0 0 1 8 6 l-8 8 l-8 -8 a5 5 0 0 1 8 -6 Z" fill="#FF6B8B" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      );
    case "star":
      return (
        <path d="M74 24 L76 30 L82 30 L77 34 L79 40 L74 36 L69 40 L71 34 L66 30 L72 30 Z" fill="#FFC94D" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      );
    case "mask":
      return (
        <path d="M24 44 Q50 38 76 44 L74 58 Q50 60 26 58 Z" fill={INK} opacity="0.85" />
      );
    case "flame":
      return (
        <path d="M50 22 Q44 32 48 34 Q42 30 46 20 Q50 12 54 18 Q52 26 56 30 Q60 24 58 18 Q64 30 54 34 Q50 32 50 22 Z" fill="#FF6B3B" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      );
    case "shades":
      return (
        <path d="M22 46 L46 44 L54 44 L78 46 L78 48 L54 50 L46 50 L22 48 Z" fill={INK} />
      );
    case "bolt":
      return (
        <path d="M56 14 L44 34 L52 34 L46 48 L62 26 L54 26 Z" fill="#FFC94D" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      );
    default:
      return null;
  }
}

function Pattern({ pattern, accent }) {
  if (!pattern) return null;
  if (pattern === "stripes") {
    return (
      <g opacity="0.35">
        <path d="M20 62 Q50 76 80 62" stroke={accent} strokeWidth="3" fill="none" />
        <path d="M22 72 Q50 84 78 72" stroke={accent} strokeWidth="3" fill="none" />
      </g>
    );
  }
  if (pattern === "spots") {
    return (
      <g opacity="0.4" fill={accent}>
        <circle cx="30" cy="70" r="3" />
        <circle cx="70" cy="72" r="2.5" />
        <circle cx="42" cy="78" r="2" />
        <circle cx="60" cy="80" r="2.5" />
      </g>
    );
  }
  return null;
}

export default function Avatar({
  color = "#F5F5F7",
  accent = "#8B5CF6",
  face = "happy",
  prop = null,
  pattern = null,
  size = 56,
}) {
  const gradId = `av-grad-${color.replace("#", "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="50" cy="92" rx="26" ry="3.5" fill="#000" opacity="0.28" />

      {/* prop drawn behind body when it sits on the head */}
      {(prop === "antenna" || prop === "hornsL" || prop === "leaf" || prop === "flame" || prop === "bolt") && (
        <Prop prop={prop} accent={accent} />
      )}

      {/* feet */}
      <ellipse cx="34" cy="84" rx="10" ry="5.5" fill={color} stroke={INK} strokeWidth="2" />
      <ellipse cx="66" cy="84" rx="10" ry="5.5" fill={color} stroke={INK} strokeWidth="2" />

      {/* body */}
      <ellipse cx="50" cy="58" rx="34" ry="30" fill={`url(#${gradId})`} stroke={INK} strokeWidth="2.5" />

      {/* rim light */}
      <path
        d="M22 58 Q26 34 50 30"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      <Pattern pattern={pattern} accent={accent} />

      {/* props drawn on top */}
      {(prop === "crown" || prop === "cap" || prop === "bowtie" || prop === "heart" || prop === "star" || prop === "mask" || prop === "shades") && (
        <Prop prop={prop} accent={accent} />
      )}

      <Face face={face} />
    </svg>
  );
}
