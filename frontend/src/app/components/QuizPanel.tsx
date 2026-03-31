import type { QuizQuestion, QuizState } from "@/app/types/workflow";

type QuizPanelProps = {
  title: string;
  showText: boolean;
  text: string;
  questions: QuizQuestion[];
  quizState: QuizState;
  onChoose: (index: number) => void;
  onSkip: () => void;
  onNext: () => void;
};

export function QuizPanel({
  title,
  showText,
  text,
  questions,
  quizState,
  onChoose,
  onSkip,
  onNext,
}: QuizPanelProps) {
  const done = quizState.index >= questions.length;

  if (!questions.length) {
    return (
      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="muted">No questions to show.</p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="quiz-score">
          Score: {quizState.score} / {questions.length}
        </p>
        <p className="muted">You have finished this quiz. Use Next when you are ready to continue.</p>
      </section>
    );
  }

  const q = questions[quizState.index];

  const quizBody = (
    <>
      <p className="quiz-score">
        Score: {quizState.score} / {questions.length}
      </p>
      <p className="quiz-progress">
        Question {quizState.index + 1} of {questions.length}
      </p>

      <p className="quiz-prompt">{q.prompt}</p>

      <div className="quiz-options" role="list">
        {q.options.map((opt, idx) => {
          const isSelected = quizState.selectedIndex === idx;
          const isCorrect = idx === q.answerIndex;
          const showResult = quizState.answered;
          let cls = "quiz-option";
          if (showResult && isCorrect) cls += " quiz-option-correct";
          if (showResult && isSelected && !isCorrect) cls += " quiz-option-wrong";

          return (
            <button
              key={opt}
              type="button"
              className={cls}
              disabled={quizState.answered}
              onClick={() => onChoose(idx)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="quiz-actions">
        {!quizState.answered && (
          <button type="button" className="button button-ghost" onClick={onSkip}>
            Skip
          </button>
        )}
        {quizState.answered && (
          <button type="button" className="button" onClick={onNext}>
            {quizState.index === questions.length - 1 ? "Finish" : "Next question"}
          </button>
        )}
      </div>
    </>
  );

  if (!showText) {
    return (
      <div className="scan-split scan-split--single">
        <section className="panel scan-pane">
          <h2 className="pane-heading">{title}</h2>
          <div className="scan-pane-scroll">{quizBody}</div>
        </section>
      </div>
    );
  }

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
        <h2 className="pane-heading">{title}</h2>
        <div className="scan-pane-scroll">{quizBody}</div>
      </section>
    </div>
  );
}
