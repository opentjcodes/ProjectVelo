// --- START OF FILE worker.js ---

const WORKER_NAME = "ProjectVelo";
const WORKER_VERSION = "8.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Worker-Engine, X-Upstream-Status, X-Upstream-Url, X-Cache-Status, X-Resolved-Bitrate, X-Lyrics-Source, X-Lyrics-Sync-Type"
};

const SAAVN_API_BASE = "https://www.jiosaavn.com/api.php";

const SAAVN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-IN,en-US;q=0.9,hi-IN;q=0.8,ml-IN;q=0.7,ta-IN;q=0.7,te-IN;q=0.7",
  "Referer": "https://www.jiosaavn.com/",
  "Origin": "https://www.jiosaavn.com",
  "X-Forwarded-For": "49.36.128.1",
  "CF-IPCountry": "IN",
  "Cookie": "L=english%2Chindi%2Cmalayalam%2Ctamil%2Ctelugu%2Cpunjabi%2Cbengali%2Ckannada; gdpr_acceptance=true; DL=english"
};

const LYRICSPLUS_MIRRORS = [
  "https://lyricsplus.binimum.org",
  "https://lyricsplus.atomix.one",
  "https://lyricsplus.prjktla.my.id",
  "https://lyricsplus.prjktla.workers.dev",
  "https://lyricsplus-seven.vercel.app",
  "https://lyrics-plus-backend.vercel.app"
];

const WORKING_STREAM_MEMO = new Map();
const SONG_META_MEMO = new Map();
const APPLE_IDENTITY_MEMO = new Map();

function setBoundedMemo(map, key, value, maxEntries = 800) {
  if (!key) return;
  if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

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
  16,7,20,21,29,12,28,17, 1,15,23,16,5,18,31,10,
  2,8,24,14,32,27,3,9,    19,13,30,6,22,11,4,25
];
DES_P[11] = 26;

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

    let validLen = outBytes.length;
    const padLen = outBytes[outBytes.length - 1];
    if (padLen >= 1 && padLen <= 8 && outBytes.length >= padLen) {
      let validPad = true;
      for (let k = outBytes.length - padLen; k < outBytes.length; k++) {
        if (outBytes[k] !== padLen) {
          validPad = false;
          break;
        }
      }
      if (validPad) validLen = outBytes.length - padLen;
    }

    let url = String.fromCharCode(...outBytes.slice(0, validLen))
      .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
      .trim();

    if (!url.startsWith("http")) return null;

    url = url
      .replace(/^http:\/\//i, "https://")
      .replace("://h.saavncdn.com/", "://aac.saavncdn.com/")
      .replace("://preview.saavncdn.com/", "://aac.saavncdn.com/");

    if (prefer320) {
      url = url
        .replace(/_(96|160|96_p)\.mp4/i, "_320.mp4")
        .replace(/_(96|160|96_p)\.mp3/i, "_320.mp3");
    } else {
      url = url
        .replace(/_(96|96_p)\.mp4/i, "_160.mp4")
        .replace(/_(96|96_p)\.mp3/i, "_160.mp3");
    }

    return url;
  } catch {
    return null;
  }
}

function buildSaavnBitrateCascade(rawAudioUrl) {
  if (!rawAudioUrl) return [];
  const cleanUrl = String(rawAudioUrl).replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim();
  if (!cleanUrl.includes("saavncdn.com")) {
    return [cleanUrl];
  }

  let parsed;
  try {
    parsed = new URL(cleanUrl.replace(/^http:\/\//i, "https://"));
  } catch {
    return [cleanUrl];
  }

  const searchSuffix = parsed.search || "";
  const isMp3 = /\.mp3$/i.test(parsed.pathname);
  const ext = isMp3 ? "mp3" : "mp4";

  const stemPath = parsed.pathname.replace(/_(320|160|96|96_p)\.(mp4|mp3)$/i, "");
  const aacBase = `https://aac.saavncdn.com${stemPath}`;
  const hBase = `https://h.saavncdn.com${stemPath}`;
  const previewBase = `https://preview.saavncdn.com${stemPath}`;

  const candidates = [
    `${aacBase}_320.${ext}${searchSuffix}`,
    `${hBase}_320.${ext}${searchSuffix}`,
    `${aacBase}_160.${ext}${searchSuffix}`,
    `${hBase}_160.${ext}${searchSuffix}`,
    `${aacBase}_96.${ext}${searchSuffix}`,
    `${hBase}_96.${ext}${searchSuffix}`,
    cleanUrl,
    `${previewBase}_96_p.mp4${searchSuffix}`
  ];

  return [...new Set(candidates.filter(Boolean))];
}

function cleanText(str) {
  if (!str) return "";
  let s = String(str);
  // Two-pass decode in case of double-encoded entities like &amp;#039; or &amp;quot;
  for (let pass = 0; pass < 2; pass++) {
    s = s
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]/g, "").trim();
}

function upgradeImage(imgUrl) {
  if (!imgUrl) return "";
  return String(imgUrl)
    .replace(/50x50|150x150/g, "500x500")
    .replace(/100x100bb|60x60bb|200x200bb/g, "600x600bb")
    .replace(/^http:\/\//i, "https://");
}

function proxyImg(imgUrl, origin) {
  const hi = upgradeImage(imgUrl);
  return hi ? `${origin}/stream?url=${encodeURIComponent(hi)}` : "";
}

async function fetchSaavnJson(queryParamsObj, timeoutMs = 5500) {
  const qs = new URLSearchParams({
    _format: "json",
    _marker: "0",
    cc: "in",
    ctx: "web6dot0",
    ...queryParamsObj
  });
  const targetUrl = `${SAAVN_API_BASE}?${qs.toString()}`;
  const res = await fetchWithTimeout(targetUrl, { headers: SAAVN_HEADERS }, timeoutMs);
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
  const cleanJson = startIdx > 0
    ? rawText.slice(startIdx, rawText.lastIndexOf(endChar) + 1)
    : rawText;

  return JSON.parse(cleanJson);
}

// ============================================================================
// REMIX-AWARE SMART DEDUPLICATION & TRACK FINGERPRINTING ENGINE
// ============================================================================

/**
 * Extracts explicit remix/version tags from a title or album so that
 * important Remixes, Lofi, Slowed, Unplugged, Acoustic, Live, and Language
 * versions are preserved as distinct songs while standard duplicates are merged.
 */
function extractTrackVariantTag(rawTitle = "", rawAlbum = "") {
  const combined = `${rawTitle} ${rawAlbum}`.toLowerCase();
  const variantTokens = [];

  const variantMatchers = [
    { key: "remix", rx: /\b(remix|re-mix|club\s+mix|dance\s+mix|dj\s+mix|bootleg|mashup|flip|vip\s+mix|extended\s+mix|festival\s+mix|trap\s+mix|edm\s+mix|house\s+mix|bass\s+boosted)\b/i },
    { key: "lofi", rx: /\b(lo-?fi|chill\s+mix|chillout)\b/i },
    { key: "slowed", rx: /\b(slowed|reverb|sped\s+up|nightcore)\b/i },
    { key: "unplugged", rx: /\b(unplugged|acoustic|stripped|piano\s+version|guitar\s+version|mtv\s+unplugged)\b/i },
    { key: "live", rx: /\b(live|concert\s+version|session)\b/i },
    { key: "reprise", rx: /\b(reprise|reprised|encore|reload|reloaded|version\s*2|part\s*2|pt\.?\s*2)\b/i },
    { key: "female", rx: /\b(female\s+version|female\s+vocals?)\b/i },
    { key: "male", rx: /\b(male\s+version|male\s+vocals?)\b/i },
    { key: "duet", rx: /\b(duet\s+version)\b/i },
    { key: "instrumental", rx: /\b(instrumental|karaoke|backing\s+track)\b/i },
    { key: "lang_hi", rx: /\b(hindi\s+version)\b/i },
    { key: "lang_ta", rx: /\b(tamil\s+version)\b/i },
    { key: "lang_te", rx: /\b(telugu\s+version)\b/i },
    { key: "lang_ml", rx: /\b(malayalam\s+version)\b/i },
    { key: "lang_kn", rx: /\b(kannada\s+version)\b/i },
    { key: "lang_ar", rx: /\b(arabic\s+version)\b/i },
    { key: "lang_en", rx: /\b(english\s+version)\b/i }
  ];

  for (const m of variantMatchers) {
    const match = combined.match(m.rx);
    if (match) {
      variantTokens.push(m.key);
    }
  }

  return variantTokens.length > 0 ? variantTokens.sort().join("+") : "standard";
}

/**
 * Strips movie/soundtrack boilerplate AND variant tags to get the pure core song title.
 */
function extractCoreTrackTitle(rawTitle = "") {
  return cleanText(rawTitle)
    // Strip (From "Movie"), [From Movie], - From "Movie"
    .replace(/\s*[\[(]\s*(?:from|movie|film|ost|original\s+motion\s+picture|soundtrack|motion\s+picture|featured\s+in)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*(?:from|movie|film|ost|original\s+motion\s+picture).*$/gi, " ")
    // Strip standard audio/video/language brackets
    .replace(/\s*[\[(]\s*(?:official|audio|video|lyrical|full\s+song|full\s+video|hd|hq|hindi|tamil|telugu|malayalam|kannada|punjabi|bengali|english)\s*[\])]/gi, " ")
    // Strip remix/variant parentheticals only for core comparison (variant is captured separately by extractTrackVariantTag)
    .replace(/\s*[\[(][^)\]]*(?:remix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*[^-]*(?:remix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit).*$/gi, " ")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Builds a canonical deduplication signature that collapses identical studio tracks
 * while keeping Remixes, Lofi, Unplugged, Slowed, and Language versions distinct.
 */
function buildTrackDedupSignature(song) {
  if (!song) return "";
  const rawTitle = song.title || song.song || "";
  const rawAlbum = song.album || song.more_info?.album || "";
  const coreTitle = normalizeTokenComparison(extractCoreTrackTitle(rawTitle) || rawTitle);
  const variantTag = extractTrackVariantTag(rawTitle, rawAlbum);

  // Use primary artist token or first word of core title + variant
  const artistList = (song.allArtists && song.allArtists.length > 0)
    ? song.allArtists
    : String(song.artist || song.primary_artists || "").split(",");

  const normArtists = artistList
    .map(a => normalizeTokenComparison(a))
    .filter(Boolean);

  // Anchor on the first 1-2 normalized artist tokens so "Pritam, Arijit Singh" and "Arijit Singh, Pritam" match
  const sortedTopArtists = [...new Set(normArtists)].slice(0, 2).sort().join("_");
  return `${coreTitle}__${variantTag}__${sortedTopArtists || "artist"}`;
}

/**
 * Secondary title+variant signature (used when two identical tracks from the same movie
 * credit different primary artists on JioSaavn, e.g., Composer vs. Singer).
 */
function buildLooseTitleVariantSignature(song) {
  if (!song) return "";
  const rawTitle = song.title || song.song || "";
  const rawAlbum = song.album || song.more_info?.album || "";
  const coreTitle = normalizeTokenComparison(extractCoreTrackTitle(rawTitle) || rawTitle);
  const variantTag = extractTrackVariantTag(rawTitle, rawAlbum);
  const durBucket = song.duration ? Math.round(Number(song.duration) / 8) : 0;
  return `${coreTitle}__${variantTag}__dur${durBucket}`;
}

function isLowQualityJunkTrack(rawSong, userQuery = "") {
  if (!rawSong || typeof rawSong !== "object") return true;
  const more = rawSong.more_info || {};
  const title = cleanText(rawSong.title || rawSong.song || "").toLowerCase();
  const album = cleanText(more.album || rawSong.album || "").toLowerCase();
  const q = String(userQuery || "").toLowerCase();

  const duration = parseInt(more.duration || rawSong.duration || "0", 10) || 0;
  if (duration > 0 && duration < 42 && !q.includes("intro") && !q.includes("ringtone")) {
    return true;
  }

  const junkPatterns = [
    /\bkaraoke\b/i,
    /\bringtone\b/i,
    /\bcaller\s*tune\b/i,
    /\b8d\s*audio\b/i,
    /\btribute\s+to\b/i,
    /\boriginally\s+performed\s+by\b/i,
    /\bdialogue\s+promo\b/i,
    /\binstrumental\s+ringtone\b/i
  ];
  for (const rx of junkPatterns) {
    if ((rx.test(title) || rx.test(album)) && !rx.test(q)) {
      return true;
    }
  }

  return false;
}

async function batchHealMissingMediaUrls(rawSongs) {
  if (!Array.isArray(rawSongs) || rawSongs.length === 0) return [];
  const missingIds = rawSongs
    .filter(s => s && s.id && !String(s.id).startsWith("apple:") && !(s.more_info?.encrypted_media_url || s.encrypted_media_url || s.decrypted_media_url))
    .map(s => String(s.id));

  if (missingIds.length === 0) return rawSongs;

  const healedMap = {};
  for (let i = 0; i < missingIds.length; i += 20) {
    const chunk = missingIds.slice(i, i + 20);
    try {
      const batchData = await fetchSaavnJson({
        __call: "song.getDetails",
        pids: chunk.join(",")
      });
      const list = Array.isArray(batchData?.songs)
        ? batchData.songs
        : Object.values(batchData || {}).filter(x => x && typeof x === "object" && x.id);
      for (const s of list) {
        healedMap[String(s.id)] = s;
      }
    } catch {}
  }

  return rawSongs.map(s => healedMap[String(s?.id)] || s);
}

/**
 * Deduplicates from index 0 while preserving Remixes/Lofi/Unplugged/Slowed versions.
 */
function deduplicateEnrichedSongs(enrichedSongs) {
  const seenStrict = new Set();
  const seenLoose = new Set();
  const results = [];

  for (const enriched of enrichedSongs) {
    if (!enriched || !enriched.id) continue;

    const strictSig = buildTrackDedupSignature(enriched);
    const looseSig = buildLooseTitleVariantSignature(enriched);

    if (seenStrict.has(strictSig)) continue;
    if (enriched.duration > 0 && seenLoose.has(looseSig)) continue;

    seenStrict.add(strictSig);
    if (enriched.duration > 0) seenLoose.add(looseSig);
    results.push(enriched);
  }

  return results;
}

async function filterAndUpgradeSongs(rawSongs, origin, userQuery = "") {
  if (!Array.isArray(rawSongs)) return [];
  const filtered = rawSongs.filter(s => !isLowQualityJunkTrack(s, userQuery));
  const listToProcess = filtered.length > 0 ? filtered : rawSongs;
  const healed = await batchHealMissingMediaUrls(listToProcess);

  const enrichedList = healed
    .map(s => enrichSaavnSong(s, origin))
    .filter(s => s && s.id);

  return deduplicateEnrichedSongs(enrichedList);
}

function enrichSaavnSong(s, origin, appleMeta = null) {
  if (!s || typeof s !== "object") return s;
  const more = s.more_info || {};
  const enc = more.encrypted_media_url || s.encrypted_media_url;

  let directUrl = s.decrypted_media_url || decryptSaavnMediaUrl(enc, true);
  if (!directUrl) {
    const preview = more.media_preview_url || s.media_preview_url || more.vlink;
    if (preview) {
      directUrl = String(preview)
        .replace(/^http:\/\//i, "https://")
        .replace("preview.saavncdn.com", "aac.saavncdn.com")
        .replace(/_96_p\.mp4/i, "_320.mp4");
    }
  }

  const artistNames = [];
  if (appleMeta?.artistName) {
    artistNames.push(...String(appleMeta.artistName).split(/[,&]/).map(cleanText));
  }
  if (more.artistMap?.primary_artists?.length) {
    for (const a of more.artistMap.primary_artists) {
      if (a?.name) artistNames.push(cleanText(a.name));
    }
  }
  if (more.singers) {
    artistNames.push(...String(more.singers).split(",").map(cleanText));
  }
  if (more.artistMap?.featured_artists?.length) {
    for (const a of more.artistMap.featured_artists) {
      if (a?.name) artistNames.push(cleanText(a.name));
    }
  }
  if (more.primary_artists || s.primary_artists) {
    artistNames.push(...String(more.primary_artists || s.primary_artists).split(",").map(cleanText));
  }
  if (more.artistMap?.artists?.length) {
    for (const a of more.artistMap.artists) {
      if (a?.name) artistNames.push(cleanText(a.name));
    }
  }
  if (more.music) {
    artistNames.push(...String(more.music).split(",").map(cleanText));
  }

  const uniqueArtists = [...new Set(artistNames.filter(a => a && a.toLowerCase() !== "unknown"))];
  const primaryArtists = uniqueArtists.slice(0, 4).join(", ") || cleanText(s.subtitle || "Unknown Artist");

  const rawImg = appleMeta?.artworkUrl || s.image || s.coverUrl;
  const hiResImg = upgradeImage(rawImg);
  const titleClean = cleanText(appleMeta?.trackName || s.title || s.song || "Untitled");
  const albumTitle = cleanText(appleMeta?.collectionName || more.album || s.album || "OpenMuse");
  const albumId = more.album_id || s.album_id || null;
  const durationSec = parseInt(more.duration || s.duration || appleMeta?.durationSec || "0", 10) || 0;
  const appleId = appleMeta?.appleTrackId || s.appleId || null;
  const idStr = String(s.id);
  const variantTag = extractTrackVariantTag(titleClean, albumTitle);

  const workerStream = directUrl
    ? `${origin}/stream?url=${encodeURIComponent(directUrl)}`
    : `${origin}/play?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;

  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${directUrl ? `&url=${encodeURIComponent(directUrl)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}&trackName=${encodeURIComponent(titleClean)}&artistName=${encodeURIComponent(primaryArtists)}&albumName=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;

  const cascade = directUrl ? buildSaavnBitrateCascade(directUrl) : [];

  const enrichedObj = {
    ...s,
    id: idStr,
    appleId: appleId ? String(appleId) : null,
    variant: variantTag,
    type: "song",
    itemType: "song",
    title: titleClean,
    artist: primaryArtists,
    allArtists: uniqueArtists,
    subtitle: primaryArtists,
    album: albumTitle,
    albumId: albumId ? String(albumId) : null,
    duration: durationSec,
    hasLyrics: true,
    image: hiResImg,
    coverUrl: proxyImg(hiResImg, origin),
    encrypted_media_url: enc || "",
    decrypted_media_url: directUrl,
    streamUrl: workerStream,
    playUrl: playEndpointUrl,
    lyricsUrl: lyricsEndpointUrl,
    more_info: {
      ...more,
      encrypted_media_url: enc || "",
      "320kbps": "true",
      album: albumTitle,
      album_id: albumId ? String(albumId) : null,
      primary_artists: primaryArtists,
      duration: String(durationSec)
    },
    DownloadQueryResult: {
      url: directUrl || playEndpointUrl,
      workerStreamUrl: workerStream,
      smartPlayUrl: playEndpointUrl,
      audioFormat: "MP4_AAC_LC",
      audioQuality: "KBPS320",
      cascade
    }
  };

  setBoundedMemo(SONG_META_MEMO, idStr, enrichedObj);
  if (appleId) {
    setBoundedMemo(SONG_META_MEMO, `apple:${appleId}`, enrichedObj);
  }
  return enrichedObj;
}

/**
 * Creates a playable track object from an Apple Music / iTunes item when a JioSaavn
 * track will be resolved on-demand via `/play` or matched from a JioSaavn candidate pool.
 */
function buildAppleBridgedSongObject(appleItem, matchedSaavnRaw, origin) {
  const appleTrackId = String(appleItem.trackId || appleItem.id || "");
  const trackName = cleanText(appleItem.trackName || appleItem.name || "Untitled");
  const artistName = cleanText(appleItem.artistName || "Unknown Artist");
  const collectionName = cleanText(appleItem.collectionName || appleItem.albumName || trackName);
  const durationSec = appleItem.trackTimeMillis
    ? Math.round(appleItem.trackTimeMillis / 1000)
    : (appleItem.durationSec || 0);
  const artworkUrl = upgradeImage(appleItem.artworkUrl100 || appleItem.artworkUrl || "");

  if (matchedSaavnRaw) {
    return enrichSaavnSong(matchedSaavnRaw, origin, {
      appleTrackId,
      trackName: matchedSaavnRaw.title && extractTrackVariantTag(matchedSaavnRaw.title) !== "standard"
        ? cleanText(matchedSaavnRaw.title)
        : trackName,
      artistName,
      collectionName,
      durationSec: parseInt(matchedSaavnRaw.more_info?.duration || matchedSaavnRaw.duration || String(durationSec), 10) || durationSec,
      artworkUrl: artworkUrl || matchedSaavnRaw.image
    });
  }

  // On-demand bridged song (resolves 320kbps JioSaavn master instantaneously when /play or /song is called)
  const syntheticId = `apple:${appleTrackId}`;
  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(syntheticId)}&appleId=${encodeURIComponent(appleTrackId)}&title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(collectionName)}&duration=${durationSec}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(syntheticId)}&appleId=${encodeURIComponent(appleTrackId)}&trackName=${encodeURIComponent(trackName)}&artistName=${encodeURIComponent(artistName)}&albumName=${encodeURIComponent(collectionName)}&duration=${durationSec}`;

  const bridgedObj = {
    id: syntheticId,
    appleId: appleTrackId,
    variant: extractTrackVariantTag(trackName, collectionName),
    type: "song",
    itemType: "song",
    title: trackName,
    artist: artistName,
    allArtists: artistName.split(/[,&]/).map(cleanText).filter(Boolean),
    subtitle: artistName,
    album: collectionName,
    albumId: appleItem.collectionId ? `apple:${appleItem.collectionId}` : null,
    duration: durationSec,
    hasLyrics: true,
    image: artworkUrl,
    coverUrl: proxyImg(artworkUrl, origin),
    encrypted_media_url: "",
    decrypted_media_url: playEndpointUrl,
    streamUrl: playEndpointUrl,
    playUrl: playEndpointUrl,
    lyricsUrl: lyricsEndpointUrl,
    more_info: {
      encrypted_media_url: "",
      "320kbps": "true",
      album: collectionName,
      primary_artists: artistName,
      duration: String(durationSec)
    },
    DownloadQueryResult: {
      url: playEndpointUrl,
      workerStreamUrl: playEndpointUrl,
      smartPlayUrl: playEndpointUrl,
      audioFormat: "MP4_AAC_LC",
      audioQuality: "KBPS320",
      cascade: [playEndpointUrl]
    }
  };

  setBoundedMemo(SONG_META_MEMO, syntheticId, bridgedObj);
  return bridgedObj;
}

/**
 * Matches an Apple Music track against a pool of JioSaavn candidate tracks,
 * ensuring variant parity (Original matches Original, Remix matches Remix).
 */
function findBestSaavnMatchForAppleTrack(appleItem, saavnPool) {
  if (!Array.isArray(saavnPool) || saavnPool.length === 0) return null;

  const appleTitleRaw = cleanText(appleItem.trackName || appleItem.name || "");
  const appleAlbumRaw = cleanText(appleItem.collectionName || "");
  const appleCore = normalizeTokenComparison(extractCoreTrackTitle(appleTitleRaw) || appleTitleRaw);
  const appleVariant = extractTrackVariantTag(appleTitleRaw, appleAlbumRaw);
  const appleArtists = String(appleItem.artistName || "")
    .split(/[,&/|]/)
    .map(a => normalizeTokenComparison(a))
    .filter(Boolean);
  const appleDur = appleItem.trackTimeMillis ? Math.round(appleItem.trackTimeMillis / 1000) : 0;

  let bestMatch = null;
  let bestScore = -999;

  for (const s of saavnPool) {
    if (!s || isLowQualityJunkTrack(s, appleTitleRaw)) continue;
    const sTitleRaw = cleanText(s.title || s.song || "");
    const sAlbumRaw = cleanText(s.more_info?.album || s.album || "");
    const sCore = normalizeTokenComparison(extractCoreTrackTitle(sTitleRaw) || sTitleRaw);
    const sVariant = extractTrackVariantTag(sTitleRaw, sAlbumRaw);

    if (!sCore || !appleCore) continue;

    // Require variant parity: don't match an unplugged/remix to a standard version unless both have the same variant
    if (appleVariant !== sVariant) continue;

    let score = 0;
    if (sCore === appleCore) {
      score += 100;
    } else if (sCore.includes(appleCore) || appleCore.includes(sCore)) {
      score += 75;
    } else {
      const aWords = appleCore.split(" ").filter(w => w.length >= 3);
      const matched = aWords.filter(w => sCore.includes(w));
      if (aWords.length > 0 && matched.length === aWords.length) {
        score += 68;
      } else {
        continue;
      }
    }

    const sArtistStr = normalizeTokenComparison(
      [
        s.more_info?.primary_artists,
        s.primary_artists,
        s.more_info?.singers,
        s.more_info?.music,
        s.subtitle
      ].filter(Boolean).join(" ")
    );

    let artistMatched = false;
    for (const aa of appleArtists) {
      const firstWord = aa.split(" ").find(w => w.length >= 3);
      if (sArtistStr.includes(aa) || (firstWord && firstWord.length >= 4 && sArtistStr.includes(firstWord))) {
        score += 65;
        artistMatched = true;
        break;
      }
    }

    const sDur = parseInt(s.more_info?.duration || s.duration || "0", 10) || 0;
    if (appleDur > 0 && sDur > 0) {
      const diff = Math.abs(appleDur - sDur);
      if (diff <= 4) score += 60;
      else if (diff <= 10) score += 35;
      else if (diff > 35 && !artistMatched) score -= 50;
    }

    if (s.more_info?.encrypted_media_url || s.encrypted_media_url) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = s;
    }
  }

  return bestScore >= 110 ? bestMatch : null;
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

async function resolveCompleteAlbum(albumIdOrToken, origin) {
  const cleanId = String(albumIdOrToken || "").trim();
  if (!cleanId) throw new Error("Missing album ID");

  // Support Apple Music bridged albums (`apple:12345678`) by resolving tracks via iTunes Lookup + JioSaavn
  if (cleanId.startsWith("apple:")) {
    const appleColId = cleanId.replace(/^apple:/, "");
    try {
      const res = await fetchWithTimeout(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appleColId)}&entity=song&country=in`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 4000);
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        const colInfo = results.find(r => r.wrapperType === "collection") || results[0] || {};
        const trackItems = results.filter(r => r.wrapperType === "track");
        const albumTitle = cleanText(colInfo.collectionName || "Album");
        const artistName = cleanText(colInfo.artistName || "Artist");

        let saavnPool = [];
        try {
          const sSearch = await fetchSaavnJson({
            __call: "search.getResults",
            api_version: "4",
            n: "30",
            p: "1",
            q: `${albumTitle} ${artistName}`
          });
          saavnPool = await batchHealMissingMediaUrls(sSearch?.results || []);
        } catch {}

        const enrichedSongs = trackItems.map(t => {
          const matched = findBestSaavnMatchForAppleTrack(t, saavnPool);
          return buildAppleBridgedSongObject(t, matched, origin);
        });

        const hiResImg = upgradeImage(colInfo.artworkUrl100 || "");
        return {
          id: cleanId,
          albumid: cleanId,
          type: "album",
          itemType: "album",
          title: albumTitle,
          name: albumTitle,
          artist: artistName,
          subtitle: artistName,
          year: colInfo.releaseDate ? String(colInfo.releaseDate).slice(0, 4) : "",
          image: hiResImg,
          coverUrl: proxyImg(hiResImg, origin),
          song_count: enrichedSongs.length,
          songs: enrichedSongs,
          list: enrichedSongs,
          relatedAlbums: []
        };
      }
    } catch {}
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

  const healedTracks = await batchHealMissingMediaUrls(rawTrackList);
  const enrichedSongs = deduplicateEnrichedSongs(
    healedTracks.map(s => enrichSaavnSong(s, origin)).filter(s => s && s.id)
  );

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
    songs: enrichedSongs,
    list: enrichedSongs,
    relatedAlbums
  };
}

