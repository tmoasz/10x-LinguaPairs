import { describe, it, expect } from "vitest";
import {
  buildSystemMessage,
  getFewShotMessages,
  buildTopicUserMessage,
  buildTextUserMessage,
  buildExtendUserMessage,
} from "@/lib/prompts/generation";

const langA = { code: "pl", name: "Polish" };
const langB = { code: "en", name: "English" };

describe("prompts/generation builders", () => {
  it("buildSystemMessage includes languages, rules and register", () => {
    const msg = buildSystemMessage({ langA, langB, register: "neutral" });
    expect(msg.role).toBe("system");
    expect(msg.content).toContain("Polish ↔ English");
    expect(msg.content).toContain("Return ONLY JSON");
    expect(msg.content).toContain("per-side ≤ 8 words");
    expect(msg.content).toContain("register=neutral");
    expect(msg.content).toContain("term_a in pl, term_b in en");
  });

  it("getFewShotMessages returns assistant JSON example", () => {
    const few = getFewShotMessages();
    expect(Array.isArray(few)).toBe(true);
    expect(few[0].role).toBe("assistant");
    const parsed = JSON.parse(few[0].content);
    expect(parsed).toHaveProperty("pairs");
    expect(Array.isArray(parsed.pairs)).toBe(true);
  });

  it("buildTopicUserMessage builds minimal topic context with params and banlist", () => {
    const banlist = ["  Ala   ma  kota  ", "Ala ma kota", "jabłko"]; // duplicates + spacing
    const msg = buildTopicUserMessage({
      topicId: "travel",
      topicLabel: "Podróże i Turystyka",
      contentType: "auto",
      register: "informal",
      count: 30,
      langA,
      langB,
      banlist,
    });
    expect(msg.role).toBe("user");
    expect(msg.content).toContain("Topic: travel — Podróże i Turystyka");
    expect(msg.content).toContain("content_type=auto, register=informal, count=30");
    expect(msg.content).toContain("A=pl, B=en");
    // normalized and deduped banlist should contain single "Ala ma kota" and "jabłko"
    expect(msg.content).toContain("Avoid:");
    const afterAvoid = msg.content.split("Avoid:")[1];
    expect(afterAvoid).toContain("Ala ma kota");
    expect(afterAvoid).toContain("jabłko");
    // not twice
    expect(afterAvoid.indexOf("Ala ma kota")).toBe(afterAvoid.lastIndexOf("Ala ma kota"));
  });

  it("buildTopicUserMessage optionally includes deck description", () => {
    const msg = buildTopicUserMessage({
      topicId: "business",
      topicLabel: "Biznes",
      contentType: "words",
      register: "formal",
      count: 10,
      langA,
      langB,
      deckDescription: "Słownictwo przydatne w rozmowach sprzedażowych i negocjacjach.",
    });
    expect(msg.content).toContain("Deck description (use this to match tone and topic): Słownictwo przydatne");
  });

  it("buildTextUserMessage clips long context and includes params", () => {
    const long = "x".repeat(1000);
    const msg = buildTextUserMessage({
      text: long,
      contentType: "phrases",
      register: "formal",
      count: 30,
      langA,
      langB,
    });
    expect(msg.role).toBe("user");
    expect(msg.content.startsWith("Context: ")).toBe(true);
    // clipped context ends with ellipsis
    expect(msg.content).toContain("…\ncontent_type=phrases, register=formal, count=30");
    expect(msg.content).toContain("A=pl, B=en");
  });

  it("buildTextUserMessage appends deck description when provided", () => {
    const msg = buildTextUserMessage({
      text: "Dowolny kontekst do generowania par.",
      contentType: "words",
      register: "neutral",
      count: 15,
      langA,
      langB,
      deckDescription: "Popularne terminy marketingowe dla SaaS.",
    });
    expect(msg.content).toContain(
      "Deck description (use this to match tone and topic): Popularne terminy marketingowe"
    );
  });

  it("buildExtendUserMessage prefers topic context over text when both provided", () => {
    const msg = buildExtendUserMessage({
      topicId: "food",
      topicLabel: "Jedzenie i Picie",
      text: "ignored because topic present",
      contentType: "mini-phrases",
      register: "neutral",
      count: 10,
      langA,
      langB,
      banlist: ["zupa"],
    });
    expect(msg.role).toBe("user");
    expect(msg.content).toContain("Topic: food — Jedzenie i Picie");
    expect(msg.content).toContain("Extension: +10 new unique pairs");
    expect(msg.content).toContain("Avoid: zupa");
  });

  it("buildExtendUserMessage appends deck description", () => {
    const msg = buildExtendUserMessage({
      topicId: "travel",
      topicLabel: "Podróże",
      contentType: "phrases",
      register: "informal",
      count: 10,
      langA,
      langB,
      deckDescription: "Zwroty konwersacyjne na lotnisku i dworcu.",
    });
    expect(msg.content).toContain(
      "Deck description (use this to match tone and topic): Zwroty konwersacyjne na lotnisku"
    );
  });
});
