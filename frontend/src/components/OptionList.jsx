import "./OptionList.css";

export default function OptionList({ options, selectedId, onSelect, disabled }) {
  return (
    <div className="option-list" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={selectedId === opt.id}
          disabled={disabled}
          className={`option-card ${selectedId === opt.id ? "option-card-selected" : ""}`}
          onClick={() => onSelect(opt.id)}
        >
          <span className="option-label display">{opt.label}</span>
          <span className="option-blurb">{opt.blurb}</span>
        </button>
      ))}
    </div>
  );
}
