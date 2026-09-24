// The admin emails are set via env (comma-separated if multiple).
// The SAME addresses must also be set inside firestore.rules
// (e.g. dreamcanvasacademy@gmail.com and adnansite01@gmail.com).

const ADMIN_EMAILS_RAW = import.meta.env.VITE_ADMIN_EMAIL || 'dreamcanvasacademy@gmail.com,adnansite01@gmail.com';

// Split the comma-separated email list and trim any extra spaces
export const ADMIN_EMAILS = ADMIN_EMAILS_RAW.split(',').map((e) => e.trim().toLowerCase());

export function isAdminUser(user) {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}