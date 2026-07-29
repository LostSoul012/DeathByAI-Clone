import Robot from "../components/Robot";
import SwirlBackground from "../components/SwirlBackground";
import { useTypewriter } from "../hooks/useTypewriter";
import "./FateSealedScreen.css";

export default function FateSealedScreen() {
  const { displayedText } = useTypewriter("YOUR FATE HAS BEEN SEALED!", 45);

  return (
    <SwirlBackground theme="black">
      <div className="fate-sealed">
        <p className="fate-sealed-text display">{displayedText}</p>
        <div className="fate-sealed-robot-stage">
          <Robot pose="sealed" eyeState="death" ominous className="fate-sealed-robot" />
        </div>
      </div>
    </SwirlBackground>
  );
}
