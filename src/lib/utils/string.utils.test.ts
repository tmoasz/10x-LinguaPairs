import { describe, it, expect } from "vitest";
import { capitalize, truncate, isValidEmail } from "./string.utils";

describe("String Utils", () => {
  describe("capitalize", () => {
    it("should capitalize the first letter of a string", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("WORLD")).toBe("World");
    });

    it("should handle empty strings", () => {
      expect(capitalize("")).toBe("");
    });

    it("should handle single character strings", () => {
      expect(capitalize("a")).toBe("A");
    });
  });

  describe("truncate", () => {
    it("should truncate strings longer than maxLength", () => {
      const longString = "This is a very long string that needs to be truncated";
      expect(truncate(longString, 20)).toBe("This is a very long ...");
    });

    it("should not truncate strings shorter than maxLength", () => {
      const shortString = "Short";
      expect(truncate(shortString, 20)).toBe("Short");
    });

    it("should handle exact length strings", () => {
      const exactString = "Exactly";
      expect(truncate(exactString, 7)).toBe("Exactly");
    });
  });

  describe("isValidEmail", () => {
    it("should validate correct email addresses", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co")).toBe(true);
      expect(isValidEmail("user+tag@example.org")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user@domain")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });
});
