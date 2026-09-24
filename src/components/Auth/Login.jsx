import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Google Sign-In only — no email/password forms. Simpler for users,
// and every account arrives with a provider-verified email, which
// firestore.rules relies on for the admin check.
export default function Login() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleGoogle() {
    setError('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setError('Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-form">
      <h2>Welcome to DeshiEdu</h2>
      <p className="empty-state">Sign in with Google to save progress, add links, and take notes.</p>
      {error && <p className="form-error">{error}</p>}
      <button className="google-btn" onClick={handleGoogle} disabled={submitting}>
        {submitting ? 'Signing in…' : 'Continue with Google'}
      </button>
    </div>
  );
}
