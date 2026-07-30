// Grim arcade "test subject" head. Flat brutalist construction: hard
// geometric silhouettes, thick ink outlines, offset ink shadow, no
// gradients and no cute features. Each preset gets a unique silhouette
// (`prop`), optic style (`face`), surface treatment (`pattern`) and color.

const INK = "#08070C";
const CREAM = "#F4EFE2";

const HEADS = {
  helmet: "M24 42 Q50 14 76 42 L76 78 L24 78 Z",
  gasmask: "M26 26 L74 26 L74 68 L50 86 L26 68 Z",
  hood: "M50 16 L78 48 L70 84 L30 84 L22 48 Z",
  crown: "M24 34 L76 34 L76 68 L62 84 L38 84 L24 68 Z",
  hazmat: "M22 50 A28 28 0 0 1 78 50 L78 80 L22 80 Z",
  filter: "M34 22 L66 22 L82 40 L82 66 L66 84 L34 84 L18 66 L18 40 Z",
  wrap: "M50 18 L78 38 L72 82 L28 82 L22 38 Z",
  diver: "M50 20 A30 30 0 1 1 49.9 20 Z",
  antenna: "M20 32 L80 32 L70 84 L30 84 Z",
  horns: "M22 40 L78 40 L78 70 L50 86 L22 70 Z",
  ember: "M50 20 L78 44 L78 80 L22 80 L22 44 Z",
  spike: "M50 16 L80 50 L50 86 L20 50 Z",
};