// ============================================================================
// APPLE MUSIC HOMEPAGE FEEDER & INTELLIGENT HYBRID SEARCH ENGINE (FREE API)
// ============================================================================

/**
 * Fetches Apple Music Top Charts (India + Global + Language Curated) via Apple's
 * free RSS Marketing Tools & iTunes APIs, then bridges tracks to JioSaavn 320kbps masters.
 */
async function fetchAppleMusicHomeFeed(langParam, origin) {
  const langs = String(langParam || "english,hindi,malayalam,tamil,telugu")
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // 1. Fetch Apple Music Top Played Songs & Albums (India + US Global) + JioSaavn Trending Pool in parallel
  const appleChartUrls = [
    "https://rss.applemarketingtools.com/api/v2/in/music/most-played/35/songs.json",
    "https://rss.applemarketingtools.com/api/v2/us/music/most-played/20/songs.json",
    "https://rss.applemarketingtools.com/api/v2/in/music/most-played/16/albums.json"
  ];

  // Language-specific Apple iTunes high-popularity feeds so regional languages have fresh Apple-curated hits
  const langQueries = [];
  if (langs.includes("hindi")) langQueries.push("Bollywood Top Hits 2025 2026");
  if (langs.includes("malayalam")) langQueries.push("Malayalam Hits Sushin Shyam Anirudh");
  if (langs.includes("tamil")) langQueries.push("Tamil Hits Anirudh A.R. Rahman");
  if (langs.includes("telugu")) langQueries.push("Telugu Hits Thaman Devi Sri Prasad");

  const [
    inSongsRes,
    usSongsRes,
    inAlbumsRes,
    saavnTrendingRes,
    ...langItunesSettled
  ] = await Promise.allSettled([
    fetchWithTimeout(appleChartUrls[0], { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, 3400).then(r => r.ok ? r.json() : null),
    fetchWithTimeout(appleChartUrls[1], { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, 3400).then(r => r.ok ? r.json() : null),
    fetchWithTimeout(appleChartUrls[2], { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, 3400).then(r => r.ok ? r.json() : null),
    fetchSaavnJson({
      __call: "content.getTrending",
      api_version: "4",
      entity_type: "song",
      entity_language: langs.join(",") || "english,hindi,malayalam,tamil,telugu"
    }, 4200),
    ...langQueries.slice(0, 3).map(term =>
      fetchWithTimeout(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=in&media=music&entity=song&limit=10`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        3000
      ).then(r => r.ok ? r.json() : null)
    )
  ]);

  const appleChartTracks = [];
  const pushRssSongs = (rssObj) => {
    const results = rssObj?.feed?.results;
    if (Array.isArray(results)) {
      for (const item of results) {
        if (item && item.id && item.name) {
          appleChartTracks.push({
            trackId: item.id,
            trackName: item.name,
            artistName: item.artistName || "Unknown Artist",
            collectionName: item.collectionName || item.name,
            artworkUrl100: item.artworkUrl100 || ""
          });
        }
      }
    }
  };

  if (inSongsRes.status === "fulfilled" && inSongsRes.value) pushRssSongs(inSongsRes.value);
  if (usSongsRes.status === "fulfilled" && usSongsRes.value) pushRssSongs(usSongsRes.value);

  for (const lRes of langItunesSettled) {
    if (lRes.status === "fulfilled" && Array.isArray(lRes.value?.results)) {
      for (const item of lRes.value.results) {
        if (item && item.trackId && item.trackName) {
          appleChartTracks.push(item);
        }
      }
    }
  }

  // Raw JioSaavn trending songs pool
  const saavnRawItems = (saavnTrendingRes.status === "fulfilled" && Array.isArray(saavnTrendingRes.value))
    ? saavnTrendingRes.value
    : [];
  const saavnTrendingSongsRaw = saavnRawItems.filter(x => x && (x.type === "song" || x.more_info?.encrypted_media_url));

  // Batch-resolve top 14 Apple Chart tracks directly against JioSaavn search so they have instant 320kbps URLs
  const topAppleToResolve = appleChartTracks.slice(0, 14);
  const resolvedSaavnBatches = await Promise.allSettled(
    topAppleToResolve.map(at =>
      fetchSaavnJson({
        __call: "search.getResults",
        api_version: "4",
        n: "5",
        p: "1",
        q: `${extractCoreTrackTitle(at.trackName)} ${String(at.artistName || "").split(/[,&]/)[0]}`.trim()
      }, 3000)
    )
  );

  const combinedSaavnPool = [...saavnTrendingSongsRaw];
  for (const b of resolvedSaavnBatches) {
    if (b.status === "fulfilled" && Array.isArray(b.value?.results)) {
      combinedSaavnPool.push(...b.value.results);
    }
  }

  const healedSaavnPool = await batchHealMissingMediaUrls(combinedSaavnPool);

  // Build unified homepage song list: Apple Music Chart songs first (with JioSaavn 320kbps masters), then unique JioSaavn trending songs
  const candidateEnrichedSongs = [];

  for (const appleTrack of appleChartTracks) {
    const matchedSaavn = findBestSaavnMatchForAppleTrack(appleTrack, healedSaavnPool);
    candidateEnrichedSongs.push(buildAppleBridgedSongObject(appleTrack, matchedSaavn, origin));
  }

  for (const sRaw of healedSaavnPool) {
    if (!isLowQualityJunkTrack(sRaw)) {
      candidateEnrichedSongs.push(enrichSaavnSong(sRaw, origin));
    }
  }

  const uniqueHomeSongs = deduplicateEnrichedSongs(candidateEnrichedSongs).slice(0, 42);

  // Build Homepage Albums (Apple Music Top Albums + JioSaavn Albums)
  const albums = [];
  const seenAlbumTitles = new Set();

  if (inAlbumsRes.status === "fulfilled" && Array.isArray(inAlbumsRes.value?.feed?.results)) {
    for (const alb of inAlbumsRes.value.feed.results) {
      if (!alb?.id || !alb?.name) continue;
      const cleanName = cleanText(alb.name);
      const normKey = normalizeTokenComparison(cleanName);
      if (seenAlbumTitles.has(normKey)) continue;
      seenAlbumTitles.add(normKey);

      const hiImg = upgradeImage(alb.artworkUrl100 || "");
      const appleAlbId = `apple:${alb.id}`;
      albums.push({
        id: appleAlbId,
        albumid: appleAlbId,
        type: "album",
        itemType: "album",
        title: cleanName,
        name: cleanName,
        artist: cleanText(alb.artistName || "Apple Music Chart"),
        subtitle: cleanText(alb.artistName || "Album"),
        year: alb.releaseDate ? String(alb.releaseDate).slice(0, 4) : "",
        image: hiImg,
        coverUrl: proxyImg(hiImg, origin),
        workerAlbumUrl: `${origin}/album?id=${encodeURIComponent(appleAlbId)}`
      });
    }
  }

  const saavnAlbums = saavnRawItems
    .filter(x => x && (x.type === "album" || x.type === "playlist"))
    .map(a => enrichSaavnAlbum(a, origin));

  for (const sa of saavnAlbums) {
    const normKey = normalizeTokenComparison(sa.title);
    if (!seenAlbumTitles.has(normKey)) {
      seenAlbumTitles.add(normKey);
      albums.push(sa);
    }
  }

  return {
    songs: uniqueHomeSongs,
    albums: albums.slice(0, 20)
  };
}

/**
 * Intelligent Hybrid Search powered by Apple's free iTunes Search API + JioSaavn 320kbps Catalog.
 * Deduplicates identical tracks while preserving Remixes, Lofi, Unplugged, Slowed, and Language versions.
 */
async function executeIntelligentHybridSearch(query, origin) {
  const q = String(query || "Trending").trim();

  // Query Apple iTunes Search (Songs + Albums) and JioSaavn Search in parallel
  const [
    itunesSongsRes,
    itunesAlbumsRes,
    saavnSongsRes,
    saavnAlbumsRes
  ] = await Promise.allSettled([
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=20`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      3200
    ).then(r => r.ok ? r.json() : null),
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=album&limit=10`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      3200
    ).then(r => r.ok ? r.json() : null),
    fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "32", p: "1", q }, 4200),
    fetchSaavnJson({ __call: "search.getAlbumResults", api_version: "4", n: "16", p: "1", q }, 4200)
  ]);

  const appleSongHits = (itunesSongsRes.status === "fulfilled" && Array.isArray(itunesSongsRes.value?.results))
    ? itunesSongsRes.value.results
    : [];

  let saavnRawSongs = (saavnSongsRes.status === "fulfilled" && Array.isArray(saavnSongsRes.value?.results))
    ? saavnSongsRes.value.results
    : [];

  // If Apple Intelligent Search spell-corrected a fuzzy query that JioSaavn missed, run a fast supplemental JioSaavn lookup
  if (appleSongHits.length > 0 && saavnRawSongs.length < 4) {
    const topApple = appleSongHits[0];
    const correctedQ = `${extractCoreTrackTitle(topApple.trackName)} ${String(topApple.artistName || "").split(/[,&]/)[0]}`.trim();
    if (correctedQ && correctedQ.toLowerCase() !== q.toLowerCase()) {
      try {
        const extraSaavn = await fetchSaavnJson({
          __call: "search.getResults",
          api_version: "4",
          n: "20",
          p: "1",
          q: correctedQ
        }, 2800);
        if (Array.isArray(extraSaavn?.results)) {
          saavnRawSongs.push(...extraSaavn.results);
        }
      } catch {}
    }
  }

  const filteredSaavnRaw = saavnRawSongs.filter(s => !isLowQualityJunkTrack(s, q));
  const healedSaavnPool = await batchHealMissingMediaUrls(
    filteredSaavnRaw.length > 0 ? filteredSaavnRaw : saavnRawSongs
  );

  const combinedCandidates = [];
  const usedSaavnIds = new Set();

  // 1. Cross-match Apple Intelligent Search hits with JioSaavn 320kbps masters
  for (const appleHit of appleSongHits) {
    if (!appleHit || !appleHit.trackId) continue;
    if (isLowQualityJunkTrack({ title: appleHit.trackName, album: appleHit.collectionName, duration: (appleHit.trackTimeMillis || 0) / 1000 }, q)) {
      continue;
    }

    const matchedSaavn = findBestSaavnMatchForAppleTrack(appleHit, healedSaavnPool);
    if (matchedSaavn) {
      usedSaavnIds.add(String(matchedSaavn.id));
      combinedCandidates.push(buildAppleBridgedSongObject(appleHit, matchedSaavn, origin));
    } else {
      // Keep top Apple hits playable via on-demand /play bridge even if not in the first JioSaavn page
      combinedCandidates.push(buildAppleBridgedSongObject(appleHit, null, origin));
    }
  }

  // 2. Append remaining JioSaavn tracks (including important Remixes / Lofi / Unplugged / Regional versions!)
  for (const sRaw of healedSaavnPool) {
    if (!sRaw || !sRaw.id) continue;
    if (usedSaavnIds.has(String(sRaw.id))) continue;
    combinedCandidates.push(enrichSaavnSong(sRaw, origin));
  }

  // 3. Deduplicate identical standard tracks while preserving all distinct Remixes & Versions
  const deduplicatedSongs = deduplicateEnrichedSongs(combinedCandidates);

  // Prioritize songs that already have a direct 320kbps decrypted_media_url on Saavn CDN, while keeping Apple ranking order
  const directReady = deduplicatedSongs.filter(s => s.decrypted_media_url && s.decrypted_media_url.includes("saavncdn.com"));
  const onDemandBridged = deduplicatedSongs.filter(s => !s.decrypted_media_url || !s.decrypted_media_url.includes("saavncdn.com"));
  const finalSongs = [...directReady, ...onDemandBridged].slice(0, 30);

  // Merge Albums (Apple + JioSaavn, deduplicated)
  const finalAlbums = [];
  const seenAlbumKeys = new Set();

  if (saavnAlbumsRes.status === "fulfilled" && Array.isArray(saavnAlbumsRes.value?.results)) {
    for (const a of saavnAlbumsRes.value.results) {
      const enrichedAlb = enrichSaavnAlbum(a, origin);
      const key = normalizeTokenComparison(enrichedAlb.title);
      if (key && !seenAlbumKeys.has(key)) {
        seenAlbumKeys.add(key);
        finalAlbums.push(enrichedAlb);
      }
    }
  }

  if (itunesAlbumsRes.status === "fulfilled" && Array.isArray(itunesAlbumsRes.value?.results)) {
    for (const col of itunesAlbumsRes.value.results) {
      if (!col?.collectionId || !col?.collectionName) continue;
      const cleanName = cleanText(col.collectionName);
      const key = normalizeTokenComparison(cleanName);
      if (key && !seenAlbumKeys.has(key)) {
        seenAlbumKeys.add(key);
        const hiImg = upgradeImage(col.artworkUrl100 || "");
        const appleAlbId = `apple:${col.collectionId}`;
        finalAlbums.push({
          id: appleAlbId,
          albumid: appleAlbId,
          type: "album",
          itemType: "album",
          title: cleanName,
          name: cleanName,
          artist: cleanText(col.artistName || "Album"),
          subtitle: cleanText(col.artistName || "Album"),
          year: col.releaseDate ? String(col.releaseDate).slice(0, 4) : "",
          image: hiImg,
          coverUrl: proxyImg(hiImg, origin),
          workerAlbumUrl: `${origin}/album?id=${encodeURIComponent(appleAlbId)}`
        });
      }
    }
  }

  return {
    query: q,
    songs: finalSongs,
    albums: finalAlbums.slice(0, 18)
  };
}

// ============================================================================
// REAL-TIME WORD-BY-WORD LYRICS ENGINE v8.0
// (APPLE MUSIC IDENTITY BRIDGE + ENGLISH/ROMANIZED PRIORITY + ZERO SAAVN LYRICS)
// ============================================================================

/**
 * Evaluates script cleanliness and checks if lyrics are written in English / Romanized (Latin) script
 * vs. native Indic/CJK scripts or broken encoding codes.
 */
function evaluateLyricsScriptQuality(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { isValid: false, isLatinScript: false, latinRatio: 0, scoreBonus: -500 };
  }

  const vocalLines = lines.filter(l => l && !l.isInstrumental && l.text && l.text !== "♪");
  if (vocalLines.length === 0) {
    return { isValid: false, isLatinScript: false, latinRatio: 0, scoreBonus: -500 };
  }

  const joined = vocalLines.map(l => l.text).join(" ");

  // Reject broken HTML/encoding codes (e.g. &amp;#, &#039;, <div, \ufffd)
  if (/&(?:#\d+|#x[0-9a-f]+|quot|amp|lt|gt);|<\/?[a-z][\s\S]*?>|\ufffd/i.test(joined)) {
    return { isValid: false, isLatinScript: false, latinRatio: 0, scoreBonus: -300 };
  }

  const latinChars = (joined.match(/[a-zA-Z]/g) || []).length;
  const nonLatinChars = (joined.match(/[\u0900-\u0d7f\u0e00-\u0eff\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff]/g) || []).length;
  const totalAlpha = latinChars + nonLatinChars;

  if (totalAlpha === 0) {
    return { isValid: false, isLatinScript: false, latinRatio: 0, scoreBonus: -200 };
  }

  const latinRatio = latinChars / totalAlpha;
  const isLatinScript = latinRatio >= 0.68;

  // Strongly prefer English / Romanized written lyrics over non-Latin native script
  const scoreBonus = isLatinScript ? 130 : -45;

  return {
    isValid: true,
    isLatinScript,
    latinRatio,
    scoreBonus
  };
}

/**
 * Aggressively strips author/credit/sync/website/structural junk lines
 * while protecting legitimate song lyrics.
 */
function isCreditOrMetadataJunkLine(rawLine, trackTitle = "", artistName = "", lineIndex = 0, lineTimeSec = 0) {
  if (!rawLine) return true;
  const s = cleanText(rawLine)
    .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, "")
    .trim();

  if (!s) return true;

  // 1. Standard LRC metadata tags
  if (/^\[?(?:ti|ar|al|by|offset|length|re|ve|au|lr|id|tool|la|bg|Qq|total)\s*:/i.test(s)) {
    return true;
  }

  // 2. Structural section markers ([Verse 1], [Chorus], (Pre-Chorus), etc.)
  if (/^[\[(<~*-]*\s*(?:verse|chorus|pre-?\s*chorus|post-?\s*chorus|bridge|intro|outro|hook|interlude|refrain|instrumental(?:\s+break|\s+solo)?|guitar\s+solo|music(?:\s+break)?|solo|drop|beat\s+drop|repeat(?:\s+chorus)?|end)\s*\d*\s*[\])>~*-]*$/i.test(s)) {
    return true;
  }

  // 3. Explicit colon-based credit labels (Lyrics:, Lyricist:, Music:, Composer:, Synced:, etc.)
  if (/^(?:lyrics?|lyricists?|words|written|composed|music|bgm|score|produced|producer|arranged|arranger|sung|singers?|vocals?|vocalists?|performed|featuring|synced|synchronized|sync|timed|timing|edited|editor|transcribed|uploaded|uploader|created|creator|subtitles?|captions?|translated|translation|mixed|mastered|recorded|published|publisher|label|album|movie|film|starring|cast|director|audio|source|author|lrc|karaoke|by)\s*[:：\-–—]/i.test(s)) {
    return true;
  }

  // 4. Explicit "X by Y" credit phrases ("Lyrics by ...", "Synced by ...", "Music by ...", "Written by ...")
  if (/^(?:lyrics?|words|written|composed|music|song\s+by|track\s+by|produced|arranged|synced|synchronized|sync|timed|timing|edited|transcribed|uploaded|created|subtitles?|captions?|translated|translation|lrc|karaoke|audio|mixed|mastered|recorded|published)\s+by\b/i.test(s)) {
    return true;
  }

  // 5. Standalone "By @handle" or "By Name" credit line at start/end of track
  if ((lineIndex <= 2 || lineTimeSec < 12) && /^by\s+[@A-Za-z0-9_.\s]{2,35}$/i.test(s)) {
    if (!/^by\s+(?:the|your|my|me|now|side|myself|yourself|default|chance|heart|night|day|time|far|all|hand|grace|faith|blood|fire|water|light|god)\b/i.test(s)) {
      return true;
    }
  }

  // 6. CJK / Asian credit lines
  if (/^(?:作词|作詞|作曲|编曲|編曲|制作人?|製作人?|演唱|歌手|主唱|混音|母带|母帶|吉他|贝斯|鼓|弦乐|弦樂|和声|和聲|录音|錄音|统筹|統籌|出品|发行|發行|监制|監製|词|詞|曲|编|編|原唱|翻唱|后期|後期|文案|封面|OP|SP|LRC)\s*[:：]/iu.test(s)) {
    return true;
  }

  // 7. Website URLs, social handles, and commercial disclaimers
  if (/\b(?:www\.[a-z0-9-]+|https?:\/\/\S+|[a-z0-9-]+\.(?:com|net|org|io|me|in|co|ru|cn|info)\b|musixmatch|lrclib|lrcgenerator|megalobiz|rentanadviser|lyrics\.ovh|syair\.info|RCLyricsBand)/i.test(s)) {
    return true;
  }
  if (/this\s+lyrics?\s+is\s+not\s+for\s+commercial\s+use|\*{3,}|^[©℗]|all\s+rights\s+reserved|\bfollow\s+(?:me|us)\s+on\b|\bsubscribe\s+to\b/i.test(s)) {
    return true;
  }

  // 8. First-line Title - Artist echo (e.g. "Kesariya - Arijit Singh" at index 0)
  if (lineIndex === 0 && lineTimeSec < 10 && trackTitle && artistName) {
    const normLine = normalizeTokenComparison(s);
    const normTitle = normalizeTokenComparison(trackTitle);
    const normArtist = normalizeTokenComparison(artistName.split(",")[0]);
    if (
      normTitle &&
      normArtist &&
      normLine.includes(normTitle) &&
      normLine.includes(normArtist) &&
      (/[-–—:|•/]/.test(s) || normLine.length <= normTitle.length + normArtist.length + 6)
    ) {
      return true;
    }
  }

  return false;
}

function sanitizeLyricLineText(rawText) {
  if (!rawText) return "";
  let text = cleanText(rawText)
    .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, " ")
    .replace(/\[(?:verse|chorus|pre-?chorus|post-?chorus|bridge|intro|outro|hook|interlude|instrumental|repeat)[^\]]*\]/gi, " ")
    .replace(/\[bg\s*:[^\]]*\]/gi, " ")
    .replace(/^(?:v\d+|male|female|both|duet|chorus|all|singer\s*\d*|voice\s*\d*|m|f)\s*[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function extractLyricsSearchTokens(rawTitle, rawArtist, rawAlbum, extraArtists = []) {
  const fullTitle = cleanText(rawTitle || "");
  let extractedMovie = "";
  const fromMatch = fullTitle.match(/(?:from|movie|film)\s+["'“”‘’]?([^)"'\]”’]+)["'“”‘’]?/i);
  if (fromMatch && fromMatch[1]) {
    extractedMovie = fromMatch[1].trim();
  }

  const variantTag = extractTrackVariantTag(fullTitle, rawAlbum);

  const baseTitle = fullTitle
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/-\s*(from|feat|ft|original|ost|version|malayalam|tamil|telugu|hindi|kannada|punjabi|bengali|marathi|remix|lofi|lo-fi|slowed|reverb|unplugged|live|film|motion picture|video|lyrical|full\s+song|audio).*$/gi, " ")
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
    .filter(a => a && !/^(unknown|unknown artist|various artists|ost|traditional)$/i.test(a));

  const uniqueArtists = [...new Set(allArtistsRaw)];

  const cleanAlbum = cleanText(rawAlbum || extractedMovie || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/original motion picture soundtrack/gi, "")
    .replace(/-\s*(?:single|ep|ost|original.*)$/gi, "")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const validAlbum = (cleanAlbum && cleanAlbum.toLowerCase() !== "openmuse" && cleanAlbum.toLowerCase() !== primaryTitle.toLowerCase())
    ? cleanAlbum
    : (extractedMovie || "");

  return {
    primaryTitle,
    secondaryTitle,
    baseTitle: baseTitle || primaryTitle,
    variantTag,
    artists: uniqueArtists,
    album: validAlbum
  };
}

const SHORT_FUNCTION_WORDS = new Set([
  "a", "an", "the", "to", "in", "on", "at", "of", "for", "and", "or", "but",
  "is", "it", "its", "it's", "im", "i'm", "be", "by", "as", "so", "if", "we",
  "he", "me", "my", "do", "go", "no", "up", "us", "ki", "ka", "ke", "se", "ko",
  "na", "ne", "pe", "tu", "ho", "hi", "jo", "to", "ye", "wo"
]);

function estimateWordWeight(word, isLastWordInLine = false) {
  const raw = String(word || "").trim();
  if (!raw || raw === "♪" || raw === "•") return 1.0;

  const bare = raw.replace(/[^a-zA-Z0-9\u0900-\u0d7f\u4e00-\u9fff]/g, "");
  const lower = bare.toLowerCase();
  const len = Math.max(1, bare.length);

  const cjkCount = (bare.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinVowels = (bare.match(/[aeiouyAEIOUY]+/g) || []).length;
  const indicMatras = (bare.match(/[\u093e-\u094c\u0981-\u09cd\u0b82-\u0bcd\u0c01-\u0c4d\u0c82-\u0ccd\u0d02-\u0d4d]/g) || []).length;

  const syllableCount = Math.max(1, cjkCount + latinVowels + indicMatras || Math.ceil(len / 2.6));
  const hasElongation = /([aeiouy])\1{1,}|^(?:o+h+|a+h+|y+e+a+h*|w+o+a+h+|m+m+|h+m+|l+a+|n+a+|d+a+)$/i.test(lower) || /[~…]$/.test(raw);

  let weight = syllableCount * 1.15 + Math.min(8, len) * 0.22;

  if (SHORT_FUNCTION_WORDS.has(lower) && !isLastWordInLine) {
    weight *= 0.66;
  }
  if (hasElongation) {
    weight *= 1.45;
  }
  if (isLastWordInLine) {
    weight *= 1.32;
  }

  return Math.max(0.45, weight);
}

function getPostWordPauseRatio(word, isLastWordInLine) {
  if (isLastWordInLine) return 0;
  const raw = String(word || "").trim();
  if (/[.!?…]+["'”’)]*$/.test(raw)) return 0.45;
  if (/[,;:]+["'”’)]*$/.test(raw)) return 0.28;
  if (/[-–—]+$/.test(raw)) return 0.20;
  return 0;
}

function distributeWordsAcrossWindow(text, lineStartSec, vocalEndSec, lineHardEndSec) {
  const rawWords = String(text || "").split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) {
    const dur = Number(Math.max(0.1, lineHardEndSec - lineStartSec).toFixed(3));
    return [{
      word: "♪",
      text: "♪",
      time: lineStartSec,
      endTime: lineHardEndSec,
      duration: dur,
      timeMs: Math.round(lineStartSec * 1000),
      durationMs: Math.round(dur * 1000)
    }];
  }

  const n = rawWords.length;
  const wordWeights = rawWords.map((w, idx) => estimateWordWeight(w, idx === n - 1));
  const pauseWeights = rawWords.map((w, idx) => getPostWordPauseRatio(w, idx === n - 1));

  const totalUnits = Math.max(
    0.5,
    wordWeights.reduce((a, b) => a + b, 0) + pauseWeights.reduce((a, b) => a + b, 0)
  );
  const activeSpan = Math.max(0.22, vocalEndSec - lineStartSec);

  let cursor = lineStartSec;
  return rawWords.map((w, idx) => {
    const wordSpan = (wordWeights[idx] / totalUnits) * activeSpan;
    const pauseSpan = (pauseWeights[idx] / totalUnits) * activeSpan;
    const wStart = Number(cursor.toFixed(3));
    const wEnd = idx === n - 1
      ? Number(Math.max(wStart + 0.08, vocalEndSec).toFixed(3))
      : Number(Math.max(wStart + 0.05, cursor + wordSpan).toFixed(3));
    const wDur = Number(Math.max(0.05, wEnd - wStart).toFixed(3));
    cursor += wordSpan + pauseSpan;

    return {
      word: w,
      text: w,
      time: wStart,
      endTime: wEnd,
      duration: wDur,
      timeMs: Math.round(wStart * 1000),
      durationMs: Math.round(wDur * 1000)
    };
  });
}

function createInstrumentalCueLine(startTimeSec, endTimeSec, index = 0) {
  const safeStart = Number(Math.max(0, startTimeSec).toFixed(3));
  const safeEnd = Number(Math.max(safeStart + 0.8, endTimeSec).toFixed(3));
  const totalDur = Number((safeEnd - safeStart).toFixed(3));
  const symbols = ["♪", "•", "•", "•"];
  const step = totalDur / symbols.length;
  const words = symbols.map((sym, i) => {
    const wStart = Number((safeStart + i * step).toFixed(3));
    const wEnd = Number((safeStart + (i + 1) * step).toFixed(3));
    const wDur = Number(Math.max(0.05, wEnd - wStart).toFixed(3));
    return {
      word: sym,
      text: sym,
      time: wStart,
      endTime: wEnd,
      duration: wDur,
      timeMs: Math.round(wStart * 1000),
      durationMs: Math.round(wDur * 1000)
    };
  });

  return {
    index,
    time: safeStart,
    endTime: safeEnd,
    duration: totalDur,
    text: symbols.join(" "),
    isInstrumental: true,
    plainOnly: false,
    words
  };
}

function formatLrcTimestamp(sec) {
  const safe = Math.max(0, Number(sec) || 0);
  const mins = Math.floor(safe / 60);
  const rem = safe - mins * 60;
  const mm = String(mins).padStart(2, "0");
  const ss = rem.toFixed(2).padStart(5, "0");
  return `${mm}:${ss}`;
}

function buildEnhancedLrcFromTimeline(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  return lines
    .filter(l => l && !l.isInstrumental)
    .map(line => {
      const lineTag = `[${formatLrcTimestamp(line.time)}]`;
      if (Array.isArray(line.words) && line.words.length > 0) {
        const wordTags = line.words
          .map(w => `<${formatLrcTimestamp(w.time)}>${w.word}`)
          .join(" ");
        return `${lineTag}${wordTags}`;
      }
      return `${lineTag}${line.text}`;
    })
    .join("\n");
}

function buildStandardLrcFromTimeline(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  return lines
    .filter(l => l && !l.isInstrumental)
    .map(line => `[${formatLrcTimestamp(line.time)}]${line.text}`)
    .join("\n");
}

function buildLyricsPlusCompatiblePayload(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((l, idx) => ({
    time: Math.round(l.time * 1000),
    duration: Math.round(l.duration * 1000),
    text: l.text,
    syllabus: (l.words || []).map((w, wIdx, arr) => ({
      time: Math.round(w.time * 1000),
      duration: Math.round(Math.max(0.05, (w.endTime || w.time + 0.25) - w.time) * 1000),
      text: wIdx < arr.length - 1 ? `${w.word} ` : w.word
    })),
    element: { key: `L${idx + 1}` }
  }));
}

function finalizeTimelineMonotonic(rawEntries, totalDurationSec = 0, trackTitle = "", artistName = "") {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) return [];

  const cleanedEntries = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const item = rawEntries[i];
    if (!item) continue;
    const rawText = String(item.text || "").trim();
    if (rawText !== "♪" && rawText !== "♪ • • •") {
      if (isCreditOrMetadataJunkLine(rawText, trackTitle, artistName, cleanedEntries.length, item.time || 0)) {
        continue;
      }
    }
    const cleanLine = (rawText === "♪" || rawText === "♪ • • •")
      ? rawText
      : sanitizeLyricLineText(rawText);

    if (!cleanLine) continue;
    if (cleanLine !== "♪" && cleanLine !== "♪ • • •" && isCreditOrMetadataJunkLine(cleanLine, trackTitle, artistName, cleanedEntries.length, item.time || 0)) {
      continue;
    }

    cleanedEntries.push({
      ...item,
      time: Math.max(0, Number(item.time) || 0),
      endTime: item.endTime ? Number(item.endTime) : 0,
      text: cleanLine
    });
  }

  if (cleanedEntries.length === 0) return [];

  const sorted = [...cleanedEntries].sort((a, b) => a.time - b.time);

  const deduped = [];
  for (let i = 0; i < sorted.length; i++) {
    const item = { ...sorted[i] };
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(item.time - prev.time) < 0.06) {
      if (normalizeTokenComparison(item.text) === normalizeTokenComparison(prev.text)) {
        if (!prev.inlineWords?.length && item.inlineWords?.length) {
          prev.inlineWords = item.inlineWords;
        }
        continue;
      }
      if (prev.text === "♪" || prev.text === "♪ • • •") {
        prev.text = item.text;
        prev.inlineWords = item.inlineWords;
        prev.endTime = item.endTime;
        continue;
      }
      if (item.text === "♪" || item.text === "♪ • • •") continue;

      // If one of the colliding lines is in English/Latin script and the other is a non-Latin translation, keep the Latin line!
      const prevLatin = (prev.text.match(/[a-zA-Z]/g) || []).length;
      const itemLatin = (item.text.match(/[a-zA-Z]/g) || []).length;
      if (prevLatin >= 4 && itemLatin === 0) {
        continue;
      }
      if (itemLatin >= 4 && prevLatin === 0) {
        prev.text = item.text;
        prev.inlineWords = item.inlineWords;
        prev.endTime = item.endTime;
        continue;
      }

      let nextDistinctTime = prev.time + 3.6;
      for (let k = i + 1; k < sorted.length; k++) {
        if (sorted[k].time > prev.time + 0.25) {
          nextDistinctTime = sorted[k].time;
          break;
        }
      }
      const windowSpan = Math.max(0.8, nextDistinctTime - prev.time);
      item.time = Number((prev.time + Math.min(2.2, windowSpan * 0.48)).toFixed(3));
    }
    deduped.push(item);
  }

  const tempoSamples = [];
  for (let i = 0; i < deduped.length - 1; i++) {
    const cur = deduped[i];
    const nxt = deduped[i + 1];
    const gap = nxt.time - cur.time;
    if (gap >= 1.1 && gap <= 5.5 && cur.text !== "♪" && cur.text !== "♪ • • •") {
      const words = cur.text.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        const wSum = words.reduce((acc, w, idx) => acc + estimateWordWeight(w, idx === words.length - 1), 0);
        if (wSum > 0) tempoSamples.push((gap * 0.88) / wSum);
      }
    }
  }
  tempoSamples.sort((a, b) => a - b);
  const medianSecPerUnit = tempoSamples.length > 0
    ? tempoSamples[Math.floor(tempoSamples.length / 2)]
    : 0.24;
  const clampedTempoRate = Math.min(0.42, Math.max(0.15, medianSecPerUnit));

  const timeline = [];

  if (deduped.length > 0 && deduped[0].time > 1.5) {
    timeline.push(createInstrumentalCueLine(0, deduped[0].time, 0));
  } else if (deduped.length > 0 && deduped[0].time > 0 && deduped[0].time <= 0.6) {
    deduped[0].time = 0;
  }

  for (let i = 0; i < deduped.length; i++) {
    const entry = deduped[i];
    const nextEntry = deduped[i + 1];
    const fallbackEnd = totalDurationSec > entry.time ? totalDurationSec : entry.time + 4.5;
    const nextStartTime = nextEntry
      ? Number(Math.max(entry.time + 0.18, nextEntry.time).toFixed(3))
      : Number(Math.max(entry.time + 1.8, fallbackEnd).toFixed(3));

    const gapToNext = Number(Math.max(0.18, nextStartTime - entry.time).toFixed(3));
    const isInst = entry.text === "♪" || entry.text === "♪ • • •";

    if (isInst) {
      timeline.push(createInstrumentalCueLine(entry.time, nextStartTime, timeline.length));
      continue;
    }

    let words = [];
    let lineEndTime = nextStartTime;

    if (Array.isArray(entry.inlineWords) && entry.inlineWords.length > 0) {
      const validInline = entry.inlineWords.filter(iw => iw && String(iw.word || iw.text || "").trim());
      words = validInline.map((iw, wIdx) => {
        const nextIw = validInline[wIdx + 1];
        const wText = String(iw.word || iw.text || "").trim();
        const wStart = Number(Math.max(entry.time, Number(iw.time) || entry.time).toFixed(3));
        let rawEnd = iw.endTime ? Number(iw.endTime) : (nextIw ? Number(nextIw.time) : (entry.endTime || wStart + 0.42));
        if (nextIw && rawEnd > Number(nextIw.time)) {
          rawEnd = Number(nextIw.time);
        }
        const wEnd = Number(Math.max(wStart + 0.05, Math.min(nextStartTime, rawEnd)).toFixed(3));
        const wDur = Number(Math.max(0.05, wEnd - wStart).toFixed(3));
        const wordObj = {
          word: wText,
          text: wText,
          time: wStart,
          endTime: wEnd,
          duration: wDur,
          timeMs: Math.round(wStart * 1000),
          durationMs: Math.round(wDur * 1000)
        };
        if (Array.isArray(iw.syllables) && iw.syllables.length > 0) {
          wordObj.syllables = iw.syllables;
        }
        return wordObj;
      });

      const lastWordEnd = words.length > 0 ? words[words.length - 1].endTime : entry.time + 2.0;
      if (entry.endTime && entry.endTime > entry.time && entry.endTime <= nextStartTime) {
        lineEndTime = Number(Math.max(lastWordEnd, entry.endTime).toFixed(3));
      } else if (nextStartTime - lastWordEnd >= 5.5) {
        lineEndTime = Number(Math.min(nextStartTime, lastWordEnd + 0.6).toFixed(3));
      }
    } else {
      const wordList = entry.text.split(/\s+/).filter(Boolean);
      const totalWordWeight = wordList.reduce(
        (acc, w, idx) => acc + estimateWordWeight(w, idx === wordList.length - 1) + getPostWordPauseRatio(w, idx === wordList.length - 1),
        0
      );
      const expectedVocalSpan = Math.max(0.85, totalWordWeight * clampedTempoRate);

      let vocalSpan;
      if (entry.endTime && entry.endTime > entry.time && entry.endTime <= nextStartTime) {
        vocalSpan = Math.max(0.25, entry.endTime - entry.time);
      } else if (gapToNext <= 4.2) {
        vocalSpan = Math.max(0.22, Math.min(gapToNext * 0.92, Math.max(gapToNext * 0.76, expectedVocalSpan)));
      } else {
        vocalSpan = Math.min(gapToNext * 0.90, Math.max(1.25, expectedVocalSpan * 1.32));
      }

      const vocalEndSec = Number(Math.min(nextStartTime, entry.time + vocalSpan).toFixed(3));
      if (nextStartTime - vocalEndSec >= 5.5) {
        lineEndTime = Number(Math.min(nextStartTime, vocalEndSec + 0.5).toFixed(3));
      }

      words = distributeWordsAcrossWindow(entry.text, entry.time, vocalEndSec, lineEndTime);
    }

    const lineDuration = Number(Math.max(0.18, lineEndTime - entry.time).toFixed(3));

    timeline.push({
      index: timeline.length,
      time: Number(entry.time.toFixed(3)),
      endTime: lineEndTime,
      duration: lineDuration,
      text: entry.text,
      isInstrumental: false,
      plainOnly: false,
      words
    });

    if (nextEntry && nextStartTime - lineEndTime >= 5.0) {
      timeline.push(createInstrumentalCueLine(lineEndTime, nextStartTime, timeline.length));
    }
  }

  return timeline;
}

function parseLyricsPlusJsonToTimeline(data, totalDurationSec = 0, trackTitle = "", artistName = "") {
  const rawLyrics = data?.lyrics;
  if (!Array.isArray(rawLyrics) || rawLyrics.length === 0) return null;

  const maxRawTime = rawLyrics.reduce((m, l) => Math.max(m, Number(l?.time) || 0), 0);
  const toSec = (val) => {
    const n = Number(val) || 0;
    return maxRawTime > 1000 ? n / 1000 : n;
  };

  let hasTrueWordSync = false;
  const entries = [];

  for (const line of rawLyrics) {
    if (!line) continue;
    const lineStart = toSec(line.time);
    const lineDur = toSec(line.duration);
    const lineEnd = lineDur > 0 ? lineStart + lineDur : 0;

    const syllabus = Array.isArray(line.syllabus) ? line.syllabus : [];
    let lineText = cleanText(line.text || "");
    if (!lineText && syllabus.length > 0) {
      lineText = cleanText(syllabus.map(s => s.text || "").join(""));
    }
    if (!lineText) continue;

    let inlineWords = null;

    if (syllabus.length > 0) {
      hasTrueWordSync = true;
      const usesTrailingSpace = syllabus.some(s => typeof s?.text === "string" && /\s$/.test(s.text));

      if (usesTrailingSpace) {
        const groupedWords = [];
        let curWordText = "";
        let curStart = null;
        let curEnd = null;
        let curSyllables = [];

        for (let k = 0; k < syllabus.length; k++) {
          const syl = syllabus[k];
          if (!syl || syl.isBackground) continue;
          const rawSylText = String(syl.text || "");
          const trimmedSyl = cleanText(rawSylText);
          if (!trimmedSyl) continue;

          const sStart = toSec(syl.time);
          const sDur = Math.max(0.05, toSec(syl.duration) || 0.22);
          const sEnd = sStart + sDur;

          if (curStart === null) curStart = sStart;
          curEnd = sEnd;
          curWordText += trimmedSyl;
          curSyllables.push({
            text: trimmedSyl,
            time: Number(sStart.toFixed(3)),
            endTime: Number(sEnd.toFixed(3)),
            duration: Number(sDur.toFixed(3))
          });

          const isWordEnd = /\s$/.test(rawSylText) || k === syllabus.length - 1;
          if (isWordEnd && curWordText) {
            groupedWords.push({
              word: curWordText,
              text: curWordText,
              time: Number(curStart.toFixed(3)),
              endTime: Number(curEnd.toFixed(3)),
              syllables: curSyllables
            });
            curWordText = "";
            curStart = null;
            curEnd = null;
            curSyllables = [];
          }
        }

        if (groupedWords.length > 0) {
          inlineWords = groupedWords;
        }
      } else {
        inlineWords = syllabus
          .filter(s => s && cleanText(s.text))
          .map(s => {
            const sStart = toSec(s.time);
            const sDur = Math.max(0.06, toSec(s.duration) || 0.25);
            const w = cleanText(s.text);
            return {
              word: w,
              text: w,
              time: Number(sStart.toFixed(3)),
              endTime: Number((sStart + sDur).toFixed(3))
            };
          });
      }
    }

    entries.push({
      time: lineStart,
      endTime: lineEnd,
      text: lineText,
      inlineWords
    });
  }

  const lines = finalizeTimelineMonotonic(entries, totalDurationSec, trackTitle, artistName);
  if (lines.length === 0) return null;

  const scriptQual = evaluateLyricsScriptQuality(lines);

  return {
    lines,
    hasTrueWordSync: hasTrueWordSync || String(data?.type || "").toLowerCase() === "word",
    isLatinScript: scriptQual.isLatinScript,
    upstreamSource: data?.metadata?.source || "LyricsPlus"
  };
}

function parseTtmlTimestamp(rawTime) {
  if (rawTime === undefined || rawTime === null) return null;
  const s = String(rawTime).trim();
  if (!s) return null;

  if (s.endsWith("ms")) {
    return Math.max(0, parseFloat(s.slice(0, -2)) / 1000);
  }
  if (s.endsWith("s")) {
    return Math.max(0, parseFloat(s.slice(0, -1)));
  }

  const parts = s.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) {
    return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  if (parts.length === 2) {
    return Math.max(0, parts[0] * 60 + parts[1]);
  }
  return Math.max(0, parts[0]);
}

function parseTtmlToTimeline(ttmlXml, totalDurationSec = 0, trackTitle = "", artistName = "") {
  if (!ttmlXml || typeof ttmlXml !== "string" || !ttmlXml.includes("<p")) return [];

  const entries = [];
  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let pMatch;

  while ((pMatch = pRegex.exec(ttmlXml)) !== null) {
    const pAttrs = pMatch[1] || "";
    let pInner = pMatch[2] || "";

    pInner = pInner.replace(/<span\b[^>]*(?:ttm:role|role)\s*=\s*["']x-bg["'][^>]*>[\s\S]*?<\/span>/gi, " ");

    const beginAttr = pAttrs.match(/\bbegin\s*=\s*["']([^"']+)["']/i);
    const endAttr = pAttrs.match(/\bend\s*=\s*["']([^"']+)["']/i);
    const lineStart = parseTtmlTimestamp(beginAttr?.[1]);
    const lineEnd = parseTtmlTimestamp(endAttr?.[1]);

    const spanRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>(\s*)/gi;
    let sMatch;
    const inlineWords = [];
    let curWord = "";
    let curStart = null;
    let curEnd = null;
    let curSyllables = [];

    while ((sMatch = spanRegex.exec(pInner)) !== null) {
      const sAttrs = sMatch[1] || "";
      const rawContent = sMatch[2].replace(/<[^>]+>/g, "");
      const trailingSpace = sMatch[3] || "";
      const hasSpaceInsideEnd = /\s$/.test(rawContent);
      const tokenText = cleanText(rawContent);
      if (!tokenText) continue;

      const sBegin = parseTtmlTimestamp(sAttrs.match(/\bbegin\s*=\s*["']([^"']+)["']/i)?.[1]);
      const sEnd = parseTtmlTimestamp(sAttrs.match(/\bend\s*=\s*["']([^"']+)["']/i)?.[1]);
      if (sBegin === null) continue;

      const effectiveEnd = sEnd !== null && sEnd > sBegin ? sEnd : sBegin + 0.24;

      if (curStart === null) curStart = sBegin;
      curEnd = effectiveEnd;
      curWord += tokenText;
      curSyllables.push({
        text: tokenText,
        time: Number(sBegin.toFixed(3)),
        endTime: Number(effectiveEnd.toFixed(3))
      });

      if (trailingSpace.length > 0 || hasSpaceInsideEnd) {
        inlineWords.push({
          word: curWord,
          text: curWord,
          time: Number(curStart.toFixed(3)),
          endTime: Number(curEnd.toFixed(3)),
          syllables: curSyllables
        });
        curWord = "";
        curStart = null;
        curEnd = null;
        curSyllables = [];
      }
    }

    if (curWord && curStart !== null) {
      inlineWords.push({
        word: curWord,
        text: curWord,
        time: Number(curStart.toFixed(3)),
        endTime: Number((curEnd || curStart + 0.3).toFixed(3)),
        syllables: curSyllables
      });
    }

    const plainLine = inlineWords.length > 0
      ? inlineWords.map(w => w.word).join(" ")
      : cleanText(pInner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

    if (!plainLine) continue;
    const effectiveLineStart = lineStart !== null
      ? lineStart
      : (inlineWords[0]?.time ?? null);

    if (effectiveLineStart === null) continue;

    entries.push({
      time: effectiveLineStart,
      endTime: lineEnd || (inlineWords.length > 0 ? inlineWords[inlineWords.length - 1].endTime : 0),
      text: plainLine,
      inlineWords: inlineWords.length > 0 ? inlineWords : null
    });
  }

  return finalizeTimelineMonotonic(entries, totalDurationSec, trackTitle, artistName);
}

function parseLrcToTimeline(lrcString, totalDurationSec = 0, trackTitle = "", artistName = "") {
  if (!lrcString || typeof lrcString !== "string") return { lines: [], hasEnhancedWordTags: false };

  let offsetMs = 0;
  const offsetMatch = lrcString.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  if (offsetMatch) offsetMs = parseInt(offsetMatch[1], 10) || 0;

  const rawLines = lrcString.split(/\r?\n/);
  const parsedEntries = [];
  const lineTimeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const wordAnchorRegex = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>([^<]*)/g;

  let hasEnhancedWordTags = false;

  const parseTimestampToSec = (m, s, f) => {
    const min = parseInt(m, 10);
    const sec = parseInt(s, 10);
    const fracRaw = f || "0";
    const ms = fracRaw.length === 1
      ? parseInt(fracRaw, 10) * 100
      : fracRaw.length === 2
        ? parseInt(fracRaw, 10) * 10
        : parseInt(fracRaw.slice(0, 3), 10);
    return Math.max(0, min * 60 + sec + (ms - offsetMs) / 1000);
  };

  for (const line of rawLines) {
    const timestamps = [];
    let match;
    lineTimeRegex.lastIndex = 0;
    while ((match = lineTimeRegex.exec(line)) !== null) {
      timestamps.push(Number(parseTimestampToSec(match[1], match[2], match[3]).toFixed(3)));
    }

    if (timestamps.length === 0) continue;

    const contentRaw = line.replace(lineTimeRegex, "").trim();
    const cleanLineText = sanitizeLyricLineText(contentRaw);

    if (contentRaw && !cleanLineText) continue;

    const anchors = [];
    wordAnchorRegex.lastIndex = 0;
    let wMatch;
    while ((wMatch = wordAnchorRegex.exec(contentRaw)) !== null) {
      anchors.push({
        time: parseTimestampToSec(wMatch[1], wMatch[2], wMatch[3]),
        text: wMatch[4] || ""
      });
    }

    let inlineWords = null;
    if (anchors.length > 0) {
      hasEnhancedWordTags = true;
      const builtWords = [];
      for (let aIdx = 0; aIdx < anchors.length; aIdx++) {
        const curAnchor = anchors[aIdx];
        const nextAnchor = anchors[aIdx + 1];
        const segText = cleanText(curAnchor.text);
        if (!segText) continue;

        const subWords = segText.split(/\s+/).filter(Boolean);
        const segStart = curAnchor.time;
        const segEnd = nextAnchor
          ? Math.max(segStart + 0.06 * subWords.length, nextAnchor.time)
          : segStart + Math.max(0.32, subWords.length * 0.34);

        if (subWords.length === 1) {
          builtWords.push({
            word: subWords[0],
            text: subWords[0],
            time: Number(segStart.toFixed(3)),
            endTime: Number(segEnd.toFixed(3))
          });
        } else {
          const interpolated = distributeWordsAcrossWindow(segText, segStart, segEnd, segEnd);
          builtWords.push(...interpolated);
        }
      }
      if (builtWords.length > 0) {
        inlineWords = builtWords;
      }
    }

    const lineEndFromAnchor = anchors.length > 1 && !cleanText(anchors[anchors.length - 1].text)
      ? anchors[anchors.length - 1].time
      : 0;

    for (const t of timestamps) {
      parsedEntries.push({
        time: t,
        endTime: lineEndFromAnchor > t ? lineEndFromAnchor : 0,
        text: cleanLineText || "♪",
        inlineWords: inlineWords && timestamps.length === 1 ? inlineWords : null
      });
    }
  }

  const lines = finalizeTimelineMonotonic(parsedEntries, totalDurationSec, trackTitle, artistName);
  return { lines, hasEnhancedWordTags };
}

function parseNeteaseYrcToTimeline(yrcString, totalDurationSec = 0, trackTitle = "", artistName = "") {
  if (!yrcString || typeof yrcString !== "string") return [];
  const rawLines = yrcString.split(/\r?\n/);
  const entries = [];

  for (const line of rawLines) {
    const lineMeta = line.match(/^\[(\d+),(\d+)\](.*)$/);
    if (!lineMeta) continue;
    const lineStartSec = parseInt(lineMeta[1], 10) / 1000;
    const lineDurSec = parseInt(lineMeta[2], 10) / 1000;
    const body = lineMeta[3] || "";

    const wordRegex = /\((\d+),(\d+),\d+\)([^\r\n(]*)/g;
    let wm;
    const inlineWords = [];
    const textParts = [];

    while ((wm = wordRegex.exec(body)) !== null) {
      const wStart = parseInt(wm[1], 10) / 1000;
      const wDur = Math.max(0.06, parseInt(wm[2], 10) / 1000);
      const wText = cleanText(wm[3]);
      if (!wText) continue;
      textParts.push(wText);
      inlineWords.push({
        word: wText,
        text: wText,
        time: Number(wStart.toFixed(3)),
        endTime: Number((wStart + wDur).toFixed(3))
      });
    }

    const joined = textParts.join(" ").replace(/\s+/g, " ").trim();
    if (joined) {
      entries.push({
        time: Number(lineStartSec.toFixed(3)),
        endTime: lineDurSec > 0 ? Number((lineStartSec + lineDurSec).toFixed(3)) : 0,
        text: joined,
        inlineWords
      });
    }
  }

  return finalizeTimelineMonotonic(entries, totalDurationSec, trackTitle, artistName);
}

function buildEstimatedTimelineFromPlain(plainLyrics, totalDurationSec = 190, trackTitle = "", artistName = "") {
  if (!plainLyrics) return [];
  const rawLines = String(plainLyrics)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\r?\n/)
    .map(l => sanitizeLyricLineText(l))
    .filter((l, idx) => l && !isCreditOrMetadataJunkLine(l, trackTitle, artistName, idx, idx * 4));

  if (rawLines.length === 0) return [];

  const effectiveTotal = totalDurationSec > 35 ? totalDurationSec : 195;
  const introOffset = Math.min(8.0, Math.max(2.5, effectiveTotal * 0.045));
  const outroBuffer = Math.min(12.0, Math.max(4.0, effectiveTotal * 0.06));
  const usableWindow = Math.max(30, effectiveTotal - introOffset - outroBuffer);

  const lineWeights = rawLines.map(line => {
    const words = line.split(/\s+/).filter(Boolean);
    const wordSum = words.reduce((acc, w, idx) => acc + estimateWordWeight(w, idx === words.length - 1), 0);
    return Math.max(3.8, wordSum + 1.6);
  });
  const totalWeight = Math.max(1, lineWeights.reduce((a, b) => a + b, 0));

  let cursor = introOffset;
  const rawEntries = rawLines.map((text, idx) => {
    const span = Math.max(1.35, (lineWeights[idx] / totalWeight) * usableWindow);
    const startSec = Number(cursor.toFixed(3));
    cursor += span;
    return {
      time: startSec,
      endTime: Number((startSec + span * 0.90).toFixed(3)),
      text
    };
  });

  return finalizeTimelineMonotonic(rawEntries, effectiveTotal, trackTitle, artistName);
}

function buildInstrumentalFallbackTimeline(trackTitle, artistName, totalDurationSec = 180) {
  const dur = totalDurationSec > 30 ? totalDurationSec : 180;
  const title = cleanText(trackTitle || "Instrumental");
  const artist = cleanText(artistName || "OpenMuse");
  const cues = [
    `♪ ${title} — ${artist}`,
    "♪ • • •",
    "♪ Melodic Interlude • • •",
    "♪ • • •",
    `♪ ${title}`,
    "♪ • • •"
  ];
  const step = dur / cues.length;
  const entries = cues.map((text, idx) => ({
    time: Number((idx * step).toFixed(3)),
    text
  }));
  return finalizeTimelineMonotonic(entries, dur);
}

function normalizeTokenComparison(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/sh/g, "s")
    .replace(/zh/g, "l")
    .replace(/kh/g, "k")
    .replace(/bh/g, "b")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/ph/g, "f")
    .replace(/[^a-z0-9\u0900-\u0d7f\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLrcCandidate(item, tokens, durationSec, checkScriptQuality = false) {
  if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -999;

  const rawItemTitle = String(item.trackName || item.name || "").toLowerCase();
  const rawSearchTitle = String(tokens.primaryTitle || "").toLowerCase();

  if (/\b(karaoke|8d|instrumental|ringtone)\b/i.test(rawItemTitle) && !/\b(karaoke|8d|instrumental|ringtone)\b/i.test(rawSearchTitle)) {
    return -500;
  }

  const itemTitle = normalizeTokenComparison(extractCoreTrackTitle(item.trackName || item.name || "") || item.trackName || "");
  const itemArtist = normalizeTokenComparison(item.artistName || "");
  const itemAlbum = normalizeTokenComparison(item.albumName || "");
  const targetTitle = normalizeTokenComparison(tokens.primaryTitle);
  const altTitle = normalizeTokenComparison(tokens.secondaryTitle);

  let titleScore = 0;
  if (targetTitle && itemTitle === targetTitle) {
    titleScore = 95;
  } else if (targetTitle && (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle))) {
    titleScore = 76;
  } else if (altTitle && altTitle.length >= 3 && (itemTitle === altTitle || itemTitle.includes(altTitle))) {
    titleScore = 68;
  } else if (targetTitle) {
    const targetWords = targetTitle.split(" ").filter(w => w.length >= 3);
    const matchedWords = targetWords.filter(w => itemTitle.includes(w));
    if (targetWords.length > 0 && matchedWords.length === targetWords.length) {
      titleScore = 70;
    } else if (targetWords.length >= 2 && matchedWords.length >= targetWords.length - 1) {
      titleScore = 52;
    }
  }

  if (titleScore === 0) return -500;

  let score = titleScore;
  let contextMatched = false;

  for (const a of tokens.artists) {
    const normA = normalizeTokenComparison(a);
    if (!normA) continue;
    const words = normA.split(" ").filter(w => w.length >= 3);
    if (itemArtist.includes(normA) || normA.includes(itemArtist) || words.some(w => w.length >= 4 && itemArtist.includes(w))) {
      score += 70;
      contextMatched = true;
      break;
    }
    if (itemAlbum && words.some(w => w.length >= 4 && itemAlbum.includes(w))) {
      score += 48;
      contextMatched = true;
      break;
    }
  }

  if (tokens.album) {
    const normAlb = normalizeTokenComparison(tokens.album);
    const albWords = normAlb.split(" ").filter(w => w.length >= 3);
    if (normAlb && (itemAlbum.includes(normAlb) || itemTitle.includes(normAlb) || itemArtist.includes(normAlb) || albWords.some(w => w.length >= 4 && (itemAlbum.includes(w) || itemArtist.includes(w))))) {
      score += 62;
      contextMatched = true;
    }
  }

  if (durationSec > 0 && item.duration) {
    const diff = Math.abs(durationSec - Number(item.duration));
    if (diff <= 3) {
      score += 85;
      contextMatched = true;
    } else if (diff <= 8) {
      score += 58;
      contextMatched = true;
    } else if (diff <= 18) {
      score += 28;
    } else if (diff > 45 && !contextMatched) {
      score -= 45;
    }
  }

  if (item.syncedLyrics) {
    if (/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/.test(item.syncedLyrics)) {
      score += 145;
    } else {
      score += 95;
    }
  } else if (item.plainLyrics) {
    score += 25;
  }

  // Prefer English / Romanized (Latin script) lyrics over native Indic/CJK scripts
  if (checkScriptQuality) {
    const sampleText = String(item.syncedLyrics || item.plainLyrics || "")
      .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, " ")
      .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, " ");
    const latinCount = (sampleText.match(/[a-zA-Z]/g) || []).length;
    const nonLatinCount = (sampleText.match(/[\u0900-\u0d7f\u4e00-\u9fff]/g) || []).length;
    if (latinCount + nonLatinCount > 20) {
      const ratio = latinCount / (latinCount + nonLatinCount);
      if (ratio >= 0.70) score += 115; // Strong boost for English-written / Romanized lyrics
      else score -= 55;
    }
  }

  return score;
}

/**
 * Multi-Vector iTunes / Apple Music Identity Resolver.
 * Bridges JioSaavn's naming conventions (where artists list 3-4 composers/singers and
 * titles contain film names or hooks) to Apple Music's exact Track ID, Title, Artist, and Album.
 */
async function resolveAppleMusicIdentity(tokens, durationSec, explicitAppleId = "") {
  const memoKey = `${tokens.primaryTitle.toLowerCase()}__${(tokens.artists[0] || "").toLowerCase()}__${durationSec}`;
  if (APPLE_IDENTITY_MEMO.has(memoKey)) {
    return APPLE_IDENTITY_MEMO.get(memoKey);
  }

  try {
    // 1. If we already have an explicit Apple Track ID (from /home or /search), look it up directly
    if (explicitAppleId && /^\d+$/.test(String(explicitAppleId))) {
      const lookupRes = await fetchWithTimeout(
        `https://itunes.apple.com/lookup?id=${encodeURIComponent(explicitAppleId)}&country=in`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2400
      );
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        const hit = lookupData?.results?.[0];
        if (hit && hit.trackId) {
          const cleanTitle = extractCoreTrackTitle(hit.trackName || "") || cleanText(hit.trackName || tokens.primaryTitle);
          const cleanAlb = cleanText(hit.collectionName || "").replace(/\s*-\s*(?:Single|EP|Original Motion Picture Soundtrack)$/i, "").trim();
          const identity = {
            appleTrackId: String(hit.trackId),
            canonicalTitle: cleanTitle,
            fullAppleTitle: cleanText(hit.trackName || cleanTitle),
            canonicalArtist: cleanText(hit.artistName || ""),
            primaryAppleArtist: cleanText(String(hit.artistName || "").split(/[,&]/)[0]),
            canonicalAlbum: cleanAlb,
            canonicalDuration: hit.trackTimeMillis ? Math.round(hit.trackTimeMillis / 1000) : durationSec
          };
          setBoundedMemo(APPLE_IDENTITY_MEMO, memoKey, identity);
          return identity;
        }
      }
    }

    // 2. Build Multi-Vector iTunes Search Queries to bridge JioSaavn <-> Apple Music differences
    const searchQueries = [];
    if (tokens.primaryTitle && tokens.artists[0]) {
      searchQueries.push(`${tokens.primaryTitle} ${tokens.artists[0]}`);
    }
    if (tokens.primaryTitle && tokens.album) {
      searchQueries.push(`${tokens.primaryTitle} ${tokens.album}`);
    }
    if (tokens.primaryTitle && tokens.artists[1]) {
      searchQueries.push(`${tokens.primaryTitle} ${tokens.artists[1]}`);
    }
    if (tokens.secondaryTitle && tokens.secondaryTitle.length >= 3) {
      searchQueries.push(`${tokens.secondaryTitle} ${tokens.artists[0] || tokens.album || ""}`.trim());
    }
    if (tokens.primaryTitle) {
      searchQueries.push(tokens.primaryTitle);
    }

    const uniqueQueries = [...new Set(searchQueries.filter(Boolean))].slice(0, 3);
    const urls = [];
    for (const q of uniqueQueries) {
      urls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=6`);
    }
    if (uniqueQueries[0]) {
      urls.push(`https://itunes.apple.com/search?term=${encodeURIComponent(uniqueQueries[0])}&country=us&media=music&entity=song&limit=5`);
    }

    const settled = await Promise.allSettled(
      urls.map(u => fetchWithTimeout(u, { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, 2500).then(r => r.ok ? r.json() : null))
    );

    const allResults = [];
    const seenTrackIds = new Set();
    for (const res of settled) {
      if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
        for (const r of res.value.results) {
          if (r && r.trackId && !seenTrackIds.has(r.trackId)) {
            seenTrackIds.add(r.trackId);
            allResults.push(r);
          }
        }
      }
    }

    if (allResults.length === 0) return null;

    let bestHit = null;
    let bestScore = -999;

    for (const r of allResults) {
      const rVariant = extractTrackVariantTag(r.trackName || "", r.collectionName || "");
      // Prefer variant parity (e.g., if searching for standard version, don't pick a remix on Apple Music unless requested)
      if (tokens.variantTag === "standard" && rVariant !== "standard") continue;

      const cand = {
        trackName: r.trackName,
        artistName: r.artistName,
        albumName: r.collectionName,
        duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 0,
        syncedLyrics: "1"
      };
      const sc = scoreLrcCandidate(cand, tokens, durationSec, false);
      if (sc > bestScore) {
        bestScore = sc;
        bestHit = r;
      }
    }

    if (!bestHit || bestScore < 58) return null;

    const cleanCanonicalTitle = extractCoreTrackTitle(bestHit.trackName || "") || cleanText(bestHit.trackName || tokens.primaryTitle);
    const cleanAlb = cleanText(bestHit.collectionName || "")
      .replace(/\s*\((?:original\s+motion\s+picture\s+soundtrack|deluxe|special\s+edition).*?\)/gi, "")
      .replace(/\s*-\s*(?:Single|EP|Original Motion Picture Soundtrack)$/i, "")
      .trim();

    const identity = {
      appleTrackId: String(bestHit.trackId),
      canonicalTitle: cleanCanonicalTitle,
      fullAppleTitle: cleanText(bestHit.trackName || cleanCanonicalTitle),
      canonicalArtist: cleanText(bestHit.artistName || ""),
      primaryAppleArtist: cleanText(String(bestHit.artistName || "").split(/[,&]/)[0]),
      canonicalAlbum: cleanAlb,
      canonicalDuration: bestHit.trackTimeMillis ? Math.round(bestHit.trackTimeMillis / 1000) : durationSec
    };

    setBoundedMemo(APPLE_IDENTITY_MEMO, memoKey, identity);
    return identity;
  } catch {
    return null;
  }
}

/**
 * Queries the LyricsPlus (YouLy+ / KPOE) Multi-Backend Cluster using both
 * Apple Music canonical identity and cleaned JioSaavn tokens.
 */
async function searchLyricsPlusCluster(tokens, durationSec, appleIdentity = null) {
  const queryTitle = appleIdentity?.canonicalTitle || tokens.primaryTitle;
  const queryArtist = appleIdentity?.primaryAppleArtist || tokens.artists[0] || "";
  const queryAlbum = appleIdentity?.canonicalAlbum || tokens.album || "";
  const queryDur = durationSec || appleIdentity?.canonicalDuration || 0;

  if (!queryTitle) return null;

  const qs = new URLSearchParams({
    title: queryTitle,
    artist: queryArtist,
    album: queryAlbum,
    duration: String(queryDur),
    source: "apple,lyricsplus,musixmatch-word,musixmatch,spotify"
  });

  const fetchMirror = async (baseUrl, timeoutMs = 3400) => {
    const res = await fetchWithTimeout(`${baseUrl}/v2/lyrics/get?${qs.toString()}`, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "application/json"
      }
    }, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const parsed = parseLyricsPlusJsonToTimeline(data, queryDur, queryTitle, queryArtist);
    if (!parsed || parsed.lines.length < 2) throw new Error("Empty lyrics");
    return parsed;
  };

  try {
    return await Promise.any(LYRICSPLUS_MIRRORS.slice(0, 3).map(m => fetchMirror(m, 3300)));
  } catch {
    try {
      return await Promise.any(LYRICSPLUS_MIRRORS.slice(3).map(m => fetchMirror(m, 3300)));
    } catch {
      return null;
    }
  }
}

/**
 * Queries Apple Music TTML & Syllable Providers (Paxsenix Apple Music ID, BiniLyrics, BetterLyrics).
 */
async function searchTtmlSyllableProviders(tokens, durationSec, appleIdentity = null) {
  const title = appleIdentity?.canonicalTitle || tokens.primaryTitle;
  const artist = appleIdentity?.primaryAppleArtist || tokens.artists[0] || "";
  const album = appleIdentity?.canonicalAlbum || tokens.album || "";
  const appleTrackId = appleIdentity?.appleTrackId || null;

  if (!title) return null;

  const tasks = [];

  // 1. Paxsenix Direct Apple Music Track ID TTML Lookup (Highest accuracy when Apple Track ID is resolved by iTunes)
  if (appleTrackId) {
    tasks.push((async () => {
      const res = await fetchWithTimeout(
        `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(appleTrackId)}&ttml=true&v=2`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        3300
      );
      if (!res.ok) throw new Error("Paxsenix miss");
      const text = await res.text();
      if (text.includes("<tt") && text.includes("<p")) {
        const lines = parseTtmlToTimeline(text, durationSec, title, artist);
        const qual = evaluateLyricsScriptQuality(lines);
        if (lines.length >= 2 && qual.isValid) {
          return { lines, source: "AppleMusicDirectTtmlProvider", hasTrueWordSync: true, isLatinScript: qual.isLatinScript };
        }
      }
      const json = JSON.parse(text);
      const ttml = json?.ttml || json?.data?.ttml || json?.content;
      if (typeof ttml === "string" && ttml.includes("<p")) {
        const lines = parseTtmlToTimeline(ttml, durationSec, title, artist);
        const qual = evaluateLyricsScriptQuality(lines);
        if (lines.length >= 2 && qual.isValid) {
          return { lines, source: "AppleMusicDirectTtmlProvider", hasTrueWordSync: true, isLatinScript: qual.isLatinScript };
        }
      }
      throw new Error("No Paxsenix TTML");
    })());
  }

  // 2. BiniLyrics Apple Music TTML API
  tasks.push((async () => {
    const qs = new URLSearchParams({ track: title, artist });
    if (album) qs.set("album", album);
    const res = await fetchWithTimeout(`https://lyrics-api.binimum.org/?${qs.toString()}`, {
      headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
    }, 3300);
    if (!res.ok) throw new Error("BiniLyrics miss");
    const text = await res.text();
    if (text.includes("<tt") && text.includes("<p")) {
      const lines = parseTtmlToTimeline(text, durationSec, title, artist);
      const qual = evaluateLyricsScriptQuality(lines);
      if (lines.length >= 2 && qual.isValid) {
        return { lines, source: "AppleMusicTtmlBiniProvider", hasTrueWordSync: true, isLatinScript: qual.isLatinScript };
      }
    }
    const json = JSON.parse(text);
    const ttmlContent = json?.ttml || json?.lyrics || json?.results?.[0]?.ttml;
    if (typeof ttmlContent === "string" && ttmlContent.includes("<p")) {
      const lines = parseTtmlToTimeline(ttmlContent, durationSec, title, artist);
      const qual = evaluateLyricsScriptQuality(lines);
      if (lines.length >= 2 && qual.isValid) {
        return { lines, source: "AppleMusicTtmlBiniProvider", hasTrueWordSync: true, isLatinScript: qual.isLatinScript };
      }
    }
    const ttmlUrl = json?.results?.[0]?.ttmlUrl || json?.results?.[0]?.url || json?.ttmlUrl;
    if (ttmlUrl && String(ttmlUrl).startsWith("http")) {
      const ttmlRes = await fetchWithTimeout(ttmlUrl, {}, 2500);
      if (ttmlRes.ok) {
        const xml = await ttmlRes.text();
        const lines = parseTtmlToTimeline(xml, durationSec, title, artist);
        const qual = evaluateLyricsScriptQuality(lines);
        if (lines.length >= 2 && qual.isValid) {
          return { lines, source: "AppleMusicTtmlBiniProvider", hasTrueWordSync: true, isLatinScript: qual.isLatinScript };
        }
      }
    }
    throw new Error("No valid TTML");
  })());

  // 3. BetterLyrics TTML API (boidu.dev)
  tasks.push((async () => {
    const qs = new URLSearchParams({ s: title, a: artist });
    if (album) qs.set("al", album);
    if (durationSec > 0) qs.set("d", String(durationSec));
    const res = await fetchWithTimeout(`https://lyrics-api.boidu.dev/getLyrics?${qs.toString()}`, {
      headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
    }, 3300);
    if (!res.ok) throw new Error("BetterLyrics miss");
    const data = await res.json();
    const ttml = data?.ttml || data?.lyrics;
    if (typeof ttml === "string" && ttml.includes("<p")) {
      const lines = parseTtmlToTimeline(ttml, durationSec, title, artist);
      const qual = evaluateLyricsScriptQuality(lines);
      if (lines.length >= 2 && qual.isValid) {
        return { lines, source: "BetterLyricsTtmlProvider", hasTrueWordSync: true, isLatinScript: qual.isLatinScript };
      }
    }
    throw new Error("No TTML in BetterLyrics");
  })());

  try {
    return await Promise.any(tasks);
  } catch {
    return null;
  }
}

async function searchLrclibCandidates(tokens, durationSec, appleIdentity = null) {
  const headers = { "User-Agent": `${WORKER_NAME}/${WORKER_VERSION} (https://projectvelo.tjcodewizard.workers.dev)` };
  const urls = [];

  const titleA = appleIdentity?.canonicalTitle || tokens.primaryTitle;
  const artistA = appleIdentity?.primaryAppleArtist || tokens.artists[0] || "";
  const albumA = appleIdentity?.canonicalAlbum || tokens.album || "";

  if (titleA && artistA) {
    const getQs = new URLSearchParams({ track_name: titleA, artist_name: artistA });
    if (albumA) getQs.set("album_name", albumA);
    if (durationSec > 0) getQs.set("duration", String(durationSec));
    urls.push(`https://lrclib.net/api/get?${getQs.toString()}`);
    urls.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(titleA)}&artist_name=${encodeURIComponent(artistA)}`);
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${titleA} ${artistA}`)}`);
  }

  if (tokens.primaryTitle && tokens.artists[0] && (`${tokens.primaryTitle} ${tokens.artists[0]}` !== `${titleA} ${artistA}`)) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.artists[0]}`)}`);
  }
  if (tokens.primaryTitle && tokens.album) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.album}`)}`);
  }
  if (tokens.primaryTitle && tokens.artists[1]) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.artists[1]}`)}`);
  }
  if (tokens.secondaryTitle && tokens.secondaryTitle.length >= 3) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.secondaryTitle} ${artistA || tokens.album || ""}`.trim())}`);
  }
  if (titleA) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(titleA)}`);
  }

  const uniqueUrls = [...new Set(urls)].slice(0, 7);
  const settled = await Promise.allSettled(
    uniqueUrls.map(u =>
      fetchWithTimeout(u, { headers }, 3800).then(r => (r.ok ? r.json() : null))
    )
  );

  const seenIds = new Set();
  const allCandidates = [];

  for (const res of settled) {
    if (res.status === "fulfilled" && res.value) {
      const list = Array.isArray(res.value) ? res.value : [res.value];
      for (const item of list) {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allCandidates.push(item);
        }
      }
    }
  }

  if (allCandidates.length === 0) return { bestSynced: null, bestPlain: null };

  const enrichedTokens = {
    ...tokens,
    primaryTitle: titleA || tokens.primaryTitle,
    artists: [...new Set([artistA, appleIdentity?.canonicalArtist, ...tokens.artists].filter(Boolean))],
    album: albumA || tokens.album
  };

  // Score candidates WITH English/Romanized script quality boost (`checkScriptQuality = true`)
  const scored = allCandidates
    .map(item => ({ item, score: scoreLrcCandidate(item, enrichedTokens, durationSec, true) }))
    .filter(x => x.score >= 50)
    .sort((a, b) => b.score - a.score);

  const bestSynced = scored.find(x => x.item.syncedLyrics)?.item || null;
  const bestPlain = scored.find(x => x.item.plainLyrics)?.item || null;

  return { bestSynced, bestPlain };
}

