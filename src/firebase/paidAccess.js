import { fetchSectionAccessHash } from './firestoreApi';
import { sha256Hex } from '../utils/hash';

const UNLOCK_PREFIX = 'deshiedu-unlocked:';

export function isUnlockedLocally(sectionId) {
  return localStorage.getItem(UNLOCK_PREFIX + sectionId) === 'true';
}

function markUnlockedLocally(sectionId) {
  localStorage.setItem(UNLOCK_PREFIX + sectionId, 'true');
}

// Returns true/false, or throws if the code couldn't be checked at
// all (e.g. not signed in, or no code has been set up yet).
export async function verifyAccessCode(sectionId, enteredCode) {
  const storedHash = await fetchSectionAccessHash(sectionId);
  if (!storedHash) {
    throw new Error('No access code has been set up for this course yet.');
  }
  const enteredHash = await sha256Hex(enteredCode);
  const matches = enteredHash === storedHash;
  if (matches) markUnlockedLocally(sectionId);
  return matches;
}
