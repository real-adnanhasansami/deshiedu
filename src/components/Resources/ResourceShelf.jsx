import { useCallback, useEffect, useState } from 'react';
import { fetchSectionResources } from '../../firebase/firestoreApi';
import { deleteSectionResource, updateSectionResource } from '../../firebase/firestoreWrites';
import { useAuth } from '../../context/AuthContext';
import AddResourceForm from './AddResourceForm';

function ResourceRow({ resource, canManage, onChanged, sectionId }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [url, setUrl] = useState(resource.fileUrl);
  const [busy, setBusy] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setBusy(true);
    try {
      await updateSectionResource(sectionId, resource.id, { title: title.trim(), fileUrl: url.trim() });
      setEditing(false);
      onChanged?.();
    } catch (err) {
      console.error('Failed to update resource:', err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove "${resource.title}"?`)) return;
    try {
      await deleteSectionResource(sectionId, resource.id);
      onChanged?.();
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  }

  if (editing) {
    return (
      <li>
        <form className="resource-edit-row" onSubmit={handleSave}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit" className="resource-edit-btn" disabled={busy}>
            {busy ? '…' : 'Save'}
          </button>
          <button type="button" className="resource-edit-btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li>
      <div className="resource-item-main">
        <a href={resource.fileUrl} target="_blank" rel="noreferrer">
          {resource.title}
        </a>
      </div>
      {canManage && (
        <div className="resource-item-actions">
          <button type="button" className="resource-edit-btn" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="resource-delete-btn" onClick={handleDelete}>
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

export default function ResourceShelf({ sectionId }) {
  const { currentUser, isAdmin } = useAuth();
  const [resources, setResources] = useState([]);
  const [status, setStatus] = useState('loading');

  const load = useCallback(() => {
    setStatus('loading');
    fetchSectionResources(sectionId)
      .then((data) => {
        setResources(data);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load resources:', err);
        setStatus('error');
      });
  }, [sectionId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="resource-shelf">
      <h3>Resources</h3>
      {status === 'loading' && <p className="empty-state">Loading resources…</p>}
      {status === 'error' && <p className="empty-state">Couldn't load resources.</p>}
      {status === 'ready' && resources.length === 0 && (
        <p className="empty-state">No resources added yet for this section.</p>
      )}
      {status === 'ready' && resources.length > 0 && (
        <ul className="resource-list">
          {resources.map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              sectionId={sectionId}
              onChanged={load}
              canManage={Boolean(currentUser) && (currentUser.uid === resource.addedBy || isAdmin)}
            />
          ))}
        </ul>
      )}
      <AddResourceForm sectionId={sectionId} onAdded={load} />
    </div>
  );
}
