import { assertLocal, SUPABASE_KEY, SUPABASE_URL } from './local-stack';
import { withDatabase } from './database';

// Fails fast, with a clear message, when the local stack isn't ready.
export default async function globalSetup() {
  assertLocal();

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(`The local Supabase API is not reachable at ${SUPABASE_URL} (${String(error)}). Run \`npx supabase start\`.`);
  }

  await withDatabase(async db => {
    const { rows } = await db.query<{ members: number }>(
      `select count(*)::int as members from auth.users where email in ('example1@example.com', 'example2@example.com')`,
    );
    if (rows[0].members !== 2) {
      throw new Error('The seeded members are missing. Run `npx supabase db reset` to restore the seed.');
    }
  });
}
