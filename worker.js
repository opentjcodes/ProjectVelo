/**
 * ProjectVelo v3.0 — High-Retention Zero-Buffer Streaming Cloudflare Worker
 * Target URL: https://projectvelo.tjcodewizard.workers.dev/
 *
 * Features:
 * - Zero-Buffer Audio & Byte-Range (HTTP 206) Streaming (/stream)
 * - Auto-Healing Bitrate Fallback (_320.mp4 -> _160.mp4 -> _96.mp4)
 * - Edge-Cached 500x500 Cover Art for Canvas Color Extraction
 * - Deep Album + Playlist + Token Resolver (/album & auto-intercepted content.getAlbumDetails)
 * - Endless Autoplay Recommendations (/reco) & Launch Home Feed (/home)
 * - Soundbound Repository & Zipline Manifest NDJSON Streamer (/collect & /terms)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Upstream-Status, X-Upstream-Url, X-Cache-Status"
};

const SAAVN_API_BASE = "https://www.jiosaavn.com/api.php";
const SAAVN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
  "Referer": "https://www.jiosaavn.com/",
  "Cookie": "L=english%2Chindi%2Cpunjabi; gdpr_acceptance=true; DL=english"
};

// ============================================================================
// 1. PURE-JS DES-ECB DECRYPTOR (JioSaavn encrypted_media_url -> 320kbps MP4)
// ============================================================================
const DES_IP = [
  58,50,42,34,26,18,10,2, 60,52,44,36,28,20,12,4,
  62,54,46,38,30,22,14,6, 64,56,48,40,32,24,16,8,
  57,49,41,33,25,17,9,1,  59,51,43,35,27,19,11,3,
  61,53,45,37,29,21,13,5, 63,55,47,39,31,23,15,7
];
const DES_FP = [
  40,8,48,16,56,24,64,32, 39,7,47,15,55,23,63,31,
  38,6,46,14,54,22,62,30, 37,5,45,13,53,21,61,29,
  36,4,44,12,52,20,60,28, 35,3,43,11,51,19,59,27,
  34,2,42,10,50,18,58,26, 33,1,41,9,49,17,57,25
];
const DES_PC1 = [
  57,49,41,33,25,17,9,  1,58,50,42,34,26,18,
  10,2,59,51,43,35,27,  19,11,3,60,52,44,36,
  63,55,47,39,31,23,15, 7,62,54,46,38,30,22,
  14,6,61,53,45,37,29,  21,13,5,28,20,12,4
];
const DES_PC2 = [
  14,17,11,24,1,5,   3,28,15,6,21,10,
  23,19,12,4,26,8,   16,7,27,20,13,2,
  41,52,31,37,47,55, 30,40,51,45,33,48,
  44,49,39,56,34,53, 46,42,50,36,29,32
];
const DES_E = [
  32,1,2,3,4,5,     4,5,6,7,8,9,
  8,9,10,11,12,13,  12,13,14,15,16,17,
  16,17,18,19,20,21,20,21,22,23,24,25,
  24,25,26,27,28,29,28,29,30,31,32,1
];
const DES_P = [
  16,7,20,21,29,12,28,17, 1,15,23,26,5,18,31,10,
  2,8,24,14,32,27,3,9,    19,13,30,6,22,11,4,25
];
const DES_SHIFTS = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];
const DES_SBOX = [
  [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7, 0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8, 4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0, 15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
  [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10, 3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5, 0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15, 13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
  [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8, 13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1, 13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7, 1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
  [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15, 13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9, 10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4, 3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
  [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9, 14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6, 4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14, 11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
  [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11, 10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8, 9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6, 4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
  [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1, 13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6, 1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2, 6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
  [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7, 1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2, 7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8, 2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
];

const SA_SUBKEYS = (() => {
  const keyStr = "38346591";
  const keyBits = [];
  for (let i = 0; i < 8; i++) {
    const c = keyStr.charCodeAt(i);
    for (let b = 7; b >= 0; b--) keyBits.push((c >> b) & 1);
  }
  let c = DES_PC1.slice(0, 28).map(p => keyBits[p - 1]);
  let d = DES_PC1.slice(28, 56).map(p => keyBits[p - 1]);
  const subkeys = [];
  for (let round = 0; round < 16; round++) {
    const s = DES_SHIFTS[round];
    c = c.slice(s).concat(c.slice(0, s));
    d = d.slice(s).concat(d.slice(0, s));
    const cd = c.concat(d);
    subkeys.push(DES_PC2.map(p => cd[p - 1]));
  }
  return subkeys.reverse();
})();

function decryptSaavnMediaUrl(encryptedBase64, has320 = true) {
  if (!encryptedBase64 || typeof encryptedBase64 !== "string") return null;
  try {
    const raw = atob(encryptedBase64.trim());
    const outBytes = [];
    for (let offset = 0; offset < raw.length; offset += 8) {
      const blockBits = [];
      for (let i = 0; i < 8; i++) {
        const byte = raw.charCodeAt(offset + i) || 0;
        for (let b = 7; b >= 0; b--) blockBits.push((byte >> b) & 1);
      }
      const ip = DES_IP.map(p => blockBits[p - 1]);
      let L = ip.slice(0, 32);
      let R = ip.slice(32, 64);

      for (let r = 0; r < 16; r++) {
        const expR = DES_E.map(p => R[p - 1]);
        const xored = expR.map((bit, idx) => bit ^ SA_SUBKEYS[r][idx]);
        const sOut = [];
        for (let box = 0; box < 8; box++) {
          const chunk = xored.slice(box * 6, box * 6 + 6);
          const row = (chunk[0] << 1) | chunk[5];
          const col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
          const val = DES_SBOX[box][row * 16 + col];
          sOut.push((val >> 3) & 1, (val >> 2) & 1, (val >> 1) & 1, val & 1);
        }
        const fRes = DES_P.map(p => sOut[p - 1]);
        const nextR = L.map((bit, idx) => bit ^ fRes[idx]);
        L = R;
        R = nextR;
      }

      const preFp = R.concat(L);
      const fp = DES_FP.map(p => preFp[p - 1]);
      for (let i = 0; i < 8; i++) {
        let byteVal = 0;
        for (let b = 0; b < 8; b++) byteVal = (byteVal << 1) | fp[i * 8 + b];
        outBytes.push(byteVal);
      }
    }

    const padLen = outBytes[outBytes.length - 1];
    const validLen = (padLen > 0 && padLen <= 8) ? outBytes.length - padLen : outBytes.length;
    let url = String.fromCharCode(...outBytes.slice(0, validLen)).trim();
    if (!url.startsWith("http")) return null;
    url = url.replace(/^http:\/\//i, "https://");
    return has320
      ? url.replace(/_96\.mp4|_160\.mp4/g, "_320.mp4")
      : url.replace(/_96\.mp4/g, "_160.mp4");
  } catch {
    return null;
  }
}

// ============================================================================
// 2. HELPERS: ENTITY DECODING, JSON SANITIZER & SONG/ALBUM NORMALIZERS
// ============================================================================
function cleanText(str) {
  if (!str) return "";
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function upgradeImage(imgUrl) {
  if (!imgUrl) return "";
  return String(imgUrl)
    .replace(/50x50|150x150/g, "500x500")
    .replace(/^http:\/\//i, "https://");
}

function proxyImg(imgUrl, origin) {
  const hi = upgradeImage(imgUrl);
  return hi ? `${origin}/stream?url=${encodeURIComponent(hi)}` : "";
}

async function fetchSaavnJson(queryParamsObj) {
  const qs = new URLSearchParams({
    _format: "json",
    _marker: "0",
    cc: "in",
    ctx: "web6dot0",
    ...queryParamsObj
  });
  const targetUrl = `${SAAVN_API_BASE}?${qs.toString()}`;
  const res = await fetch(targetUrl, { headers: SAAVN_HEADERS });
  if (!res.ok) throw new Error(`Saavn HTTP ${res.status}`);
  const rawText = (await res.text()).trim();

  // Strip any accidental JSONP/comment wrapper
  const firstBrace = rawText.indexOf("{");
  const firstBracket = rawText.indexOf("[");
  let startIdx = -1;
  let endChar = "}";
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endChar = "}";
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endChar = "]";
  }
  const cleanJson = startIdx > 0
    ? rawText.slice(startIdx, rawText.lastIndexOf(endChar) + 1)
    : rawText;

  return JSON.parse(cleanJson);
}

/**
 * Enriches a raw JioSaavn song (from either v3 or v4 API) so both OpenMuse
 * and Soundbound clients receive pre-decrypted 320kbps URLs & normalized fields.
 */
