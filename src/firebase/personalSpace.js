// Real-time (onSnapshot) CRUD for a user's own personal space, stored
// at users/{uid}/personalSpace/{itemId}. This REPLACES the earlier
// localStorage-only Private Space design — see PROGRESS.md for the
// trade-off that reverses (now syncs across devices, but does leave
// this device-local approach behind).

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';

// Returns an unsubscribe function — call it on unmount.
export function subscribeToPersonalSpace(uid, onData, onError) {
  const q = query(collection(db, 'users', uid, 'personalSpace'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error('personalSpace snapshot error:', err);
      onError?.(err);
    }
  );
}

export async function addPersonalItem(uid, { title, type, url }) {
  await addDoc(collection(db, 'users', uid, 'personalSpace'), {
    title,
    type,
    url: url || '',
    createdAt: serverTimestamp(),
  });
}

export async function updatePersonalItem(uid, itemId, updates) {
  await updateDoc(doc(db, 'users', uid, 'personalSpace', itemId), updates);
}

export async function deletePersonalItem(uid, itemId) {
  await deleteDoc(doc(db, 'users', uid, 'personalSpace', itemId));
}
