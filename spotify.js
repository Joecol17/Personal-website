// "Now playing" widget: shows what I'm listening to on Spotify.
// Spotify's own API needs a server to keep a secret token, which a static GitHub Pages site
// can't do, so this reads from Last.fm instead: Spotify scrobbles every track to Last.fm
// (Spotify → Settings → Apps → Last.fm), and Last.fm's API can be called straight from the browser.
(() => {
  // Fill these in to turn the widget on (see README → "Now playing")
  const LASTFM_USER = "";
  const LASTFM_API_KEY = "";

  const POLL_MS = 30000;
  const RECENT_MS = 6 * 60 * 60 * 1000; // show "Last played" for up to 6 hours after a track

  if (!LASTFM_USER || !LASTFM_API_KEY) return;

  const url =
    "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&format=json&limit=1" +
    "&user=" + encodeURIComponent(LASTFM_USER) +
    "&api_key=" + encodeURIComponent(LASTFM_API_KEY);

  const el = document.createElement("a");
  el.className = "np";
  el.target = "_blank";
  el.rel = "noopener";
  el.hidden = true;
  el.innerHTML =
    '<span class="np-art"><img alt="" width="44" height="44" decoding="async"></span>' +
    '<span class="np-body">' +
    '<span class="np-status mono"><span class="np-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="np-label"></span></span>' +
    '<span class="np-track"></span>' +
    '<span class="np-artist"></span>' +
    "</span>";
  document.body.appendChild(el);

  const img = el.querySelector("img");
  const label = el.querySelector(".np-label");
  const trackEl = el.querySelector(".np-track");
  const artistEl = el.querySelector(".np-artist");

  function ago(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    const h = Math.round(m / 60);
    return h + (h === 1 ? " hr ago" : " hrs ago");
  }

  function render(t) {
    const playing = t["@attr"] && t["@attr"].nowplaying === "true";
    const when = t.date ? Number(t.date.uts) * 1000 : 0;
    if (!playing && (!when || Date.now() - when > RECENT_MS)) {
      el.hidden = true;
      return;
    }
    const name = t.name || "";
    const artist = (t.artist && (t.artist["#text"] || t.artist.name)) || "";
    const art = (t.image || []).find((i) => i.size === "medium") || (t.image || [])[0];
    const src = art && art["#text"];

    el.classList.toggle("is-playing", playing);
    el.classList.toggle("no-art", !src);
    if (src && img.src !== src) img.src = src;
    label.textContent = playing ? "Now playing" : "Last played · " + ago(Date.now() - when);
    trackEl.textContent = name;
    artistEl.textContent = artist;
    el.href = t.url || "https://www.last.fm/user/" + encodeURIComponent(LASTFM_USER);
    el.title = name + " — " + artist;
    el.setAttribute("aria-label", (playing ? "Now playing: " : "Last played: ") + name + " by " + artist);
    el.hidden = false;
  }

  let timer = 0;
  async function poll() {
    clearTimeout(timer);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const tracks = data.recenttracks && data.recenttracks.track;
      const t = Array.isArray(tracks) ? tracks[0] : tracks;
      if (t) render(t);
      else el.hidden = true;
    } catch (e) {
      // Leave whatever was showing; try again next time
    }
    if (!document.hidden) timer = setTimeout(poll, POLL_MS);
  }

  // Only poll while the tab is visible
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearTimeout(timer);
    else poll();
  });

  poll();
})();