function enrichSaavnSong(s, origin) {
  if (!s || typeof s !== "object") return s;
  const more = s.more_info || {};
  const enc = more.encrypted_media_url || s.encrypted_media_url;
  const has320 = String(more["320kbps"] ?? s["320kbps"] ?? "true") === "true";

  let directUrl = decryptSaavnMediaUrl(enc, has320);
  if (!directUrl) {
    const preview = more.media_preview_url || s.media_preview_url;
    if (preview) {
      directUrl = String(preview)
        .replace("preview.saavncdn.com", "aac.saavncdn.com")
        .replace("_96_p.mp4", has320 ? "_320.mp4" : "_160.mp4");
    }
  }

  let primaryArtists = "";
  if (more.artistMap?.primary_artists?.length) {
    primaryArtists = more.artistMap.primary_artists.map(a => cleanText(a.name)).join(", ");
  } else if (Array.isArray(more.primary_artists)) {
    primaryArtists = more.primary_artists.map(a => cleanText(a.name || a)).join(", ");
  } else {
    primaryArtists = cleanText(more.primary_artists || s.primary_artists || more.music || s.subtitle || "Unknown Artist");
  }

  const hiResImg = upgradeImage(s.image || s.coverUrl);
  const albumTitle = cleanText(more.album || s.album || "OpenMuse");
  const albumId = more.album_id || s.album_id || null;
  const durationSec = parseInt(more.duration || s.duration || "0", 10) || 0;
  const workerStream = directUrl ? `${origin}/stream?url=${encodeURIComponent(directUrl)}` : null;

  return {
    ...s,
    id: String(s.id),
    type: "song",
    itemType: "song",
    title: cleanText(s.title || s.song || "Untitled"),
    artist: primaryArtists,
    subtitle: primaryArtists,
    album: albumTitle,
    albumId: albumId ? String(albumId) : null,
    duration: durationSec,
    image: hiResImg,
    coverUrl: proxyImg(hiResImg, origin),
    encrypted_media_url: enc || "",
    decrypted_media_url: directUrl,
    streamUrl: workerStream,
    more_info: {
      ...more,
      encrypted_media_url: enc || "",
      "320kbps": has320 ? "true" : "false",
      album: albumTitle,
      album_id: albumId ? String(albumId) : null,
      primary_artists: primaryArtists,
      duration: String(durationSec)
    },
    DownloadQueryResult: directUrl ? {
      url: directUrl,
      workerStreamUrl: workerStream,
      audioFormat: "MP4",
      audioQuality: has320 ? "KBPS320" : "KBPS160",
      fallbacks: {
        kbps320: directUrl.replace(/_96\.mp4|_160\.mp4/g, "_320.mp4"),
        kbps160: directUrl.replace(/_96\.mp4|_320\.mp4/g, "_160.mp4"),
        kbps96: directUrl.replace(/_160\.mp4|_320\.mp4/g, "_96.mp4")
      }
    } : null
  };
}

