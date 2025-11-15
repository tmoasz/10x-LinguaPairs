/**
 * FlagIcon Component
 *
 * Displays country flags as local assets (cached in public/flags)
 * Works on all operating systems including Windows
 * Only includes languages defined in the database: pl, en, en-US, de, it, es, cs
 * Falls back to CDN if local asset fails to load
 */

/**
 * Converts language code to country code (ISO 3166-1 alpha-2)
 * Only includes languages defined in the database (from migration)
 * Languages in DB: pl, en, en-US, de, it, es, cs
 */
function getCountryCode(code: string | null | undefined): string {
  if (!code) return "xx";

  // Map of language codes to country codes - ONLY languages from database
  // Based on supabase/migrations/20251029184527_add_languages_table.sql
  const countryMap: Record<string, string> = {
    pl: "pl", // Polish -> Poland
    en: "gb", // English -> Great Britain
    "en-us": "us", // English (US) -> United States
    "en-gb": "gb", // English (GB) -> Great Britain
    de: "de", // German -> Germany
    it: "it", // Italian -> Italy
    es: "es", // Spanish -> Spain
    cs: "cz", // Czech -> Czech Republic
  };

  // Normalize code (lowercase, handle regional variants)
  const normalizedCode = code.toLowerCase();

  // Check exact match first (handles "en-us", "en-gb", etc.)
  if (countryMap[normalizedCode]) {
    return countryMap[normalizedCode];
  }

  // Check base code (e.g., "en" from "en-us")
  const baseCode = normalizedCode.split("-")[0];
  if (countryMap[baseCode]) {
    return countryMap[baseCode];
  }

  // Fallback for unknown languages
  return "xx";
}

interface FlagIconProps {
  code: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Flag component that uses local assets instead of CDN
 * Works on all operating systems including Windows
 * Flags are cached as part of the application bundle
 */
export default function FlagIcon({ code, className = "", size = "md" }: FlagIconProps) {
  const countryCode = getCountryCode(code);

  // Size mapping
  const sizeMap = {
    sm: { width: "16px", height: "12px" },
    md: { width: "20px", height: "15px" },
    lg: { width: "24px", height: "18px" },
  };

  const dimensions = sizeMap[size];

  // Use local assets from public/flags directory
  // Fallback to CDN only if local asset doesn't exist (for development)
  const flagUrl = `/flags/${countryCode}.png`;

  return (
    <img
      src={flagUrl}
      alt=""
      className={`inline-block ${className}`}
      style={{ width: dimensions.width, height: dimensions.height, objectFit: "cover" }}
      loading="lazy"
      onError={(e) => {
        // Fallback to CDN if local asset fails to load
        const target = e.currentTarget;
        if (!target.src.includes("flagcdn.com")) {
          target.src = `https://flagcdn.com/w${dimensions.width.replace("px", "")}/${countryCode}.png`;
        }
      }}
    />
  );
}
