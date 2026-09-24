import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchSectionItems, fetchSectionResources } from '../firebase/firestoreApi';

const DEBOUNCE_MS = 400;
const MAX_SECTIONS_SCANNED = 40; // keeps a single search affordable

export function useCatalogSearch(sections, query) {
  const [itemResults, setItemResults] = useState([]);
  const [resourceResults, setResourceResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const cacheRef = useRef({ items: new Map(), resources: new Map() });
  const debounceRef = useRef(null);

  const trimmed = query.trim().toLowerCase();

  // Instant — no extra reads, just filters what's already loaded.
  const sectionResults = useMemo(() => {
    if (!trimmed) return [];
    return sections.filter(
      (s) =>
        s.title?.toLowerCase().includes(trimmed) || s.description?.toLowerCase().includes(trimmed)
    );
  }, [sections, trimmed]);

  // Deeper — lazily fetches each section's items/resources (cached
  // after first fetch) and filters those too, debounced so it only
  // fires once typing pauses.
  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (trimmed.length < 2) {
      setItemResults([]);
      setResourceResults([]);
      return undefined;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const matchedItems = [];
      const matchedResources = [];
      const candidates = sections.slice(0, MAX_SECTIONS_SCANNED);

      await Promise.all(
        candidates.map(async (section) => {
          if (!cacheRef.current.items.has(section.id)) {
            try {
              cacheRef.current.items.set(section.id, await fetchSectionItems(section.id));
            } catch {
              cacheRef.current.items.set(section.id, []);
            }
          }
          if (!cacheRef.current.resources.has(section.id)) {
            try {
              cacheRef.current.resources.set(section.id, await fetchSectionResources(section.id));
            } catch {
              cacheRef.current.resources.set(section.id, []);
            }
          }
          for (const item of cacheRef.current.items.get(section.id)) {
            if (item.title?.toLowerCase().includes(trimmed)) {
              matchedItems.push({ ...item, sectionId: section.id, sectionTitle: section.title });
            }
          }
          for (const resource of cacheRef.current.resources.get(section.id)) {
            if (resource.title?.toLowerCase().includes(trimmed)) {
              matchedResources.push({ ...resource, sectionId: section.id, sectionTitle: section.title });
            }
          }
        })
      );

      setItemResults(matchedItems.slice(0, 20));
      setResourceResults(matchedResources.slice(0, 20));
      setSearching(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [trimmed, sections]);

  return {
    sectionResults,
    itemResults,
    resourceResults,
    searching,
    active: trimmed.length > 0,
  };
}