function enrichSaavnAlbum(a, origin) {
  if (!a || typeof a !== "object") return a;
  const more = a.more_info || {};
  let artist = "";
  if (more.artistMap?.primary_artists?.length) {
    artist = more.artistMap.primary_artists.map(x => cleanText(x.name)).join(", ");
  } else {
    artist = cleanText(more.music || a.primary_artists || a.music || a.subtitle || "Album");
  }
  const hiResImg = upgradeImage(a.image);
  const id = String(a.id || a.albumid || a.listid || "");

  return {
    ...a,
    id,
    albumid: id,
    type: a.type === "playlist" ? "playlist" : "album",
    itemType: "album",
    title: cleanText(a.title || a.name || "Album"),
    name: cleanText(a.title || a.name || "Album"),
    artist,
    subtitle: artist,
    year: String(a.year || more.year || ""),
    image: hiResImg,
    coverUrl: proxyImg(hiResImg, origin),
    songCount: parseInt(more.song_count || a.more_info?.song_count || "0", 10) || undefined,
    workerAlbumUrl: `${origin}/album?id=${encodeURIComponent(id)}`
  };
}

// ============================================================================
// 3. DEEP ALBUM & PLAYLIST RESOLVER (Never fails on v3/v4/Playlist/Token)
// ============================================================================
async function resolveCompleteAlbum(albumIdOrToken, origin) {
  const cleanId = String(albumIdOrToken || "").trim();
  if (!cleanId) throw new Error("Missing album ID");

  let albumPayload = null;
  let rawTrackList = [];

  // Step 1: If a full URL or alphanumeric token was passed, extract token and try webapi.get
  const isNumeric = /^\d+$/.test(cleanId);
  if (!isNumeric) {
    const token = cleanId.split("/").filter(Boolean).pop();
    try {
      const tokenData = await fetchSaavnJson({
        __call: "webapi.get",
        api_version: "4",
        token,
        type: "album"
      });
      if (tokenData && (Array.isArray(tokenData.list) || Array.isArray(tokenData.songs))) {
        albumPayload = tokenData;
        rawTrackList = tokenData.list || tokenData.songs || [];
      }
    } catch {}
  }

  // Step 2: Try v4 content.getAlbumDetails
  if (rawTrackList.length === 0 && isNumeric) {
    try {
      const v4Data = await fetchSaavnJson({
        __call: "content.getAlbumDetails",
        api_version: "4",
        albumid: cleanId
      });
      if (v4Data && (Array.isArray(v4Data.list) || Array.isArray(v4Data.songs))) {
        albumPayload = v4Data;
        rawTrackList = v4Data.list || v4Data.songs || [];
      }
    } catch {}
  }

  // Step 3: Fallback to v3 content.getAlbumDetails (without api_version=4)
  if (rawTrackList.length === 0 && isNumeric) {
    try {
      const v3Data = await fetchSaavnJson({
        __call: "content.getAlbumDetails",
        albumid: cleanId
      });
      if (v3Data && (Array.isArray(v3Data.songs) || Array.isArray(v3Data.list))) {
        albumPayload = v3Data;
        rawTrackList = v3Data.songs || v3Data.list || [];
      }
    } catch {}
  }

  // Step 4: Fallback to Playlist / Chart resolver (if the ID is actually a playlist listid!)
  if (rawTrackList.length === 0 && isNumeric) {
    try {
      const plData = await fetchSaavnJson({
        __call: "playlist.getDetails",
        api_version: "4",
        listid: cleanId
      });
      if (plData && (Array.isArray(plData.list) || Array.isArray(plData.songs))) {
        albumPayload = plData;
        rawTrackList = plData.list || plData.songs || [];
      }
    } catch {}
  }

  if (!albumPayload) {
    albumPayload = { id: cleanId, title: "Album", songs: [], list: [] };
  }

  // Step 5: Heal any tracks inside the album that are missing encrypted_media_url
  const missingPids = rawTrackList
    .filter(t => t && t.id && !(t.more_info?.encrypted_media_url || t.encrypted_media_url))
    .map(t => t.id);

  if (missingPids.length > 0) {
    try {
      const batchData = await fetchSaavnJson({
        __call: "song.getDetails",
        pids: missingPids.join(",")
      });
      const lookup = batchData.songs
        ? Object.fromEntries(batchData.songs.map(s => [String(s.id), s]))
        : batchData;
      rawTrackList = rawTrackList.map(t => lookup?.[String(t.id)] || t);
    } catch {}
  }

  // Step 6: Enrich every track in the album & attach both `songs` and `list` for 100% compatibility
  const enrichedSongs = rawTrackList
    .map(s => enrichSaavnSong(s, origin))
    .filter(s => s && (s.decrypted_media_url || s.id));

  // Step 7: Fetch related albums (`reco.getAlbumReco`) in parallel for user retention
  let relatedAlbums = [];
  if (isNumeric) {
    try {
      const recoRes = await fetchSaavnJson({
        __call: "reco.getAlbumReco",
        api_version: "4",
        albumid: cleanId
      });
      if (Array.isArray(recoRes)) {
        relatedAlbums = recoRes.slice(0, 8).map(a => enrichSaavnAlbum(a, origin));
      }
    } catch {}
  }

  const normalizedAlbum = enrichSaavnAlbum(albumPayload, origin);

  return {
    ...normalizedAlbum,
    song_count: enrichedSongs.length,
    songs: enrichedSongs, // Used by v3 & OpenMuse client
    list: enrichedSongs,  // Used by v4 clients
    relatedAlbums
  };
}

