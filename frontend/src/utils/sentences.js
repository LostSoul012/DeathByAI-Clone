// Splits narration text into sentences on sentence-ending punctuation
// (. ! ?), trimming whitespace around each one. Used to pace the verdict
// reader one sentence at a time.
//
// This has to be pure and deterministic: RevealSequence uses it to work
// out which player/sentence room.game.revealCursor currently points at,
// and StoryCard uses it to know what text to type out. Both the host and
// every other player run it against the exact same (server-synced) story
// text, so they always land on the same sentence list without needing
// the split itself to be sent over the wire.
export function splitSentences(text) {
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const matches = trimmed.match(/[^.!?]*[.!?]+(?=\s|$)|[^.!?]+$/g);
  if (!matches) return [trimmed];

  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}
