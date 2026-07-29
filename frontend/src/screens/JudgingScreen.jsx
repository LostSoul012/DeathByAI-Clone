import SwirlBackground from "../components/SwirlBackground";
import "./JudgingScreen.css";

export default function JudgingScreen() {
  return (
    <SwirlBackground theme="black">
      <div className="judging-screen">
        <p className="judging-text display">JUDGING...</p>
        <div className="judging-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </SwirlBackground>
  );
}