// ============================================================================
// 4. MAIN CLOUDFLARE WORKER ENTRYPOINT
// ============================================================================
export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ROUTE 1: ZERO-BUFFER STREAMING PROXY & AUTO-ENHANCER (/stream?url=...)
      if (path === "/stream" || path === "/proxy" || url.searchParams.has("streamUrl")) {
        const target = url.searchParams.get("url") || url.searchParams.get("streamUrl");
        return await handleSmartStream(request, target, url.origin, ctx);
      }

      // ROUTE 2: DEEP ALBUM & PLAYLIST RESOLVER (/album?id=...)
      if (path === "/album") {
        const albumId = url.searchParams.get("id") || url.searchParams.get("albumid") || url.searchParams.get("token");
        return await withEdgeCache(request, ctx, 1800, async () => {
          const data = await resolveCompleteAlbum(albumId, url.origin);
          return jsonResponse(data);
        });
      }

      // ROUTE 3: SINGLE OR BATCH SONG RESOLVER (/song?id=...)
      if (path === "/song") {
        const pids = url.searchParams.get("id") || url.searchParams.get("pids");
        if (!pids) return jsonResponse({ error: "Missing ?id= parameter" }, 400);
        return await withEdgeCache(request, ctx, 1800, async () => {
          const data = await fetchSaavnJson({ __call: "song.getDetails", pids });
          const rawList = Array.isArray(data?.songs)
            ? data.songs
            : Object.values(data || {}).filter(v => v && typeof v === "object" && v.id);
          const songs = rawList.map(s => enrichSaavnSong(s, url.origin));
          return jsonResponse({ songs, track: songs[0] || null });
        });
      }

      // ROUTE 4: AUTOPLAY / ENDLESS RETENTION RECOMMENDATIONS (/reco?id=<songId>)
      if (path === "/reco") {
        const pid = url.searchParams.get("id") || url.searchParams.get("pid");
        if (!pid) return jsonResponse({ error: "Missing ?id=<songId>" }, 400);
        return await withEdgeCache(request, ctx, 900, async () => {
          const rawReco = await fetchSaavnJson({
            __call: "reco.getreco",
            api_version: "4",
            pid,
            language: url.searchParams.get("lang") || "english,hindi"
          });
          const songs = (Array.isArray(rawReco) ? rawReco : [])
            .map(s => enrichSaavnSong(s, url.origin))
            .filter(s => s.decrypted_media_url);
          return jsonResponse({ pid, count: songs.length, songs });
        });
      }

      // ROUTE 5: CURATED HOME & LAUNCH FEED (/home)
      if (path === "/home") {
        return await withEdgeCache(request, ctx, 900, async () => {
          const trendingData = await fetchSaavnJson({
            __call: "content.getTrending",
            api_version: "4",
            entity_type: "song",
            entity_language: url.searchParams.get("lang") || "english,hindi"
          });
          const items = Array.isArray(trendingData) ? trendingData : [];
          const songs = items
            .filter(x => x.type === "song" || x.more_info?.encrypted_media_url)
            .map(s => enrichSaavnSong(s, url.origin));
          const albums = items
            .filter(x => x.type === "album" || x.type === "playlist")
            .map(a => enrichSaavnAlbum(a, url.origin));
          return jsonResponse({ songs, albums });
        });
      }

      // ROUTE 6: UNIFIED OR NDJSON SEARCH (/search?q=...)
      if (path === "/search") {
        return await handleSearchRoute(request, url, ctx);
      }

      // ROUTE 7: SYNCED LYRICS (/lyrics?q=...&id=...)
      if (path === "/lyrics") {
        return await handleLyricsRoute(url);
      }

      // Default Status / Documentation
      return jsonResponse({
        service: "ProjectVelo v3.0 — OpenMuse & Soundbound Streaming Worker",
        status: "online",
        endpoints: {
          stream: `${url.origin}/stream?url=<target_audio_image_or_api_url>`,
          home: `${url.origin}/home?lang=english,hindi`,
          search: `${url.origin}/search?q=The+Weeknd&format=json`,
          album: `${url.origin}/album?id=<albumId_or_playlistId_or_token>`,
          song: `${url.origin}/song?id=<songId>`,
          reco: `${url.origin}/reco?id=<songId>`,
          lyrics: `${url.origin}/lyrics?q=Starboy+The+Weeknd`
        }
      });

    } catch (err) {
      return jsonResponse({
        error: "ThrowableWrapper",
        message: err.message || String(err)
      }, 500);
    }
  }
};

