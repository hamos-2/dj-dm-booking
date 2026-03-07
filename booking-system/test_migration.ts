import { execSync } from 'child_process';
try {
  execSync('npx supabase db execute --file supabase/migrations/20260307054216_crm_schema_update.sql --local', { stdio: 'inherit' });
  console.log("Migration executed successfully");
} catch(e) {
  console.error("Migration failed", e.message);
}
