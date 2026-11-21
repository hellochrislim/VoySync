import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { api, errorMessage } from '../lib/api.js';

export default function useApi(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get(path, { signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setData(response.data); })
      .catch((failure) => { if (!axios.isCancel(failure)) setError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, revision]);

  return { data, loading, error, reload };
}
