import { splitForDisplay } from "@/app/helpers/text";

type ClickableTextProps = {
  text: string;
  onWordClick: (rawToken: string) => void;
};

export function ClickableText({ text, onWordClick }: ClickableTextProps) {
  const segments = splitForDisplay(text);

  return (
    <div className="text-block preview" lang="en">
      {segments.map((seg, i) =>
        seg.type === "space" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <button
            key={i}
            type="button"
            className="text-token"
            title="Add this word to your list"
            onClick={() => onWordClick(seg.value)}
          >
            {seg.value}
          </button>
        ),
      )}
    </div>
  );
}
