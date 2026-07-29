import { useEffect, useRef, useState } from "react";

// Ticks down from a server-provided absolute deadline (epoch ms) rather
// than a client-side duration — since the deadline is authoritative on
// the backend, this just reflects it, it doesn't decide it.
//
// fractionRemaining is for visual cues only (e.g. a shrinking time bar) —
// since we don't know the server's original duration, it's estimated from
// the moment THIS client first saw the current deadline value, which is
// normally within a few ms of the phase actually starting.
export function useCountdown(deadlineMs) {
  const [now, setNow] = useState(Date.now());
  const startRef = useRef({ deadline: null, startedAt: null });

  useEffect(() => {
    if (!deadlineMs) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  if (startRef.current.deadline !== deadlineMs) {
    startRef.current = { deadline: deadlineMs, startedAt: Date.now() };
  }

  if (!deadlineMs) return { secondsRemaining: 0, isLow: false, fractionRemaining: 1 };

  const msRemaining = Math.max(0, deadlineMs - now);
  const totalMs = Math.max(1, deadlineMs - startRef.current.startedAt);
  return {
    secondsRemaining: Math.ceil(msRemaining / 1000),
    isLow: msRemaining <= 10_000,
    fractionRemaining: Math.min(1, Math.max(0, msRemaining / totalMs)),
  };
}
