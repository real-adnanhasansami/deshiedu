import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseVideoLink, SOURCE_LABELS, getYoutubeThumbnail } from '../../utils/linkParser';
import { addSectionItem } from '../../firebase/firestoreWrites';

export default function AddItemForm({ sectionId, currentThumbnailUrl, onAdded }) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser) {
    return <p className="empty-state">Sign in to add a link to this roadmap.</p>;
  }

  // Live preview as the user types/pastes — this is the "client-side
  // validation ... detect YouTube links and extract the videoId" part,
  // now also showing the auto-extracted thumbnail itself.
  let preview = null;
  if (url.trim()) {
    preview = parseVideoLink(url.trim());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim() || !url.trim()) {
      setError('Please enter both a title and a link.');
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

    setSubmitting(true);
    try {
      await addSectionItem(
        sectionId,
        {
          title: title.trim(),
          url: url.trim(),
          sourceType: parsed.sourceType,
          videoId: parsed.videoId,
          order: Date.now(),
        },
        currentUser.uid,
        { currentThumbnailUrl }
      );
      setTitle('');
      setUrl('');
      onAdded?.();
    } catch (err) {
      console.error('Failed to add item:', err);
      setError('Could not save this link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const thumb = preview?.sourceType === 'youtube' && preview.videoId ? getYoutubeThumbnail(preview.videoId) : null;

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <h4>Add a link to this roadmap</h4>
      {error && <p className="form-error">{error}</p>}
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="url"
        placeholder="Paste a YouTube, Udemy, Coursera… link"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      {thumb && (
        <img src={thumb} alt="" className="link-thumb-preview" />
      )}
      {preview && (
        <p className="link-preview">
          Detected: <strong>{SOURCE_LABELS[preview.sourceType]}</strong>
          {preview.sourceType === 'youtube' &&
            (preview.videoId
              ? ' — thumbnail auto-extracted, will play in-app'
              : " — couldn't read a video id from this URL, will open externally")}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add to Roadmap'}
      </button>
    </form>
  );
}
