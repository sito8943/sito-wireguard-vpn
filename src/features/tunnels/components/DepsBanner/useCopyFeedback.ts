import { useCallback, useEffect, useRef, useState } from "react";

import { COPY_FEEDBACK_MS } from "./constants";

/** Copia texto al portapapeles y expone un flag "copiado" temporal. */
export function useCopyFeedback() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(
      () => setCopied(false),
      COPY_FEEDBACK_MS,
    );
  }, []);

  return { copied, copy };
}
