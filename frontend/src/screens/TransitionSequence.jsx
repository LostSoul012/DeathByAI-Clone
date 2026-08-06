import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./TransitionSequence.css";

const INCOMING_MS = 1400;
const PROMPT_MS = 3200;

// Two short beats shown to every player once the scenario is confirmed —
// "Scenario Incoming!" then "Prompt: <text>" — then calls onComplete so
// the parent can reveal the real writing screen.
export default function TransitionSequence({ scenarioText, onComplete }) {
  const [step, setStep] = useState("incoming"); // "incoming" | "prompt"

  useEffect(() => {
    const t1 = setTimeout(() => setStep("prompt"), INCOMING_MS);
    const t2 = setTimeout(onComplete, INCOMING_MS + PROMPT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spring = { type: "spring", stiffness: 220, damping: 26, mass: 0.9 };

  return (
    <AnimatePresence mode="wait">
      {step === "incoming" ? (
        <motion.div
          key="incoming"
          className="transition-screen transition-incoming"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <motion.span
            className="display"
            initial={{ opacity: 0, y: 30, letterSpacing: "0.4em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "-0.02em", filter: "blur(0px)" }}
            transition={{ ...spring, delay: 0.05 }}
          >
            Scenario Incoming!
          </motion.span>
        </motion.div>
      ) : (
        <motion.div
          key="prompt"
          className="transition-screen transition-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <motion.span
            className="display"
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...spring, delay: 0.08 }}
          >
            The scenario is:
            <strong>{scenarioText}</strong>
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
