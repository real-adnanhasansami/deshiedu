// One-time / repeatable seed script — populates a couple of sample
// sections with roadmap items and resource entries so the catalog
// isn't empty while the UI is being built.
//
// Requires a Firebase service account key (Project Settings > Service
// accounts > Generate new private key in the Firebase Console).
// NEVER commit that key file. Run with:
//
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seed.mjs
//
// Safe to re-run — it overwrites the same fixed doc ids each time
// rather than creating duplicates.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const sections = [
  {
    id: 'web-development',
    title: 'Web Development',
    description: 'HTML, CSS, JavaScript, and modern frameworks — free resources start to finish.',
    order: 1,
    items: [
      {
        id: 'item-1',
        title: 'HTML & CSS Crash Course',
        url: 'https://www.youtube.com/watch?v=G3e-cpL7ofc',
        sourceType: 'youtube',
        videoId: 'G3e-cpL7ofc',
        order: 1,
      },
      {
        id: 'item-2',
        title: 'JavaScript Full Course',
        url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
        sourceType: 'youtube',
        videoId: 'PkZNo7MFNFg',
        order: 2,
      },
    ],
    resources: [
      {
        id: 'resource-1',
        title: 'MDN Web Docs (reference)',
        fileUrl: 'https://developer.mozilla.org',
        fileType: 'link',
      },
    ],
  },
  {
    id: 'data-science',
    title: 'Data Science',
    description: 'Python, statistics, and machine learning fundamentals.',
    order: 2,
    items: [
      {
        id: 'item-1',
        title: 'Python for Data Science',
        url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI',
        sourceType: 'youtube',
        videoId: 'LHBE6Q9XlzI',
        order: 1,
      },
    ],
    resources: [],
  },
];

async function seed() {
  for (const section of sections) {
    const { items, resources, ...sectionData } = section;

    await db.doc(`sections/${section.id}`).set({
      ...sectionData,
      itemCount: items.length,
      createdAt: Timestamp.now(),
    });

    for (const item of items) {
      const { id, ...itemData } = item;
      await db.doc(`sections/${section.id}/items/${id}`).set({
        ...itemData,
        addedBy: 'seed-script',
        addedAt: Timestamp.now(),
      });
    }

    for (const resource of resources) {
      const { id, ...resourceData } = resource;
      await db.doc(`sections/${section.id}/resources/${id}`).set({
        ...resourceData,
        addedBy: 'seed-script',
        addedAt: Timestamp.now(),
      });
    }

    console.log(`Seeded section: ${section.title}`);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
