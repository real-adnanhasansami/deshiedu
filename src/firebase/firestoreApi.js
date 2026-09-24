// Thin read layer over the `sections` collection and its `items` /
// `resources` subcollections. Keeping these here (rather than calling
// Firestore directly from components) means the data model can change
// in one place later — e.g. if we add pagination or caching.
//
// Sorting is done client-side rather than with Firestore's orderBy().
// orderBy() silently EXCLUDES any document missing that field from the
// results entirely (not just sorts it last) — a real footgun if a
// section/item ever gets added by hand in the console without an
// `order` field. Fetching everything and sorting in JS, with a safe
// fallback, avoids content quietly disappearing from the catalog.

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './config';

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

// -- Sections (the public catalog) ------------------------------------

export async function fetchSections() {
  const snap = await getDocs(collection(db, 'sections'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

export async function fetchSection(sectionId) {
  const snap = await getDoc(doc(db, 'sections', sectionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// -- Roadmap items within a section -----------------------------------

export async function fetchSectionItems(sectionId) {
  const snap = await getDocs(collection(db, 'sections', sectionId, 'items'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

// -- Resource files within a section ------------------------------------

export async function fetchSectionResources(sectionId) {
  const snap = await getDocs(collection(db, 'sections', sectionId, 'resources'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aTime = a.addedAt?.toMillis?.() ?? 0;
      const bTime = b.addedAt?.toMillis?.() ?? 0;
      return bTime - aTime; // newest first
    });
}

// -- Paid-course access code (see firebase/paidAccess.js for the
// verify flow that uses this) -----------------------------------

export async function fetchSectionAccessHash(sectionId) {
  const snap = await getDoc(doc(db, 'sections', sectionId, 'private', 'access'));
  return snap.exists() ? snap.data().codeHash : null;
}
