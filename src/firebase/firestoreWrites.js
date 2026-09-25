// Write-side counterpart to firestoreApi.js. Kept separate so it's
// obvious at a glance which functions mutate data (and therefore need
// an authenticated user + pass the Firestore security rules) versus
// which only read.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getYoutubeThumbnail } from '../utils/linkParser';

export async function addSectionItem(
  sectionId,
  { title, url, sourceType, videoId, order },
  uid,
  { currentThumbnailUrl = null } = {}
) {
  await addDoc(collection(db, 'sections', sectionId, 'items'), {
    title,
    url,
    sourceType,
    videoId: videoId || null,
    order,
    addedBy: uid,
    addedAt: serverTimestamp(),
  });

  const updates = { itemCount: increment(1) };
  // Auto-extract a catalog thumbnail from the first YouTube link that
  // comes in, whenever the section doesn't already have one — not
  // restricted to literally the section's first item, so a thumbnail
  // still gets set even if earlier items were non-YouTube links.
  if (!currentThumbnailUrl && sourceType === 'youtube' && videoId) {
    updates.thumbnailUrl = getYoutubeThumbnail(videoId);
  }
  await updateDoc(doc(db, 'sections', sectionId), updates);
}

// Firestore rules only allow the original addedBy user (or the admin)
// to call these — enforced server-side, not just hidden in the UI.
export async function updateSectionItem(sectionId, itemId, updates) {
  await updateDoc(doc(db, 'sections', sectionId, 'items', itemId), updates);
}

export async function deleteSectionItem(sectionId, itemId) {
  await deleteDoc(doc(db, 'sections', sectionId, 'items', itemId));
  await updateDoc(doc(db, 'sections', sectionId), {
    itemCount: increment(-1),
  });
}

export async function addSectionResource(sectionId, { title, url, fileType }, uid) {
  await addDoc(collection(db, 'sections', sectionId, 'resources'), {
    title,
    fileUrl: url,
    fileType,
    addedBy: uid,
    addedAt: serverTimestamp(),
  });
}

export async function updateSectionResource(sectionId, resourceId, updates) {
  await updateDoc(doc(db, 'sections', sectionId, 'resources', resourceId), updates);
}

export async function deleteSectionResource(sectionId, resourceId) {
  await deleteDoc(doc(db, 'sections', sectionId, 'resources', resourceId));
}

// User-created section, optionally seeded with a first batch of
// roadmap links (each already parsed via parseVideoLink upstream).
// `extra` carries the optional category/coverImage/paid fields.
export async function createSection(uid, { title, description }, items = [], extra = {}) {
  const firstYoutubeItem = items.find((i) => i.sourceType === 'youtube' && i.videoId);
  const thumbnailUrl =
    extra.coverImage?.trim() || (firstYoutubeItem ? getYoutubeThumbnail(firstYoutubeItem.videoId) : null);

  const sectionRef = await addDoc(collection(db, 'sections'), {
    title,
    description: description || '',
    category: extra.category || 'video',
    order: Date.now(),
    itemCount: 0,
    pinned: false,
    thumbnailUrl,
    createdBy: uid,
    createdAt: serverTimestamp(),
    ...(extra.isPaid
      ? {
          isPaid: true,
          price: extra.price || '',
          previewMediaUrl: extra.previewMediaUrl || null,
          previewType: extra.previewType || 'image',
        }
      : { isPaid: false }),
  });

  let added = 0;
  for (const item of items) {
    await addDoc(collection(db, 'sections', sectionRef.id, 'items'), {
      title: item.title,
      url: item.url,
      sourceType: item.sourceType,
      videoId: item.videoId || null,
      order: Date.now() + added, // preserve the order they were entered in
      addedBy: uid,
      addedAt: serverTimestamp(),
    });
    added += 1;
  }

  if (added > 0) {
    await updateDoc(doc(db, 'sections', sectionRef.id), { itemCount: increment(added) });
  }

  // Access code (paid sections only) lives in a separate, more tightly
  // restricted doc — see setSectionAccessCode / firestore.rules.
  if (extra.isPaid && extra.accessCodeHash) {
    await setSectionAccessCode(sectionRef.id, extra.accessCodeHash);
  }

  return sectionRef.id;
}

export async function updateSection(sectionId, updates) {
  await updateDoc(doc(db, 'sections', sectionId), updates);
}

// Recursively removes a section's items/resources/private docs, then
// the section itself. Fine for playlist-sized subcollections; not
// meant for anything with thousands of docs (no Cloud Function
// available on the free tier to do this server-side).
//
// IMPORTANT: only pass isPaid:true (and only attempt the private/access
// delete at all) when the section is actually paid. That subdoc's rule
// is admin-only-write, so an ordinary user deleting their own free
// section would otherwise have this single extra delete reject the
// ENTIRE batch (Firestore batches are all-or-nothing) even though
// they're fully allowed to delete everything else in it.
export async function deleteSection(sectionId, { isPaid = false } = {}) {
  const batch = writeBatch(db);

  const itemsSnap = await getDocs(collection(db, 'sections', sectionId, 'items'));
  itemsSnap.docs.forEach((d) => batch.delete(d.ref));

  const resourcesSnap = await getDocs(collection(db, 'sections', sectionId, 'resources'));
  resourcesSnap.docs.forEach((d) => batch.delete(d.ref));

  if (isPaid) {
    batch.delete(doc(db, 'sections', sectionId, 'private', 'access'));
  }
  batch.delete(doc(db, 'sections', sectionId));

  await batch.commit();
}

// Reorders whichever sections the caller passes — used with just the
// subset the current user owns (or, for admin, potentially all of
// them). One atomic batch write; if the caller doesn't actually own
// every doc in the list, the whole batch is rejected by the rules
// rather than partially applied.
export async function reorderSections(entries) {
  const batch = writeBatch(db);
  entries.forEach(({ id, order }) => {
    batch.update(doc(db, 'sections', id), { order });
  });
  await batch.commit();
}

export async function toggleSectionPinned(sectionId, pinned) {
  await updateDoc(doc(db, 'sections', sectionId), { pinned });
}

// --- Paid-course access code -------------------------------------
// Stored under a subcollection with its own (tighter) read rule
// rather than on the public section doc — see firestore.rules and
// PROGRESS.md for exactly what this does and doesn't protect against.

export async function setSectionAccessCode(sectionId, codeHash) {
  await setDoc(doc(db, 'sections', sectionId, 'private', 'access'), {
    codeHash,
    updatedAt: serverTimestamp(),
  });
}
