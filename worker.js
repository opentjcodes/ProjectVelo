/**
 * ProjectVelo — Lossless-Grade Edge Audio, Spotify & Real-Time Word Lyrics Engine
 * GitHub Repo ID: ProjectVelo
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Upstream-Status, X-Upstream-Url, X-Cache-Status, X-Resolved-Bitrate, X-Lyrics-Source, X-Engine"
};

const SAAVN_API_BASE = "https://www.jiosaavn.com/api.php";

const SAAVN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-IN,en-US;q=0.9,hi-IN;q=0.8,ml-IN;q=0.8,ta-IN;q=0.8,te-IN;q=0.7",
  "Referer": "https://www.jiosaavn.com/",
  "Origin": "https://www.jiosaavn.com",
  "X-Forwarded-For": "49.36.128.1",
  "CF-IPCountry": "IN",
  "Cookie": "L=english%2Chindi%2Cmalayalam%2Ctamil%2Ctelugu%2Cpunjabi%2Cbengali%2Ckannada; gdpr_acceptance=true; DL=english"
};

const WORKING_STREAM_MEMO = new Map();
const MAX_MEMO_SIZE = 1500;

function memoizeWorkingStream(key, val) {
  if (!key || !val) return;
  if (WORKING_STREAM_MEMO.size >= MAX_MEMO_SIZE) {
    const oldestKey = WORKING_STREAM_MEMO.keys().next().value;
    if (oldestKey) WORKING_STREAM_MEMO.delete(oldestKey);
  }
  WORKING_STREAM_MEMO.set(key, val);
}

// ============================================================================
// 1. DES-ECB DECRYPTION ENGINE (FIXED NULL-BYTE & PADDING HANDLING)
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
  [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10, 3,13,4,7,15,2,8,14,0,1,10,6,9,11,5,12, 0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15, 13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
  [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8, 13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1, 13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7, 1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
  [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15, 13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9, 10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4, 3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
  [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9, 14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6, 4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14, 11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
  [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11, 10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8, 9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6, 4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
  [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1, 13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6, 1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2, 6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
  [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7, 1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2, 7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8, 2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
];

// Correct S-Box 2 row 2 fix (standard FIPS 46-3)
DES_SBOX[1] = [
  15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,
  3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,
  0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,
  13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9
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

function decryptSaavnMediaUrl(encryptedBase64, prefer320 = true) {
  if (!encryptedBase64 || typeof encryptedBase64 !== "string") return null;
  try {
    let b64 = encryptedBase64
      .trim()
      .replace(/ /g, "+")
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .replace(/[^A-Za-z0-9+/=]/g, "");
    while (b64.length % 4 !== 0) b64 += "=";

    const raw = atob(b64);
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

    // Validate PKCS#7 padding or strip trailing null/control bytes
    let endIdx = outBytes.length;
    const lastByte = outBytes[endIdx - 1];
    if (lastByte >= 1 && lastByte <= 8) {
      let validPkcs = true;
      for (let k = 1; k <= lastByte; k++) {
        if (outBytes[endIdx - k] !== lastByte) {
          validPkcs = false;
          break;
        }
      }
      if (validPkcs) endIdx -= lastByte;
    }

    let url = String.fromCharCode(...outBytes.slice(0, endIdx))
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
      .trim();

    if (!url.startsWith("http")) return null;

    url = url
      .replace(/^http:\/\//i, "https://")
      .replace("://h.saavncdn.com/", "://aac.saavncdn.com/")
      .replace("://preview.saavncdn.com/", "://aac.saavncdn.com/");

    // Always upgrade to full-length 320kbps or 160kbps master stream
    if (prefer320) {
      url = url.replace(/_(96|160|96_p)\.(mp4|m4a)/i, "_320.$2");
    } else {
      url = url.replace(/_(96|96_p)\.(mp4|m4a)/i, "_160.$2");
    }
    return url;
  } catch {
    return null;
  }
}

function buildSaavnBitrateCascade(rawAudioUrl) {
  if (!rawAudioUrl) return [];
  const cleanUrl = String(rawAudioUrl).replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
  if (!cleanUrl.includes("saavncdn.com")) {
    return [cleanUrl].filter(Boolean);
  }

  let parsed;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    return [cleanUrl];
  }

  const searchSuffix = parsed.search || "";
  const normPath = parsed.pathname
    .replace(/_96_p\.(mp4|m4a)$/i, "_320.$1")
    .replace(/\/preview\//i, "/");

  const stemPath = normPath.replace(/_(320|160|96)\.(mp4|m4a)$/i, "");
  const extMatch = normPath.match(/\.(mp4|m4a)$/i);
  const ext = extMatch ? extMatch[1] : "mp4";

  const aacBase = `https://aac.saavncdn.com${stemPath}`;
  const hBase = `https://h.saavncdn.com${stemPath}`;

  // Ordered strictly from highest lossless-transparent 320kbps AAC-LC down to 96kbps full-track
  const candidates = [
    `${aacBase}_320.${ext}${searchSuffix}`,
    `${hBase}_320.${ext}${searchSuffix}`,
    `${aacBase}_160.${ext}${searchSuffix}`,
    `${hBase}_160.${ext}${searchSuffix}`,
    `${aacBase}_96.${ext}${searchSuffix}`,
    `${hBase}_96.${ext}${searchSuffix}`,
    cleanUrl
  ];

  return [...new Set(candidates.filter(Boolean))];
}

// ============================================================================
// 2. TEXT CLEANING, QUALITY FILTERING & SAAVN API HELPERS
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
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

function upgradeImage(imgUrl) {
  if (!imgUrl) return "";
  return String(imgUrl)
    .replace(/50x50|150x150|50x50\.jpg|150x150\.jpg/g, "500x500")
    .replace(/^http:\/\//i, "https://");
}

function proxyImg(imgUrl, origin) {
  const hi = upgradeImage(imgUrl);
  return hi ? `${origin}/stream?url=${encodeURIComponent(hi)}` : "";
}

async function fetchSaavnJson(queryParamsObj, timeoutMs = 7000) {
  const qs = new URLSearchParams({
    _format: "json",
    _marker: "0",
    cc: "in",
    ctx: "web6dot0",
    ...queryParamsObj
  });
  const targetUrl = `${SAAVN_API_BASE}?${qs.toString()}`;
  const res = await fetch(targetUrl, {
    headers: SAAVN_HEADERS,
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`Saavn HTTP ${res.status}`);
  const rawText = (await res.text()).trim();

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
  const cleanJson = startIdx >= 0
    ? rawText.slice(startIdx, rawText.lastIndexOf(endChar) + 1)
    : rawText;

  return JSON.parse(cleanJson);
}

function enrichSaavnSong(s, origin) {
  if (!s || typeof s !== "object") return null;
  const more = s.more_info || {};
  const enc = more.encrypted_media_url || s.encrypted_media_url;
  const has320 = String(more["320kbps"] ?? s["320kbps"] ?? "true") === "true";

  // Always decrypt to 320kbps candidate first; our /stream cascade handles 160/96 fallback automatically
  let directUrl = s.decrypted_media_url || decryptSaavnMediaUrl(enc, true);
  if (!directUrl) {
    const preview = more.media_preview_url || s.media_preview_url || more.vlink;
    if (preview) {
      directUrl = String(preview)
        .replace(/^http:\/\//i, "https://")
        .replace("preview.saavncdn.com", "aac.saavncdn.com")
        .replace(/_96_p\.(mp4|m4a)/i, "_320.$1");
    }
  }

  const primaryArtistNames = [];
  const composerNames = [];
  const allArtistNames = [];

  if (more.artistMap?.primary_artists?.length) {
    for (const a of more.artistMap.primary_artists) {
      if (a?.name) {
        const n = cleanText(a.name);
        primaryArtistNames.push(n);
        allArtistNames.push(n);
      }
    }
  }
  if (more.primary_artists || s.primary_artists) {
    for (const part of String(more.primary_artists || s.primary_artists).split(",")) {
      const n = cleanText(part);
      if (n) {
        primaryArtistNames.push(n);
        allArtistNames.push(n);
      }
    }
  }
  if (more.music || s.music) {
    for (const part of String(more.music || s.music).split(",")) {
      const n = cleanText(part);
      if (n && n.toLowerCase() !== "unknown") {
        composerNames.push(n);
        allArtistNames.push(n);
      }
    }
  }
  if (more.singers) {
    for (const part of String(more.singers).split(",")) {
      const n = cleanText(part);
      if (n) allArtistNames.push(n);
    }
  }
  if (more.artistMap?.featured_artists?.length) {
    for (const a of more.artistMap.featured_artists) {
      if (a?.name) allArtistNames.push(cleanText(a.name));
    }
  }
  if (more.artistMap?.artists?.length) {
    for (const a of more.artistMap.artists) {
      if (a?.name) allArtistNames.push(cleanText(a.name));
    }
  }

  const uniquePrimary = [...new Set(primaryArtistNames.filter(Boolean))];
  const uniqueComposers = [...new Set(composerNames.filter(Boolean))];
  const uniqueAllArtists = [...new Set(allArtistNames.filter(Boolean))];

  // Combine primary singers + main composer so both display & lyrics resolution succeed
  const displayRoster = [...uniquePrimary];
  for (const comp of uniqueComposers) {
    if (displayRoster.length < 3 && !displayRoster.some(x => x.toLowerCase() === comp.toLowerCase())) {
      displayRoster.push(comp);
    }
  }

  const primaryArtists = displayRoster.slice(0, 4).join(", ") ||
    uniqueAllArtists.slice(0, 3).join(", ") ||
    cleanText(s.subtitle || "Unknown Artist");

  const hiResImg = upgradeImage(s.image || s.coverUrl);
  const titleClean = cleanText(s.title || s.song || "Untitled");
  const albumTitle = cleanText(more.album || s.album || "OpenMuse");
  const albumId = more.album_id || s.album_id || null;
  const durationSec = parseInt(more.duration || s.duration || "0", 10) || 0;
  const playCount = parseInt(s.play_count || more.play_count || "0", 10) || 0;
  const hasLyrics = String(more.has_lyrics || s.has_lyrics || "false") === "true";
  const idStr = String(s.id || "");

  const workerStream = directUrl
    ? `${origin}/stream?url=${encodeURIComponent(directUrl)}`
    : `${origin}/play?id=${encodeURIComponent(idStr)}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}`;

  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(idStr)}${directUrl ? `&url=${encodeURIComponent(directUrl)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(idStr)}&trackName=${encodeURIComponent(titleClean)}&artistName=${encodeURIComponent(primaryArtists)}&albumName=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;

  const cascade = directUrl ? buildSaavnBitrateCascade(directUrl) : [];

  return {
    ...s,
    id: idStr,
    type: "song",
    itemType: "song",
    title: titleClean,
    artist: primaryArtists,
    composers: uniqueComposers,
    allArtists: uniqueAllArtists,
    subtitle: primaryArtists,
    album: albumTitle,
    albumId: albumId ? String(albumId) : null,
    duration: durationSec,
    playCount,
    hasLyrics,
    image: hiResImg,
    coverUrl: proxyImg(hiResImg, origin),
    encrypted_media_url: enc || "",
    decrypted_media_url: directUrl || playEndpointUrl,
    streamUrl: workerStream,
    playUrl: playEndpointUrl,
    lyricsUrl: lyricsEndpointUrl,
    more_info: {
      ...more,
      encrypted_media_url: enc || "",
      "320kbps": has320 ? "true" : "false",
      album: albumTitle,
      album_id: albumId ? String(albumId) : null,
      primary_artists: primaryArtists,
      music: uniqueComposers.join(", "),
      duration: String(durationSec)
    },
    DownloadQueryResult: {
      url: directUrl || playEndpointUrl,
      workerStreamUrl: workerStream,
      smartPlayUrl: playEndpointUrl,
      audioFormat: "MP4",
      audioQuality: "KBPS320",
      cascade
    }
  };
}

/**
 * Filters out junk/short-clips/ringtones/karaoke/amateur knockoffs and ranks official music first.
 */
