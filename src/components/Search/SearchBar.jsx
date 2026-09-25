import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalogSearch } from '../../hooks/useCatalogSearch';
import { parseVideoLink } from '../../utils/linkParser';

export default function SearchBar({ sections }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const { sectionResults, itemResults, resourceResults, searching, active } = useCatalogSearch(
    sections,
    query
  );

  const showResults = focused && active;
  const nothingFound =
    !searching && sectionResults.length === 0 && itemResults.length === 0 && resourceResults.length === 0;

  return (
    <div className="search-bar-wrap">
      <div className="search-bar">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Search videos, playlists, courses, and resources…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </div>

      {showResults && (
        <div className="search-results">
          {nothingFound && <p className="search-empty">No matches for "{query}"</p>}

          {sectionResults.length > 0 && (
            <>
              <p className="search-group-label">Sections</p>
              {sectionResults.map((s) => (
                <Link key={s.id} to={`/section/${s.id}`} className="search-result-row">
                  <span className="search-result-title">{s.title}</span>
                  <span className="search-result-meta">{s.itemCount ?? 0} items</span>
                </Link>
              ))}
            </>
          )}

          {itemResults.length > 0 && (
            <>
              <p className="search-group-label">Videos &amp; Links</p>
              {itemResults.map((item) => {
                const effective = parseVideoLink(item.url);
                const to =
                  effective.sourceType === 'youtube' && effective.videoId
                    ? `/video/${effective.videoId}?title=${encodeURIComponent(item.title)}&section=${item.sectionId}&sectionTitle=${encodeURIComponent(item.sectionTitle)}`
                    : `/section/${item.sectionId}`;
                return (
                  <Link key={`${item.sectionId}-${item.id}`} to={to} className="search-result-row">
                    <span className="search-result-title">{item.title}</span>
                    <span className="search-result-meta">in {item.sectionTitle}</span>
                  </Link>
                );
              })}
            </>
          )}

          {resourceResults.length > 0 && (
            <>
              <p className="search-group-label">Resources</p>
              {resourceResults.map((resource) => (
                <Link
                  key={`${resource.sectionId}-${resource.id}`}
                  to={`/section/${resource.sectionId}`}
                  className="search-result-row"
                >
                  <span className="search-result-title">{resource.title}</span>
                  <span className="search-result-meta">in {resource.sectionTitle}</span>
                </Link>
              ))}
            </>
          )}

          {searching && <p className="search-empty">Searching…</p>}
        </div>
      )}
    </div>
  );
}
