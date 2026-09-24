import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reorderSections } from '../../firebase/firestoreWrites';
import SectionCard from './SectionCard';

export default function CategoryRow({
  title,
  hint,
  sections,
  onReload,
  onEditSection,
  onLockedClick,
}) {
  const { currentUser, isAdmin } = useAuth();
  const [draggedId, setDraggedId] = useState(null);

  if (sections.length === 0) return null;

  function canReorderCard(section) {
    return Boolean(currentUser) && (currentUser.uid === section.createdBy || isAdmin);
  }

  async function handleDrop(targetId) {
    const fromId = draggedId;
    setDraggedId(null);
    if (!fromId || fromId === targetId) return;

    const fromIndex = sections.findIndex((s) => s.id === fromId);
    const toIndex = sections.findIndex((s) => s.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Only persist new positions for sections the current user is
    // actually allowed to write — everyone else's cards keep their
    // existing `order` value (a Firestore batch fails entirely if any
    // single doc in it fails the security rules).
    const entries = reordered
      .map((s, index) => ({ id: s.id, order: index * 1000 }))
      .filter((entry) => canReorderCard(sections.find((s) => s.id === entry.id)));

    if (entries.length === 0) return;

    try {
      await reorderSections(entries);
      onReload?.();
    } catch (err) {
      console.error('Failed to reorder sections:', err);
    }
  }

  return (
    <div className="category-row">
      <div className="category-row-header">
        <h2>{title}</h2>
        {hint && <span className="category-row-hint">{hint}</span>}
      </div>
      <div className="section-grid">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onChanged={onReload}
            draggable={canReorderCard(section)}
            isDragging={draggedId === section.id}
            onDragStart={setDraggedId}
            onDragOver={() => {}}
            onDrop={handleDrop}
            onEditClick={onEditSection}
            onLockedClick={onLockedClick}
          />
        ))}
      </div>
    </div>
  );
}