function filterAndRankValidTracks(tracks, queryStr = "") {
  if (!Array.isArray(tracks) || tracks.length === 0) return [];
  const qLower = String(queryStr || "").toLowerCase();
  const wantsKaraokeOrRingtone = /\b(karaoke|instrumental|ringtone|tribute|8d| dialogue)\b/i.test(qLower);

  const valid = [];
  const seenKeys = new Map();

  for (const t of tracks) {
    if (!t || !t.id || !t.title) continue;

    // Must have a playable stream or encrypted media URL
    const hasStream = Boolean(t.decrypted_media_url || t.encrypted_media_url || t.streamUrl);
    if (!hasStream) continue;

    // Filter out short snippets/ringtones (< 42s) or 2-hour podcasts unless explicitly queried
    if (t.duration > 0 && (t.duration < 42 || t.duration > 1800) && !wantsKaraokeOrRingtone) {
      continue;
    }

    const combinedMeta = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
    if (!wantsKaraokeOrRingtone) {
      if (/\b(ringtone|karaoke|tribute to|originally performed by|made famous by|dialogue promo|caller tune)\b/i.test(combinedMeta)) {
        continue;
      }
    }

    // Deduplicate identical (Title + Primary Artist) tracks, keeping higher quality / higher playCount
    const normTitle = t.title.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, "").replace(/[^a-z0-9]+/g, "").trim();
    const normArtist = (t.artist || "").split(",")[0].toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
    const dedupKey = `${normTitle}__${normArtist}`;

    if (normTitle.length >= 2 && seenKeys.has(dedupKey)) {
      const existingIdx = seenKeys.get(dedupKey);
      const existing = valid[existingIdx];
      const existingScore = (existing.playCount || 0) + (existing.more_info?.["320kbps"] === "true" ? 50000 : 0);
      const currentScore = (t.playCount || 0) + (t.more_info?.["320kbps"] === "true" ? 50000 : 0);
      if (currentScore > existingScore) {
        valid[existingIdx] = t;
      }
      continue;
    }

    seenKeys.set(dedupKey, valid.length);
    valid.push(t);
  }

  return valid.length > 0 ? valid : tracks.filter(t => t && t.id && (t.decrypted_media_url || t.streamUrl));
}

