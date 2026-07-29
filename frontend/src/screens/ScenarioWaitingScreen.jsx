import SwirlBackground from "../components/SwirlBackground";
import "./ScenarioWaitingScreen.css";

export default function ScenarioWaitingScreen({ writerUsername }) {
  return (
    <SwirlBackground theme="purple">
      <div className="scenario-waiting">
        <p className="scenario-waiting-text display">
          {writerUsername ?? "Someone"} is selecting a scenario
          <span className="dot-pulse">
            <span />
            <span />
            <span />
          </span>
        </p>
      </div>
    </SwirlBackground>
  );
}
