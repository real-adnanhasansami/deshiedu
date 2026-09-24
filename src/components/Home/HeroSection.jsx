import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function HeroSection() {
  const { loginWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogle() {
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google sign-in failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="hero">
      <span className="hero-eyebrow">Learn without the distractions</span>
      <h1>One focused place for every video, course, and resource you're learning from.</h1>
      <p>
        DeshiEdu pulls YouTube, Udemy, Coursera, and any other link you find into organized
        roadmaps — no autoplay, no recommended-videos rabbit hole, just the next thing on your
        list and a place to take notes while you watch.
      </p>
      <div className="hero-cta">
        <button className="hero-google-btn" onClick={handleGoogle} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Continue with Google'}
        </button>
      </div>
      <div className="hero-features">
        <span>🎬 Curated video roadmaps</span>
        <span>📚 Free course links, organized</span>
        <span>📝 Notes that save as you watch</span>
        <span>🧭 Build your own study plan</span>
      </div>
    </section>
  );
}
