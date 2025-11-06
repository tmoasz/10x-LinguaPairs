/**
 * ParamsSelector Component
 *
 * Selection of generation parameters:
 * - Content type (auto, words, phrases, mini-phrases)
 * - Register/formality (neutral, informal, formal)
 */

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    <div className="w-full space-y-8">
      {/* Content Type Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Typ treści</h3>
          <p className="text-sm text-muted-foreground">Wybierz typ par słówek, które chcesz wygenerować</p>
        </div>

        <RadioGroup value={contentType} onValueChange={(value) => onContentTypeChange(value as GenerationContentType)}>
          <div className="space-y-3">
            {CONTENT_TYPE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem value={option.value} id={`content-${option.value}`} className="mt-1" />
                <Label htmlFor={`content-${option.value}`} className="flex-1 cursor-pointer space-y-1 font-normal">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Register Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Rejestr językowy</h3>
          <p className="text-sm text-muted-foreground">Wybierz poziom formalności generowanego słownictwa</p>
        </div>

        <RadioGroup value={register} onValueChange={(value) => onRegisterChange(value as GenerationRegister)}>
          <div className="space-y-3">
            {REGISTER_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem value={option.value} id={`register-${option.value}`} className="mt-1" />
                <Label htmlFor={`register-${option.value}`} className="flex-1 cursor-pointer space-y-1 font-normal">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
