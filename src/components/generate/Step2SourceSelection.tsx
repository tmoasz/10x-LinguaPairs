/**
 * Step2SourceSelection Component
 *
 * Second step of wizard: Choose generation source
 * - Topic from predefined list (20 topics)
 * - Own text (1-5000 characters)
 */

import { Button } from "@/components/ui/button";
import TopicPicker from "./TopicPicker";
import TextAreaLimited from "./TextAreaLimited";
import type { TopicID } from "@/types";

interface Step2SourceSelectionProps {
  source: "topic" | "text";
  selectedTopicId: TopicID | null;
  text: string;
  onSourceChange: (source: "topic" | "text") => void;
  onTopicSelect: (topicId: TopicID) => void;
  onTextChange: (text: string) => void;
}

export default function Step2SourceSelection({
  source,
  selectedTopicId,
  text,
  onSourceChange,
  onTopicSelect,
  onTextChange,
}: Step2SourceSelectionProps) {
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Źródło generacji</h2>
        <p className="text-sm text-muted-foreground">Wybierz temat z listy lub opisz własny kontekst dla generacji</p>
      </div>

      {/* Source type selection */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant={source === "topic" ? "default" : "outline"}
          size="lg"
          onClick={() => onSourceChange("topic")}
          className="flex-1 flex flex-col items-start justify-center h-auto py-4 px-6"
        >
          <span className="font-semibold text-base">Temat z listy</span>
          <span className="text-xs opacity-90 mt-1">Wybierz jeden z 20 predefiniowanych tematów</span>
        </Button>

        <Button
          type="button"
          variant={source === "text" ? "default" : "outline"}
          size="lg"
          onClick={() => onSourceChange("text")}
          className="flex-1 flex flex-col items-start justify-center h-auto py-4 px-6"
        >
          <span className="font-semibold text-base">Własny tekst</span>
          <span className="text-xs opacity-90 mt-1">Opisz kontekst własnymi słowami (1-5000 znaków)</span>
        </Button>
      </div>

      {/* Conditional content based on source */}
      <div className="mt-6">
        {source === "topic" ? (
          <TopicPicker selectedTopicId={selectedTopicId} onSelect={onTopicSelect} />
        ) : (
          <TextAreaLimited value={text} onChange={onTextChange} />
        )}
      </div>
    </div>
  );
}
