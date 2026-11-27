import "server-only";
import { randomInt } from "node:crypto";

const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

/** 10-char temporary password with letters and digits (passes registerSchema). Shown once, never emailed. */
export function generateTempPassword(): string {
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(LETTERS), pick(DIGITS)];
  while (chars.length < 10) chars.push(pick(LETTERS + DIGITS));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
