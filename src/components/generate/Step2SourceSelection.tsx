/**
 * Step2SourceSelection Component
 *
 * Second step of wizard: Choose generation source
 * - Topic from predefined list (20 topics)
 * - Own text (1-5000 characters)
 */

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
      <RadioGroup value={source} onValueChange={(value) => onSourceChange(value as "topic" | "text")}>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="topic" id="source-topic" />
            <Label htmlFor="source-topic" className="cursor-pointer font-normal">
              <div className="font-medium">Temat z listy</div>
              <div className="text-xs text-muted-foreground">Wybierz jeden z 20 predefiniowanych tematów</div>
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <RadioGroupItem value="text" id="source-text" />
            <Label htmlFor="source-text" className="cursor-pointer font-normal">
              <div className="font-medium">Własny tekst</div>
              <div className="text-xs text-muted-foreground">Opisz kontekst własnymi słowami (1-5000 znaków)</div>
            </Label>
          </div>
        </div>
      </RadioGroup>

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
