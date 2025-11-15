import type { TopicID } from "@/types";

export interface TopicDefinition {
  label: string;
  description: string;
  icon: string; // Emoji icon
}

/**
 * Single source of truth for topic definitions
 * Used by both frontend (TopicPicker) and backend (generation service)
 */
export const TOPIC_DEFINITIONS: Record<TopicID, TopicDefinition> = {
  travel: { label: "Podróże i Turystyka", description: "Słownictwo przydatne w podróży", icon: "✈️" },
  business: { label: "Biznes", description: "Terminologia biznesowa i korporacyjna", icon: "💼" },
  food: { label: "Jedzenie i Picie", description: "Nazwy potraw, składników i napojów", icon: "🍕" },
  technology: { label: "Technologia", description: "IT, programowanie, urządzenia", icon: "💻" },
  health: { label: "Zdrowie", description: "Zdrowie, fitness i dobre samopoczucie", icon: "🏥" },
  education: { label: "Edukacja", description: "Szkoła, nauka, uniwersytet", icon: "📚" },
  shopping: { label: "Zakupy", description: "Sklepy, ubrania, płatności", icon: "🛍️" },
  family: { label: "Rodzina", description: "Relacje rodzinne, członkowie rodziny", icon: "👨‍👩‍👧‍👦" },
  hobbies: { label: "Hobby", description: "Zainteresowania i pasje", icon: "🎨" },
  sports: { label: "Sport", description: "Dyscypliny sportowe, aktywność fizyczna", icon: "⚽" },
  nature: { label: "Przyroda", description: "Zwierzęta, rośliny, środowisko", icon: "🌳" },
  culture: { label: "Kultura", description: "Sztuka, muzyka, literatura", icon: "🎭" },
  emotions: { label: "Emocje", description: "Uczucia, nastroje, stany psychiczne", icon: "😊" },
  time: { label: "Czas", description: "Dni tygodnia, miesiące, pory roku", icon: "⏰" },
  weather: { label: "Pogoda", description: "Warunki pogodowe, klimat", icon: "🌤️" },
  transport: { label: "Transport", description: "Środki transportu, podróżowanie", icon: "🚗" },
  communication: { label: "Komunikacja", description: "Rozmowa, języki, media", icon: "💬" },
  home: { label: "Dom", description: "Meble, urządzenia domowe, pomieszczenia", icon: "🏠" },
  work: { label: "Praca", description: "Zawody, biuro, kariera", icon: "💼" },
  emergency: { label: "Sytuacje Awaryjne", description: "Pomoc, bezpieczeństwo, nagłe wypadki", icon: "🚨" },
} as const;

export function getTopicLabel(topicId: TopicID): string {
  return TOPIC_DEFINITIONS[topicId]?.label ?? topicId;
}
