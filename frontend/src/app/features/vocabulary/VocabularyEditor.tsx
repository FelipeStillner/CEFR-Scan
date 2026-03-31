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
        <h2 className="pane-heading">Text</h2>
        <ClickableText text={text} onWordClick={onWordClick} />
      </section>

      <section className="panel scan-pane">
        <h2 className="pane-heading">Your vocabulary list</h2>
        <p className="hint pane-hint">
          Add words by clicking the text or typing below. Remove words you already know.
        </p>
        {vocabulary.length < 4 && (
          <p className="hint pane-hint">Select at least 4 words to continue to the vocabulary quiz.</p>
        )}

        <div className="inline-add">
          <input
            className="text-input"
            type="text"
            value={manualTerm}
            onChange={(e) => onManualTermChange(e.target.value)}
            placeholder="Add a word manually"
          />
          {!!manualTerm.trim() && (
            <button type="button" className="button" onClick={onAddManual}>
              Add
            </button>
          )}
        </div>

        <div className="vocab-scroll">
          {vocabulary.length === 0 ? (
            <p className="empty">No terms yet. Click words in the text or add one manually.</p>
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
