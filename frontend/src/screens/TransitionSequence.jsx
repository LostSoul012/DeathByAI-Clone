import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./TransitionSequence.css";

const INCOMING_MS = 1300;
const PROMPT_MS = 1800;

// Two short beats shown to every player once the scenario is confirmed —
// "Scenario Incoming!" then "Prompt: <text>" — then calls onComplete so
// the parent can reveal the real writing screen. Deliberately snappy: a
// beat, not a scene.
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

  return (
    <AnimatePresence mode="wait">
      {step === "incoming" ? (
        <motion.div
          key="incoming"
          className="transition-screen transition-incoming"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="display">Scenario Incoming!</span>
        </motion.div>
      ) : (
        <motion.div
          key="prompt"
          className="transition-screen transition-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="display">
            Prompt: <strong>{scenarioText}</strong>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