async function searchNeteaseLyrics(tokens, durationSec) {
  try {
    const query = [tokens.primaryTitle, tokens.artists[0] || tokens.album || ""].filter(Boolean).join(" ").trim();
    if (!query) return null;

    const searchUrl = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(query)}&type=1&offset=0&limit=6`;
    const searchRes = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Referer": "https://music.163.com/"
      }
    }, 3400);

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const songs = searchData?.result?.songs || [];
    if (!songs.length) return null;

    let bestSong = null;
    let bestScore = -999;

    for (const s of songs) {
      const candidateItem = {
        trackName: s.name,
        artistName: (s.ar || s.artists || []).map(a => a.name).join(", "),
        albumName: (s.al || s.album)?.name || "",
        duration: s.dt ? Math.round(s.dt / 1000) : (s.duration ? Math.round(s.duration / 1000) : 0),
        syncedLyrics: "1"
      };
      const sc = scoreLrcCandidate(candidateItem, tokens, durationSec, false);
      if (sc > bestScore) {
        bestScore = sc;
        bestSong = s;
      }
    }

    if (!bestSong || bestScore < 62) return null;

    const lrcRes = await fetchWithTimeout(`https://music.163.com/api/song/lyric?id=${bestSong.id}&lv=1&kv=1&tv=-1&yv=1`, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Referer": "https://music.163.com/"
      }
    }, 3400);

    if (!lrcRes.ok) return null;
    const lrcJson = await lrcRes.json();

    const rawYrc = lrcJson?.yrc?.lyric || "";
    if (rawYrc && rawYrc.length > 30) {
      const yrcLines = parseNeteaseYrcToTimeline(rawYrc, durationSec, tokens.primaryTitle, tokens.artists[0] || "");
      const qual = evaluateLyricsScriptQuality(yrcLines);
      if (yrcLines.length >= 3 && qual.isLatinScript) {
        return {
          source: "NetEaseVerbatimYrcProvider",
          syncType: "WORD",
          isSynced: true,
          isAutoTimed: false,
          isLatinScript: true,
          lines: yrcLines
        };
      }
    }

    const rawLrc = lrcJson?.lrc?.lyric || "";
    if (!rawLrc || rawLrc.length < 25) return null;

    const parsed = parseLrcToTimeline(rawLrc, durationSec, tokens.primaryTitle, tokens.artists[0] || "");
    const qual = evaluateLyricsScriptQuality(parsed.lines);
    if (parsed.lines.length >= 3 && qual.isLatinScript) {
      return {
        source: "NetEaseLrcProvider",
        syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
        isSynced: true,
        isAutoTimed: false,
        isLatinScript: true,
        lines: parsed.lines
      };
    }
  } catch {}
  return null;
}

