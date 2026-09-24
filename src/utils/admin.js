// The admin email is set via env for the client-side UI check. The
// SAME address must also be hardcoded into firestore.rules (rules
// files can't read .env — see the ADMIN_EMAIL constant near the top
// of firestore.rules) — if you change one, change both, or admin
// writes will start failing against the database even though the UI
// still shows the Admin link.
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

export function isAdminUser(user) {
  return Boolean(user?.email) && Boolean(ADMIN_EMAIL) && user.email === ADMIN_EMAIL;
}