// ============================================================================
// 5. SMART ZERO-BUFFER STREAM HANDLER WITH AUTO-HEALING & EDGE CACHE
// ============================================================================
async function handleSmartStream(request, targetUrl, origin, ctx) {
  if (!targetUrl) {
    return jsonResponse({ error: "Missing ?url= parameter" }, 400);
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return jsonResponse({ error: "Invalid target URL" }, 400);
  }

  const host = parsedTarget.hostname.toLowerCase();

  // A. AUTO-INTERCEPT JIOSAAVN API CALLS MADE THROUGH /stream?url=...
  // This upgrades OpenMuse's existing album & search calls automatically on the edge!
  if (host.includes("jiosaavn.com") && parsedTarget.pathname.includes("api.php")) {
    const callType = parsedTarget.searchParams.get("__call") || "";

    // Upgrade Album Details calls automatically so albums never fail or miss tracks!
    if (callType === "content.getAlbumDetails") {
      const albumId = parsedTarget.searchParams.get("albumid") || parsedTarget.searchParams.get("id");
      return await withEdgeCache(request, ctx, 1800, async () => {
        const enrichedAlbum = await resolveCompleteAlbum(albumId, origin);
        return jsonResponse(enrichedAlbum);
      });
    }

    // Upgrade Song Search & Album Search calls with edge caching & entity cleanup
    if (callType === "search.getResults" || callType === "search.getAlbumResults" || callType === "song.getDetails") {
      return await withEdgeCache(request, ctx, 900, async () => {
        const res = await fetch(parsedTarget.toString(), { headers: SAAVN_HEADERS });
        const text = (await res.text()).trim();
        const start = text.indexOf("{");
        const clean = start > 0 ? text.slice(start, text.lastIndexOf("}") + 1) : text;
        const data = JSON.parse(clean);

        if (callType === "search.getResults" && Array.isArray(data.results)) {
          data.results = data.results.map(s => enrichSaavnSong(s, origin));
        } else if (callType === "search.getAlbumResults" && Array.isArray(data.results)) {
          data.results = data.results.map(a => enrichSaavnAlbum(a, origin));
        }
        return jsonResponse(data);
      });
    }
  }

  // B. EDGE CACHE FOR COVER ART IMAGES (7-Day Immutable Edge Cache -> 5ms load)
  const isImage = /\.(jpg|jpeg|png|webp|svg|avif)(\?.*)?$/i.test(parsedTarget.pathname) || host.includes("c.saavncdn.com") || host.includes("sop.saavncdn.com");
  if (isImage && request.method === "GET" && !request.headers.has("Range")) {
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: "GET" });
    const cachedImg = await cache.match(cacheKey);
    if (cachedImg) {
      const hitHeaders = new Headers(cachedImg.headers);
      for (const [k, v] of Object.entries(CORS_HEADERS)) hitHeaders.set(k, v);
      hitHeaders.set("X-Cache-Status", "HIT");
      return new Response(cachedImg.body, { status: cachedImg.status, headers: hitHeaders });
    }

    const imgRes = await fetch(parsedTarget.toString(), {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": parsedTarget.origin + "/"
      }
    });

    if (imgRes.ok && imgRes.body) {
      const imgHeaders = new Headers(CORS_HEADERS);
      imgHeaders.set("Content-Type", imgRes.headers.get("Content-Type") || "image/jpeg");
      imgHeaders.set("Cache-Control", "public, max-age=604800, immutable");
      imgHeaders.set("X-Cache-Status", "MISS");

      const [streamForCache, streamForClient] = imgRes.body.tee();
      ctx.waitUntil(cache.put(cacheKey, new Response(streamForCache, { status: 200, headers: imgHeaders })));
      return new Response(streamForClient, { status: 200, headers: imgHeaders });
    }
  }

  // C. ZERO-BUFFER AUDIO & RAW FILE STREAMING WITH AUTO-BITRATE HEALING
  const upstreamHeaders = new Headers({
    "User-Agent": SAAVN_HEADERS["User-Agent"],
    "Accept": request.headers.get("Accept") || "*/*",
    "Referer": parsedTarget.origin + "/"
  });

  if (request.headers.has("Range")) {
    upstreamHeaders.set("Range", request.headers.get("Range"));
  }
  if (request.headers.has("If-Range")) {
    upstreamHeaders.set("If-Range", request.headers.get("If-Range"));
  }

  let targetFetchUrl = parsedTarget.toString();
  let upstreamRes = await fetch(targetFetchUrl, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: upstreamHeaders,
    redirect: "follow"
  });

  // Auto-Heal JioSaavn Audio Streams if _320.mp4 is missing on the CDN
  if (!upstreamRes.ok && host.includes("saavncdn.com") && targetFetchUrl.includes("_320.mp4")) {
    const fallback160 = targetFetchUrl.replace("_320.mp4", "_160.mp4");
    upstreamRes = await fetch(fallback160, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: upstreamHeaders,
      redirect: "follow"
    });
    if (!upstreamRes.ok) {
      const fallback96 = targetFetchUrl.replace("_320.mp4", "_96.mp4");
      upstreamRes = await fetch(fallback96, {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: upstreamHeaders,
        redirect: "follow"
      });
    }
  }

  const resHeaders = new Headers(CORS_HEADERS);
  const forwardHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
    "last-modified"
  ];

  for (const h of forwardHeaders) {
    if (upstreamRes.headers.has(h)) {
      resHeaders.set(h, upstreamRes.headers.get(h));
    }
  }

  if (!resHeaders.has("accept-ranges")) {
    resHeaders.set("Accept-Ranges", "bytes");
  }
  resHeaders.set("X-Upstream-Status", String(upstreamRes.status));
  resHeaders.set("X-Upstream-Url", upstreamRes.url || targetFetchUrl);

  if (!upstreamRes.body) {
    return new Response(null, { status: upstreamRes.status, headers: resHeaders });
  }

  // Zero-buffer pipe directly from upstream socket to browser
  const { readable, writable } = new TransformStream();
  upstreamRes.body.pipeTo(writable).catch(() => {});

  return new Response(readable, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders
  });
}