async function searchGeniusPlainLyrics(tokens) {
  try {
    const q = [tokens.primaryTitle, tokens.artists[0] || tokens.album || ""].filter(Boolean).join(" ").trim();
    if (!q) return null;
    const searchUrl = `https://genius.com/api/search/multi?per_page=3&q=${encodeURIComponent(q)}`;
    const res = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "application/json"
      }
    }, 3300);
    if (!res.ok) return null;
    const data = await res.json();
    const sections = data?.response?.sections || [];
    let songHit = null;

    for (const sec of sections) {
      if (sec.type === "song" || sec.type === "top_hit") {
        for (const h of (sec.hits || [])) {
          if (h.type === "song" && h.result?.url) {
            const normHitTitle = normalizeTokenComparison(h.result.title || "");
            const normTarget = normalizeTokenComparison(tokens.primaryTitle);
            if (normHitTitle.includes(normTarget) || normTarget.includes(normHitTitle)) {
              songHit = h.result;
              break;
            }
          }
        }
      }
      if (songHit) break;
    }

    if (!songHit?.url) return null;
    const pageRes = await fetchWithTimeout(songHit.url, {
      headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
    }, 3400);
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    const containerMatches = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi)];
    if (!containerMatches.length) return null;

    const extracted = containerMatches
      .map(m => m[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
      )
      .join("\n");

    const cleaned = cleanText(extracted);
    return cleaned.length > 40 ? cleaned : null;
  } catch {
    return null;
  }
}