function Optics({ face, accent }) {
  switch (face) {
    case "lenses":
      return (
        <>
          <circle cx="38" cy="52" r="9" fill={INK} />
          <circle cx="62" cy="52" r="9" fill={INK} />
          <circle cx="38" cy="52" r="4" fill={accent} />
          <circle cx="62" cy="52" r="4" fill={accent} />
          <path d="M47 52 L53 52" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M40 70 L60 70" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "void":
      return (
        <>
          <path d="M28 44 L72 44 L72 60 L28 60 Z" fill={INK} />
          <path d="M35 52 L44 52" stroke={accent} strokeWidth="3.5" strokeLinecap="square" />
          <path d="M56 52 L65 52" stroke={accent} strokeWidth="3.5" strokeLinecap="square" />
        </>
      );
    case "hollow":
      return (
        <>
          <path d="M31 44 L45 44 L41 60 L31 58 Z" fill={INK} />
          <path d="M69 44 L55 44 L59 60 L69 58 Z" fill={INK} />
          <path d="M41 70 L59 70" stroke={INK} strokeWidth="3" />
          <path d="M46 65 L46 75 M54 65 L54 75" stroke={INK} strokeWidth="2.5" />
        </>
      );
    case "grid":
      return (
        <>
          <rect x="28" y="42" width="44" height="18" fill={INK} />
          <g stroke={accent} strokeWidth="1.5" opacity="0.9">
            <path d="M34 42 L34 60 M44 42 L44 60 M54 42 L54 60 M64 42 L64 60" />
            <path d="M28 51 L72 51" />
          </g>
          <path d="M38 70 L62 70" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "porthole":
      return (
        <>
          <circle cx="50" cy="54" r="17" fill={INK} />
          <circle cx="50" cy="54" r="12" fill={accent} />
          <path d="M42 47 L52 44" stroke={CREAM} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          <path d="M33 54 L67 54" stroke={INK} strokeWidth="2" opacity="0.6" />
        </>
      );
    case "cyclops":
      return (
        <>
          <path d="M28 46 L72 42 L72 58 L28 56 Z" fill={INK} />
          <circle cx="52" cy="50" r="4.5" fill={accent} />
          <path d="M38 70 L48 74 L62 68" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "stitch":
      return (
        <>
          <path d="M31 48 L45 48 M55 48 L69 48" stroke={INK} strokeWidth="4" strokeLinecap="square" />
          <path d="M34 66 L66 66" stroke={INK} strokeWidth="3.5" />
          <g stroke={INK} strokeWidth="2.5">
            <path d="M40 61 L40 71 M50 61 L50 71 M60 61 L60 71" />
          </g>
        </>
      );
    case "slit":
    default:
      return (
        <>
          <path d="M28 48 L72 48 L72 57 L28 57 Z" fill={INK} />
          <path d="M32 52.5 L46 52.5" stroke={accent} strokeWidth="3" strokeLinecap="square" />
          <path d="M54 52.5 L68 52.5" stroke={accent} strokeWidth="3" strokeLinecap="square" />
          <path d="M40 70 L60 70" stroke={INK} strokeWidth="3" strokeLinecap="square" />
        </>
      );
  }
}

/* Gear drawn BEHIND the head plate — silhouette extensions only. */
function GearBack({ prop, accent, color }) {
  switch (prop) {
    case "helmet":
      return (
        <>
          <path d="M50 18 L50 6" stroke={INK} strokeWidth="3.5" strokeLinecap="square" />
          <rect x="44" y="-2" width="12" height="8" fill={accent} stroke={INK} strokeWidth="2.5" />
        </>
      );
    case "gasmask":
      return (
        <>
          <rect x="20" y="14" width="60" height="10" fill={INK} />
          <rect x="4" y="50" width="16" height="22" fill={color} stroke={INK} strokeWidth="3" />
        </>
      );
    case "hood":
      return <path d="M50 6 L88 48 L78 92 L22 92 L12 48 Z" fill={INK} />;
    case "crown":
      return (
        <path
          d="M22 36 L26 10 L38 26 L50 4 L62 26 L74 10 L78 36 Z"
          fill={accent}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      );
    case "hazmat":
      return <rect x="26" y="78" width="48" height="12" fill={INK} />;
    case "filter":
      return (
        <>
          <rect x="30" y="8" width="40" height="10" fill={INK} />
          <rect x="36" y="82" width="28" height="12" fill={INK} />
        </>
      );
    case "wrap":
      return <path d="M50 6 L58 20 L42 20 Z" fill={INK} />;
    case "diver":
      return (
        <>
          <rect x="24" y="82" width="52" height="12" fill={INK} />
          <path d="M22 32 L10 20" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <circle cx="8" cy="18" r="6" fill={accent} stroke={INK} strokeWidth="2.5" />
        </>
      );
    case "antenna":
      return (
        <>
          <rect x="18" y="22" width="64" height="10" fill={INK} />
          <path d="M30 22 L22 8" stroke={INK} strokeWidth="3.5" strokeLinecap="square" />
          <path d="M70 22 L78 8" stroke={INK} strokeWidth="3.5" strokeLinecap="square" />
          <rect x="17" y="0" width="9" height="9" fill={accent} stroke={INK} strokeWidth="2" />
          <rect x="74" y="0" width="9" height="9" fill={accent} stroke={INK} strokeWidth="2" />
        </>
      );
    case "horns":
      return (
        <>
          <path d="M22 42 L6 6 L40 32 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M78 42 L94 6 L60 32 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </>
      );
    case "ember":
      return (
        <path
          d="M50 2 L60 20 L70 12 L68 40 L32 40 L30 12 L40 20 Z"
          fill="#FF3B1F"
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      );
    case "spike":
      return (
        <>
          <path d="M50 16 L50 0" stroke={INK} strokeWidth="5" strokeLinecap="square" />
          <path d="M80 50 L96 50 M20 50 L4 50" stroke={INK} strokeWidth="5" strokeLinecap="square" />
          <path d="M50 86 L50 98" stroke={INK} strokeWidth="5" strokeLinecap="square" />
        </>
      );
    default:
      return null;
  }
}

/* Gear drawn ON TOP of the head plate — straps, rims, plating. */
function GearFront({ prop, accent }) {
  switch (prop) {
    case "helmet":
      return <path d="M24 42 Q50 16 76 42 L76 44 L24 44 Z" fill={INK} />;
    case "gasmask":
      return <path d="M20 60 L26 60 M20 66 L26 66" stroke={INK} strokeWidth="3.5" />;
    case "hood":
      return (
        <>
          <path d="M50 16 L78 48 L70 84" fill="none" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
          <path d="M50 16 L22 48 L30 84" fill="none" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        </>
      );
    case "hazmat":
      return <path d="M22 50 A28 28 0 0 1 78 50" fill="none" stroke={INK} strokeWidth="7" />;
    case "filter":
      return <path d="M40 84 L40 78 M50 84 L50 78 M60 84 L60 78" stroke={INK} strokeWidth="3" />;
    case "wrap":
      return (
        <g stroke={accent} strokeWidth="5" strokeLinecap="square" opacity="0.95">
          <path d="M25 36 L74 42" />
          <path d="M28 80 L71 74" />
          <path d="M58 22 L76 36" />
        </g>
      );
    case "ember":
      return <path d="M22 44 L78 44" stroke={INK} strokeWidth="5" />;
    case "spike":
      return (
        <path d="M50 16 L80 50 L50 86 L20 50 Z" fill="none" stroke={accent} strokeWidth="2" opacity="0.65" />
      );
    default:
      return null;
  }
}

function Surface({ pattern, accent }) {
  if (!pattern) return null;
  if (pattern === "hazard") {
    return (
      <g opacity="0.45" stroke={accent} strokeWidth="5">
        <path d="M28 80 L38 64" />
        <path d="M42 80 L52 64" />
        <path d="M56 80 L66 64" />
      </g>
    );
  }
  if (pattern === "rivets") {
    return (
      <g fill={INK} opacity="0.85">
        <circle cx="32" cy="34" r="2.5" />
        <circle cx="68" cy="34" r="2.5" />
        <circle cx="32" cy="72" r="2.5" />
        <circle cx="68" cy="72" r="2.5" />
      </g>
    );
  }
  if (pattern === "cracks") {
    return (
      <g stroke={INK} strokeWidth="2.5" fill="none" opacity="0.9">
        <path d="M36 32 L42 44 L34 52" />
        <path d="M66 62 L60 72 L66 80" />
      </g>
    );
  }
  return null;
}

export default function Avatar({
  color = "#E8E2D2",
  accent = "#8B5CF6",
  face = "slit",
  prop = "helmet",
  pattern = null,
  size = 56,
}) {
  const head = HEADS[prop] ?? HEADS.helmet;
  const clipId = `av-clip-${prop}`;

  return (
    <svg width={size} height={size} viewBox="-8 -8 116 116" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={head} />
        </clipPath>
      </defs>

      {/* hard offset ink shadow — matches the brutalist card treatment */}
      <path d={head} fill={INK} opacity="0.85" transform="translate(5,5)" />

      <GearBack prop={prop} accent={accent} color={color} />

      {/* head plate */}
      <path d={head} fill={color} stroke={INK} strokeWidth="4" strokeLinejoin="round" />

      {/* flat side shading, no gradient */}
      <g clipPath={`url(#${clipId})`} opacity="0.16">
        <path d={head} fill={INK} transform="translate(14,0)" />
      </g>

      <g clipPath={`url(#${clipId})`}>
        <Surface pattern={pattern} accent={accent} />
      </g>

      <GearFront prop={prop} accent={accent} />
      <Optics face={face} accent={accent} />

      <path d={head} fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}
