export const SPECIALTIES = [
  { key: "Fade Clássico", emoji: "✂️" },
  { key: "Tranças", emoji: "🪮" },
  { key: "Barba", emoji: "🧔" },
  { key: "Degradê", emoji: "💈" },
  { key: "Corte Infantil", emoji: "👦" },
  { key: "Dreadlocks", emoji: "🌀" },
  { key: "Hair Design", emoji: "🎨" },
  { key: "Corte Afro", emoji: "💇" },
  { key: "Corte Clássico", emoji: "💼" },
  { key: "Hot Towel", emoji: "🔥" },
] as const;

export type Specialty = (typeof SPECIALTIES)[number]["key"];

export function specialtyEmoji(label: string): string {
  return SPECIALTIES.find((s) => s.key === label)?.emoji ?? "✂️";
}

export const LANGUAGE_FLAGS: Record<string, string> = {
  Português: "🇦🇴",
  English: "🇬🇧",
  Français: "🇫🇷",
  Other: "🌐",
};