function buildUnifiedLyricsResponse({
  source,
  syncType = "WORD",
  trackName,
  artistName,
  duration,
  isSynced = true,
  isAutoTimed = false,
  lines
}) {
  const vocalLines = lines.filter(l => l && !l.isInstrumental);
  const cleanPlain = (vocalLines.length > 0 ? vocalLines : lines)
    .map(l => l.text)
    .join("\n");

  const standardLrc = buildStandardLrcFromTimeline(lines);
  const enhancedLrc = buildEnhancedLrcFromTimeline(lines);
  const lyricsPlusCompat = buildLyricsPlusCompatiblePayload(lines);

  return {
    source,
    syncType,
    wordSynced: true,
    trackName: trackName || "OpenMuse",
    artistName: artistName || "OpenMuse",
    duration: duration || 185,
    isSynced,
    isAutoTimed,
    syncedLyrics: standardLrc || null,
    enhancedLyrics: enhancedLrc || null,
    plainLyrics: cleanPlain,
    lines,
    type: "Word",
    lyrics: lyricsPlusCompat
  };
}

/**
 * Resolves Real-Time Word-by-Word Lyrics using:
 * 1. iTunes / Apple Music Identity Bridge (resolves exact Apple Track ID, Title, Artist, Album)
 * 2. Apple Music TTML & LyricsPlus Word-Sync Cluster + LRCLIB Enhanced/Synced
 * 3. Strict English/Romanized (Latin-script) preference & zero JioSaavn native lyrics
 */
