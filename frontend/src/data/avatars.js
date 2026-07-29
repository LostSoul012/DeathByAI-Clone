// 12 preset avatars — polished blob characters with strong per-character
// distinction (unique colors, accents, faces, and props). Rendered by
// <Avatar/>. IDs are stable so backend-stored avatarIds remain compatible.

export const AVATARS = [
  { id: "blob-01", color: "#F5F5F7", accent: "#8B5CF6", face: "happy",     prop: "antenna",  pattern: null      },
  { id: "blob-02", color: "#FF8A65", accent: "#7A2E1A", face: "surprised", prop: "hornsL",   pattern: null      },
  { id: "blob-03", color: "#4FD1C5", accent: "#0E4A44", face: "cool",      prop: "shades",   pattern: null      },
  { id: "blob-04", color: "#B497F6", accent: "#3B1E7A", face: "sly",       prop: "crown",    pattern: null      },
  { id: "blob-05", color: "#FFC533", accent: "#5A3A00", face: "happy",     prop: "bowtie",   pattern: "stripes" },
  { id: "blob-06", color: "#69D46A", accent: "#0F3A10", face: "surprised", prop: "leaf",     pattern: null      },
  { id: "blob-07", color: "#FF6B8B", accent: "#5A0F1F", face: "kiss",      prop: "heart",    pattern: null      },
  { id: "blob-08", color: "#5AB2FF", accent: "#0A2A55", face: "wink",      prop: "cap",      pattern: null      },
  { id: "blob-09", color: "#F2E86D", accent: "#4A3F00", face: "grin",      prop: "star",     pattern: "spots"   },
  { id: "blob-10", color: "#C7C7CF", accent: "#2A2A34", face: "sly",       prop: "mask",     pattern: null      },
  { id: "blob-11", color: "#FF9F43", accent: "#5A2E00", face: "grin",      prop: "flame",    pattern: null      },
  { id: "blob-12", color: "#8CE6E0", accent: "#0D3A38", face: "cool",      prop: "bolt",     pattern: "spots"   },
];

export function getAvatarById(id) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
