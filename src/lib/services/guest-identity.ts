
const STORAGE_KEY_GUEST_ID = "linguapairs.guest.id";
const STORAGE_KEY_GUEST_NAME = "linguapairs.guest.name";

const ADJECTIVES = [
  "Szybki", "Bystry", "Finezyjny", "Sprytny", "Wesoły", "Dzielny", "Mądry", "Zwinny", "Czujny", "Śmiały", "Hardy"
];

const NOUNS = [
  "Bóbr", "Lis", "Wilk", "Orzeł", "Sokół", "Ryś", "Dzik", "Żubr", "Łoś", "Niedźwiedź"
];

function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} ${noun} #${num}`;
}

export const guestIdentityService = {
  getIdentity(): { guestId: string; guestName: string } {
    if (typeof window === "undefined") {
      return { guestId: "", guestName: "Anonim" };
    }

    let guestId = localStorage.getItem(STORAGE_KEY_GUEST_ID);
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY_GUEST_ID, guestId);
    }

    let guestName = localStorage.getItem(STORAGE_KEY_GUEST_NAME);
    if (!guestName) {
      guestName = generateRandomName();
      localStorage.setItem(STORAGE_KEY_GUEST_NAME, guestName);
    }

    return { guestId, guestName };
  },

  updateName(newName: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_GUEST_NAME, newName);
  },

  regenerateName(): string {
    if (typeof window === "undefined") return "Anonim";
    const newName = generateRandomName();
    localStorage.setItem(STORAGE_KEY_GUEST_NAME, newName);
    return newName;
  },
  
  ensureIdentity(): void {
    this.getIdentity(); // Triggers generation if missing
  }
};

