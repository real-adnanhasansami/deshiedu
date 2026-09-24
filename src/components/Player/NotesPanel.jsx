import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchNote, saveNote, clearNote } from '../../firebase/notes';

const AUTOSAVE_DELAY_MS = 1500;

export default function NotesPanel({ videoId, videoTitle }) {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | saving | saved | error
  const timerRef = useRef(null);

  // Load this video's saved note whenever the video (or the signed-in
  // user) changes.
  useEffect(() => {
    if (!currentUser || !videoId) return;
    let cancelled = false;
    setStatus('loading');

    fetchNote(currentUser.uid, videoId)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setStatus('idle');
        }
      })
      .catch((err) => {
        console.error('Failed to load notes:', err);
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [currentUser, videoId]);

  async function persist(text) {
    if (!currentUser) return;
    setStatus('saving');
    try {
      await saveNote(currentUser.uid, videoId, text);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (err) {
      console.error('Failed to save notes:', err);
      setStatus('error');
    }
  }

  function handleChange(e) {
    const value = e.target.value;
    setContent(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(value), AUTOSAVE_DELAY_MS);
  }

  function handleSaveNow() {
    clearTimeout(timerRef.current);
    persist(content);
  }

  function handleDownloadTxt() {
    if (!content.trim()) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // jsPDF is loaded on demand (not in the main bundle) since most
  // sessions will never touch the PDF button.
  async function handleDownloadPdf() {
    if (!content.trim()) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;

    // Header band
    doc.setFillColor(20, 21, 26);
    doc.rect(0, 0, pageWidth, 74, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(videoTitle || 'DeshiEdu Notes', margin, 34, { maxWidth: maxWidth });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Exported ${new Date().toLocaleString()}`, margin, 54);

    // Body
    doc.setTextColor(24, 24, 28);
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(content, maxWidth);
    let y = 108;
    const lineHeight = 16;
    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save(`notes-${videoId}.pdf`);
  }

  async function handleClear() {
    if (!window.confirm('Clear all notes for this video?')) return;
    clearTimeout(timerRef.current);
    setContent('');
    if (!currentUser) return;
    try {
      await clearNote(currentUser.uid, videoId);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (err) {
      console.error('Failed to clear notes:', err);
      setStatus('error');
    }
  }

  if (!currentUser) {
    return (
      <div className="notes-panel">
        <h3>Notes</h3>
        <p className="empty-state">Sign in to take notes on this video.</p>
      </div>
    );
  }

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <h3>Notes</h3>
        <span className="notes-status">
          {status === 'loading' && 'Loading…'}
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved'}
          {status === 'error' && 'Couldn\u2019t save'}
        </span>
      </div>
      <textarea
        placeholder="Type your notes here… they save automatically."
        value={content}
        onChange={handleChange}
        disabled={status === 'loading'}
      />
      <div className="notes-actions">
        <button type="button" onClick={handleSaveNow}>
          Save Now
        </button>
        <button type="button" onClick={handleDownloadTxt}>
          ⬇ .txt
        </button>
        <button type="button" onClick={handleDownloadPdf}>
          ⬇ PDF
        </button>
        <button type="button" onClick={handleClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