// ============================================================================
// 6. UNIFIED & NDJSON SEARCH ROUTE (/search)
// ============================================================================
async function handleSearchRoute(request, url, ctx) {
  const q = (url.searchParams.get("q") || url.searchParams.get("trackName") || "Trending").trim();
  const format = url.searchParams.get("format") || "ndjson";

  if (format === "json") {
    return await withEdgeCache(request, ctx, 600, async () => {
      const [sData, aData] = await Promise.allSettled([
        fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "24", p: "1", q }),
        fetchSaavnJson({ __call: "search.getAlbumResults", api_version: "4", n: "14", p: "1", q })
      ]);

      const songs = sData.status === "fulfilled" && Array.isArray(sData.value?.results)
        ? sData.value.results.map(s => enrichSaavnSong(s, url.origin))
        : [];
      const albums = aData.status === "fulfilled" && Array.isArray(aData.value?.results)
        ? aData.value.results.map(a => enrichSaavnAlbum(a, url.origin))
        : [];

      return jsonResponse({ query: q, songs, albums });
    });
  }

  // Default NDJSON Streaming Search
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const writeLine = async (obj) => writer.write(encoder.encode(JSON.stringify(obj) + "\n"));

  ctx.waitUntil((async () => {
    try {
      const [sData, aData] = await Promise.allSettled([
        fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "24", p: "1", q }),
        fetchSaavnJson({ __call: "search.getAlbumResults", api_version: "4", n: "14", p: "1", q })
      ]);

      if (sData.status === "fulfilled" && Array.isArray(sData.value?.results)) {
        for (const s of sData.value.results) {
          await writeLine({ event: "TrackDetails", source_name: "SaavnProvider", data: enrichSaavnSong(s, url.origin) });
        }
      }
      if (aData.status === "fulfilled" && Array.isArray(aData.value?.results)) {
        for (const a of aData.value.results) {
          await writeLine({ event: "AlbumDetails", source_name: "SaavnProvider", data: enrichSaavnAlbum(a, url.origin) });
        }
      }
      await writeLine({ event: "done", timestamp: Date.now() });
    } catch (e) {
      await writeLine({ event: "error", message: e.message });
    } finally {
      await writer.close();
    }
  })());

  return new Response(readable, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

// ============================================================================
// 7. SYNCED LYRICS RESOLVER (/lyrics)
// ============================================================================
async function handleLyricsRoute(url) {
  const q = url.searchParams.get("q") || "";
  const songId = url.searchParams.get("id") || "";

  if (q) {
    try {
      const lrcRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
        headers: { "User-Agent": "OpenMuse-Worker/3.0" }
      });
      if (lrcRes.ok) {
        const list = await lrcRes.json();
        if (Array.isArray(list) && list.length > 0) {
          const best = list.find(i => i.syncedLyrics) || list[0];
          return jsonResponse({
            source: "LrcLibProvider",
            syncedLyrics: best.syncedLyrics || null,
            plainLyrics: best.plainLyrics || null
          });
        }
      }
    } catch {}
  }

  if (songId) {
    try {
      const saavnLyrics = await fetchSaavnJson({
        __call: "lyrics.getLyrics",
        api_version: "4",
        lyrics_id: songId
      });
      if (saavnLyrics?.lyrics) {
        return jsonResponse({
          source: "SaavnProvider",
          syncedLyrics: null,
          plainLyrics: saavnLyrics.lyrics.replace(/<br\s*\/?>/gi, "\n")
        });
      }
    } catch {}
  }

  return jsonResponse({ error: "NoMatchFound", syncedLyrics: null, plainLyrics: null }, 404);
}

// ============================================================================
// 8. EDGE CACHE & JSON UTILITIES
// ============================================================================
function jsonResponse(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

async function withEdgeCache(request, ctx, ttlSeconds, computeFn) {
  if (request.method !== "GET") return await computeFn();
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    headers.set("X-Cache-Status", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const freshRes = await computeFn();
  if (freshRes.status === 200) {
    const cacheHeaders = new Headers(freshRes.headers);
    cacheHeaders.set("Cache-Control", `public, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`);
    cacheHeaders.set("X-Cache-Status", "MISS");
    const cloned = new Response(freshRes.clone().body, { status: 200, headers: cacheHeaders });
    ctx.waitUntil(cache.put(cacheKey, cloned));
    return new Response(freshRes.body, { status: 200, headers: cacheHeaders });
  }

  return freshRes;
}
