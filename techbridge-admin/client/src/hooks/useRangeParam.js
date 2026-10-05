import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Date range kept in the URL (?range=this_month), so a refresh or a shared link
 * shows the same period. Returns [value, setValue, isReady].
 */
export function useRangeParam(defaultRange = 'this_month') {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(
    () => ({
      range: searchParams.get('range') || defaultRange,
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
    }),
    [searchParams, defaultRange]
  );

  const setValue = useCallback(
    (next) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          params.set('range', next.range);
          if (next.range === 'custom') {
            params.set('from', next.from ?? '');
            params.set('to', next.to ?? '');
          } else {
            params.delete('from');
            params.delete('to');
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // A custom range needs both dates before asking the server
  const isReady = value.range !== 'custom' || Boolean(value.from && value.to);

  return [value, setValue, isReady];
}