async function healMissingStreamsInList(rawTrackList) {
  if (!Array.isArray(rawTrackList) || rawTrackList.length === 0) return [];
  const missingPids = rawTrackList
    .filter(t => t && t.id && !String(t.id).startsWith("sp_") && !(t.more_info?.encrypted_media_url || t.encrypted_media_url || t.decrypted_media_url))
    .map(t => String(t.id));

  if (missingPids.length === 0) return rawTrackList;

  const healedMap = {};
  for (let i = 0; i < missingPids.length; i += 20) {
    const chunk = missingPids.slice(i, i + 20);
    try {
      const batchData = await fetchSaavnJson({
        __call: "song.getDetails",
        pids: chunk.join(",")
      });
      const list = Array.isArray(batchData?.songs)
        ? batchData.songs
        : Object.values(batchData || {}).filter(x => x && typeof x === "object" && x.id);
      for (const s of list) healedMap[String(s.id)] = s;
    } catch {}
  }

  return rawTrackList.map(t => healedMap[String(t.id)] || t);
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
  const hiResImg = upgradeImage(a.image || a.coverUrl);
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
// 3. SPOTIFY SUPPORT ENGINE (TRACKS, ALBUMS, PLAYLISTS & 320KBPS BRIDGE)
// ============================================================================

function parseSpotifyIdentifier(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  // Custom worker IDs: sp_track_<id>, sp_album_<id>, sp_playlist_<id>
  const internalMatch = trimmed.match(/^sp_(track|album|playlist|artist)_([A-Za-z0-9]{22})$/);
  if (internalMatch) {
    return { type: internalMatch[1], id: internalMatch[2] };
  }

  // Spotify URI: spotify:track:<id>
  const uriMatch = trimmed.match(/spotify:(track|album|playlist|artist):([A-Za-z0-9]{22})/i);
  if (uriMatch) {
    return { type: uriMatch[1].toLowerCase(), id: uriMatch[2] };
  }

  // Spotify URL: https://open.spotify.com/(intl-xx/)?(embed/)?(track|album|playlist|artist)/<id>
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-zA-Z-]+\/)?(?:embed\/)?(track|album|playlist|artist)\/([A-Za-z0-9]{22})/i);
  if (urlMatch) {
    return { type: urlMatch[1].toLowerCase(), id: urlMatch[2] };
  }

  return null;
}

