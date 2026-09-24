import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toggleSectionPinned, deleteSection } from '../../firebase/firestoreWrites';

const CATEGORY_ICONS = { video: '🎬', course: '📚', resource: '📄', paid: '🔒' };

export default function SectionCard({
  section,
  onChanged,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  onEditClick,
  onLockedClick,
}) {
  const { currentUser, isAdmin } = useAuth();
  const canManage = Boolean(currentUser) && (currentUser.uid === section.createdBy || isAdmin);
  const icon = CATEGORY_ICONS[section.isPaid ? 'paid' : section.category] || '🎬';

  async function handlePinToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleSectionPinned(section.id, !section.pinned);
      onChanged?.();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${section.title}" and everything in it? This can't be undone.`)) {
      return;
    }
    try {
      await deleteSection(section.id);
      onChanged?.();
    } catch (err) {
      console.error('Failed to delete section:', err);
    }
  }

  function handleEdit(e) {
    e.preventDefault();
    e.stopPropagation();
    onEditClick?.(section);
  }

  const isLocked = section.isPaid && onLockedClick;

  const cardInner = (
    <>
      <div className="section-card-badges">
        {section.pinned && <span className="badge badge-pinned">📌 Pinned</span>}
        {section.isPaid && <span className="badge badge-paid">Premium</span>}
      </div>
      {canManage && (
        <div className="section-card-owner-actions">
          {draggable && (
            <button
              type="button"
              className="section-drag-handle"
              title="Drag to reorder"
              onClick={(e) => e.preventDefault()}
            >
              ⠿
            </button>
          )}
          <button
            type="button"
            className={section.pinned ? 'is-active' : ''}
            title={section.pinned ? 'Unpin' : 'Pin to top'}
            onClick={handlePinToggle}
          >
            📌
          </button>
          <button type="button" title="Edit" onClick={handleEdit}>
            ✎
          </button>
          <button type="button" title="Delete" onClick={handleDelete}>
            🗑
          </button>
        </div>
      )}
      <div className="section-card-thumb">
        {section.thumbnailUrl ? <img src={section.thumbnailUrl} alt="" /> : icon}
      </div>
      <div className="section-card-body">
        <h3>{section.title}</h3>
        {section.description && <p className="section-description">{section.description}</p>}
        {section.isPaid ? (
          <span className="section-price-tag">{section.price || 'Paid'}</span>
        ) : (
          <p className="section-meta">{section.itemCount ?? 0} items</p>
        )}
      </div>
    </>
  );

  const cardProps = {
    className: `section-card${isDragging ? ' is-dragging' : ''}`,
    draggable,
    onDragStart: draggable ? () => onDragStart?.(section.id) : undefined,
    onDragOver: draggable ? (e) => { e.preventDefault(); onDragOver?.(section.id); } : undefined,
    onDrop: draggable ? (e) => { e.preventDefault(); onDrop?.(section.id); } : undefined,
  };

  if (isLocked) {
    return (
      <div
        {...cardProps}
        role="button"
        tabIndex={0}
        onClick={() => onLockedClick(section)}
      >
        {cardInner}
      </div>
    );
  }

  return (
    <Link to={`/section/${section.id}`} {...cardProps}>
      {cardInner}
    </Link>
  );
}
