import type { DeckDetailDTO, PairDTO } from "@/types";

const now = new Date().toISOString();

export const MOCK_CHALLENGE_DECK: DeckDetailDTO = {
  id: "mock-deck-demo",
  owner_user_id: "mock-owner",
  owner: {
    id: "mock-owner",
    username: "LinguaPairs",
  },
  title: "Twój Challenge: Podstawowe zwroty",
  description: "Spróbuj się z kilkoma podstawowymi zwrotami PL ↔ EN.",
  lang_a: {
    id: "lang-pl",
    code: "pl",
    name: "Polski",
    flag_emoji: "🇵🇱",
  },
  lang_b: {
    id: "lang-en",
    code: "en",
    name: "English",
    flag_emoji: "🇬🇧",
  },
  visibility: "public",
  pairs_count: 15,
  created_at: now,
  updated_at: now,
};

const MOCK_PAIR_POOL: [string, string][] = [
  ["cena zawiera podatki", "price includes taxes"],
  ["dzień dobry", "good morning"],
  ["dobry wieczór", "good evening"],
  ["do widzenia", "goodbye"],
  ["proszę", "please"],
  ["wyzwanie", "challenge"],
  ["bardzo dziękuję", "thank you very much"],
  ["przepraszam", "sorry"],
  ["nie ma za co", "you're welcome"],
  ["czy to jest pikantne?", "is this spicy?"],
  ["jeszcze raz proszę", "another one, please"],
  ["może", "maybe"],
  ["jak się masz?", "how are you?"],
  ["wszystko w porządku", "all good"],
  ["świetnie", "great"],
  ["Nazywam się…", "My name is…"],
  ["Miło cię poznać", "Nice to meet you"],
  ["Skąd jesteś?", "Where are you from?"],
  ["Jestem z Polski", "I'm from Poland"],
  ["mam pytanie", "I have a question"],
  ["potrzebuję pomocy", "I need help"],
  ["czy możesz powtórzyć?", "Could you repeat?"],
  ["mówię trochę po angielsku", "I speak a little English"],
  ["proszę mówić wolniej", "Please speak slower"],
  ["gdzie jest toaleta?", "Where is the restroom?"],
  ["gdzie jest przystanek?", "Where is the bus stop?"],
  ["ile to kosztuje?", "How much is it?"],
  ["czy mogę zapłacić kartą?", "Can I pay by card?"],
  ["poproszę rachunek", "The bill, please"],
  ["smacznego", "enjoy your meal"],
  ["jest pyszne", "it's delicious"],
  ["chciałbym kawę", "I'd like a coffee"],
  ["woda bez gazu", "still water"],
  ["czy to daleko?", "Is it far?"],
  ["o której godzinie?", "at what time?"],
  ["jutro", "tomorrow"],
  ["dzisiaj", "today"],
  ["za chwilę", "in a moment"],
  ["spotkajmy się później", "let's meet later"],
  ["po lewej", "on the left"],
  ["prosto", "straight ahead"],
  ["Lubię 10xdevs", "I like 10xdevs"],
  ["kocham to", "I love it"],
  ["nie rozumiem", "I don't understand"],
  ["to trudne", "it's difficult"],
  ["jest łatwe", "it's easy"],
  ["to ważne", "it's important"],
  ["nie wiem", "I don't know"],
  ["do zobaczenia później", "see you later"],
  ["dobranoc", "good night"],
];

//Fisher–Yates: like a boss
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getMockChallengePairs(count = 15): PairDTO[] {
  const shuffled = shuffle(MOCK_PAIR_POOL);
  return shuffled.slice(0, count).map((pair, index) => ({
    id: `mock-pair-${index + 1}`,
    deck_id: MOCK_CHALLENGE_DECK.id,
    term_a: pair[0],
    term_b: pair[1],
    added_at: now,
    updated_at: now,
  }));
}
