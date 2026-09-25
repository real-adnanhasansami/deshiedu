// Given any link a user pastes in, work out which platform it's from
// and, for YouTube, pull out the embeddable video id (and/or playlist
// id). Used by the seed script, the "add a link" forms, and search.

export function parseVideoLink(rawUrl) {
  let sourceType = 'other';
  let videoId = null;
  let playlistId = null;

  const trimmed = (rawUrl || '').trim();
  // People often paste/type links without "https://" (e.g.
  // "youtube.com/watch?v=..."). `new URL()` throws on that, which
  // used to silently fall through to 'other' — treating a perfectly
  // good YouTube link as an external one. Add a scheme if it's
  // missing before parsing.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/+$/, ''); // drop trailing slash(es)

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      sourceType = 'youtube';
      playlistId = parsed.searchParams.get('list') || null;

      if (parsed.searchParams.get('v')) {
        videoId = parsed.searchParams.get('v');
      } else if (path.startsWith('/shorts/')) {
        videoId = path.split('/shorts/')[1];
      } else if (path.startsWith('/embed/')) {
        videoId = path.split('/embed/')[1];
      } else if (path.startsWith('/live/')) {
        videoId = path.split('/live/')[1];
      }
      // A bare "/playlist?list=..." link has no specific video at
      // all — playlistId above already covers it, videoId stays null.
    } else if (host === 'youtu.be') {
      sourceType = 'youtube';
      videoId = path.slice(1) || null;
      playlistId = parsed.searchParams.get('list') || null;
    } else if (host.includes('udemy.com')) {
      sourceType = 'udemy';
    } else if (host.includes('coursera.org')) {
      sourceType = 'coursera';
    }

    // Belt-and-braces: an id should never carry extra query params or
    // path segments if one of the branches above slipped through with
    // something messier than expected.
    if (videoId) videoId = videoId.split(/[?&/]/)[0] || null;
    if (playlistId) playlistId = playlistId.split(/[?&/]/)[0] || null;
  } catch {
    // Genuinely not parseable as a URL even with a scheme added —
    // leave as 'other' with no videoId/playlistId.
  }

  return { sourceType, videoId, playlistId };
}

export const SOURCE_LABELS = {
  youtube: 'YouTube',
  udemy: 'Udemy',
  coursera: 'Coursera',
  other: 'External Link',
};

// Single source of truth for turning a YouTube video id into a
// thumbnail URL — used for auto-extracted section covers, live
// previews while pasting a link, and Private Space video cards.
export function getYoutubeThumbnail(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

// YouTube has no public, key-free endpoint for a real playlist cover
// image (that needs the Data API + an API key, which this project
// doesn't have — see PROGRESS.md). Being honest about that limit: a
// playlist-only link gets a fixed icon in the UI instead of a real
// thumbnail, rather than a fake image URL that would just 404.
export const PLAYLIST_ICON = '🎞️';
