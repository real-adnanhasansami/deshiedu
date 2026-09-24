// Same pattern as notes.js: one doc per video, keyed by videoId, under
// the signed-in user's own subcollection.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './config';

export async function fetchWatchProgress(uid, videoId) {
  const snap = await getDoc(doc(db, 'users', uid, 'watchProgress', videoId));
  return snap.exists() ? snap.data().seconds || 0 : 0;
}

export async function saveWatchProgress(uid, videoId, seconds) {
  await setDoc(doc(db, 'users', uid, 'watchProgress', videoId), {
    seconds: Math.floor(seconds),
    updatedAt: serverTimestamp(),
  });
}
