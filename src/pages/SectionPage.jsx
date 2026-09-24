import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSection, fetchSectionItems } from '../firebase/firestoreApi';
import { isUnlockedLocally } from '../firebase/paidAccess';
import { useAuth } from '../context/AuthContext';
import RoadmapItem from '../components/Sections/RoadmapItem';
import AddItemForm from '../components/Sections/AddItemForm';
import ResourceShelf from '../components/Resources/ResourceShelf';
import PaidAccessModal from '../components/Paid/PaidAccessModal';

export default function SectionPage() {
  const { sectionId } = useParams();
  const { currentUser, isAdmin } = useAuth();
  const [section, setSection] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error | not-found | locked
  const [showAccessModal, setShowAccessModal] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    fetchSection(sectionId)
      .then(async (sectionData) => {
        if (!sectionData) {
          setStatus('not-found');
          return;
        }
        setSection(sectionData);

        const unlocked =
          !sectionData.isPaid ||
          isUnlockedLocally(sectionId) ||
          (currentUser && (currentUser.uid === sectionData.createdBy || isAdmin));

        if (!unlocked) {
          setStatus('locked');
          return;
        }

        const itemsData = await fetchSectionItems(sectionId);
        setItems(itemsData);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load section:', err);
        setStatus('error');
      });
  }, [sectionId, currentUser, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') {
    return (
      <div className="page">
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="page">
        <p className="empty-state">
          Section not found. <Link to="/">Back to catalog</Link>
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page">
        <p className="empty-state">Couldn't load this section. Please refresh.</p>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="page">
        <Link to="/" className="back-link">
          ← All sections
        </Link>
        <div className="locked-section-panel">
          <h1>{section.title}</h1>
          <p className="paid-price-line">{section.price || 'Paid course'}</p>
          <p className="empty-state">This is a premium course. Enter your access code to view it.</p>
          <button type="button" className="create-section-btn" onClick={() => setShowAccessModal(true)}>
            🔒 Enter Access Code
          </button>
        </div>
        {showAccessModal && (
          <PaidAccessModal section={section} onClose={() => setShowAccessModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="page section-detail">
      <Link to="/" className="back-link">
        ← All sections
      </Link>
      <h1>{section.title}</h1>
      {section.description && <p className="section-description">{section.description}</p>}

      <div className="section-detail-body">
        <div className="roadmap-list">
          <h3>Roadmap</h3>
          {items.length === 0 ? (
            <p className="empty-state">No items in this roadmap yet.</p>
          ) : (
            items.map((item, index) => (
              <RoadmapItem
                key={item.id}
                item={item}
                index={index}
                sectionId={sectionId}
                sectionTitle={section.title}
                onChanged={load}
              />
            ))
          )}
          <AddItemForm sectionId={sectionId} currentThumbnailUrl={section.thumbnailUrl} onAdded={load} />
        </div>
        <ResourceShelf sectionId={sectionId} />
      </div>
    </div>
  );
}