async function resolveRealtimeLyrics(url) {
  let songId = url.searchParams.get("id") || url.searchParams.get("pid") || "";
  let explicitAppleId = url.searchParams.get("appleId") || "";
  let trackName = url.searchParams.get("trackName") || url.searchParams.get("title") || "";
  let artistName = url.searchParams.get("artistName") || url.searchParams.get("artist") || "";
  let albumName = url.searchParams.get("albumName") || url.searchParams.get("album") || "";
  let durationSec = parseInt(url.searchParams.get("duration") || "0", 10) || 0;
  const rawQ = url.searchParams.get("q") || "";
  let extraArtists = [];

  if (songId.startsWith("apple:") && !explicitAppleId) {
    explicitAppleId = songId.replace(/^apple:/, "");
  }

  if (songId) {
    const memoSong = SONG_META_MEMO.get(String(songId));
    if (memoSong) {
      if (!explicitAppleId && memoSong.appleId) explicitAppleId = String(memoSong.appleId);
      if (!trackName) trackName = memoSong.title;
      if (!artistName) artistName = memoSong.artist;
      if (!albumName || albumName === "OpenMuse") albumName = memoSong.album;
      if (!durationSec && memoSong.duration) durationSec = memoSong.duration;
      if (Array.isArray(memoSong.allArtists)) extraArtists = memoSong.allArtists;
    } else if (/^\d+$/.test(songId)) {
      try {
        const details = await fetchSaavnJson({ __call: "song.getDetails", pids: songId });
        const songObj = details?.[songId] || details?.songs?.[0] || Object.values(details || {})[0];
        if (songObj) {
          const enriched = enrichSaavnSong(songObj, url.origin);
          if (!trackName) trackName = enriched.title;
          if (!artistName) artistName = enriched.artist;
          if (!albumName || albumName === "OpenMuse") albumName = enriched.album;
          if (!durationSec && enriched.duration) durationSec = enriched.duration;
          if (Array.isArray(enriched.allArtists)) extraArtists = enriched.allArtists;
        }
      } catch {}
    }
  }

  const tokens = extractLyricsSearchTokens(trackName || rawQ, artistName, albumName, extraArtists);

  // Step 1: Fast iTunes / Apple Music Identity Resolution (~150ms on Edge)
  // Bridges JioSaavn metadata to Apple Music's exact Track ID, Title, Artist, and Album
  const appleIdentity = await resolveAppleMusicIdentity(tokens, durationSec, explicitAppleId);
  if (appleIdentity) {
    if (!durationSec && appleIdentity.canonicalDuration) {
      durationSec = appleIdentity.canonicalDuration;
    }
    if (appleIdentity.primaryAppleArtist && !tokens.artists.includes(appleIdentity.primaryAppleArtist)) {
      tokens.artists.unshift(appleIdentity.primaryAppleArtist);
    }
  }

  // Step 2: Parallel Word-Sync & Synced Providers using Apple Music Identity + Cleaned Tokens
  const [
    lyricsPlusHit,
    ttmlHit,
    lrcResult,
    neteaseHit
  ] = await Promise.all([
    searchLyricsPlusCluster(tokens, durationSec, appleIdentity),
    searchTtmlSyllableProviders(tokens, durationSec, appleIdentity),
    searchLrclibCandidates(tokens, durationSec, appleIdentity),
    searchNeteaseLyrics(tokens, durationSec)
  ]);

  let lrcSyncedParsed = null;
  let lrcSyncedIsLatin = false;
  if (lrcResult?.bestSynced?.syncedLyrics) {
    const winner = lrcResult.bestSynced;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const parsed = parseLrcToTimeline(
      winner.syncedLyrics,
      effectiveDur,
      winner.trackName || tokens.primaryTitle,
      winner.artistName || artistName
    );
    if (parsed.lines.length > 0) {
      const qual = evaluateLyricsScriptQuality(parsed.lines);
      if (qual.isValid) {
        lrcSyncedParsed = {
          lines: parsed.lines,
          hasEnhancedWordTags: parsed.hasEnhancedWordTags,
          trackName: winner.trackName || appleIdentity?.canonicalTitle || tokens.primaryTitle,
          artistName: winner.artistName || appleIdentity?.canonicalArtist || artistName,
          duration: effectiveDur
        };
        lrcSyncedIsLatin = qual.isLatinScript;
      }
    }
  }

  // Priority A: English/Romanized True Word-by-Word Sync from LyricsPlus (Apple Music / Musixmatch Word)
  if (lyricsPlusHit && lyricsPlusHit.hasTrueWordSync && lyricsPlusHit.isLatinScript && lyricsPlusHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: `AppleLyricsPlusWordSync (${lyricsPlusHit.upstreamSource})`,
      syncType: "WORD",
      trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle,
      artistName: appleIdentity?.canonicalArtist || tokens.artists[0] || artistName,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: lyricsPlusHit.lines
    });
  }

  // Priority B: English/Romanized Direct Apple Music TTML Word Sync (Paxsenix / BiniLyrics / BetterLyrics)
  if (ttmlHit && ttmlHit.isLatinScript && ttmlHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: ttmlHit.source,
      syncType: "WORD",
      trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle,
      artistName: appleIdentity?.canonicalArtist || tokens.artists[0] || artistName,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: ttmlHit.lines
    });
  }

  // Priority C: English/Romanized LRCLIB Synced Lyrics (Enhanced `<mm:ss.xx>` or Tempo-Adaptive Word-Sync)
  if (lrcSyncedParsed && lrcSyncedIsLatin) {
    return buildUnifiedLyricsResponse({
      source: lrcSyncedParsed.hasEnhancedWordTags ? "LrcLibEnhancedWordProvider" : "LrcLibRealtimeWordSyncProvider",
      syncType: lrcSyncedParsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
      trackName: lrcSyncedParsed.trackName,
      artistName: lrcSyncedParsed.artistName,
      duration: lrcSyncedParsed.duration,
      isSynced: true,
      isAutoTimed: false,
      lines: lrcSyncedParsed.lines
    });
  }

  // Priority D: English/Romanized LyricsPlus Line-Enhanced or NetEase YRC/LRC
  if (lyricsPlusHit && lyricsPlusHit.isLatinScript && lyricsPlusHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: `AppleLyricsPlusEnhanced (${lyricsPlusHit.upstreamSource})`,
      syncType: "LINE_ENHANCED",
      trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle,
      artistName: appleIdentity?.canonicalArtist || tokens.artists[0] || artistName,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: lyricsPlusHit.lines
    });
  }

  if (neteaseHit && neteaseHit.isLatinScript && neteaseHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: neteaseHit.source,
      syncType: neteaseHit.syncType || "WORD",
      trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle,
      artistName: appleIdentity?.canonicalArtist || tokens.artists[0] || artistName,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: neteaseHit.lines
    });
  }

  // Priority E: English/Romanized Plain Lyrics from LRCLIB or Genius -> Phonetic Cadence Word-Sync
  if (lrcResult?.bestPlain?.plainLyrics) {
    const winner = lrcResult.bestPlain;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const plainLines = buildEstimatedTimelineFromPlain(
      winner.plainLyrics,
      effectiveDur,
      winner.trackName || tokens.primaryTitle,
      winner.artistName || artistName
    );
    const qual = evaluateLyricsScriptQuality(plainLines);
    if (plainLines.length > 0 && qual.isLatinScript) {
      return buildUnifiedLyricsResponse({
        source: "LrcLibRomanizedCadenceProvider",
        syncType: "CADENCE_ESTIMATED",
        trackName: winner.trackName || appleIdentity?.canonicalTitle || tokens.primaryTitle,
        artistName: winner.artistName || appleIdentity?.canonicalArtist || artistName,
        duration: effectiveDur,
        isSynced: true,
        isAutoTimed: true,
        lines: plainLines
      });
    }
  }

  const geniusPlain = await searchGeniusPlainLyrics({
    ...tokens,
    primaryTitle: appleIdentity?.canonicalTitle || tokens.primaryTitle
  });
  if (geniusPlain) {
    const geniusLines = buildEstimatedTimelineFromPlain(
      geniusPlain,
      durationSec || 185,
      appleIdentity?.canonicalTitle || tokens.primaryTitle,
      appleIdentity?.canonicalArtist || artistName
    );
    const qual = evaluateLyricsScriptQuality(geniusLines);
    if (geniusLines.length > 0 && qual.isLatinScript) {
      return buildUnifiedLyricsResponse({
        source: "GeniusEnglishCadenceProvider",
        syncType: "CADENCE_ESTIMATED",
        trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle,
        artistName: appleIdentity?.canonicalArtist || artistName,
        duration: durationSec || 185,
        isSynced: true,
        isAutoTimed: true,
        lines: geniusLines
      });
    }
  }

  // Priority F: If only non-Latin synced Apple Music / LyricsPlus / LRCLIB lyrics exist for this track, use them as fallback
  if (lyricsPlusHit && lyricsPlusHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: `AppleLyricsPlus (${lyricsPlusHit.upstreamSource})`,
      syncType: lyricsPlusHit.hasTrueWordSync ? "WORD" : "LINE_ENHANCED",
      trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle,
      artistName: appleIdentity?.canonicalArtist || tokens.artists[0] || artistName,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: lyricsPlusHit.lines
    });
  }

  if (ttmlHit && ttmlHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: ttmlHit.source,
      syncType: "WORD",
      trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle,
      artistName: appleIdentity?.canonicalArtist || tokens.artists[0] || artistName,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: ttmlHit.lines
    });
  }

  if (lrcSyncedParsed) {
    return buildUnifiedLyricsResponse({
      source: lrcSyncedParsed.hasEnhancedWordTags ? "LrcLibEnhancedWordProvider" : "LrcLibRealtimeWordSyncProvider",
      syncType: lrcSyncedParsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
      trackName: lrcSyncedParsed.trackName,
      artistName: lrcSyncedParsed.artistName,
      duration: lrcSyncedParsed.duration,
      isSynced: true,
      isAutoTimed: false,
      lines: lrcSyncedParsed.lines
    });
  }

  // Guaranteed real-time fallback timeline (Never calls JioSaavn native lyrics!)
  const fallbackLines = buildInstrumentalFallbackTimeline(
    appleIdentity?.canonicalTitle || tokens.primaryTitle || trackName,
    appleIdentity?.canonicalArtist || artistName,
    durationSec || 185
  );
  return buildUnifiedLyricsResponse({
    source: "ProjectVeloBeatSyncFallback",
    syncType: "CADENCE_ESTIMATED",
    trackName: appleIdentity?.canonicalTitle || tokens.primaryTitle || trackName || "OpenMuse",
    artistName: appleIdentity?.canonicalArtist || artistName || "OpenMuse",
    duration: durationSec || 185,
    isSynced: true,
    isAutoTimed: true,
    lines: fallbackLines
  });
}

