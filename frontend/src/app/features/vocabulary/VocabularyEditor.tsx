import { ClickableText } from "./ClickableText";

type VocabularyEditorProps = {
  text: string;
  vocabulary: string[];
  manualTerm: string;
  onManualTermChange: (value: string) => void;
  onAddManual: () => void;
  onWordClick: (rawToken: string) => void;
  onRemoveTerm: (term: string) => void;
};

export function VocabularyEditor({
  text,
  vocabulary,
  manualTerm,
  onManualTermChange,
  onAddManual,
  onWordClick,
  onRemoveTerm,
}: VocabularyEditorProps) {
  return (
    <div className="scan-split">
      <section className="panel scan-pane">
        <h2 className="pane-heading">Source text</h2>
        <p className="hint pane-hint">Click words in the passage to add them to your list.</p>
        <div className="scan-pane-scroll">
          <ClickableText text={text} onWordClick={onWordClick} />
        </div>
      </section>

      <section className="panel scan-pane">
        <h2 className="pane-heading">Word list</h2>
        <p className="hint pane-hint">
          Keep the words you want to study; remove any you already know. You need at least four words to open the quiz.
        </p>
        {vocabulary.length < 4 && (
          <p className="hint pane-hint">
            Add {4 - vocabulary.length} more word{4 - vocabulary.length === 1 ? "" : "s"} to continue.
          </p>
        )}

        <div className="inline-add">
          <input
            className="text-input"
            type="text"
            value={manualTerm}
            onChange={(e) => onManualTermChange(e.target.value)}
            placeholder="Type a word and add it"
          />
          {!!manualTerm.trim() && (
            <button type="button" className="button" onClick={onAddManual}>
              Add word
            </button>
          )}
        </div>

        <div className="vocab-scroll">
          {vocabulary.length === 0 ? (
            <p className="empty">No words yet. Tap words in the text on the left, or type one above.</p>
          ) : (
            <ul className="vocab-cards">
              {vocabulary.map((term) => (
                <li key={term} className="vocab-card">
                  <div className="vocab-card-head">
                    <span className="vocab-term">{term}</span>
                    <button type="button" className="button button-ghost" onClick={() => onRemoveTerm(term)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
