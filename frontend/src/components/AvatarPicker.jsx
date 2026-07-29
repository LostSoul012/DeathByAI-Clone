import { AVATARS } from "../data/avatars";
import Avatar from "./Avatar";
import "./AvatarPicker.css";

export default function AvatarPicker({ selectedId, onSelect }) {
  return (
    <div className="avatar-picker" role="radiogroup" aria-label="Choose your avatar">
      {AVATARS.map((a, i) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={selectedId === a.id}
          aria-label={`Avatar ${i + 1}`}
          className={`avatar-option ${selectedId === a.id ? "avatar-option-selected" : ""}`}
          onClick={() => onSelect(a.id)}
        >
          <Avatar color={a.color} accent={a.accent} face={a.face} prop={a.prop} pattern={a.pattern} size={44} />
        </button>
      ))}
    </div>
  );
}
