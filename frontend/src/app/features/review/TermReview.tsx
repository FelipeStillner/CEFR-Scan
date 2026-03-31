import {
  TRANSLATE_LANG_OPTIONS,
  translateCacheKey,
  type TranslateLang,
} from "@/app/helpers/translatePrefs";
import { googleSearchUrl } from "@/app/helpers/text";

type TermReviewProps = {
  text: string;
  vocabulary: string[];
  translateLang: TranslateLang;
  onTranslateLangChange: (lang: TranslateLang) => void;
  definitions: Record<string, string>;
  defLoading: boolean;
  defError: string | null;
  translationCache: Record<string, string>;
  transLoading: Record<string, boolean>;
  transError: Record<string, string | null>;
  onTranslateTerm: (term: string) => void;
};

export function TermReview({
  text,
  vocabulary,
  translateLang,
  onTranslateLangChange,
  definitions,
  defLoading,
  defError,
  translationCache,
  transLoading,
  transError,
  onTranslateTerm,
}: TermReviewProps) {
  return (
    <div className="scan-split">
      <section className="panel scan-pane">
        <h2 className="pane-heading">Source text</h2>
        <div className="scan-pane-scroll">
          <p className="text-block preview" lang="en">
            {text}
          </p>
        </div>
      </section>

      <section className="panel scan-pane">
        <h2 className="pane-heading">Words & meanings</h2>
        <p className="hint pane-hint">
          Read each definition. Optionally load a translation and open a dictionary search in a new tab.
        </p>

        <div className="translate-lang-bar">
          <label className="translate-lang-label" htmlFor="translate-lang">
            Translation
          </label>
          <select
            id="translate-lang"
            className="translate-lang-select"
            value={translateLang}
            onChange={(e) => onTranslateLangChange(e.target.value as TranslateLang)}
          >
            {TRANSLATE_LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {defLoading && vocabulary.length > 0 && (
          <p className="def-status muted" aria-live="polite">
            Loading definitions…
          </p>
        )}
        {defError && (
          <p className="def-status def-error" role="alert">
            {defError}
          </p>
        )}

        <div className="vocab-scroll">
          {vocabulary.length === 0 ? (
            <p className="empty">No words in your list.</p>
          ) : (
            <ul className="vocab-cards">
              {vocabulary.map((term) => {
                const tKey = translateCacheKey(term, translateLang);
                const tText = translationCache[tKey];
                const tLoad = transLoading[tKey];
                const tErr = transError[tKey];

                return (
                  <li key={term} className="vocab-card">
                    <div className="vocab-card-head">
                      <span className="vocab-term">{term}</span>
                    </div>
                    <p className="vocab-definition">
                      {defLoading && !definitions[term] ? (
                        <span className="muted">…</span>
                      ) : (
                        definitions[term] || (defError ? "—" : <span className="muted">…</span>)
                      )}
                    </p>

                    <div className="vocab-actions">
                      {!tLoad && (
                        <button type="button" className="button" onClick={() => onTranslateTerm(term)}>
                          Translate
                        </button>
                      )}
                      {tLoad && <span className="muted">Translating…</span>}
                      <a
                        className="button"
                        href={googleSearchUrl(term)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Search the web
                      </a>
                    </div>

                    {tErr && (
                      <p className="vocab-translation vocab-translation-error" role="alert">
                        {tErr}
                      </p>
                    )}
                    {tText && !tErr && (
                      <p className="vocab-translation" lang={translateLang}>
                        {tText}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
