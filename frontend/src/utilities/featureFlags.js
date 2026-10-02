// Feature flags for staged rollouts. A flag is on when either:
//   - the build enables it for everyone: VITE_FF_<NAME>=true (e.g. VITE_FF_WATCHES_4G=true), or
//   - this browser enabled it: localStorage["vv.ff.<name>"] === "1".
// Developers turn a flag on or off by opening any page with ?ff=<name> or ?ff=-<name>
// (several: ?ff=watches4g,-other). This only hides UI; the API keeps its own role checks.

const FLAGS = {
  // All 4G watch screens: admin "4G Watches" page, patient "4G Watch" tab, registration picker.
  watches4g: { env: "VITE_FF_WATCHES_4G" },
};

const storageKey = (name) => `vv.ff.${name}`;
let urlApplied = false;

function applyFlagsFromUrl() {
  urlApplied = true;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ff");
    if (!raw) return;
    for (const token of raw.split(",")) {
      const off = token.startsWith("-");
      const name = token.replace(/^-/, "").trim();
      if (!FLAGS[name]) continue;
      if (off) localStorage.removeItem(storageKey(name));
      else localStorage.setItem(storageKey(name), "1");
    }
    params.delete("ff");                      // keep the address clean after applying it
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  } catch {
    // storage blocked (private mode etc.): flags just stay at their build defaults
  }
}

export function isFeatureEnabled(name) {
  if (!urlApplied) applyFlagsFromUrl();
  const flag = FLAGS[name];
  if (!flag) return false;
  if (String(import.meta.env[flag.env] ?? "").toLowerCase() === "true") return true;
  try {
    return localStorage.getItem(storageKey(name)) === "1";
  } catch {
    return false;
  }
}
