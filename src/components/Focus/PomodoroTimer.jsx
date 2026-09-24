import { useEffect, useRef, useState } from 'react';

const PRESETS_MIN = [15, 25, 45, 60];

// Three short beeps generated with the Web Audio API — no external
// audio file needed, works fully offline.
function playAlarm() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.35);
    });
  } catch (err) {
    console.error('Could not play the timer alarm:', err);
  }
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function PomodoroTimer() {
  const [minimized, setMinimized] = useState(true);
  const [presetMinutes, setPresetMinutes] = useState(25);
  // idle | running | paused | finished | overtime
  const [phase, setPhase] = useState('idle');
  const [remaining, setRemaining] = useState(25 * 60);
  const [overtime, setOvertime] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (phase === 'idle') setRemaining(presetMinutes * 60);
  }, [presetMinutes, phase]);

  useEffect(() => {
    clearInterval(intervalRef.current);

    if (phase === 'running') {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            playAlarm();
            setPhase('finished');
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else if (phase === 'overtime') {
      intervalRef.current = setInterval(() => setOvertime((o) => o + 1), 1000);
    }

    return () => clearInterval(intervalRef.current);
  }, [phase]);

  function handleStart() {
    setRemaining(presetMinutes * 60);
    setOvertime(0);
    setPhase('running');
  }
  function handlePause() {
    setPhase('paused');
  }
  function handleResume() {
    setPhase('running');
  }
  function handleStop() {
    setPhase('idle');
    setOvertime(0);
    setRemaining(presetMinutes * 60);
  }
  function handleContinue() {
    setOvertime(0);
    setPhase('overtime');
  }

  const bubbleLabel =
    phase === 'idle' ? '⏱️' : phase === 'overtime' ? `+${formatTime(overtime)}` : formatTime(remaining);

  return (
    <div className="pomodoro-widget">
      {minimized ? (
        <button
          type="button"
          className="pomodoro-bubble"
          onClick={() => setMinimized(false)}
          title="Open focus timer"
        >
          {bubbleLabel}
        </button>
      ) : (
        <div className="pomodoro-panel">
          <div className="pomodoro-header">
            <span>⏱️ Focus Timer</span>
            <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize">
              —
            </button>
          </div>

          {phase === 'idle' && (
            <>
              <div className="pomodoro-presets">
                {PRESETS_MIN.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={presetMinutes === m ? 'is-active' : ''}
                    onClick={() => setPresetMinutes(m)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div className="pomodoro-time">{formatTime(presetMinutes * 60)}</div>
              <button type="button" className="pomodoro-start-btn" onClick={handleStart}>
                ▶ Start Focus Session
              </button>
            </>
          )}

          {(phase === 'running' || phase === 'paused') && (
            <>
              <div className="pomodoro-time">{formatTime(remaining)}</div>
              <div className="pomodoro-controls">
                {phase === 'running' ? (
                  <button type="button" onClick={handlePause}>
                    ⏸ Pause
                  </button>
                ) : (
                  <button type="button" onClick={handleResume}>
                    ▶ Resume
                  </button>
                )}
                <button type="button" onClick={handleStop}>
                  ■ Stop
                </button>
              </div>
            </>
          )}

          {phase === 'finished' && (
            <>
              <div className="pomodoro-time pomodoro-done">Time&rsquo;s up! 🎉</div>
              <div className="pomodoro-controls">
                <button type="button" onClick={handleStop}>
                  ■ Stop
                </button>
                <button type="button" onClick={handleContinue}>
                  + Continue
                </button>
              </div>
            </>
          )}

          {phase === 'overtime' && (
            <>
              <div className="pomodoro-time pomodoro-overtime">+{formatTime(overtime)} overtime</div>
              <div className="pomodoro-controls">
                <button type="button" onClick={handleStop}>
                  ■ Stop
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
