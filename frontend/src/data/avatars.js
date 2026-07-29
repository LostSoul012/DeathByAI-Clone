// 12 preset avatars — Gartic-Phone style: a simple blob body, no upload.
// Rendered by <Avatar/>; this file just picks a color + a face per id so
// they're easy to tell apart in a player list.

export const AVATARS = [
  { id: "blob-01", color: "#F5F5F7", face: "happy" },
  { id: "blob-02", color: "#FF8A65", face: "surprised" },
  { id: "blob-03", color: "#4FD1C5", face: "happy" },
  { id: "blob-04", color: "#B497F6", face: "sly" },
  { id: "blob-05", color: "#FFC533", face: "happy" },
  { id: "blob-06", color: "#69D46A", face: "surprised" },
  { id: "blob-07", color: "#FF6B8B", face: "sly" },
  { id: "blob-08", color: "#5AB2FF", face: "happy" },
  { id: "blob-09", color: "#F2E86D", face: "surprised" },
  { id: "blob-10", color: "#C7C7CF", face: "sly" },
  { id: "blob-11", color: "#FF9F43", face: "happy" },
  { id: "blob-12", color: "#8CE6E0", face: "surprised" },
];

export function getAvatarById(id) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
