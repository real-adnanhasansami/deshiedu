// Notes are stored at users/{uid}/notes/{videoId} — one doc per video,
// keyed by videoId itself rather than a generated id, so fetch/save is
// a single direct doc reference with no query needed.

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './config';

export async function fetchNote(uid, videoId) {
  const snap = await getDoc(doc(db, 'users', uid, 'notes', videoId));
  return snap.exists() ? snap.data().content || '' : '';
}

export async function saveNote(uid, videoId, content) {
  await setDoc(doc(db, 'users', uid, 'notes', videoId), {
    videoId,
    content,
    updatedAt: serverTimestamp(),
  });
}

export async function clearNote(uid, videoId) {
  await deleteDoc(doc(db, 'users', uid, 'notes', videoId));
}
