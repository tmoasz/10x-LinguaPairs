/**
 * TopicPicker Component
 *
 * Grid of 20 predefined topics for generation
 * Displays cards with icons, labels, and descriptions
 * Handles topic selection with visual highlighting
 */

import { TOPICS } from "./types";
import type { TopicID } from "@/types";

interface TopicPickerProps {
  selectedTopicId: TopicID | null;
  onSelect: (topicId: TopicID) => void;
}

export default function TopicPicker({ selectedTopicId, onSelect }: TopicPickerProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Wybierz temat</h3>

      {/* Topics grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {TOPICS.map((topic) => {
          const isSelected = selectedTopicId === topic.id;

          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onSelect(topic.id)}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                hover:border-primary hover:shadow-md
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-accent/50"}
              `}
              aria-pressed={isSelected}
              aria-label={`${topic.label}: ${topic.description}`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-primary-foreground"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Topic icon */}
              <div className="text-3xl mb-2" aria-hidden="true">
                {topic.icon}
              </div>

              {/* Topic label */}
              <div className="text-sm font-medium text-foreground mb-1">{topic.label}</div>

              {/* Topic description */}
              <div className="text-xs text-muted-foreground line-clamp-2">{topic.description}</div>
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="mt-4 text-sm text-muted-foreground">
        Wybierz temat, aby AI wygenerowało dla Ciebie 30 par słówek związanych z wybraną tematyką.
      </p>
    </div>
  );
}
