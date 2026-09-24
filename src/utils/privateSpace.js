// Deliberately NOT Firestore — this data is meant to live only on the
// visitor's own device (localStorage), per the "zero external server
// storage" requirement. That's a real trade-off worth knowing: it
// won't sync across devices/browsers, and clearing site data wipes it.

const KEY_PREFIX = 'deshiedu-private-space:';

function keyFor(uid) {
  return KEY_PREFIX + uid;
}

export function getPrivateItems(uid) {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read Private Space data:', err);
    return [];
  }
}

function saveAll(uid, items) {
  localStorage.setItem(keyFor(uid), JSON.stringify(items));
}

export function addPrivateItem(uid, item) {
  const items = getPrivateItems(uid);
  const newItem = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    ...item,
  };
  items.unshift(newItem);
  saveAll(uid, items);
  return newItem;
}

export function updatePrivateItem(uid, id, updates) {
  const items = getPrivateItems(uid).map((it) => (it.id === id ? { ...it, ...updates } : it));
  saveAll(uid, items);
}

export function deletePrivateItem(uid, id) {
  const items = getPrivateItems(uid).filter((it) => it.id !== id);
  saveAll(uid, items);
}
