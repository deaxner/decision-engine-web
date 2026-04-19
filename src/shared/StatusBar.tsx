import './shared.css';

export function StatusBar({ notice, error }: { notice: string; error: string }) {
  const message = error || notice;
  if (!message) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      <div className={error ? 'toast toast-error' : 'toast toast-success'} role="status">
        {message}
      </div>
    </div>
  );
}
