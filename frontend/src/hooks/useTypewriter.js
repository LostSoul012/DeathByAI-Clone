import { useEffect, useState } from "react";

// Reveals `text` character by character. Deliberately NOT synced to real
// TTS timing (unpredictable across browsers) — both are just started at
// the same moment and left to run independently; see useSpeech.js.
export function useTypewriter(text, msPerChar = 28) {
  const [displayedLength, setDisplayedLength] = useState(0);

  useEffect(() => {
    setDisplayedLength(0);
    if (!text) return undefined;

    const interval = setInterval(() => {
      setDisplayedLength((len) => {
        if (len >= text.length) {
          clearInterval(interval);
          return len;
        }
        return len + 1;
      });
    }, msPerChar);

    return () => clearInterval(interval);
  }, [text, msPerChar]);

  return {
    displayedText: text ? text.slice(0, displayedLength) : "",
    isComplete: !text || displayedLength >= text.length,
  };
}
