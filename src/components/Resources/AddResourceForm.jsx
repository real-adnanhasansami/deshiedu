import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { addSectionResource } from '../../firebase/firestoreWrites';

function guessFileType(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path.endsWith('.pdf')) return 'pdf';
    if (path.endsWith('.doc') || path.endsWith('.docx')) return 'doc';
    if (path.endsWith('.txt')) return 'txt';
  } catch {
    // fall through
  }
  return 'link';
}

// Cloudinary upload isn't built yet, so this contributes a *link* to a
// file (or any resource page) rather than uploading one directly.
// Admin-only, same reasoning as AddItemForm — see its comment.
export default function AddResourceForm({ sectionId, onAdded }) {
  const { currentUser, isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin || !currentUser) {
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim() || !url.trim()) {
      setError('Please enter both a title and a link.');
      return;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url.trim());
    } catch {
      setError("That doesn't look like a valid link.");
      return;
    }

    setSubmitting(true);
    try {
      await addSectionResource(
        sectionId,
        { title: title.trim(), url: url.trim(), fileType: guessFileType(url.trim()) },
        currentUser.uid
      );
      setTitle('');
      setUrl('');
      onAdded?.();
    } catch (err) {
      console.error('Failed to add resource:', err);
      setError('Could not save this resource. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      <input
        type="text"
        placeholder="Resource title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="url"
        placeholder="Link to a PDF, doc, or any resource"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Resource'}
      </button>
    </form>
  );
}
