// Bearer-token check shared by the job routes (app/api/jobs/*): the
// scheduled functions authenticate with JOB_SECRET (docs/agents/email.md,
// docs/agents/outlook-sync.md).
import { timingSafeEqual } from "node:crypto";

export const isJobAuthorized = (
  header: string | null,
  secret: string
): boolean => {
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(header ?? "");
  return (
    provided.length === expected.length && timingSafeEqual(expected, provided)
  );
};
