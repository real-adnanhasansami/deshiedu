import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSections } from '../firebase/firestoreApi';
import { deleteSection, toggleSectionPinned } from '../firebase/firestoreWrites';
import SectionModal from '../components/Sections/SectionModal';

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [sections, setSections] = useState([]);
  const [status, setStatus] = useState('loading');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const load = useCallback(() => {
    setStatus('loading');
    fetchSections()
      .then((data) => {
        setSections(data);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load sections for admin:', err);
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="page">
        <p className="admin-denied">This page is only available to the site admin.</p>
      </div>
    );
  }

  async function handleDelete(section) {
    if (!window.confirm(`Delete "${section.title}" and everything in it? This can't be undone.`)) {
      return;
    }
    try {
      await deleteSection(section.id, { isPaid: section.isPaid });
      load();
    } catch (err) {
      console.error('Failed to delete section:', err);
    }
  }

  async function handlePinToggle(section) {
    try {
      await toggleSectionPinned(section.id, !section.pinned);
      load();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h1>Admin Panel</h1>
        <button type="button" className="create-section-btn" onClick={() => setModalOpen(true)}>
          + Create Section / Paid Course
        </button>
      </div>

      {status === 'loading' && <p className="empty-state">Loading…</p>}
      {status === 'error' && <p className="empty-state">Couldn't load sections.</p>}

      {status === 'ready' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Paid</th>
              <th>Items</th>
              <th>Pinned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.id}>
                <td>{section.title}</td>
                <td>{section.category}</td>
                <td>{section.isPaid ? section.price || 'Yes' : '—'}</td>
                <td>{section.itemCount ?? 0}</td>
                <td>{section.pinned ? '📌' : '—'}</td>
                <td className="admin-table-actions">
                  <button type="button" onClick={() => handlePinToggle(section)}>
                    {section.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button type="button" onClick={() => setEditingSection(section)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(section)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
      <SectionModal
        open={Boolean(editingSection)}
        section={editingSection}
        onClose={() => setEditingSection(null)}
        onSaved={load}
      />
    </div>
  );
}
