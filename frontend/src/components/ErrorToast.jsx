export default function ErrorToast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-toast" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
