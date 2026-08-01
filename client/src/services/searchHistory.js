const STORAGE_KEY = "novawear_recent_search";

export function saveRecentSearch(term) {
  const value = String(term || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!value || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ term: value, searchedAt: new Date().toISOString() }));
  } catch (_error) {
    // Browsing still works when storage is blocked by the browser.
  }
}

export function getRecentSearch() {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    const term = String(stored?.term || "").trim();
    return term ? { term, searchedAt: stored.searchedAt || null } : null;
  } catch (_error) {
    return null;
  }
}
