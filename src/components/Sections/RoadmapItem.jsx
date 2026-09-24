import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SOURCE_LABELS, parseVideoLink } from '../../utils/linkParser';
import { updateSectionItem, deleteSectionItem } from '../../firebase/firestoreWrites';

export default function RoadmapItem({ item, index, sectionId, sectionTitle, onChanged }) {
  const { currentUser, isAdmin } = useAuth();
  const isOwner = Boolean(currentUser) && (currentUser.uid === item.addedBy || isAdmin);
  const isInAppPlayable = item.sourceType === 'youtube' && item.videoId;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [url, setUrl] = useState(item.url);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function playerHref() {
    const params = new URLSearchParams({ title: item.title });
    if (sectionId) params.set('section', sectionId);
    if (sectionTitle) params.set('sectionTitle', sectionTitle);
    return `/video/${item.videoId}?${params.toString()}`;
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim() || !url.trim()) {
      setError('Title and link are required.');
      return;
    }

    let parsed;
    try {
      parsed = parseVideoLink(url.trim());
      // eslint-disable-next-line no-new
      new URL(url.trim());
    } catch {
      setError("That doesn't look like a valid link.");
      return;
    }

    setBusy(true);
    try {
      await updateSectionItem(sectionId, item.id, {
        title: title.trim(),
        url: url.trim(),
        sourceType: parsed.sourceType,
        videoId: parsed.videoId,
      });
      setEditing(false);
      onChanged?.();
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove "${item.title}" from this roadmap?`)) return;
    setBusy(true);
    try {
      await deleteSectionItem(sectionId, item.id);
      onChanged?.();
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Could not delete this item.');
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form className="roadmap-item roadmap-item-editing" onSubmit={handleSaveEdit}>
        {error && <p className="form-error">{error}</p>}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link" />
        <div className="roadmap-item-actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const content = (
    <>
      <span className="roadmap-index">{index + 1}</span>
      <span className="roadmap-title">{item.title}</span>
      <span className="roadmap-source">{SOURCE_LABELS[item.sourceType] || 'External Link'}</span>
    </>
  );

  return (
    <div className="roadmap-item">
      {isInAppPlayable ? (
        <Link to={playerHref()} className="roadmap-item-link">
          {content}
        </Link>
      ) : (
        <a href={item.url} target="_blank" rel="noreferrer" className="roadmap-item-link">
          {content}
        </a>
      )}
      {isOwner && (
        <div className="roadmap-item-actions">
          <button type="button" onClick={() => setEditing(true)} disabled={busy}>
            Edit
          </button>
          <button type="button" onClick={handleDelete} disabled={busy}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
