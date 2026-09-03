// Creates a cloud admin: auth.admin.createUser with app_role = 'admin' in
// app_metadata; the custom access token hook copies it into the JWT
// (docs/agents/auth.md). Run once per cloud environment:
//
//   node --env-file=.env.local scripts/create-admin.ts \
//     --email admin@thesocialhouse.dk --password <secret> [--display-name <name>]
//
// Local development instead seeds its admin via supabase/seed.sql.
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { envSchema } from "../lib/env-schema.ts";

const { values } = parseArgs({
  options: {
    "display-name": { type: "string" },
    email: { type: "string" },
    password: { type: "string" },
  },
});

if (!(values.email && values.password)) {
  console.error(
    "Usage: --email <email> --password <password> [--display-name <name>]"
  );
  process.exit(1);
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    `Invalid environment:\n${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")}`
  );
  process.exit(1);
}

const secretKey = parsed.data.SUPABASE_SECRET_KEY;
if (!secretKey) {
  console.error("SUPABASE_SECRET_KEY is not set");
  process.exit(1);
}

const admin = createClient(parsed.data.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  app_metadata: { app_role: "admin" },
  email: values.email,
  email_confirm: true,
  password: values.password,
});
if (error) {
  console.error(`createUser failed: ${error.message}`);
  process.exit(1);
}

const { error: insertError } = await admin.from("admins").insert({
  admin_auth_user_id: data.user.id,
  admin_display_name: values["display-name"] ?? values.email,
});
if (insertError) {
  // Roll the auth user back so a re-run is not blocked by the duplicate email.
  await admin.auth.admin.deleteUser(data.user.id);
  console.error(`admins insert failed: ${insertError.message}`);
  process.exit(1);
}

console.log(`created admin ${data.user.email} (${data.user.id})`);
