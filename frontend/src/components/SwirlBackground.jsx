import { useMemo } from "react";
import "./SwirlBackground.css";

/**
 * The one background every screen shares. Rings are circles whose centers
 * are offset from true-center by a small, increasing amount at a golden-
 * angle step apart — that offset is what makes rotation actually visible
 * (perfectly concentric circles are rotationally symmetric and wouldn't
 * appear to move at all). Only `theme` changes between screens; the ring
 * geometry is identical everywhere.
 *
 * theme: "purple" | "dark" | "black" | "light"
 */
export default function SwirlBackground({ theme = "purple", children }) {
  const rings = useMemo(() => generateRings(16, 105), []);

  return (
    <div className="swirl-wrap" data-theme={theme}>
      <div className="swirl-base" />
      <svg
        className="swirl-svg"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {rings.map((ring, i) => (
          <circle
            key={i}
            cx={ring.cx}
            cy={ring.cy}
            r={ring.r}
            fill={i % 2 === 0 ? "var(--swirl-ring-a)" : "var(--swirl-ring-b)"}
          />
        ))}
      </svg>
      {children && <div className="swirl-content">{children}</div>}
    </div>
  );
}

function generateRings(count, maxRadius) {
  const GOLDEN_ANGLE = 2.4;
  const rings = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const radius = maxRadius * (1 - t) + 6;
    const centerOffset = t * maxRadius * 0.42;
    const angle = i * GOLDEN_ANGLE;
    rings.push({
      cx: 100 + centerOffset * Math.cos(angle),
      cy: 100 + centerOffset * Math.sin(angle),
      r: radius,
    });
  }
  // Largest first so smaller rings paint on top, bullseye-style.
  return rings.sort((a, b) => b.r - a.r);
}