// ============================================================================
// MAIN WORKER ROUTER (ProjectVelo v8.0.0)
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/stream" || path === "/proxy" || url.searchParams.has("streamUrl")) {
        const target = url.searchParams.get("url") || url.searchParams.get("streamUrl");
        return await handleSmartStream(request, target, url.origin, ctx);
      }

      if (path === "/play") {
        return await handleOneHopPlay(request, url, ctx);
      }

      if (path === "/lyrics") {
        return await withEdgeCache(request, ctx, 3600, async () => {
          const lyricsData = await resolveRealtimeLyrics(url);
          return jsonResponse(lyricsData, 200, {
            "X-Lyrics-Source": lyricsData.source || "ProjectVelo",
            "X-Lyrics-Sync-Type": lyricsData.syncType || "WORD",
            "X-Worker-Engine": `${WORKER_NAME}/${WORKER_VERSION}`
          });
        }, "v8-projectvelo-lyrics");
      }

      if (path === "/album") {
        const albumId = url.searchParams.get("id") || url.searchParams.get("albumid") || url.searchParams.get("token");
        return await withEdgeCache(request, ctx, 1800, async () => {
          const data = await resolveCompleteAlbum(albumId, url.origin);
          return jsonResponse(data);
        }, "v8-projectvelo-album");
      }

      if (path === "/song") {
        const pids = url.searchParams.get("id") || url.searchParams.get("pids");
        if (!pids) return jsonResponse({ error: "Missing ?id= parameter" }, 400);
        return await withEdgeCache(request, ctx, 1800, async () => {
          if (String(pids).startsWith("apple:")) {
            const appleId = String(pids).replace(/^apple:/, "");
            const memo = SONG_META_MEMO.get(String(pids));
            const lookupRes = await fetchWithTimeout(
              `https://itunes.apple.com/lookup?id=${encodeURIComponent(appleId)}&country=in`,
              { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
              3000
            );
            const lookupJson = lookupRes.ok ? await lookupRes.json() : null;
            const appleTrack = lookupJson?.results?.[0] || {
              trackId: appleId,
              trackName: memo?.title || "Track",
              artistName: memo?.artist || "",
              collectionName: memo?.album || ""
            };
            const q = `${extractCoreTrackTitle(appleTrack.trackName)} ${String(appleTrack.artistName || "").split(/[,&]/)[0]}`.trim();
            const sData = await fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "8", p: "1", q });
            const pool = await batchHealMissingMediaUrls(sData?.results || []);
            const matched = findBestSaavnMatchForAppleTrack(appleTrack, pool) || pool[0] || null;
            const bridged = buildAppleBridgedSongObject(appleTrack, matched, url.origin);
            return jsonResponse({ songs: [bridged], track: bridged });
          }

          const data = await fetchSaavnJson({ __call: "song.getDetails", pids });
          const rawList = Array.isArray(data?.songs)
            ? data.songs
            : Object.values(data || {}).filter(v => v && typeof v === "object" && v.id);
          const songs = rawList.map(s => enrichSaavnSong(s, url.origin));
          return jsonResponse({ songs, track: songs[0] || null });
        }, "v8-projectvelo-song");
      }

      if (path === "/reco") {
        const pid = url.searchParams.get("id") || url.searchParams.get("pid");
        if (!pid) return jsonResponse({ error: "Missing ?id=<songId>" }, 400);
        return await withEdgeCache(request, ctx, 900, async () => {
          let targetPid = String(pid);
          if (targetPid.startsWith("apple:")) {
            const memo = SONG_META_MEMO.get(targetPid);
            if (memo && memo.title) {
              const sRes = await fetchSaavnJson({
                __call: "search.getResults",
                api_version: "4",
                n: "5",
                p: "1",
                q: `${extractCoreTrackTitle(memo.title)} ${memo.artist.split(",")[0]}`
              });
              if (sRes?.results?.[0]?.id) {
                targetPid = String(sRes.results[0].id);
              }
            }
          }
          const rawReco = await fetchSaavnJson({
            __call: "reco.getreco",
            api_version: "4",
            pid: targetPid,
            language: url.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu"
          });
          const songs = await filterAndUpgradeSongs(Array.isArray(rawReco) ? rawReco : [], url.origin);
          return jsonResponse({ pid, count: songs.length, songs });
        }, "v8-projectvelo-reco");
      }

      if (path === "/home") {
        return await withEdgeCache(request, ctx, 900, async () => {
          const langParam = url.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu";
          const homeData = await fetchAppleMusicHomeFeed(langParam, url.origin);
          return jsonResponse(homeData);
        }, "v8-projectvelo-home");
      }

      if (path === "/search") {
        return await handleSearchRoute(request, url, ctx);
      }

      return jsonResponse({
        service: `${WORKER_NAME} v${WORKER_VERSION} — Apple Music Curated Intelligence + JioSaavn 320kbps Audio & Real-Time Word-Sync Engine`,
        repository: "ProjectVelo",
        status: "online",
        endpoints: {
          stream: `${url.origin}/stream?url=<target>`,
          play: `${url.origin}/play?id=<songId>&appleId=<appleTrackId>&title=<title>&artist=<artist>`,
          lyrics: `${url.origin}/lyrics?id=<songId>&appleId=<appleTrackId>&trackName=<title>&artistName=<artist>&albumName=<album>&duration=<sec>`,
          home: `${url.origin}/home?lang=english,hindi,malayalam,tamil`,
          search: `${url.origin}/search?q=<query>&format=json`,
          album: `${url.origin}/album?id=<albumId_or_token>`,
          song: `${url.origin}/song?id=<songId>`,
          reco: `${url.origin}/reco?id=<songId>`
        }
      });

    } catch (err) {
      return jsonResponse({
        error: "ProjectVeloException",
        message: err.message || String(err)
      }, 500);
    }
  }
};

