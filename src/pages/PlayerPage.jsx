import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import VideoPlayer from '../components/Player/VideoPlayer';
import NotesPanel from '../components/Player/NotesPanel';
import { useAuth } from '../context/AuthContext';
import { fetchWatchProgress, saveWatchProgress } from '../firebase/watchProgress';

// Only bother writing to Firestore again if playback has moved at
// least this many seconds since the last save — keeps the write
// count sane instead of one every 8s no matter what.
const MIN_SECONDS_BETWEEN_SAVES = 4;

export default function PlayerPage() {
  const { videoId } = useParams();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title');
  const sectionId = searchParams.get('section');
  const sectionTitle = searchParams.get('sectionTitle');
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    setResumeSeconds(0);
    lastSavedRef.current = 0;
    if (!currentUser || !videoId) return;
    fetchWatchProgress(currentUser.uid, videoId)
      .then(setResumeSeconds)
      .catch((err) => console.error('Failed to load watch progress:', err));
  }, [currentUser, videoId]);

  function handleProgress(seconds) {
    if (!currentUser || !videoId) return;
    if (Math.abs(seconds - lastSavedRef.current) < MIN_SECONDS_BETWEEN_SAVES) return;
    lastSavedRef.current = seconds;
    saveWatchProgress(currentUser.uid, videoId, seconds).catch((err) =>
      console.error('Failed to save watch progress:', err)
    );
  }

  return (
    <div className="page player-page-wrap">
      {sectionId && (
        <Link to={`/section/${sectionId}`} className="back-link">
          ← Back to {sectionTitle || 'section'}
        </Link>
      )}
      {title && <h2 className="player-title">{title}</h2>}
      <div className="player-page">
        <VideoPlayer youtubeId={videoId} resumeSeconds={resumeSeconds} onProgress={handleProgress} />
        <NotesPanel videoId={videoId} videoTitle={title} />
      </div>
    </div>
  );
}
