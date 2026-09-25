// Admin emails are set via env for the client-side UI check, as a
// comma-separated list (so you can have more than one admin account
// without editing code). The SAME set must also be hardcoded into
// firestore.rules' isAdmin() function — rules files can't read .env —
// so if you add/remove an email, change both places, or admin writes
// will fail against the database even though the UI shows the Admin
// link (or vice versa).

const RAW_ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS || import.meta.env.VITE_ADMIN_EMAIL || '';

export const ADMIN_EMAILS = RAW_ADMIN_EMAILS.split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (ADMIN_EMAILS.length === 0) {
  // Loud on purpose: a missing VITE_ADMIN_EMAILS is the single most
  // common reason "the admin checkbox/panel doesn't show up even
  // though I'm signed in with the right email" — and Vite bakes this
  // value in at BUILD time, so setting it in Vercel's dashboard alone
  // isn't enough; the site needs a fresh deploy afterward too.
  console.warn(
    '[DeshiEdu] VITE_ADMIN_EMAILS is not set — admin-only features (paid courses, /admin) will stay hidden for everyone. Set it in .env (and in Vercel + redeploy for production), matching the emails hardcoded in firestore.rules.'
  );
}

export function isAdminUser(user) {
  if (!user?.email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(user.email.trim().toLowerCase());
}
