// Lightweight helper for the paid-course access code system. Hashing
// the code (rather than storing it in plaintext) means a casual read
// of the Firestore doc doesn't hand over the code directly — see the
// "Paid courses & access codes" note in PROGRESS.md for the honest
// limits of what this does and doesn't protect against without a
// server-side function.
export async function sha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
