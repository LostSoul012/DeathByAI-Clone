import { useCallback, useRef, useState } from "react";

const DEFAULT_RATE = 0.9;

function isSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Wraps SpeechSynthesisUtterance. Safe to call in any environment — if the
// browser (or test environment) doesn't support it, speak() just no-ops
// rather than throwing, since the on-screen text is always the primary
// way to get the story either way (see StoryCard).
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const utteranceRef = useRef(null);

  const speak = useCallback(
    (text) => {
      if (!isSupported() || !text) return;
      window.speechSynthesis.cancel(); // don't let a previous line overlap

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [rate]
  );

  const stop = useCallback(() => {
    if (isSupported()) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, rate, setRate, supported: isSupported() };
}
