/**
 * Step3Parameters Component
 *
 * Third and final step: Configure generation parameters
 * - Content type (auto, words, phrases, mini-phrases)
 * - Register (neutral, informal, formal)
 * - Display quota information
 */

import ParamsSelector from "./ParamsSelector";
import QuotaInfo from "./QuotaInfo";
import type { GenerationContentType, GenerationRegister, QuotaDTO } from "@/types";

interface Step3ParametersProps {
  contentType: GenerationContentType;
  register: GenerationRegister;
  quota: QuotaDTO | null;
  isLoadingQuota?: boolean;
  onContentTypeChange: (type: GenerationContentType) => void;
  onRegisterChange: (register: GenerationRegister) => void;
}

export default function Step3Parameters({
  contentType,
  register,
  quota,
  isLoadingQuota = false,
  onContentTypeChange,
  onRegisterChange,
}: Step3ParametersProps) {
  return (
    <div className="w-full space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Parametry generacji</h2>
        <p className="text-sm text-muted-foreground">Dostosuj typ treści i rejestr językowy do swoich potrzeb</p>
      </div>

      {/* Parameters selection */}
      <ParamsSelector
        contentType={contentType}
        register={register}
        onContentTypeChange={onContentTypeChange}
        onRegisterChange={onRegisterChange}
      />

      {/* Quota information */}
      <div className="pt-6 border-t">
        <QuotaInfo quota={quota} isLoading={isLoadingQuota} />
      </div>
    </div>
  );
}
