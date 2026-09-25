import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { parseVideoLink, getYoutubeThumbnail } from '../../utils/linkParser';
import { sha256Hex } from '../../utils/hash';
import { createSection, updateSection, setSectionAccessCode } from '../../firebase/firestoreWrites';

const emptyLink = () => ({ title: '', url: '' });
const CATEGORIES = [
  { value: 'video', label: 'Videos / Playlists' },
  { value: 'course', label: 'Courses' },
  { value: 'resource', label: 'Resources' },
];

// `section` prop present => edit mode (prefilled, no starter-links
// step — item management happens on the section page itself).
export default function SectionModal({ open, onClose, onSaved, section = null }) {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isEdit = Boolean(section);

  const [title, setTitle] = useState(section?.title || '');
  const [description, setDescription] = useState(section?.description || '');
  const [category, setCategory] = useState(section?.category || 'video');
  const [coverImage, setCoverImage] = useState(section?.thumbnailUrl || '');
  const [links, setLinks] = useState([emptyLink()]);

  const [isPaid, setIsPaid] = useState(section?.isPaid || false);
  const [price, setPrice] = useState(section?.price || '');
  const [previewMediaUrl, setPreviewMediaUrl] = useState(section?.previewMediaUrl || '');
  const [previewType, setPreviewType] = useState(section?.previewType || 'image');
  const [accessCode, setAccessCode] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open || !currentUser) return null;

  function updateLink(index, field, value) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }
  function addLinkRow() {
    setLinks((prev) => [...prev, emptyLink()]);
  }
  function removeLinkRow(index) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function resetAndClose() {
    setTitle('');
    setDescription('');
    setCategory('video');
    setCoverImage('');
    setLinks([emptyLink()]);
    setIsPaid(false);
    setPrice('');
    setPreviewMediaUrl('');
    setAccessCode('');
    setError('');
    setSubmitting(false);
    onClose();
  }

  function parseLinks() {
    const prepared = [];
    for (const link of links) {
      const linkTitle = link.title.trim();
      const linkUrl = link.url.trim();
      if (!linkTitle && !linkUrl) continue;
      if (!linkTitle || !linkUrl) {
        throw new Error('Each link needs both a title and a URL — leave a row fully empty to skip it.');
      }
      let parsed;
      try {
        parsed = parseVideoLink(linkUrl);
        // eslint-disable-next-line no-new
        new URL(linkUrl);
      } catch {
        throw new Error(`"${linkUrl}" doesn't look like a valid link.`);
      }
      prepared.push({ title: linkTitle, url: linkUrl, sourceType: parsed.sourceType, videoId: parsed.videoId });
    }
    return prepared;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please give your section a title.');
      return;
    }
    if (isPaid && !price.trim()) {
      setError('Please set a price for this paid course.');
      return;
    }
    if (isPaid && !isEdit && !accessCode.trim()) {
      setError('Please set an access code for this paid course.');
      return;
    }

    let preparedItems = [];
    try {
      if (!isEdit && isAdmin) preparedItems = parseLinks();
    } catch (err) {
      setError(err.message);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const updates = {
          title: title.trim(),
          description: description.trim(),
          category,
          thumbnailUrl: coverImage.trim() || section.thumbnailUrl || null,
        };
        if (isAdmin) {
          updates.isPaid = isPaid;
          updates.price = isPaid ? price.trim() : '';
          updates.previewMediaUrl = isPaid ? previewMediaUrl.trim() || null : null;
          updates.previewType = previewType;
        }
        await updateSection(section.id, updates);
        if (isAdmin && isPaid && accessCode.trim()) {
          await setSectionAccessCode(section.id, await sha256Hex(accessCode.trim()));
        }
        onSaved?.();
        resetAndClose();
      } else {
        const extra = { category, coverImage: coverImage.trim() };
        if (isAdmin && isPaid) {
          extra.isPaid = true;
          extra.price = price.trim();
          extra.previewMediaUrl = previewMediaUrl.trim() || null;
          extra.previewType = previewType;
          extra.accessCodeHash = await sha256Hex(accessCode.trim());
        }
        const newId = await createSection(
          currentUser.uid,
          { title: title.trim(), description: description.trim() },
          preparedItems,
          extra
        );
        onSaved?.();
        resetAndClose();
        navigate(`/section/${newId}`);
      }
    } catch (err) {
      console.error('Failed to save section:', err);
      setError('Could not save this section. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <form
        className="modal-content create-section-form"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2>{isEdit ? 'Edit Section' : 'Create a Section'}</h2>
        {error && <p className="form-error">{error}</p>}

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Web Development" />
        </label>

        <label>
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this roadmap about?"
          />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Cover image URL (optional)
          <input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="Leave blank to auto-use the first YouTube video's thumbnail"
          />
        </label>

        {!isEdit && isAdmin && (
          <div className="modal-links">
            <p className="modal-links-label">Roadmap links (optional — you can add these later too)</p>
            {links.map((link, index) => {
              const preview = link.url.trim() ? parseVideoLink(link.url.trim()) : null;
              const thumb =
                preview?.sourceType === 'youtube' && preview.videoId
                  ? getYoutubeThumbnail(preview.videoId)
                  : null;
              return (
                <div className="modal-link-row-wrap" key={index}>
                  <div className="modal-link-row">
                    <input
                      value={link.title}
                      onChange={(e) => updateLink(index, 'title', e.target.value)}
                      placeholder="Link title"
                    />
                    <input
                      value={link.url}
                      onChange={(e) => updateLink(index, 'url', e.target.value)}
                      placeholder="YouTube, Udemy, Coursera… URL"
                    />
                    {links.length > 1 && (
                      <button type="button" className="modal-link-remove" onClick={() => removeLinkRow(index)}>
                        ✕
                      </button>
                    )}
                  </div>
                  {thumb && <img src={thumb} alt="" className="link-thumb-preview" />}
                </div>
              );
            })}
            <button type="button" className="modal-add-link" onClick={addLinkRow}>
              + Add another link
            </button>
          </div>
        )}

        {isAdmin && (
          <>
            <hr className="form-section-divider" />
            <label className="admin-only-toggle">
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
              Make this a Paid Course (admin only)
            </label>

            {isPaid && (
              <>
                <label>
                  Price (shown on the card)
                  <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. ৳999 or $19" />
                </label>
                <label>
                  Preview type
                  <select value={previewType} onChange={(e) => setPreviewType(e.target.value)}>
                    <option value="image">Image</option>
                    <option value="video">Short video (URL to an .mp4)</option>
                  </select>
                </label>
                <label>
                  Preview media URL (optional)
                  <input
                    value={previewMediaUrl}
                    onChange={(e) => setPreviewMediaUrl(e.target.value)}
                    placeholder="Shown in the locked preview before purchase"
                  />
                </label>
                <label>
                  {isEdit ? 'Set a new access code (leave blank to keep current)' : 'Access code'}
                  <input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Shared with buyers after you verify payment"
                  />
                </label>
              </>
            )}
          </>
        )}

        <div className="modal-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Section'}
          </button>
          <button type="button" onClick={resetAndClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