async function handleOneHopPlay(request, url, ctx) {
  const songId = (url.searchParams.get("id") || "").trim();
  const appleId = (url.searchParams.get("appleId") || (songId.startsWith("apple:") ? songId.slice(6) : "")).trim();
  let rawMediaUrl = (url.searchParams.get("url") || "").trim();
  let title = (url.searchParams.get("title") || "").trim();
  let artist = (url.searchParams.get("artist") || "").trim();
  let album = (url.searchParams.get("album") || "").trim();

  // Ignore self-referential /play URLs if passed in ?url=
  if (rawMediaUrl && rawMediaUrl.includes("/play?")) {
    rawMediaUrl = "";
  }

  // Step 1: Check if songId is a numeric/token JioSaavn ID
  if (songId && !songId.startsWith("apple:")) {
    try {
      const data = await fetchSaavnJson({ __call: "song.getDetails", pids: songId });
      const rawSong = data?.[songId] || data?.songs?.[0] || Object.values(data || {})[0];
      if (rawSong) {
        const enriched = enrichSaavnSong(rawSong, url.origin);
        if (enriched.decrypted_media_url && !enriched.decrypted_media_url.includes("/play?")) {
          rawMediaUrl = enriched.decrypted_media_url;
        }
        if (!title) title = enriched.title;
        if (!artist) artist = enriched.artist;
      }
    } catch {}
  }

  // Step 2: If only appleId was passed without title/artist, resolve metadata from iTunes Lookup
  if ((!title || !artist) && appleId && /^\d+$/.test(appleId)) {
    try {
      const lookupRes = await fetchWithTimeout(
        `https://itunes.apple.com/lookup?id=${encodeURIComponent(appleId)}&country=in`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2800
      );
      if (lookupRes.ok) {
        const lData = await lookupRes.json();
        const hit = lData?.results?.[0];
        if (hit) {
          if (!title) title = cleanText(hit.trackName || "");
          if (!artist) artist = cleanText(hit.artistName || "");
          if (!album) album = cleanText(hit.collectionName || "");
        }
      }
    } catch {}
  }

  if (rawMediaUrl) {
    const streamRes = await handleSmartStream(request, rawMediaUrl, url.origin, ctx, true);
    if (streamRes && (streamRes.status === 200 || streamRes.status === 206)) {
      return streamRes;
    }
  }

  // Step 3: Bridge Apple Music / Self-Heal Track to JioSaavn's 320kbps Master
  const tokens = extractLyricsSearchTokens(title, artist, album);
  const queriesToTry = [
    [tokens.primaryTitle, tokens.artists[0] || ""].filter(Boolean).join(" ").trim(),
    [tokens.primaryTitle, tokens.album || ""].filter(Boolean).join(" ").trim(),
    tokens.primaryTitle
  ].filter(Boolean);

  for (const qStr of [...new Set(queriesToTry)].slice(0, 2)) {
    try {
      const searchData = await fetchSaavnJson({
        __call: "search.getResults",
        api_version: "4",
        n: "12",
        p: "1",
        q: qStr
      });
      const candidates = await filterAndUpgradeSongs(searchData?.results || [], url.origin, qStr);
      for (const cand of candidates) {
        if (cand.id === songId && rawMediaUrl) continue;
        if (!cand.decrypted_media_url || cand.decrypted_media_url.includes("/play?")) continue;
        const healedStream = await handleSmartStream(request, cand.decrypted_media_url, url.origin, ctx, true);
        if (healedStream && (healedStream.status === 200 || healedStream.status === 206)) {
          if (appleId) {
            setBoundedMemo(SONG_META_MEMO, `apple:${appleId}`, cand);
          }
          return healedStream;
        }
      }
    } catch {}
  }

  return jsonResponse({
    error: "StreamUnavailable",
    message: "Official high-resolution stream could not be resolved for this track."
  }, 404);
}

async function handleSmartStream(request, targetUrl, origin, ctx, returnNullOnFail = false) {
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

  if (host.includes("audius.co")) {
    return jsonResponse({ data: [] }, 200);
  }

  if (host.includes("jiosaavn.com") && parsedTarget.pathname.includes("api.php")) {
    const callType = parsedTarget.searchParams.get("__call") || "";

    if (callType === "content.getAlbumDetails" || callType === "playlist.getDetails") {
      const albumId = parsedTarget.searchParams.get("albumid") || parsedTarget.searchParams.get("listid") || parsedTarget.searchParams.get("id");
      return await withEdgeCache(request, ctx, 1800, async () => {
        const enrichedAlbum = await resolveCompleteAlbum(albumId, origin);
        return jsonResponse(enrichedAlbum);
      }, "v8-projectvelo-stream-album");
    }

    if (callType === "search.getResults" || callType === "search.getAlbumResults" || callType === "song.getDetails") {
      return await withEdgeCache(request, ctx, 900, async () => {
        const res = await fetchWithTimeout(parsedTarget.toString(), { headers: SAAVN_HEADERS }, 5500);
        const text = (await res.text()).trim();
        const start = text.indexOf("{");
        const clean = start > 0 ? text.slice(start, text.lastIndexOf("}") + 1) : text;
        const data = JSON.parse(clean);

        if (callType === "search.getResults" && Array.isArray(data.results)) {
          const userQ = parsedTarget.searchParams.get("q") || "";
          data.results = await filterAndUpgradeSongs(data.results, origin, userQ);
        } else if (callType === "search.getAlbumResults" && Array.isArray(data.results)) {
          data.results = data.results.map(a => enrichSaavnAlbum(a, origin));
        } else if (callType === "song.getDetails") {
          for (const key of Object.keys(data)) {
            if (data[key] && typeof data[key] === "object" && data[key].id) {
              data[key] = enrichSaavnSong(data[key], origin);
            }
          }
          if (Array.isArray(data.songs)) {
            data.songs = data.songs.map(s => enrichSaavnSong(s, origin));
          }
        }
        return jsonResponse(data);
      }, "v8-projectvelo-stream-api");
    }
  }

  const isImage = /\.(jpg|jpeg|png|webp|svg|avif)(\?.*)?$/i.test(parsedTarget.pathname) || host.includes("c.saavncdn.com") || host.includes("sop.saavncdn.com") || host.includes("mzstatic.com");
  if (isImage && request.method === "GET" && !request.headers.has("Range")) {
    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.sort();
    const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });

    const cachedImg = await cache.match(cacheKey);
    if (cachedImg) {
      const hitHeaders = new Headers(cachedImg.headers);
      for (const [k, v] of Object.entries(CORS_HEADERS)) hitHeaders.set(k, v);
      hitHeaders.delete("content-encoding");
      hitHeaders.set("X-Cache-Status", "HIT");
      return new Response(cachedImg.body, { status: cachedImg.status, headers: hitHeaders });
    }

    const imgRes = await fetchWithTimeout(parsedTarget.toString(), {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": host.includes("mzstatic.com") ? "https://music.apple.com/" : "https://www.jiosaavn.com/"
      }
    }, 5000);

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

  const isSaavnCdn = host.includes("saavncdn.com");
  const upstreamHeaders = new Headers({
    "User-Agent": SAAVN_HEADERS["User-Agent"],
    "Accept": request.headers.get("Accept") || "*/*",
    "Referer": isSaavnCdn ? "https://www.jiosaavn.com/" : (parsedTarget.origin + "/")
  });
  if (isSaavnCdn) {
    upstreamHeaders.set("Origin", "https://www.jiosaavn.com");
  }

  if (request.headers.has("Range")) {
    upstreamHeaders.set("Range", request.headers.get("Range"));
  }
  if (request.headers.has("If-Range")) {
    upstreamHeaders.set("If-Range", request.headers.get("If-Range"));
  }

  const rawTargetStr = parsedTarget.toString();
  const memoizedWorkingUrl = WORKING_STREAM_MEMO.get(rawTargetStr);
  const candidateUrls = memoizedWorkingUrl
    ? [memoizedWorkingUrl, ...buildSaavnBitrateCascade(rawTargetStr)]
    : buildSaavnBitrateCascade(rawTargetStr);

  let upstreamRes = null;
  let usedUrl = rawTargetStr;

  for (const candidate of [...new Set(candidateUrls)]) {
    usedUrl = candidate;
    try {
      const attemptRes = await fetchWithTimeout(candidate, {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: upstreamHeaders,
        redirect: "follow"
      }, 6500);

      if (attemptRes.ok || attemptRes.status === 206) {
        const contentLen = parseInt(attemptRes.headers.get("content-length") || "99999", 10);
        if (contentLen > 1024 || request.method === "HEAD") {
          upstreamRes = attemptRes;
          if (candidateUrls.length > 1) {
            setBoundedMemo(WORKING_STREAM_MEMO, rawTargetStr, candidate);
          }
          break;
        }
      }
    } catch {}
  }

  if (!upstreamRes) {
    if (returnNullOnFail) return null;
    upstreamRes = await fetch(rawTargetStr, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: upstreamHeaders,
      redirect: "follow"
    });
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

  if (isSaavnCdn || /\.(mp4|m4a|mp3)(\?.*)?$/i.test(usedUrl)) {
    if (/\.mp3(\?.*)?$/i.test(usedUrl)) {
      resHeaders.set("Content-Type", "audio/mpeg");
    } else {
      resHeaders.set("Content-Type", "audio/mp4");
    }
  }

  resHeaders.delete("content-encoding");

  if (!resHeaders.has("accept-ranges")) {
    resHeaders.set("Accept-Ranges", "bytes");
  }
  resHeaders.set("X-Worker-Engine", `${WORKER_NAME}/${WORKER_VERSION}`);
  resHeaders.set("X-Upstream-Status", String(upstreamRes.status));
  resHeaders.set("X-Upstream-Url", upstreamRes.url || usedUrl);

  const bitrateMatch = usedUrl.match(/_(320|160|96)(_p)?\.(mp4|mp3)/i);
  if (bitrateMatch) {
    resHeaders.set("X-Resolved-Bitrate", `${bitrateMatch[1]}kbps`);
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders
  });
}

async function handleSearchRoute(request, url, ctx) {
  const q = (url.searchParams.get("q") || url.searchParams.get("trackName") || "Trending").trim();
  const format = url.searchParams.get("format") || "ndjson";

  if (format === "json") {
    return await withEdgeCache(request, ctx, 600, async () => {
      const searchPayload = await executeIntelligentHybridSearch(q, url.origin);
      return jsonResponse(searchPayload);
    }, "v8-projectvelo-search");
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const writeLine = async (obj) => writer.write(encoder.encode(JSON.stringify(obj) + "\n"));

  ctx.waitUntil((async () => {
    try {
      const { songs, albums } = await executeIntelligentHybridSearch(q, url.origin);

      for (const s of songs) {
        await writeLine({ event: "TrackDetails", source_name: "ProjectVeloAppleSaavnBridge", data: s });
      }
      for (const a of albums) {
        await writeLine({ event: "AlbumDetails", source_name: "ProjectVeloAppleSaavnBridge", data: a });
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

function jsonResponse(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "X-Worker-Engine": `${WORKER_NAME}/${WORKER_VERSION}`,
      ...extraHeaders
    }
  });
}

async function withEdgeCache(request, ctx, ttlSeconds, computeFn, cacheNamespace = "v8-projectvelo") {
  if (request.method !== "GET") return await computeFn();

  const cache = caches.default;
  const parsed = new URL(request.url);
  parsed.searchParams.set("_cv", cacheNamespace);
  parsed.searchParams.sort();
  const cacheKey = new Request(parsed.toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    headers.delete("content-encoding");
    headers.set("X-Cache-Status", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const freshRes = await computeFn();
  if (freshRes.status === 200) {
    const cacheHeaders = new Headers(freshRes.headers);
    cacheHeaders.delete("content-encoding");
    cacheHeaders.set("Cache-Control", `public, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`);
    cacheHeaders.set("X-Cache-Status", "MISS");
    const cloned = new Response(freshRes.clone().body, { status: 200, headers: cacheHeaders });
    ctx.waitUntil(cache.put(cacheKey, cloned));
    return new Response(freshRes.body, { status: 200, headers: cacheHeaders });
  }

  return freshRes;
}
