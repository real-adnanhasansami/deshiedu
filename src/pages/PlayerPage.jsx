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
  const { videoId: rawParam } = useParams();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title');
  const sectionId = searchParams.get('section');
  const sectionTitle = searchParams.get('sectionTitle');
  const playlistId = searchParams.get('playlistId');

  // Safety net: react-router's useParams() already stops at the `?`,
  // so rawParam shouldn't ever contain a stray "&..." fragment — but
  // if some future caller ever builds a malformed link (or a browser
  // extension mangles the URL), split defensively rather than pass a
  // garbage id straight to the YouTube embed and crash the player.
  const cleanId = (rawParam || '').split('&')[0].split('?')[0];

  // /video/playlist?playlistId=... is how playlist-only links route
  // (see RoadmapItem) — there's no single videoId to key notes/resume
  // off in that case, so treat "playlist" as a sentinel rather than a
  // real video id.
  const isPlaylistMode = cleanId === 'playlist' && Boolean(playlistId);
  const videoId = isPlaylistMode ? null : cleanId;
  // Notes still work in playlist mode, just keyed to the playlist
  // itself rather than any one video in it.
  const notesKey = isPlaylistMode ? `playlist_${playlistId}` : videoId;

  const [resumeSeconds, setResumeSeconds] = useState(0);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    setResumeSeconds(0);
    lastSavedRef.current = 0;
    // Resume/progress tracking is single-video only — see VideoPlayer.
    if (!currentUser || !videoId || isPlaylistMode) return;
    fetchWatchProgress(currentUser.uid, videoId)
      .then(setResumeSeconds)
      .catch((err) => console.error('Failed to load watch progress:', err));
  }, [currentUser, videoId, isPlaylistMode]);

  function handleProgress(seconds) {
    if (!currentUser || !videoId || isPlaylistMode) return;
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
        <VideoPlayer
          youtubeId={videoId}
          playlistId={isPlaylistMode ? playlistId : null}
          resumeSeconds={resumeSeconds}
          onProgress={handleProgress}
        />
        <NotesPanel videoId={notesKey} videoTitle={title} />
      </div>
    </div>
  );
}
