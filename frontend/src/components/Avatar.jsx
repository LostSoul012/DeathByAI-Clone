// Simple blob character, colored per preset. Shared by the avatar picker
// and the player list so a player looks the same everywhere.
export default function Avatar({ color = "#F5F5F7", face = "happy", size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="58" rx="34" ry="30" fill={color} />
      <ellipse cx="34" cy="82" rx="10" ry="6" fill={color} />
      <ellipse cx="66" cy="82" rx="10" ry="6" fill={color} />
      {face === "happy" && (
        <>
          <circle cx="38" cy="52" r="4.5" fill="#1c1d22" />
          <circle cx="62" cy="52" r="4.5" fill="#1c1d22" />
          <path d="M40 64 Q50 72 60 64" stroke="#1c1d22" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {face === "surprised" && (
        <>
          <circle cx="38" cy="52" r="5" fill="#1c1d22" />
          <circle cx="62" cy="52" r="5" fill="#1c1d22" />
          <circle cx="50" cy="66" r="6" fill="#1c1d22" />
        </>
      )}
      {face === "sly" && (
        <>
          <path d="M32 51 L44 53" stroke="#1c1d22" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M68 51 L56 53" stroke="#1c1d22" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M40 65 Q50 68 62 62" stroke="#1c1d22" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
