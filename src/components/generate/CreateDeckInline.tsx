/**
 * CreateDeckInline Component
 *
 * Inline form for creating a new deck
 * Supports onboarding flow with pre-filled default values (PL↔EN)
 * Validates input and shows errors inline
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
import { validateCreateDeck } from "./utils";
import type { CreateDeckDTO, LanguageDTO } from "@/types";

interface CreateDeckInlineProps {
  languages: LanguageDTO[];
  isOnboarding?: boolean;
  defaultLangA?: string;
  defaultLangB?: string;
  onCancel?: () => void;
  onCreate: (deck: CreateDeckDTO) => Promise<void>;
}

export default function CreateDeckInline({
  languages,
  isOnboarding = false,
  defaultLangA,
  defaultLangB,
  onCancel,
  onCreate,
}: CreateDeckInlineProps) {
  // Find Polish language ID (code "pl") - always use Polish as language A for MVP
  const polishLangId = languages.find((l) => l.code.toLowerCase() === "pl")?.id ?? defaultLangA ?? "";

  const [formData, setFormData] = useState<Partial<CreateDeckDTO>>({
    title: "",
    description: "",
    lang_a: polishLangId,
    lang_b: defaultLangB ?? "",
    visibility: "private",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Ensure lang_a is always set to Polish when languages are loaded
  useEffect(() => {
    if (polishLangId && formData.lang_a !== polishLangId) {
      setFormData((prev) => ({ ...prev, lang_a: polishLangId }));
    }
  }, [polishLangId, formData.lang_a]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission - use ref for immediate check
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    // Validate
    const validationErrors = validateCreateDeck(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Set both ref and state to prevent double submission
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrors({});

    try {
      await onCreate(formData as CreateDeckDTO);
      // Success - parent will handle state update
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Nie udało się utworzyć talii",
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 p-6 border rounded-lg bg-card">
      {/* Onboarding message */}
      {isOnboarding && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
          <p className="text-sm text-foreground">
            <strong>To będzie Twoja pierwsza talia!</strong> Utwórz ją, aby rozpocząć generowanie par słówek.
          </p>
        </div>
      )}

      <h3 className="text-lg font-semibold">Utwórz nową talię</h3>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="deck-title">
          Tytuł <span className="text-destructive">*</span>
        </Label>
        <Input
          id="deck-title"
          placeholder="np. Angielski do podróży"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          maxLength={200}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="deck-description">
          Opis <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="deck-description"
          placeholder="Krótki opis talii, czyli o czym chciałbyś się nauczyć..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          maxLength={5000}
          rows={3}
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.description}
          </p>
        )}
      </div>

      {/* Languages */}
      {/* Language A is hidden for MVP - always set to Polish */}
      <div className="space-y-2">
        <Label htmlFor="lang-b">
          Język <span className="text-destructive">*</span>
        </Label>
        <Select value={formData.lang_b} onValueChange={(value) => setFormData({ ...formData, lang_b: value })}>
          <SelectTrigger id="lang-b" className={errors.lang_b ? "border-destructive" : ""}>
            <SelectValue placeholder="Wybierz język..." />
          </SelectTrigger>
          <SelectContent>
            {languages
              .filter((lang) => lang.id !== polishLangId) // Exclude Polish since it's always Language A
              .map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  <div className="flex items-center gap-2">
                    <FlagIcon code={lang.code} size="md" />
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {errors.lang_b && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.lang_b}
          </p>
        )}
      </div>

      {/* Submit error */}
      {errors.submit && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errors.submit}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Tworzenie...
            </>
          ) : (
            "Utwórz talię"
          )}
        </Button>
        {!isOnboarding && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Anuluj
          </Button>
        )}
      </div>
    </form>
  );
}
