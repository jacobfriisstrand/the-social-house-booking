import { createHash, randomBytes } from "node:crypto";

export const createChangeToken = (): {
  hash: string;
  raw: string;
} => {
  const raw = randomBytes(32).toString("base64url");
  return { hash: hashChangeToken(raw), raw };
};

export const hashChangeToken = (raw: string): string =>
  createHash("sha256").update(raw).digest("hex");
