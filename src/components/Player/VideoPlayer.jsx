import { useEffect, useRef, useState } from 'react';

// Distraction-free YouTube embed via the real IFrame Player API
// (youtube-nocookie.com, rel=0, modestbranding, annotations off) —
// upgraded from a plain <iframe src> so we can read/seek playback
// position for resume-watching. YouTube no longer allows fully
// suppressing end-of-video suggestions from the *same* channel;
// this is as close to distraction-free as the embed API allows.
//
// TODO (later task): support non-YouTube sourceTypes (Udemy/Coursera
// don't offer embeddable players, so those stay external links from
// RoadmapItem — this component only ever receives a YouTube id).

let apiLoadPromise = null;
function loadYouTubeIframeAPI() {
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[data-deshiedu-yt-api]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.setAttribute('data-deshiedu-yt-api', 'true');
      document.body.appendChild(tag);
    }
  });
  return apiLoadPromise;
}

const PLAYING = 1;
// Only resume-seek past this many seconds — jumping to :03 isn't worth it.
const MIN_RESUME_SECONDS = 5;
const PROGRESS_SAVE_INTERVAL_MS = 8000;

export default function VideoPlayer({ youtubeId, resumeSeconds = 0, onProgress }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const resumeSecondsRef = useRef(resumeSeconds);
  const onProgressRef = useRef(onProgress);
  const [loaded, setLoaded] = useState(false);

  resumeSecondsRef.current = resumeSeconds;
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!youtubeId || !containerRef.current) return undefined;
    let cancelled = false;
    setLoaded(false);

    loadYouTubeIframeAPI().then((YT) => {
      if (cancelled || !containerRef.current) return;

      playerRef.current = new YT.Player(containerRef.current, {
        videoId: youtubeId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            setLoaded(true);
            if (resumeSecondsRef.current > MIN_RESUME_SECONDS) {
              event.target.seekTo(resumeSecondsRef.current, true);
            }
          },
          onStateChange: (event) => {
            clearInterval(progressTimerRef.current);
            if (event.data === PLAYING) {
              progressTimerRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.();
                if (typeof t === 'number') onProgressRef.current?.(t);
              }, PROGRESS_SAVE_INTERVAL_MS);
            } else {
              const t = playerRef.current?.getCurrentTime?.();
              if (typeof t === 'number') onProgressRef.current?.(t);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      clearInterval(progressTimerRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {
        // player may already be gone if the API never finished loading
      }
      playerRef.current = null;
    };
    // Only re-create the player when the video itself changes —
    // resumeSeconds/onProgress are read via refs/closures above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  if (!youtubeId) {
    return <div className="video-wrapper empty">No video selected</div>;
  }

  return (
    <div className={`video-wrapper ${loaded ? 'is-loaded' : 'is-loading'}`}>
      {!loaded && <div className="video-loading">Loading video…</div>}
      <div ref={containerRef} />
    </div>
  );
}
