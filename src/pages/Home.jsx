import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../components/Home/HeroSection';
import SearchBar from '../components/Search/SearchBar';
import CategoryRow from '../components/Sections/CategoryRow';
import SectionModal from '../components/Sections/SectionModal';
import PaidAccessModal from '../components/Paid/PaidAccessModal';
import { fetchSections } from '../firebase/firestoreApi';
import { isUnlockedLocally } from '../firebase/paidAccess';
import { useAuth } from '../context/AuthContext';

function sortForDisplay(list) {
  return [...list].sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [status, setStatus] = useState('loading');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [lockedSection, setLockedSection] = useState(null);

  const load = useCallback(() => {
    setStatus('loading');
    fetchSections()
      .then((data) => {
        setSections(data);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load sections:', err);
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { videoSections, courseSections, resourceSections, paidSections } = useMemo(() => {
    const free = sections.filter((s) => !s.isPaid);
    const paid = sections.filter((s) => s.isPaid);
    return {
      videoSections: sortForDisplay(free.filter((s) => (s.category || 'video') === 'video')),
      courseSections: sortForDisplay(free.filter((s) => s.category === 'course')),
      resourceSections: sortForDisplay(free.filter((s) => s.category === 'resource')),
      paidSections: sortForDisplay(paid),
    };
  }, [sections]);

  function handlePaidCardClick(section) {
    if (isUnlockedLocally(section.id)) {
      navigate(`/section/${section.id}`);
    } else {
      setLockedSection(section);
    }
  }

  const hasAnySections = sections.length > 0;

  return (
    <div className="page">
      {!currentUser && <HeroSection />}

      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Your Learning Journey</h1>
            <p>
              {currentUser
                ? `Welcome back, ${currentUser.displayName || currentUser.email}`
                : 'Browse curated learning roadmaps'}
            </p>
          </div>
          {currentUser && (
            <button type="button" className="create-section-btn" onClick={() => setCreateOpen(true)}>
              + Create Section
            </button>
          )}
        </div>
      </header>

      {hasAnySections && <SearchBar sections={sections} />}

      {status === 'loading' && <p className="empty-state">Loading sections…</p>}
      {status === 'error' && (
        <p className="empty-state">
          Couldn't load sections right now. Make sure your Firestore rules are published and your
          `.env` values are set, then refresh.
        </p>
      )}

      {status === 'ready' && !hasAnySections && (
        <div className="empty-catalog">
          <p>No sections yet — be the first to start a roadmap!</p>
          {currentUser ? (
            <button type="button" className="create-section-btn" onClick={() => setCreateOpen(true)}>
              + Create Your First Section
            </button>
          ) : (
            <p className="empty-state">Sign in to create the first section.</p>
          )}
        </div>
      )}

      {status === 'ready' && hasAnySections && (
        <>
          <CategoryRow
            title="🎬 Videos / Playlists"
            sections={videoSections}
            onReload={load}
            onEditSection={setEditingSection}
          />
          <CategoryRow
            title="📚 Courses"
            sections={courseSections}
            onReload={load}
            onEditSection={setEditingSection}
          />
          <CategoryRow
            title="📄 Resources"
            sections={resourceSections}
            onReload={load}
            onEditSection={setEditingSection}
          />
          <CategoryRow
            title="🔒 Premium Courses"
            hint="Access-code protected"
            sections={paidSections}
            onReload={load}
            onEditSection={setEditingSection}
            onLockedClick={handlePaidCardClick}
          />
        </>
      )}

      <SectionModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={load} />
      <SectionModal
        open={Boolean(editingSection)}
        section={editingSection}
        onClose={() => setEditingSection(null)}
        onSaved={load}
      />
      {lockedSection && (
        <PaidAccessModal section={lockedSection} onClose={() => setLockedSection(null)} />
      )}
    </div>
  );
}
