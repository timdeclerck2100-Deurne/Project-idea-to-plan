"use client";

import * as React from "react";

export function useLocalStorage(key: string, initialValue: string): [string, (value: string) => void] {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    const stored = localStorage.getItem(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external localStorage is the intended use of effects
    if (stored !== null) setValue(stored);
  }, [key]);

  const setPersisted = React.useCallback(
    (next: string) => {
      setValue(next);
      if (next) localStorage.setItem(key, next);
      else localStorage.removeItem(key);
    },
    [key]
  );

  return [value, setPersisted];
}
