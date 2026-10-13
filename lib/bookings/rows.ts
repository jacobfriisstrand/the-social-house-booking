import type { PostgrestError } from "@supabase/supabase-js";

// Every list read unwraps the Postgrest response the same way: an error
// throws with the subject named, a null data array is an empty set.
export function rowsOrThrow<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  subject: string
): T[] {
  if (result.error) {
    throw new Error(`could not list ${subject}: ${result.error.message}`);
  }
  return result.data ?? [];
}
