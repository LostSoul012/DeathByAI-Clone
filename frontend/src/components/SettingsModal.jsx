import Modal from "./Modal";
import OptionList from "./OptionList";
import { AI_PERSONALITIES } from "../data/gameModes";

export default function SettingsModal({ room, isHost, onSetAiPersonality, onClose }) {
  return (
    <Modal title="Settings & How to Play" onClose={onClose}>
      <section>
        <h3 className="settings-heading mono">AI Judge Personality</h3>
        <OptionList
          options={AI_PERSONALITIES}
          selectedId={room.aiPersonality}
          onSelect={onSetAiPersonality}
          disabled={!isHost}
        />
        {!isHost && <p className="settings-note">Only the host can change this.</p>}
      </section>

      <section>
        <h3 className="settings-heading mono">How to Play</h3>
        <ol className="how-to-play">
          <li>Each round, one player writes a deadly scenario — pick a preset or write your own.</li>
          <li>Everyone (including the writer) submits a strategy to survive it.</li>
          <li>The AI judge reads every strategy and decides who lives.</li>
          <li>Watch each verdict get narrated, one player at a time.</li>
          <li>Most rounds survived wins — unless you're playing Elimination, where dying once means you're out.</li>
        </ol>
      </section>
    </Modal>
  );
}
