import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { verifyAccessCode } from '../../firebase/paidAccess';
import PaymentRequestForm from './PaymentRequestForm';

export default function PaidAccessModal({ section, onClose }) {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  if (!section) return null;

  async function handleUnlock(e) {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('Enter the access code you received.');
      return;
    }
    setChecking(true);
    try {
      const ok = await verifyAccessCode(section.id, code.trim());
      if (ok) {
        onClose();
        navigate(`/section/${section.id}`);
      } else {
        setError('That code doesn\u2019t match. Double-check and try again.');
      }
    } catch (err) {
      console.error('Access code check failed:', err);
      setError(err.message || 'Could not verify the code right now.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>{section.title}</h2>

        {section.previewMediaUrl && (
          <div className="paid-preview-media">
            {section.previewType === 'video' ? (
              <video src={section.previewMediaUrl} controls />
            ) : (
              <img src={section.previewMediaUrl} alt={`${section.title} preview`} />
            )}
          </div>
        )}

        {section.description && <p className="section-description">{section.description}</p>}
        <p className="paid-price-line">{section.price || 'Paid course'}</p>

        {showRequestForm ? (
          <PaymentRequestForm courseTitle={section.title} onBack={() => setShowRequestForm(false)} />
        ) : !currentUser ? (
          <>
            <p className="empty-state">Sign in with Google to enter your access code.</p>
            <button className="google-btn" onClick={loginWithGoogle} style={{ width: '100%' }}>
              Continue with Google
            </button>
          </>
        ) : (
          <form onSubmit={handleUnlock}>
            {error && <p className="form-error">{error}</p>}
            <input
              className="paid-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter access code"
              autoFocus
            />
            <div className="modal-actions">
              <button type="submit" disabled={checking}>
                {checking ? 'Checking…' : 'Unlock'}
              </button>
              <button type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
            <button type="button" className="request-access-link" onClick={() => setShowRequestForm(true)}>
              Don't have a code? Request Access Code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
