// Gives the seeded rooms demo photos on the LOCAL stack. `npm run db:reset`
// runs it after `supabase db reset`; on its own:
//
//   npm run db:seed-images
//
// The photos are CC0 StockSnap images (found through Openverse), downloaded
// once into the gitignored supabase/seed-images/ and reused after that. It
// signs in as the seeded admin, so the uploads and room_images rows go
// through RLS like an admin upload in the app. URL and key come from
// `supabase status`, never from .env.local, so it cannot reach a cloud project.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../lib/supabase/database.types.ts";

const PHOTO_CDN = "https://cdn.stocksnap.io/img-thumbs/960w";
const PHOTO_DIR = new URL("../supabase/seed-images/", import.meta.url);
const BUCKET = "room-images";
const SEED_ADMIN = { email: "admin@thesocialhouse.dk", password: "password" };

// StockSnap photo codes per seeded room (supabase/seed.sql), cover first.
const ROOM_PHOTOS: Record<string, string[]> = {
  // Room of Power
  "00000000-0000-0000-0000-0000000000c1": [
    "VCM3QCKR3G",
    "70ZAX0HRQQ",
    "KQNZJCQYZY",
  ],
  // Room of Art
  "00000000-0000-0000-0000-0000000000c2": ["NEB7S4QC8G", "L73NCN14NG"],
  // Room of Calm
  "00000000-0000-0000-0000-0000000000c3": ["QF8DAID6O0", "478BZDEA2Y"],
  // Room of Focus
  "00000000-0000-0000-0000-0000000000c4": ["LDZ0SMPXFD", "WWF2RUV4E7"],
  // Room of Ideas
  "00000000-0000-0000-0000-0000000000c5": ["VJJSGB8SPK", "NSQTXCLWQ5"],
  // Room of Board
  "00000000-0000-0000-0000-0000000000c6": [
    "FSU5SG0X4U",
    "N3DP51WC97",
    "7RTY13MUYV",
  ],
  // Room of Light
  "00000000-0000-0000-0000-0000000000c7": ["JL96L97G1C", "0KJMGQYA2T"],
  // Room of Rest
  "00000000-0000-0000-0000-0000000000c8": ["BY59S6FSEP", "9KDSFUDU87"],
  // Room of Craft
  "00000000-0000-0000-0000-0000000000c9": [
    "XNKIHJBIQD",
    "3PLFDQQZ5M",
    "D8MPRQM38G",
  ],
  // Room of View
  "00000000-0000-0000-0000-0000000000ca": ["7OPWOSQFXS", "N0IZ9UB3QW"],
};

const localStack = z
  .object({ API_URL: z.url(), PUBLISHABLE_KEY: z.string().min(1) })
  .parse(
    JSON.parse(
      execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })
    )
  );

// The cached file, or a fresh download that is cached for the next run.
async function photo(code: string): Promise<Buffer> {
  const file = new URL(`${code}.jpg`, PHOTO_DIR);
  const cached = await readFile(file).catch(() => null);
  if (cached) {
    return cached;
  }
  const response = await fetch(`${PHOTO_CDN}/${code}.jpg`);
  if (!response.ok) {
    throw new Error(`Download of ${code} failed: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(file, bytes);
  return bytes;
}

type RoomImageRow = Database["public"]["Tables"]["room_images"]["Insert"];
interface SeedPhoto {
  code: string;
  roomId: string;
  sortOrder: number;
}

// Downloads (or reuses) one photo, uploads it and returns its room_images
// row. Ids are stable, so a second run overwrites the same objects and rows.
async function upload(
  seed: SeedPhoto,
  position: number
): Promise<RoomImageRow> {
  const id = `00000000-0000-0000-0001-${String(position + 1).padStart(12, "0")}`;
  const path = `rooms/${seed.roomId}/${id}.jpg`;
  const bytes = await photo(seed.code);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) {
    throw new Error(`Upload of ${path} failed: ${error.message}`);
  }
  return {
    room_image_file_name: `stocksnap-${seed.code}.jpg`,
    room_image_file_size: bytes.byteLength,
    room_image_id: id,
    room_image_room_id: seed.roomId,
    room_image_sort_order: seed.sortOrder,
    room_image_storage_path: path,
  };
}

const supabase = createClient<Database>(
  localStack.API_URL,
  localStack.PUBLISHABLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { error: signInError } =
  await supabase.auth.signInWithPassword(SEED_ADMIN);
if (signInError) {
  throw new Error(`Sign-in as the seed admin failed: ${signInError.message}`);
}

await mkdir(PHOTO_DIR, { recursive: true });

const seeds = Object.entries(ROOM_PHOTOS).flatMap(([roomId, codes]) =>
  codes.map((code, sortOrder) => ({ code, roomId, sortOrder }))
);
const rows = await Promise.all(seeds.map(upload));
const { error } = await supabase.from("room_images").upsert(rows);
if (error) {
  throw new Error(`Writing room_images failed: ${error.message}`);
}

console.info(`Seeded ${rows.length} room photos into ${localStack.API_URL}`);
