import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parseVideoLink, getYoutubeThumbnail } from '../utils/linkParser';
import {
  getPrivateItems,
  addPrivateItem,
  updatePrivateItem,
  deletePrivateItem,
} from '../utils/privateSpace';

const TYPES = [
  { value: 'video', label: 'Video link' },
  { value: 'drive', label: 'Drive / file link' },
  { value: 'topic', label: 'Topic / note (no link)' },
];

function ItemForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [type, setType] = useState(initial?.type || 'video');
  const [url, setUrl] = useState(initial?.url || '');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please give it a title.');
      return;
    }
    if (type !== 'topic' && !url.trim()) {
      setError('Please add a link, or switch to "Topic / note" if there isn\u2019t one.');
      return;
    }
    if (url.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(url.trim());
      } catch {
        setError("That doesn't look like a valid link.");
        return;
      }
    }
    setError('');
    onSubmit({ title: title.trim(), type, url: url.trim() });
  }

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {type !== 'topic' && (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={type === 'video' ? 'YouTube (or any video) link' : 'Google Drive / file link'}
        />
      )}
      <div className="modal-actions">
        <button type="submit">{submitLabel}</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function PrivateItemCard({ item, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const parsed = item.type === 'video' && item.url ? parseVideoLink(item.url) : null;
  const thumb = parsed?.sourceType === 'youtube' && parsed.videoId ? getYoutubeThumbnail(parsed.videoId) : null;
  const isInAppPlayable = parsed?.sourceType === 'youtube' && parsed.videoId;

  if (editing) {
    return (
      <div className="section-card">
        <div className="section-card-body">
          <ItemForm
            initial={item}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={(updates) => {
              onEdit(item.id, updates);
              setEditing(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="section-card-owner-actions">
        <button type="button" title="Edit" onClick={() => setEditing(true)}>
          ✎
        </button>
        <button type="button" title="Delete" onClick={() => onDelete(item.id)}>
          🗑
        </button>
      </div>
      <div className="section-card-thumb">
        {thumb ? <img src={thumb} alt="" /> : item.type === 'drive' ? '🗂️' : item.type === 'topic' ? '🧠' : '🎬'}
      </div>
      <div className="section-card-body">
        <h3>{item.title}</h3>
        <p className="section-meta">{TYPES.find((t) => t.value === item.type)?.label}</p>
        {item.url &&
          (isInAppPlayable ? (
            <Link to={`/video/${parsed.videoId}?title=${encodeURIComponent(item.title)}`} className="back-link">
              ▶ Watch in-app
            </Link>
          ) : (
            <a href={item.url} target="_blank" rel="noreferrer" className="back-link">
              Open link ↗
            </a>
          ))}
      </div>
    </div>
  );
}

export default function PrivateSpacePage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (currentUser) setItems(getPrivateItems(currentUser.uid));
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="page">
        <p className="empty-state">
          Sign in to use your Private Space. <Link to="/login">Sign in</Link>
        </p>
      </div>
    );
  }

  function refresh() {
    setItems(getPrivateItems(currentUser.uid));
  }

  function handleAdd(data) {
    addPrivateItem(currentUser.uid, data);
    setShowAddForm(false);
    refresh();
  }

  function handleEdit(id, updates) {
    updatePrivateItem(currentUser.uid, id, updates);
    refresh();
  }

  function handleDelete(id) {
    if (!window.confirm('Remove this from your Private Space?')) return;
    deletePrivateItem(currentUser.uid, id);
    refresh();
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>🎓 My Private Space</h1>
          <p className="empty-state">
            Your own videos, Drive links, and topics — saved only on this device/browser, never sent
            to a server.
          </p>
        </div>
        <button type="button" className="create-section-btn" onClick={() => setShowAddForm((s) => !s)}>
          {showAddForm ? 'Close' : '+ Add Item'}
        </button>
      </div>

      {showAddForm && (
        <div className="empty-catalog" style={{ textAlign: 'left', marginBottom: 24 }}>
          <ItemForm submitLabel="Add to Private Space" onSubmit={handleAdd} />
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-catalog">
          <p>Nothing here yet — add your first video, Drive link, or topic.</p>
        </div>
      ) : (
        <div className="section-grid">
          {items.map((item) => (
            <PrivateItemCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
