export function StatusBar({ notice, error }: { notice: string; error: string }) {
  if (!notice && !error) {
    return null;
  }

  return (
    <div className={error ? 'status-bar error' : 'status-bar'} role="status">
      {error || notice}
    </div>
  );
}
