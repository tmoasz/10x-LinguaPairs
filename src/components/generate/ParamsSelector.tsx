/**
 * ParamsSelector Component
 *
 * Selection of generation parameters:
 * - Content type (auto, words, phrases, mini-phrases)
 * - Register/formality (neutral, informal, formal)
 */

import { Button } from "@/components/ui/button";
import { CONTENT_TYPE_OPTIONS, REGISTER_OPTIONS } from "./types";
import type { GenerationContentType, GenerationRegister } from "@/types";

interface ParamsSelectorProps {
  contentType: GenerationContentType;
  register: GenerationRegister;
  onContentTypeChange: (type: GenerationContentType) => void;
  onRegisterChange: (register: GenerationRegister) => void;
}

export default function ParamsSelector({
  contentType,
  register,
  onContentTypeChange,
  onRegisterChange,
}: ParamsSelectorProps) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Content Type Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Typ treści</h3>
          <p className="text-sm text-muted-foreground">Wybierz typ par zwrotów słownych, które chcesz wygenerować</p>
        </div>

        <div className="flex flex-col gap-3">
          {CONTENT_TYPE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={contentType === option.value ? "default" : "outline"}
              size="lg"
              onClick={() => onContentTypeChange(option.value)}
              className="w-full flex flex-col items-start justify-center h-auto py-4 px-4"
            >
              <span className="font-semibold text-sm">{option.label}</span>
              <span className="text-xs opacity-90 mt-1 text-left">{option.description}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Register Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Rejestr językowy</h3>
          <p className="text-sm text-muted-foreground">Wybierz poziom formalności generowanego słownictwa</p>
        </div>

        <div className="flex flex-col gap-3">
          {REGISTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={register === option.value ? "default" : "outline"}
              size="lg"
              onClick={() => onRegisterChange(option.value)}
              className="w-full flex flex-col items-start justify-center h-auto py-4 px-4"
            >
              <span className="font-semibold text-sm">{option.label}</span>
              <span className="text-xs opacity-90 mt-1 text-left">{option.description}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