async function fetchSpotifyEntityFromEmbed(type, id) {
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    },
    signal: AbortSignal.timeout(7000)
  });

  if (!res.ok) throw new Error(`Spotify Embed HTTP ${res.status}`);
  const html = await res.text();

  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (nextDataMatch && nextDataMatch[1]) {
    const json = JSON.parse(nextDataMatch[1]);
    const entity = json?.props?.pageProps?.state?.data?.entity;
    if (entity) return entity;
  }

  // Fallback to oEmbed for basic title/thumbnail
  const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${type}/${id}`)}`);
  if (oembedRes.ok) {
    const oembed = await oembedRes.json();
    return {
      type,
      id,
      name: oembed.title || "Spotify Track",
      title: oembed.title || "Spotify Track",
      subtitle: oembed.author_name || "",
      visualIdentity: { image: [{ url: oembed.thumbnail_url }] }
    };
  }
  return null;
}

async function matchSpotifyTrackToSaavn(spTrack, origin, fallbackCover = "") {
  const title = cleanText(spTrack.title || spTrack.name || "");
  const artist = cleanText(
    spTrack.subtitle ||
    (Array.isArray(spTrack.artists) ? spTrack.artists.map(a => a.name || a.title).join(", ") : "") ||
    ""
  ).replace(/\u00a0/g, " ");
  const durationSec = spTrack.duration ? Math.round(Number(spTrack.duration) / 1000) : 0;
  const spCover = spTrack.coverUrl ||
    spTrack.visualIdentity?.image?.[0]?.url ||
    spTrack.album?.images?.[0]?.url ||
    fallbackCover;

  const cleanTitle = title.replace(/\([^)]*\)|\[[^\]]*\]/g, "").replace(/-\s*(from|feat|remaster|version).*$/i, "").trim();
  const primaryArtist = artist.split(/[,&/]/)[0].trim();
  const searchQuery = `${cleanTitle} ${primaryArtist}`.trim();

  try {
    const searchData = await fetchSaavnJson({
      __call: "search.getResults",
      api_version: "4",
      n: "8",
      p: "1",
      q: searchQuery
    }, 5500);

    const results = Array.isArray(searchData?.results) ? searchData.results : [];
    if (results.length > 0) {
      let bestMatch = results[0];
      let bestScore = -999;

      for (const cand of results) {
        const candEnriched = enrichSaavnSong(cand, origin);
        if (!candEnriched) continue;
        let score = 0;
        const cTitle = candEnriched.title.toLowerCase();
        const tLower = cleanTitle.toLowerCase();
        if (cTitle === tLower) score += 60;
        else if (cTitle.includes(tLower) || tLower.includes(cTitle)) score += 35;

        if (primaryArtist && candEnriched.artist.toLowerCase().includes(primaryArtist.toLowerCase())) {
          score += 45;
        }
        if (durationSec > 0 && candEnriched.duration > 0) {
          const diff = Math.abs(durationSec - candEnriched.duration);
          if (diff <= 3) score += 50;
          else if (diff <= 8) score += 25;
          else if (diff > 30) score -= 30;
        }
        if (candEnriched.more_info?.["320kbps"] === "true") score += 15;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = cand;
        }
      }

      const finalSong = enrichSaavnSong(bestMatch, origin);
      if (finalSong) {
        if (spCover) {
          finalSong.image = spCover;
          finalSong.coverUrl = proxyImg(spCover, origin);
        }
        finalSong.title = title || finalSong.title;
        if (artist) finalSong.artist = artist;
        finalSong.spotifyId = spTrack.id || spTrack.uri?.split(":").pop() || undefined;
        return finalSong;
      }
    }
  } catch {}

  // Fallback virtual track that resolves dynamically via /play on click
  const spId = spTrack.id || (spTrack.uri ? spTrack.uri.split(":").pop() : Math.random().toString(36).slice(2, 10));
  const id = `sp_track_${spId}`;
  const playUrl = `${origin}/play?id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;

  return {
    id,
    spotifyId: spId,
    type: "song",
    itemType: "song",
    title: title || "Spotify Track",
    artist: artist || "Spotify Artist",
    subtitle: artist || "Spotify Artist",
    album: spTrack.albumName || "Spotify",
    duration: durationSec || 180,
    image: spCover,
    coverUrl: spCover ? proxyImg(spCover, origin) : "",
    decrypted_media_url: playUrl,
    streamUrl: playUrl,
    playUrl,
    lyricsUrl: `${origin}/lyrics?id=${encodeURIComponent(id)}&trackName=${encodeURIComponent(title)}&artistName=${encodeURIComponent(artist)}&duration=${durationSec || 180}`,
    more_info: {
      "320kbps": "true",
      album: spTrack.albumName || "Spotify",
      primary_artists: artist,
      duration: String(durationSec || 180)
    }
  };
}

async function resolveSpotifyResource(spRef, origin) {
  const entity = await fetchSpotifyEntityFromEmbed(spRef.type, spRef.id);
  if (!entity) throw new Error("Unable to resolve Spotify entity");

  const images = entity.visualIdentity?.image || entity.coverArt?.sources || [];
  const hiResCover = images.reduce((best, img) => {
    return (!best || (img.maxWidth || img.width || 0) > (best.maxWidth || best.width || 0)) ? img : best;
  }, null)?.url || "";

  if (spRef.type === "track") {
    const artistStr = Array.isArray(entity.artists)
      ? entity.artists.map(a => a.name || a.title).join(", ")
      : (entity.subtitle || "");
    const matchedSong = await matchSpotifyTrackToSaavn({
      id: spRef.id,
      title: entity.title || entity.name,
      subtitle: artistStr,
      duration: entity.duration,
      coverUrl: hiResCover
    }, origin, hiResCover);

    // Fetch recommendations around the matched Saavn song so the user gets a full queue
    let recommendations = [];
    if (matchedSong && !String(matchedSong.id).startsWith("sp_")) {
      try {
        const rawReco = await fetchSaavnJson({
          __call: "reco.getreco",
          api_version: "4",
          pid: matchedSong.id,
          language: "english,hindi,malayalam,tamil,telugu"
        }, 4500);
        if (Array.isArray(rawReco)) {
          recommendations = filterAndRankValidTracks(
            rawReco.slice(0, 14).map(s => enrichSaavnSong(s, origin)).filter(Boolean)
          );
        }
      } catch {}
    }

    return {
      spotifyType: "track",
      id: `sp_track_${spRef.id}`,
      title: matchedSong.title,
      artist: matchedSong.artist,
      coverUrl: matchedSong.coverUrl,
      track: matchedSong,
      songs: [matchedSong, ...recommendations],
      results: [matchedSong, ...recommendations]
    };
  }

  // Album, Playlist, or Artist top tracks
  const rawTrackList = entity.trackList || [];
  const albumTitle = cleanText(entity.title || entity.name || "Spotify Collection");
  const albumArtist = cleanText(entity.subtitle || "Spotify");

  // Match up to 30 tracks in fast parallel batches
  const sliceToResolve = rawTrackList.slice(0, 30);
  const resolvedTracks = await Promise.all(
    sliceToResolve.map(item =>
      matchSpotifyTrackToSaavn({
        uri: item.uri,
        title: item.title,
        subtitle: item.subtitle,
        duration: item.duration,
        albumName: albumTitle,
        coverUrl: hiResCover
      }, origin, hiResCover)
    )
  );

  const validSongs = resolvedTracks.filter(Boolean);
  const collectionId = `sp_${spRef.type}_${spRef.id}`;

  return {
    spotifyType: spRef.type,
    id: collectionId,
    albumid: collectionId,
    type: spRef.type === "playlist" ? "playlist" : "album",
    itemType: "album",
    title: albumTitle,
    name: albumTitle,
    artist: albumArtist,
    subtitle: albumArtist,
    image: hiResCover,
    coverUrl: hiResCover ? proxyImg(hiResCover, origin) : (validSongs[0]?.coverUrl || ""),
    song_count: validSongs.length,
    songs: validSongs,
    list: validSongs,
    results: validSongs
  };
}

// ============================================================================
// 4. COMPLETE ALBUM & PLAYLIST RESOLVER (SAAVN + SPOTIFY)
// ============================================================================

async function resolveCompleteAlbum(albumIdOrToken, origin) {
  const cleanId = String(albumIdOrToken || "").trim();
  if (!cleanId) throw new Error("Missing album ID");

  // Check if it's a Spotify Album / Playlist ID or URL
  const spRef = parseSpotifyIdentifier(cleanId);
  if (spRef) {
    return await resolveSpotifyResource(spRef, origin);
  }

  let albumPayload = null;
  let rawTrackList = [];
  const isNumeric = /^\d+$/.test(cleanId);

  if (!isNumeric) {
    const token = cleanId.split("/").filter(Boolean).pop();
    for (const type of ["album", "playlist"]) {
      try {
        const tokenData = await fetchSaavnJson({
          __call: "webapi.get",
          api_version: "4",
          token,
          type
        });
        if (tokenData && (Array.isArray(tokenData.list) || Array.isArray(tokenData.songs))) {
          albumPayload = tokenData;
          rawTrackList = tokenData.list || tokenData.songs || [];
          if (rawTrackList.length > 0) break;
        }
      } catch {}
    }
  }

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

  rawTrackList = await healMissingStreamsInList(rawTrackList);

  const enrichedSongs = filterAndRankValidTracks(
    rawTrackList.map(s => enrichSaavnSong(s, origin)).filter(Boolean)
  );

  let relatedAlbums = [];
  if (isNumeric) {
    try {
      const recoRes = await fetchSaavnJson({
        __call: "reco.getAlbumReco",
        api_version: "4",
        albumid: cleanId
      }, 4500);
      if (Array.isArray(recoRes)) {
        relatedAlbums = recoRes.slice(0, 8).map(a => enrichSaavnAlbum(a, origin));
      }
    } catch {}
  }

  const normalizedAlbum = enrichSaavnAlbum(albumPayload, origin);

  return {
    ...normalizedAlbum,
    song_count: enrichedSongs.length,
    songs: enrichedSongs,
    list: enrichedSongs,
    relatedAlbums
  };
}

// ============================================================================
// 5. DEFINITE REAL-TIME WORD-BY-WORD LYRICS ENGINE (100% COVERAGE)
// ============================================================================

function extractLyricsSearchTokens(rawTitle, rawArtist, rawAlbum, extraArtists = []) {
  const fullTitle = cleanText(rawTitle || "");
  let extractedMovie = "";
  const fromMatch = fullTitle.match(/(?:from|movie|film)\s+["'“”‘’]?([^)"'\]”’]+)["'“”‘’]?/i);
  if (fromMatch && fromMatch[1]) {
    extractedMovie = fromMatch[1].trim();
  }

  const baseTitle = fullTitle
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/-\s*(from|feat|ft|original|ost|version|malayalam|tamil|telugu|hindi|kannada|punjabi|remix|lofi|slowed|reverb|unplugged|live|film|motion picture|video|audio|full song).*$/gi, " ")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const titleParts = baseTitle
    .split(/\s*[-–—:|/]\s*/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);

  const primaryTitle = titleParts[0] || baseTitle || fullTitle;
  const secondaryTitle = titleParts.length > 1 ? titleParts[titleParts.length - 1] : "";

  const allArtistsRaw = [
    ...String(rawArtist || "").split(/[,&/|]/),
    ...extraArtists
  ]
    .map(a => cleanText(a).replace(/\([^)]*\)/g, "").trim())
    .filter(a => a && !/^(unknown|unknown artist|various artists|openmuse|spotify)$/i.test(a));

  const uniqueArtists = [...new Set(allArtistsRaw)];

  const cleanAlbum = cleanText(rawAlbum || extractedMovie || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/original motion picture soundtrack/gi, "")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const validAlbum = (cleanAlbum && !/^(openmuse|unknown|single|audius|spotify)$/i.test(cleanAlbum) && cleanAlbum.toLowerCase() !== primaryTitle.toLowerCase())
    ? cleanAlbum
    : (extractedMovie || "");

  return {
    primaryTitle,
    secondaryTitle,
    baseTitle,
    artists: uniqueArtists,
    album: validAlbum
  };
}

/**
 * Computes natural syllable/phonetic word weight so word-by-word karaoke
 * illuminates at realistic human singing cadence instead of dragging across pauses.
 */
function computeWordVocalWeight(word) {
  const clean = String(word || "").replace(/[^a-zA-Z0-9\u0900-\u0d7f]/g, "");
  const len = Math.max(1, clean.length);
  const vowelGroups = (clean.match(/[aeiouyAEIOUY]+/g) || []).length || Math.ceil(len / 2.8);
  let weight = vowelGroups * 0.65 + len * 0.14;

  // Punctuation at end of word implies a natural vocal hold / micro-breath
  if (/[,;]$/.test(word)) weight += 0.45;
  else if (/[.!?…—-]+$/.test(word)) weight += 0.7;

  return Math.max(0.35, weight);
}

/**
 * Synthesizes natural word-by-word timestamps inside a line `[lineStart, lineEnd]`.
 * Caps active singing duration so long instrumental breaks after a line don't stretch words.
 */
function buildNaturalWordsForLine(text, lineStart, lineEnd) {
  const rawWords = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) {
    return [{ word: "♪", time: lineStart, endTime: lineEnd }];
  }

  const totalGap = Math.max(0.25, lineEnd - lineStart);
  const charCount = rawWords.reduce((s, w) => s + w.length, 0);

  // Natural vocal cadence: ~0.38s per word + ~0.045s per character, capped at totalGap * 0.92
  const idealSingSpan = Math.max(0.9, rawWords.length * 0.38 + charCount * 0.048);
  const activeVocalDuration = totalGap > idealSingSpan * 1.45
    ? Math.min(totalGap * 0.88, idealSingSpan * 1.25)
    : totalGap * 0.96;

  const weights = rawWords.map((w, idx) => {
    let wgt = computeWordVocalWeight(w);
    if (idx === rawWords.length - 1) wgt *= 1.22; // Last word of phrase holds slightly longer
    return wgt;
  });
  const totalWeight = Math.max(0.001, weights.reduce((a, b) => a + b, 0));

  let cursor = lineStart;
  return rawWords.map((w, idx) => {
    const wDur = activeVocalDuration * (weights[idx] / totalWeight);
    const wStart = Number(cursor.toFixed(3));
    const wEnd = Number(Math.min(lineEnd, cursor + wDur).toFixed(3));
    cursor += wDur;
    return {
      word: w,
      time: wStart,
      endTime: Math.max(wStart + 0.08, wEnd)
    };
  });
}

/**
 * Parses Enhanced LRC (`<00:12.34>word` or inline `[00:12.34]word`) if present in the line.
 */
function extractEnhancedInlineWords(rawContent, lineStart, lineEnd) {
  if (!rawContent) return null;
  const inlineRegex = /(?:<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>|\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\])\s*([^\s<\[]+)/g;
  const matches = [];
  let m;
  while ((m = inlineRegex.exec(rawContent)) !== null) {
    const min = parseInt(m[1] ?? m[4], 10);
    const sec = parseInt(m[2] ?? m[5], 10);
    const frac = m[3] ?? m[6] ?? "0";
    const ms = frac.length === 1 ? parseInt(frac, 10) * 100 : frac.length === 2 ? parseInt(frac, 10) * 10 : parseInt(frac.slice(0, 3), 10);
    const t = Number((min * 60 + sec + ms / 1000).toFixed(3));
    const wordText = m[7]?.trim();
    if (wordText) matches.push({ word: wordText, time: Math.max(lineStart, t) });
  }

  if (matches.length < 2) return null;

  return matches.map((item, idx) => {
    const nextItem = matches[idx + 1];
    const endTime = nextItem
      ? Number(Math.max(item.time + 0.08, nextItem.time).toFixed(3))
      : Number(Math.max(item.time + 0.25, Math.min(lineEnd, item.time + 1.2)).toFixed(3));
    return {
      word: item.word,
      time: item.time,
      endTime
    };
  });
}

/**
 * Parses NetEase YRC (native millisecond word-by-word format: `[startMs,durMs](wStartMs,wDurMs,0)word`)
 */
function parseNeteaseYrcToTimeline(yrcString, totalDurationSec = 0) {
  if (!yrcString || typeof yrcString !== "string") return [];
  const rows = yrcString.split(/\r?\n/);
  const timeline = [];

  for (const row of rows) {
    const lineMatch = row.match(/^\[(\d+),(\d+)\](.*)$/);
    if (!lineMatch) continue;
    const lineStartSec = Number((parseInt(lineMatch[1], 10) / 1000).toFixed(3));
    const lineDurSec = Number((parseInt(lineMatch[2], 10) / 1000).toFixed(3));
    const lineEndSec = Number((lineStartSec + Math.max(0.4, lineDurSec)).toFixed(3));
    const body = lineMatch[3];

    const wordRegex = /\((\d+),(\d+),\d+\)([^\(]*)/g;
    const rawTokens = [];
    let wm;
    while ((wm = wordRegex.exec(body)) !== null) {
      const wStart = Number((parseInt(wm[1], 10) / 1000).toFixed(3));
      const wDur = Number((parseInt(wm[2], 10) / 1000).toFixed(3));
      const wText = wm[3];
      if (wText && wText.trim()) {
        rawTokens.push({
          word: wText.trim(),
          time: wStart,
          endTime: Number((wStart + Math.max(0.08, wDur)).toFixed(3))
        });
      }
    }

    if (rawTokens.length > 0) {
      const lineText = rawTokens.map(w => w.word).join(" ");
      timeline.push({
        index: timeline.length,
        time: lineStartSec,
        endTime: lineEndSec,
        duration: Number((lineEndSec - lineStartSec).toFixed(3)),
        text: lineText,
        plainOnly: false,
        isInstrumental: false,
        words: rawTokens
      });
    }
  }

  return timeline;
}

function parseLrcToTimeline(lrcString, totalDurationSec = 0) {
  if (!lrcString || typeof lrcString !== "string") return [];

  let offsetMs = 0;
  const offsetMatch = lrcString.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  if (offsetMatch) offsetMs = parseInt(offsetMatch[1], 10) || 0;

  const rawLines = lrcString.split(/\r?\n/);
  const parsedEntries = [];
  const lineStartRegex = /^\s*((?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+)(.*)$/;
  const singleStampRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const anyTagRegex = /(?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]|<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>)/g;

  for (const line of rawLines) {
    const startMatch = line.match(lineStartRegex);
    if (!startMatch) continue;

    const stampBlock = startMatch[1];
    const contentRaw = startMatch[2].trim();

    const timestamps = [];
    let match;
    singleStampRegex.lastIndex = 0;
    while ((match = singleStampRegex.exec(stampBlock)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const fracRaw = match[3] || "0";
      const ms = fracRaw.length === 1
        ? parseInt(fracRaw, 10) * 100
        : fracRaw.length === 2
          ? parseInt(fracRaw, 10) * 10
          : parseInt(fracRaw.slice(0, 3), 10);

      const timeSec = Math.max(0, min * 60 + sec + (ms - offsetMs) / 1000);
      timestamps.push(Number(timeSec.toFixed(3)));
    }

    if (timestamps.length === 0) continue;

    const cleanLineText = contentRaw.replace(anyTagRegex, " ").replace(/\s+/g, " ").trim();
    if (/^(by|offset|ar|ti|al|length|re|ve|tool|au|id)\s*:/i.test(cleanLineText)) continue;

    for (const t of timestamps) {
      parsedEntries.push({
        time: t,
        text: cleanLineText || "♪",
        rawContent: contentRaw
      });
    }
  }

  parsedEntries.sort((a, b) => a.time - b.time);

  // Deduplicate identical timestamps
  const deduped = [];
  for (const entry of parsedEntries) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.time - entry.time) < 0.05) {
      if (prev.text === "♪" && entry.text !== "♪") {
        deduped[deduped.length - 1] = entry;
      } else if (entry.text !== "♪" && entry.text !== prev.text) {
        prev.text = `${prev.text} • ${entry.text}`;
      }
      continue;
    }
    deduped.push(entry);
  }

  return deduped.map((entry, idx) => {
    const nextEntry = deduped[idx + 1];
    const fallbackEnd = totalDurationSec > entry.time ? totalDurationSec : entry.time + 4.5;
    const endTime = nextEntry
      ? Number(Math.max(entry.time + 0.3, nextEntry.time).toFixed(3))
      : Number(fallbackEnd.toFixed(3));
    const lineDuration = Number(Math.max(0.3, endTime - entry.time).toFixed(3));

    const inlineWords = extractEnhancedInlineWords(entry.rawContent, entry.time, endTime);
    const words = inlineWords || buildNaturalWordsForLine(entry.text, entry.time, endTime);

    return {
      index: idx,
      time: entry.time,
      endTime,
      duration: lineDuration,
      text: entry.text,
      plainOnly: false,
      isInstrumental: entry.text === "♪",
      words
    };
  });
}

function buildEstimatedTimelineFromPlain(plainLyrics, totalDurationSec = 180) {
  if (!plainLyrics) return [];
  const rawLines = String(plainLyrics)
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\r?\n/)
    .map(l => cleanText(l.replace(/^\[.*?\]$/g, "")))
    .filter(l => l && !/^(lyrics|lyricist|music|singer|cast|composed by|produced by)\s*:/i.test(l));

  if (rawLines.length === 0) return [];

  const dur = totalDurationSec > 30 ? totalDurationSec : 195;
  const introOffset = Math.min(8.5, Math.max(3.0, dur * 0.04));
  const outroBuffer = Math.min(10.0, Math.max(4.0, dur * 0.05));
  const usableDuration = Math.max(30, dur - introOffset - outroBuffer);

  const lineWeights = rawLines.map(line => {
    const words = line.split(/\s+/).filter(Boolean);
    return Math.max(1.8, words.reduce((s, w) => s + computeWordVocalWeight(w), 0) + 0.65);
  });
  const totalWeight = Math.max(1, lineWeights.reduce((a, b) => a + b, 0));

  let currentSec = introOffset;
  return rawLines.map((text, idx) => {
    const lineDuration = Math.max(1.35, usableDuration * (lineWeights[idx] / totalWeight));
    const start = Number(currentSec.toFixed(3));
    const end = Number((currentSec + lineDuration).toFixed(3));
    currentSec += lineDuration;

    const words = buildNaturalWordsForLine(text, start, end);

    return {
      index: idx,
      time: start,
      endTime: end,
      duration: Number(lineDuration.toFixed(3)),
      text,
      plainOnly: false,
      isInstrumental: false,
      words
    };
  });
}

/**
 * Guaranteed rhythmic real-time timeline when a rare/instrumental track has no text lyrics on any provider.
 */
function buildGuaranteedRhythmicTimeline(title, artist, album, durationSec = 180) {
  const dur = durationSec > 30 ? durationSec : 180;
  const cleanT = cleanText(title || "Now Playing");
  const cleanA = cleanText(artist || "OpenMuse");
  const cleanAlb = cleanText(album && album !== "OpenMuse" ? album : "Liquid Glass Audio");

  const phrases = [
    `♪ ${cleanT}`,
    `Performed by ${cleanA}`,
    `From ${cleanAlb}`,
    "♪ Instrumental & Vocal Groove ♪",
    `Listening to ${cleanT}`,
    `Featuring ${cleanA}`,
    "♪ Pure Spatial Audio Stream ♪",
    `♪ ${cleanT} • ${cleanA} ♪`
  ];

  const step = Math.max(8, dur / phrases.length);
  return phrases.map((text, idx) => {
    const start = Number((idx * step).toFixed(3));
    const end = Number(Math.min(dur, (idx + 1) * step).toFixed(3));
    return {
      index: idx,
      time: start,
      endTime: end,
      duration: Number((end - start).toFixed(3)),
      text,
      plainOnly: false,
      isInstrumental: true,
      words: buildNaturalWordsForLine(text, start, end)
    };
  });
}

function normalizeTokenComparison(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u0d7f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLrcCandidate(item, tokens, durationSec) {
  if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -999;

  const itemTitle = normalizeTokenComparison(item.trackName || item.name || "");
  const itemArtist = normalizeTokenComparison(item.artistName || "");
  const itemAlbum = normalizeTokenComparison(item.albumName || "");
  const targetTitle = normalizeTokenComparison(tokens.primaryTitle);
  const altTitle = normalizeTokenComparison(tokens.secondaryTitle);

  if (!itemTitle || !targetTitle) return -999;

  let titleMatched = false;
  let score = 0;

  const targetFirstWord = targetTitle.split(" ")[0];
  if (itemTitle === targetTitle) {
    titleMatched = true;
    score += 95;
  } else if (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle)) {
    titleMatched = true;
    score += 70;
  } else if (altTitle && altTitle.length >= 3 && (itemTitle === altTitle || itemTitle.includes(altTitle))) {
    titleMatched = true;
    score += 65;
  } else if (targetFirstWord.length >= 4 && itemTitle.startsWith(targetFirstWord)) {
    titleMatched = true;
    score += 50;
  }

  if (!titleMatched) return -500;

  for (const a of tokens.artists) {
    const normA = normalizeTokenComparison(a);
    if (!normA) continue;
    const firstWord = normA.split(" ").find(w => w.length >= 3) || normA;
    if (itemArtist.includes(normA) || normA.includes(itemArtist) || (firstWord.length >= 3 && itemArtist.includes(firstWord))) {
      score += 70;
      break;
    }
    if (itemAlbum && (itemAlbum.
