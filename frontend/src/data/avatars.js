// 12 preset avatars — grim arcade "test subject" heads matching the
// brutalist ink/cream art direction. Hard-edged silhouettes, thick ink
// outlines, no cuteness. Rendered by <Avatar/>.
// IDs are stable so backend-stored avatarIds remain compatible.

export const AVATARS = [
  { id: "blob-01", color: "#E8E2D2", accent: "#8B5CF6", face: "slit",    prop: "helmet",  pattern: null     },
  { id: "blob-02", color: "#C4542F", accent: "#2A0A0F", face: "lenses",  prop: "gasmask", pattern: "rivets" },
  { id: "blob-03", color: "#2FA9A0", accent: "#08322F", face: "void",    prop: "hood",    pattern: null     },
  { id: "blob-04", color: "#8B5CF6", accent: "#FFC94D", face: "hollow",  prop: "crown",   pattern: null     },
  { id: "blob-05", color: "#FFC94D", accent: "#241900", face: "grid",    prop: "hazmat",  pattern: "hazard" },
  { id: "blob-06", color: "#C6FF3D", accent: "#12200A", face: "lenses",  prop: "filter",  pattern: null     },
  { id: "blob-07", color: "#FF5C68", accent: "#F4EFE2", face: "stitch",  prop: "wrap",    pattern: null     },
  { id: "blob-08", color: "#4A8FE7", accent: "#08151F", face: "porthole",prop: "diver",   pattern: "rivets" },
  { id: "blob-09", color: "#D9C48A", accent: "#3A2C10", face: "cyclops", prop: "antenna", pattern: null     },
  { id: "blob-10", color: "#9A97A8", accent: "#1B1A24", face: "void",    prop: "horns",   pattern: "cracks" },
  { id: "blob-11", color: "#FF8A2B", accent: "#2A1000", face: "slit",    prop: "ember",   pattern: "hazard" },
  { id: "blob-12", color: "#7FD8D2", accent: "#0D3A38", face: "hollow",  prop: "spike",   pattern: "cracks" },
];

export function getAvatarById(id) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
