import { useEffect, useRef, useState } from 'react';

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
const MIN_RESUME_SECONDS = 5;
const PROGRESS_SAVE_INTERVAL_MS = 8000;

export default function VideoPlayer({ youtubeId, playlistId, resumeSeconds = 0, onProgress }) {
  const containerRef = useRef(null);
  const playerWrapperRef = useRef(null);
  const playerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const resumeSecondsRef = useRef(resumeSeconds);
  const onProgressRef = useRef(onProgress);
  
  const [loaded, setLoaded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerSize, setPlayerSize] = useState('standard');

  resumeSecondsRef.current = resumeSeconds;
  onProgressRef.current = onProgress;

  const hasSomethingToPlay = Boolean(youtubeId) || Boolean(playlistId);

  useEffect(() => {
    if (!hasSomethingToPlay || !containerRef.current) return undefined;
    let cancelled = false;
    setLoaded(false);

    loadYouTubeIframeAPI().then((YT) => {
      if (cancelled || !containerRef.current) return;

      const playerConfig = {
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
            if (!playlistId && resumeSecondsRef.current > MIN_RESUME_SECONDS) {
              event.target.seekTo(resumeSecondsRef.current, true);
            }
          },
          onStateChange: (event) => {
            if (playlistId) return;
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
      };

      if (youtubeId) {
        playerConfig.videoId = youtubeId;
      }

      if (playlistId) {
        playerConfig.playerVars.listType = 'playlist';
        playerConfig.playerVars.list = playlistId;
      }

      playerRef.current = new YT.Player(containerRef.current, playerConfig);
    });

    return () => {
      cancelled = true;
      clearInterval(progressTimerRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {
        // player may already be gone
      }
      playerRef.current = null;
    };
  }, [youtubeId, playlistId]);

  // Speed change handler
  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(rate);
    }
  };

  // Size / Fullscreen handler
  const handleSizeChange = (size) => {
    setPlayerSize(size);

    if (size === 'wide') {
      if (playerWrapperRef.current) {
        if (playerWrapperRef.current.requestFullscreen) {
          playerWrapperRef.current.requestFullscreen();
        } else if (playerWrapperRef.current.webkitRequestFullscreen) {
          playerWrapperRef.current.webkitRequestFullscreen();
        } else if (playerWrapperRef.current.msRequestFullscreen) {
          playerWrapperRef.current.msRequestFullscreen();
        }
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    }
  };

  if (!hasSomethingToPlay) {
    return <div className="video-wrapper empty">No video selected</div>;
  }

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  
  const getSizeStyles = () => {
    if (playerSize === 'small') return { width: '65%', margin: '0 auto' };
    return { width: '100%' };
  };

  return (
    <div 
      ref={playerWrapperRef}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        width: '100%',
        background: playerSize === 'wide' ? '#000' : 'transparent',
        padding: playerSize === 'wide' ? '20px' : '0',
        justifyContent: 'center'
      }}
    >
      
      {/* Video Container with anti-click overlay and custom play/pause */}
      <div 
        className={`video-wrapper ${loaded ? 'is-loaded' : 'is-loading'}`} 
        onContextMenu={(e) => e.preventDefault()}
        style={{ ...getSizeStyles(), transition: 'all 0.3s ease', position: 'relative' }}
      >
        {!loaded && <div className="video-loading">Loading video…</div>}
        <div ref={containerRef} />
        
        {/* Transparent Shield: blocks YouTube redirects AND handles Play/Pause clicks */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%', 
            pointerEvents: 'auto',
            background: 'transparent',
            zIndex: 10,
            cursor: 'pointer'
          }} 
          onClick={() => {
            if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
              const state = playerRef.current.getPlayerState();
              if (state === PLAYING) {
                playerRef.current.pauseVideo();
              } else {
                playerRef.current.playVideo();
              }
            }
          }}
        />
      </div>

      {/* Custom Controls Panel */}
      {loaded && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: '#0f172a', 
          padding: '10px 15px', 
          borderRadius: '8px',
          gap: '15px',
          maxWidth: playerSize === 'wide' ? '1200px' : 'none',
          margin: playerSize === 'wide' ? '0 auto' : '0',
          width: '100%'
        }}>
          
          {/* Speed Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Speed:</span>
            {speedOptions.map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                style={{
                  background: playbackRate === rate ? '#0ea5e9' : '#1e293b',
                  color: playbackRate === rate ? '#fff' : '#cbd5e1',
                  border: '1px solid',
                  borderColor: playbackRate === rate ? '#0ea5e9' : '#334155',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Size Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Size:</span>
            {['small', 'standard', 'wide'].map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                style={{
                  background: playerSize === size ? '#0ea5e9' : '#1e293b',
                  color: playerSize === size ? '#fff' : '#cbd5e1',
                  border: '1px solid',
                  borderColor: playerSize === size ? '#0ea5e9' : '#334155',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {size === 'wide' ? 'Fullscreen' : size}
              </button>
            ))}
          </div>
          
        </div>
      )}
    </div>
  );
}