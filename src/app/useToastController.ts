import { useEffect, useState } from 'react';

export function useToastController() {
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Something went wrong.');
    }
  }

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!error) {
      return;
    }
    const timeout = window.setTimeout(() => setError(''), 4200);
    return () => window.clearTimeout(timeout);
  }, [error]);

  return {
    notice,
    error,
    setNotice,
    setError,
    run,
  };
}
