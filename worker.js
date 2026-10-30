// --- START OF FILE worker(v11).js ---

const WORKER_NAME = "ProjectVelo";
const WORKER_VERSION = "11.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer, X-Audio-Quality, X-Client-Id",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition, X-Worker-Engine, X-Upstream-Status, X-Upstream-Url, X-Cache-Status, X-Resolved-Bitrate, X-Audio-Quality, X-Audio-Source, X-Video-Resolution, X-Video-Codec, X-Video-Audio-Mode, X-Video-Id, X-Lyrics-Source, X-Lyrics-Sync-Type, X-Home-Source, X-Reco-Source, X-Track-Title, X-Track-Artist, X-Track-Album, X-Track-Cover"
};

const SAAVN_API_BASE = "https://www.jiosaavn.com/api.php";

const SAAVN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-IN,en-US;q=0.9,hi-IN;q=0.8,ml-IN;q=0.7,ta-IN;q=0.7,te-IN;q=0.7",
  "Referer": "https://www.jiosaavn.com/",
  "Origin": "https://www.jiosaavn.com",
  "X-Forwarded-For": "49.36.128.1",
  "CF-IPCountry": "IN",
  "Cookie": "L=english%2Chindi%2Cmalayalam%2Ctamil%2Ctelugu%2Cpunjabi%2Cbengali%2Ckannada; gdpr_acceptance=true; DL=english"
};

// Verified active LyricsPlus / KPOE / LRCMUX mirrors
const LYRICSPLUS_MIRRORS = [
  "https://lyricsplus.prjktla.my.id",
  "https://lyricsplus.prjktla.workers.dev",
  "https://lyricsplus-seven.vercel.app",
  "https://lyrics-plus-backend.vercel.app",
  "https://api.lrcmux.dev/compat/kpoe",
  "https://lyricsplus.binimum.org",
  "https://lyricsplus.atomix.one"
];

// Active Piped & Invidious API clusters for Secondary High-Res YTM Audio & Direct 4K/1080p Video-Only Streams
const PIPED_API_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.private.coffee",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.moomoo.me",
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.drgns.space",
  "https://pipedapi.ducks.party"
];

const INVIDIOUS_API_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://invidious.privacyredirect.com",
  "https://iv.melmac.space"
];

// Expanded Official Spotify Editorial & Chart Playlists for Rich Homepage & Regional Filtering
const SPOTIFY_HOME_PLAYLISTS = {
  india_top: { id: "37i9dQZEVXbLZ52XmnySJg", title: "Top 50 — India", artist: "Muse Charts", lang: "all" },
  global_top: { id: "37i9dQZEVXbMDoHDwVN2tF", title: "Top 50 — Global", artist: "Muse Charts", lang: "english" },
  todays_hits: { id: "37i9dQZF1DXcBWIGoYBM5M", title: "Today's Top Hits", artist: "Muse Editorial", lang: "english" },
  viral_india: { id: "37i9dQZEVXbK4NvPi6Sxit", title: "Viral 50 — India", artist: "Muse Charts", lang: "all" },
  malayalam_hits: { id: "37i9dQZF1DWTwzVdyRpXm1", title: "Hot Hits Malayalam", artist: "Muse Malayalam", lang: "malayalam" },
  malayalam_melody: { id: "37i9dQZF1DX5cO1uP1XC1g", title: "Malayalam Melodies", artist: "Muse Malayalam", lang: "malayalam" },
  hindi_hits: { id: "37i9dQZF1DX0XUfTFmNBRM", title: "Hot Hits Hindi", artist: "Muse Hindi", lang: "hindi" },
  bollywood_central: { id: "37i9dQZF1DWXtlo6ENS92N", title: "Bollywood Central", artist: "Muse Hindi", lang: "hindi" },
  tamil_hits: { id: "37i9dQZF1DWY4xHQp97fN6", title: "Hot Hits Tamil", artist: "Muse Tamil", lang: "tamil" },
  kollywood_cream: { id: "37i9dQZF1DX1i3hvzHpcQV", title: "Kollywood Cream", artist: "Muse Tamil", lang: "tamil" },
  telugu_hits: { id: "37i9dQZF1DWWwrjLPC16W7", title: "Hot Hits Telugu", artist: "Muse Telugu", lang: "telugu" },
  tollywood_pearls: { id: "37i9dQZF1DX6XE7HRLM75P", title: "Tollywood Pearls", artist: "Muse Telugu", lang: "telugu" },
  punjabi_hits: { id: "37i9dQZF1DWXVJK4aT7pmk", title: "Hot Hits Punjabi", artist: "Muse Punjabi", lang: "punjabi" },
  punjabi_101: { id: "37i9dQZF1DX5baCFRgbF3x", title: "Punjabi 101", artist: "Muse Punjabi", lang: "punjabi" }
};

// Bounded In-Memory Caches for Sub-Millisecond Repeat Lookups & Reduced Subrequests
const WORKING_STREAM_MEMO = new Map();
const SECONDARY_AUDIO_MEMO = new Map();
const VIDEO_STREAM_MEMO = new Map();
const SONG_META_MEMO = new Map();
const TRACK_IDENTITY_MEMO = new Map();
const TRACK_BRIDGE_MEMO = new Map();
const SPOTIFY_ARTIST_MEMO = new Map();
const SPOTIFY_PLAYLIST_MEMO = new Map();
const CLIENT_TASTE_PROFILE_MEMO = new Map();

let CACHED_SPOTIFY_ANON_TOKEN = null;
let CACHED_SPOTIFY_TOKEN_EXP = 0;
let CACHED_APPLE_WEB_TOKEN = null;
let CACHED_APPLE_TOKEN_EXP = 0;

function setBoundedMemo(map, key, value, maxEntries = 1500) {
  if (!key) return;
  if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = 4800) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ============================================================================
// PERSISTENT 2-TIER SUBREQUEST REDUCTION CACHE (RAM + CLOUDFLARE EDGE)
// ============================================================================

async function getOrComputeSubrequestCache(cacheKeyStr, ttlSeconds, computeFn, ctx = null) {
  if (TRACK_BRIDGE_MEMO.has(cacheKeyStr)) {
    return TRACK_BRIDGE_MEMO.get(cacheKeyStr);
  }

  const cache = caches.default;
  const syntheticReq = new Request(`https://edge-internal.projectvelo.workers.dev/kv/${encodeURIComponent(cacheKeyStr)}`, {
    method: "GET"
  });

  try {
    const hit = await cache.match(syntheticReq);
    if (hit && hit.ok) {
      const val = await hit.json();
      setBoundedMemo(TRACK_BRIDGE_MEMO, cacheKeyStr, val, 2000);
      return val;
    }
  } catch {}

  const computed = await computeFn();
  if (computed !== null && computed !== undefined) {
    setBoundedMemo(TRACK_BRIDGE_MEMO, cacheKeyStr, computed, 2000);
    try {
      const resToStore = new Response(JSON.stringify(computed), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, s-maxage=${ttlSeconds}`
        }
      });
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(cache.put(syntheticReq, resToStore));
      } else {
        await cache.put(syntheticReq, resToStore);
      }
    } catch {}
  }
  return computed;
}

// ============================================================================
// ADAPTIVE CLIENT TASTE PROFILE & AUDIO QUALITY PREFERENCE ENGINE
// ============================================================================

function getClientFingerprint(request, url) {
  const explicitClient = url?.searchParams?.get("clientId")
    || url?.searchParams?.get("session")
    || request?.headers?.get("X-Client-Id");
  if (explicitClient) return String(explicitClient).trim().slice(0, 64);

  const ip = request?.headers?.get("CF-Connecting-IP") || request?.headers?.get("X-Forwarded-For") || "anon";
  const ua = (request?.headers?.get("User-Agent") || "").slice(0, 48);
  return `${ip}__${ua}`;
}

function getOrCreateClientProfile(request, url) {
  const key = getClientFingerprint(request, url);
  let profile = CLIENT_TASTE_PROFILE_MEMO.get(key);
  if (!profile) {
    profile = {
      clientId: key,
      preferredQuality: "320",
      playedTrackIds: [],
      playedTrackSignatures: [],
      artistScores: {},
      languageScores: {},
      recentSeedTracks: [],
      updatedAt: Date.now()
    };
    setBoundedMemo(CLIENT_TASTE_PROFILE_MEMO, key, profile, 800);
  }
  return profile;
}

function recordClientTrackInteraction(request, url, trackObj) {
  if (!trackObj || (!trackObj.title && !trackObj.id)) return;
  const profile = getOrCreateClientProfile(request, url);
  profile.updatedAt = Date.now();

  const idStr = String(trackObj.id || "");
  if (idStr) {
    profile.playedTrackIds = [
      idStr,
      ...profile.playedTrackIds.filter(x => x !== idStr)
    ].slice(0, 80);
  }

  const title = cleanText(trackObj.title || trackObj.trackName || "");
  const artist = cleanText(trackObj.artist || trackObj.artistName || trackObj.primary_artists || "");
  if (title) {
    const sig = normalizeTokenComparison(`${extractCoreTrackTitle(title)} ${artist.split(",")[0]}`);
    if (sig) {
      profile.playedTrackSignatures = [
        sig,
        ...profile.playedTrackSignatures.filter(x => x !== sig)
      ].slice(0, 80);
    }
  }

  const artistList = Array.isArray(trackObj.allArtists) && trackObj.allArtists.length > 0
    ? trackObj.allArtists
    : artist.split(/[,&/|]/).map(cleanText).filter(Boolean);

  for (let i = 0; i < Math.min(3, artistList.length); i++) {
    const aName = artistList[i];
    if (!aName || /^(unknown|muse|openmuse|spotify|apple)/i.test(aName)) continue;
    const weight = i === 0 ? 3 : 1.5;
    profile.artistScores[aName] = (profile.artistScores[aName] || 0) + weight;
  }

  const lang = cleanText(trackObj.language || trackObj.more_info?.language || "").toLowerCase();
  if (lang && lang !== "unknown") {
    profile.languageScores[lang] = (profile.languageScores[lang] || 0) + 2;
  }

  if (title && artist) {
    profile.recentSeedTracks = [
      {
        id: idStr,
        spotifyId: trackObj.spotifyId || null,
        appleId: trackObj.appleId || null,
        title,
        artist: artistList[0] || artist
      },
      ...profile.recentSeedTracks.filter(x => x.title.toLowerCase() !== title.toLowerCase())
    ].slice(0, 15);
  }
}

function getTopClientAffinityArtists(profile, limit = 5) {
  if (!profile || !profile.artistScores) return [];
  return Object.entries(profile.artistScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(entry => entry[0]);
}

function resolveRequestedAudioQuality(request, url) {
  const rawParam = (
    url?.searchParams?.get("quality") ||
    url?.searchParams?.get("bitrate") ||
    request?.headers?.get("X-Audio-Quality") ||
    ""
  ).toLowerCase().trim();

  if (rawParam) {
    if (/^(320|320kbps|best|highest|max|high|hd|lossless|ultra)$/.test(rawParam)) return "320";
    if (/^(160|160kbps|medium|med|standard|normal|good)$/.test(rawParam)) return "160";
    if (/^(96|96kbps|low|saver|data_saver|datasaver|eco)$/.test(rawParam)) return "96";
    if (rawParam === "auto" || rawParam === "adaptive") {
      const saveData = request?.headers?.get("Save-Data");
      if (saveData === "on") return "96";
      const rtt = Number(request?.cf?.clientTcpRtt || 0);
      if (rtt > 450) return "160";
      return "320";
    }
  }

  if (request && url) {
    const profile = CLIENT_TASTE_PROFILE_MEMO.get(getClientFingerprint(request, url));
    if (profile?.preferredQuality) return profile.preferredQuality;
  }

  return "320";
}

// ============================================================================
// JIOSAAVN 320KBPS DES AUDIO DECRYPTION & MULTI-QUALITY BITRATE CASCADE
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

function decryptSaavnMediaUrl(encryptedBase64, targetBitrate = "320") {
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

    const br = ["320", "160", "96"].includes(String(targetBitrate)) ? String(targetBitrate) : "320";
    url = url
      .replace(/_(320|160|96|96_p)\.mp4/i, `_${br}.mp4`)
      .replace(/_(320|160|96|96_p)\.mp3/i, `_${br}.mp3`);

    return url;
  } catch {
    return null;
  }
}

function buildSaavnQualityUrls(rawAudioUrl) {
  if (!rawAudioUrl) return null;
  const cleanUrl = String(rawAudioUrl).replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim();
  if (!cleanUrl.includes("saavncdn.com")) {
    return { "320": cleanUrl, "160": cleanUrl, "96": cleanUrl };
  }
  try {
    const parsed = new URL(cleanUrl.replace(/^http:\/\//i, "https://"));
    const searchSuffix = parsed.search || "";
    const ext = /\.mp3$/i.test(parsed.pathname) ? "mp3" : "mp4";
    const stemPath = parsed.pathname.replace(/_(320|160|96|96_p)\.(mp4|mp3)$/i, "");
    const aacBase = `https://aac.saavncdn.com${stemPath}`;
    return {
      "320": `${aacBase}_320.${ext}${searchSuffix}`,
      "160": `${aacBase}_160.${ext}${searchSuffix}`,
      "96": `${aacBase}_96.${ext}${searchSuffix}`
    };
  } catch {
    return { "320": cleanUrl, "160": cleanUrl, "96": cleanUrl };
  }
}

function buildSaavnBitrateCascade(rawAudioUrl, preferredQuality = "320") {
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

  const order = preferredQuality === "96"
    ? ["96", "160", "320"]
    : preferredQuality === "160"
      ? ["160", "320", "96"]
      : ["320", "160", "96"];

  const candidates = [];
  for (const br of order) {
    candidates.push(`${aacBase}_${br}.${ext}${searchSuffix}`);
    candidates.push(`${hBase}_${br}.${ext}${searchSuffix}`);
  }
  candidates.push(cleanUrl);
  candidates.push(`${previewBase}_96_p.mp4${searchSuffix}`);

  return [...new Set(candidates.filter(Boolean))];
}

function cleanText(str) {
  if (!str) return "";
  let s = String(str);
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
    .replace(/\{w\}x\{h\}([a-z]*)/gi, "600x600bb")
    .replace(/50x50|150x150/g, "500x500")
    .replace(/100x100bb|60x60bb|200x200bb|300x300bb/g, "600x600bb")
    .replace(/^http:\/\//i, "https://");
}

function proxyImg(imgUrl, origin) {
  const hi = upgradeImage(imgUrl);
  return hi ? `${origin}/stream?url=${encodeURIComponent(hi)}` : "";
}

async function fetchSaavnJson(queryParamsObj, timeoutMs = 5000) {
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
// UNICODE BRAHMIC TO ENGLISH-WRITTEN (ROMANIZED) PHONEMIC TRANSLITERATION
// ============================================================================

const BRAHMIC_INDEPENDENT_VOWELS = {
  0x05: "a",  0x06: "aa", 0x07: "i",  0x08: "ee", 0x09: "u",  0x0A: "oo",
  0x0B: "ri", 0x0C: "li", 0x0D: "e",  0x0E: "e",  0x0F: "e",  0x10: "ai",
  0x11: "o",  0x12: "o",  0x13: "o",  0x14: "au"
};

const BRAHMIC_DEPENDENT_VOWELS = {
  0x3E: "aa", 0x3F: "i",  0x40: "ee", 0x41: "u",  0x42: "oo", 0x43: "ri",
  0x44: "rii",0x45: "e",  0x46: "e",  0x47: "e",  0x48: "ai", 0x49: "o",
  0x4A: "o",  0x4B: "o",  0x4C: "au", 0x57: "au"
};

const BRAHMIC_CONSONANTS = {
  0x15: "k",  0x16: "kh", 0x17: "g",  0x18: "gh", 0x19: "ng",
  0x1A: "ch", 0x1B: "chh",0x1C: "j",  0x1D: "jh", 0x1E: "nj",
  0x1F: "t",  0x20: "th", 0x21: "d",  0x22: "dh", 0x23: "n",
  0x24: "th", 0x25: "thh",0x26: "d",  0x27: "dh", 0x28: "n",  0x29: "n",
  0x2A: "p",  0x2B: "ph", 0x2C: "b",  0x2D: "bh", 0x2E: "m",
  0x2F: "y",  0x30: "r",  0x31: "r",  0x32: "l",  0x33: "l",  0x34: "zh",
  0x35: "v",  0x36: "sh", 0x37: "sh", 0x38: "s",  0x39: "h"
};

const MALAYALAM_CHILLU = {
  0x7A: "nn", 0x7B: "n", 0x7C: "r", 0x7D: "l", 0x7E: "ll", 0x7F: "k"
};

function hasIndicScriptChars(str) {
  return /[\u0900-\u0d7f]/.test(String(str || ""));
}

function transliterateIndicToRoman(input) {
  if (!input || !hasIndicScriptChars(input)) return input;
  const chars = Array.from(String(input));
  let out = "";

  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp >= 0x0900 && cp <= 0x0D7F) {
      const block = cp & 0xFF80;
      const offset = cp - block;
      const nextCp = i + 1 < chars.length ? chars[i + 1].codePointAt(0) : 0;
      const nextOffset = (nextCp >= block && nextCp < block + 0x80) ? (nextCp - block) : -1;

      if (offset === 0x01 || offset === 0x02) {
        out += (nextOffset >= 0x2A && nextOffset <= 0x2E) || nextOffset === -1 ? "m" : "n";
      } else if (offset === 0x03) {
        out += "h";
      } else if (BRAHMIC_INDEPENDENT_VOWELS[offset]) {
        out += BRAHMIC_INDEPENDENT_VOWELS[offset];
      } else if (block === 0x0D00 && MALAYALAM_CHILLU[offset]) {
        out += MALAYALAM_CHILLU[offset];
      } else if (BRAHMIC_CONSONANTS[offset]) {
        let baseCons = BRAHMIC_CONSONANTS[offset];
        if (block === 0x0B80 && offset === 0x24) baseCons = "th";
        out += baseCons;

        if (nextOffset === 0x4D) {
          i++;
        } else if (BRAHMIC_DEPENDENT_VOWELS[nextOffset]) {
          out += BRAHMIC_DEPENDENT_VOWELS[nextOffset];
          i++;
        } else if (nextOffset === 0x3C) {
          i++;
          const afterNuktaCp = i + 1 < chars.length ? chars[i + 1].codePointAt(0) : 0;
          const afterNuktaOff = (afterNuktaCp >= block && afterNuktaCp < block + 0x80) ? (afterNuktaCp - block) : -1;
          if (afterNuktaOff === 0x4D) {
            i++;
          } else if (BRAHMIC_DEPENDENT_VOWELS[afterNuktaOff]) {
            out += BRAHMIC_DEPENDENT_VOWELS[afterNuktaOff];
            i++;
          } else {
            out += "a";
          }
        } else {
          const isNorthIndian = block <= 0x0B00;
          const isWordEnd = nextOffset === -1;
          if (!(isNorthIndian && isWordEnd && i > 0)) {
            out += "a";
          }
        }
      } else if (BRAHMIC_DEPENDENT_VOWELS[offset]) {
        out += BRAHMIC_DEPENDENT_VOWELS[offset];
      }
    } else {
      out += chars[i];
    }
  }

  return out.replace(/\s+/g, " ").trim();
}

// ============================================================================
// STRING SIMILARITY, VARIANT DETECTION & SMART DEDUPLICATION ENGINE
// ============================================================================

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

function computeStringSimilarity(strA, strB) {
  const a = normalizeTokenComparison(strA);
  const b = normalizeTokenComparison(strB);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return Math.max(0.82, ratio);
  }

  const aCompact = a.replace(/\s+/g, "");
  const bCompact = b.replace(/\s+/g, "");
  if (aCompact.length < 2 || bCompact.length < 2) return aCompact === bCompact ? 1 : 0;

  const bigramsA = new Map();
  for (let i = 0; i < aCompact.length - 1; i++) {
    const bg = aCompact.slice(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < bCompact.length - 1; i++) {
    const bg = bCompact.slice(i, i + 2);
    const count = bigramsA.get(bg) || 0;
    if (count > 0) {
      bigramsA.set(bg, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / ((aCompact.length - 1) + (bCompact.length - 1));
}

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
    if (m.rx.test(combined)) {
      variantTokens.push(m.key);
    }
  }

  return variantTokens.length > 0 ? variantTokens.sort().join("+") : "standard";
}

function extractCoreTrackTitle(rawTitle = "") {
  return cleanText(rawTitle)
    .replace(/\s*[\[(]\s*(?:from|movie|film|ost|original\s+motion\s+picture|soundtrack|motion\s+picture|featured\s+in|inspired\s+by|theme)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*(?:from|movie|film|ost|original\s+motion\s+picture|single|ep|soundtrack).*$/gi, " ")
    .replace(/\s*[\[(]\s*(?:official|audio|video|lyrical|full\s+song|full\s+video|hd|hq|hindi|tamil|telugu|malayalam|kannada|punjabi|bengali|english|feat\.?[^)\]]*|ft\.?[^)\]]*)\s*[\])]/gi, " ")
    .replace(/\s*[\[(][^)\]]*(?:remix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*[^-]*(?:remix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit).*$/gi, " ")
    .replace(/\b(?:feat\.?|ft\.?|featuring)\s+.*$/gi, " ")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTrackDedupSignature(song) {
  if (!song) return "";
  const rawTitle = song.title || song.song || "";
  const rawAlbum = song.album || song.more_info?.album || "";
  const coreTitle = normalizeTokenComparison(extractCoreTrackTitle(rawTitle) || rawTitle);
  const variantTag = extractTrackVariantTag(rawTitle, rawAlbum);

  const artistList = (song.allArtists && song.allArtists.length > 0)
    ? song.allArtists
    : String(song.artist || song.primary_artists || "").split(",");

  const normArtists = artistList
    .map(a => normalizeTokenComparison(a))
    .filter(Boolean);

  const sortedTopArtists = [...new Set(normArtists)].slice(0, 2).sort().join("_");
  return `${coreTitle}__${variantTag}__${sortedTopArtists || "artist"}`;
}

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
    .filter(s =>
      s &&
      s.id &&
      !String(s.id).startsWith("apple:") &&
      !String(s.id).startsWith("spotify:") &&
      !String(s.id).startsWith("ytm:") &&
      !String(s.id).startsWith("curated:") &&
      !(s.more_info?.encrypted_media_url || s.encrypted_media_url || s.decrypted_media_url)
    )
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

async function filterAndUpgradeSongs(rawSongs, origin, userQuery = "", preferredQuality = "320") {
  if (!Array.isArray(rawSongs)) return [];
  const filtered = rawSongs.filter(s => !isLowQualityJunkTrack(s, userQuery));
  const listToProcess = filtered.length > 0 ? filtered : rawSongs;
  const healed = await batchHealMissingMediaUrls(listToProcess);

  const enrichedList = healed
    .map(s => enrichSaavnSong(s, origin, null, preferredQuality))
    .filter(s => s && s.id);

  return deduplicateEnrichedSongs(enrichedList);
}

function enrichSaavnSong(s, origin, externalMeta = null, preferredQuality = "320") {
  if (!s || typeof s !== "object") return s;
  const more = s.more_info || {};
  const enc = more.encrypted_media_url || s.encrypted_media_url;
  const quality = ["320", "160", "96"].includes(String(preferredQuality)) ? String(preferredQuality) : "320";

  let directUrl = s.decrypted_media_url || decryptSaavnMediaUrl(enc, quality);
  if (!directUrl) {
    const preview = more.media_preview_url || s.media_preview_url || more.vlink;
    if (preview) {
      directUrl = String(preview)
        .replace(/^http:\/\//i, "https://")
        .replace("preview.saavncdn.com", "aac.saavncdn.com")
        .replace(/_96_p\.mp4/i, `_${quality}.mp4`);
    }
  }

  const artistNames = [];
  if (externalMeta?.artistName) {
    artistNames.push(...String(externalMeta.artistName).split(/[,&]/).map(cleanText));
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

  const extImg = externalMeta?.artworkUrl || "";
  const isGenericPlaylistCover = /ab67706/i.test(extImg);
  const rawImg = (!isGenericPlaylistCover && extImg) ? extImg : (s.image || s.coverUrl || extImg);
  const hiResImg = upgradeImage(rawImg);

  const titleClean = cleanText(externalMeta?.trackName || s.title || s.song || "Untitled");
  const albumTitle = cleanText(externalMeta?.collectionName || more.album || s.album || "OpenMuse");
  const albumId = more.album_id || s.album_id || null;
  const durationSec = parseInt(more.duration || s.duration || externalMeta?.durationSec || "0", 10) || 0;
  const appleId = externalMeta?.appleTrackId || s.appleId || null;
  const spotifyId = externalMeta?.spotifyTrackId || s.spotifyId || null;
  const ytVideoId = externalMeta?.ytVideoId || s.ytVideoId || null;
  const idStr = String(s.id);
  const variantTag = extractTrackVariantTag(titleClean, albumTitle);

  const qualityMap = directUrl ? buildSaavnQualityUrls(directUrl) : null;
  const selectedDirectUrl = (qualityMap && qualityMap[quality]) ? qualityMap[quality] : directUrl;

  const workerStream = selectedDirectUrl
    ? `${origin}/stream?url=${encodeURIComponent(selectedDirectUrl)}&quality=${quality}`
    : `${origin}/play?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${spotifyId ? `&spotifyId=${encodeURIComponent(spotifyId)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}&quality=${quality}`;

  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${spotifyId ? `&spotifyId=${encodeURIComponent(spotifyId)}` : ""}${selectedDirectUrl ? `&url=${encodeURIComponent(selectedDirectUrl)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}&quality=${quality}`;
  const downloadEndpointUrl = `${origin}/download?id=${encodeURIComponent(idStr)}${selectedDirectUrl ? `&url=${encodeURIComponent(selectedDirectUrl)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&quality=${quality}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${spotifyId ? `&spotifyId=${encodeURIComponent(spotifyId)}` : ""}&trackName=${encodeURIComponent(titleClean)}&artistName=${encodeURIComponent(primaryArtists)}&albumName=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;
  const videoEndpointUrl = `${origin}/video?id=${encodeURIComponent(idStr)}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}&audio=0&mode=redirect`;
  const videoMetaEndpointUrl = `${origin}/video?id=${encodeURIComponent(idStr)}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}&audio=0&mode=json`;

  const cascade = selectedDirectUrl ? buildSaavnBitrateCascade(selectedDirectUrl, quality) : [];

  const qualitiesObj = {
    default: `${quality}kbps`,
    selected: `${quality}kbps`,
    "320kbps": qualityMap?.["320"] ? `${origin}/stream?url=${encodeURIComponent(qualityMap["320"])}&quality=320` : `${playEndpointUrl}&quality=320`,
    "160kbps": qualityMap?.["160"] ? `${origin}/stream?url=${encodeURIComponent(qualityMap["160"])}&quality=160` : `${playEndpointUrl}&quality=160`,
    "96kbps": qualityMap?.["96"] ? `${origin}/stream?url=${encodeURIComponent(qualityMap["96"])}&quality=96` : `${playEndpointUrl}&quality=96`,
    download: {
      "320kbps": `${origin}/download?id=${encodeURIComponent(idStr)}${qualityMap?.["320"] ? `&url=${encodeURIComponent(qualityMap["320"])}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&quality=320`,
      "160kbps": `${origin}/download?id=${encodeURIComponent(idStr)}${qualityMap?.["160"] ? `&url=${encodeURIComponent(qualityMap["160"])}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&quality=160`,
      "96kbps": `${origin}/download?id=${encodeURIComponent(idStr)}${qualityMap?.["96"] ? `&url=${encodeURIComponent(qualityMap["96"])}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&quality=96`
    }
  };

  const enrichedObj = {
    ...s,
    id: idStr,
    appleId: appleId ? String(appleId) : null,
    spotifyId: spotifyId ? String(spotifyId) : null,
    ytVideoId: ytVideoId ? String(ytVideoId) : null,
    variant: variantTag,
    type: "song",
    itemType: "song",
    title: titleClean,
    song: titleClean,
    artist: primaryArtists,
    primary_artists: primaryArtists,
    allArtists: uniqueArtists,
    subtitle: primaryArtists,
    album: albumTitle,
    albumId: albumId ? String(albumId) : null,
    duration: durationSec,
    language: cleanText(s.language || more.language || ""),
    hasLyrics: true,
    image: hiResImg,
    coverUrl: proxyImg(hiResImg, origin),
    encrypted_media_url: enc || "",
    decrypted_media_url: selectedDirectUrl || playEndpointUrl,
    streamUrl: workerStream,
    playUrl: playEndpointUrl,
    downloadUrl: downloadEndpointUrl,
    lyricsUrl: lyricsEndpointUrl,
    videoUrl: videoEndpointUrl,
    videoMetaUrl: videoMetaEndpointUrl,
    audioQuality: `${quality}kbps`,
    qualities: qualitiesObj,
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
      url: selectedDirectUrl || playEndpointUrl,
      workerStreamUrl: workerStream,
      smartPlayUrl: playEndpointUrl,
      downloadUrl: downloadEndpointUrl,
      videoStreamUrl: videoEndpointUrl,
      videoMetaUrl: videoMetaEndpointUrl,
      audioFormat: "MP4_AAC_LC",
      audioQuality: `KBPS${quality}`,
      qualities: qualitiesObj,
      cascade
    }
  };

  setBoundedMemo(SONG_META_MEMO, idStr, enrichedObj);
  if (appleId) setBoundedMemo(SONG_META_MEMO, `apple:${appleId}`, enrichedObj);
  if (spotifyId) setBoundedMemo(SONG_META_MEMO, `spotify:${spotifyId}`, enrichedObj);
  if (ytVideoId) setBoundedMemo(SONG_META_MEMO, `ytm:${ytVideoId}`, enrichedObj);
  return enrichedObj;
}

function buildCuratedBridgedSongObject(curatedItem, matchedSaavnRaw, origin, preferredQuality = "320") {
  const quality = ["320", "160", "96"].includes(String(preferredQuality)) ? String(preferredQuality) : "320";
  const appleTrackId = curatedItem.trackId || curatedItem.appleId ? String(curatedItem.trackId || curatedItem.appleId) : "";
  const spotifyTrackId = curatedItem.spotifyId ? String(curatedItem.spotifyId) : "";
  const ytVideoId = curatedItem.ytVideoId ? String(curatedItem.ytVideoId) : "";
  const trackName = cleanText(curatedItem.trackName || curatedItem.name || curatedItem.title || "Untitled");
  const artistName = cleanText(curatedItem.artistName || curatedItem.artist || "Unknown Artist");
  const collectionName = cleanText(curatedItem.collectionName || curatedItem.albumName || trackName);
  const durationSec = curatedItem.trackTimeMillis
    ? Math.round(curatedItem.trackTimeMillis / 1000)
    : (curatedItem.durationSec || 0);
  const rawArt = curatedItem.artworkUrl100 || curatedItem.artworkUrl || "";
  const isPlaylistCover = /ab67706/i.test(rawArt);
  const artworkUrl = upgradeImage((!isPlaylistCover && rawArt) ? rawArt : (matchedSaavnRaw?.image || rawArt));

  if (matchedSaavnRaw) {
    return enrichSaavnSong(matchedSaavnRaw, origin, {
      appleTrackId: appleTrackId || null,
      spotifyTrackId: spotifyTrackId || null,
      ytVideoId: ytVideoId || null,
      trackName: matchedSaavnRaw.title && extractTrackVariantTag(matchedSaavnRaw.title) !== "standard"
        ? cleanText(matchedSaavnRaw.title)
        : trackName,
      artistName,
      collectionName,
      durationSec: parseInt(matchedSaavnRaw.more_info?.duration || matchedSaavnRaw.duration || String(durationSec), 10) || durationSec,
      artworkUrl: artworkUrl || matchedSaavnRaw.image
    }, quality);
  }

  const syntheticId = appleTrackId
    ? `apple:${appleTrackId}`
    : (spotifyTrackId
        ? `spotify:${spotifyTrackId}`
        : (ytVideoId ? `ytm:${ytVideoId}` : `curated:${encodeURIComponent(`${trackName}_${artistName}`)}`));

  const basePlayParams = `id=${encodeURIComponent(syntheticId)}${appleTrackId ? `&appleId=${encodeURIComponent(appleTrackId)}` : ""}${spotifyTrackId ? `&spotifyId=${encodeURIComponent(spotifyTrackId)}` : ""}${ytVideoId ? `&ytVideoId=${encodeURIComponent(ytVideoId)}` : ""}&title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(collectionName)}&duration=${durationSec}`;
  const playEndpointUrl = `${origin}/play?${basePlayParams}&quality=${quality}`;
  const downloadEndpointUrl = `${origin}/download?${basePlayParams}&quality=${quality}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(syntheticId)}${appleTrackId ? `&appleId=${encodeURIComponent(appleTrackId)}` : ""}${spotifyTrackId ? `&spotifyId=${encodeURIComponent(spotifyTrackId)}` : ""}&trackName=${encodeURIComponent(trackName)}&artistName=${encodeURIComponent(artistName)}&albumName=${encodeURIComponent(collectionName)}&duration=${durationSec}`;
  const videoEndpointUrl = `${origin}/video?id=${encodeURIComponent(syntheticId)}&title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(collectionName)}&duration=${durationSec}&audio=0&mode=redirect`;
  const videoMetaEndpointUrl = `${origin}/video?id=${encodeURIComponent(syntheticId)}&title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(collectionName)}&duration=${durationSec}&audio=0&mode=json`;

  const qualitiesObj = {
    default: `${quality}kbps`,
    selected: `${quality}kbps`,
    "320kbps": `${origin}/play?${basePlayParams}&quality=320`,
    "160kbps": `${origin}/play?${basePlayParams}&quality=160`,
    "96kbps": `${origin}/play?${basePlayParams}&quality=96`,
    download: {
      "320kbps": `${origin}/download?${basePlayParams}&quality=320`,
      "160kbps": `${origin}/download?${basePlayParams}&quality=160`,
      "96kbps": `${origin}/download?${basePlayParams}&quality=96`
    }
  };

  const bridgedObj = {
    id: syntheticId,
    appleId: appleTrackId || null,
    spotifyId: spotifyTrackId || null,
    ytVideoId: ytVideoId || null,
    variant: extractTrackVariantTag(trackName, collectionName),
    type: "song",
    itemType: "song",
    title: trackName,
    song: trackName,
    artist: artistName,
    primary_artists: artistName,
    allArtists: artistName.split(/[,&]/).map(cleanText).filter(Boolean),
    subtitle: artistName,
    album: collectionName,
    albumId: curatedItem.collectionId ? `apple:${curatedItem.collectionId}` : null,
    duration: durationSec,
    hasLyrics: true,
    image: artworkUrl,
    coverUrl: proxyImg(artworkUrl, origin),
    encrypted_media_url: "",
    decrypted_media_url: playEndpointUrl,
    streamUrl: playEndpointUrl,
    playUrl: playEndpointUrl,
    downloadUrl: downloadEndpointUrl,
    lyricsUrl: lyricsEndpointUrl,
    videoUrl: videoEndpointUrl,
    videoMetaUrl: videoMetaEndpointUrl,
    audioQuality: `${quality}kbps`,
    qualities: qualitiesObj,
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
      downloadUrl: downloadEndpointUrl,
      videoStreamUrl: videoEndpointUrl,
      videoMetaUrl: videoMetaEndpointUrl,
      audioFormat: "MP4_AAC_LC",
      audioQuality: `KBPS${quality}`,
      qualities: qualitiesObj,
      cascade: [playEndpointUrl]
    }
  };

  setBoundedMemo(SONG_META_MEMO, syntheticId, bridgedObj);
  return bridgedObj;
}

/**
 * Strict Verifier for JioSaavn Candidate Matches:
 * Prevents JioSaavn from returning an unrelated song with a similar word when a song is actually unavailable on JioSaavn,
 * allowing our Secondary High-Res Audio Engine (YouTube Music / Piped / Invidious) to take over cleanly!
 */
function findBestSaavnMatchForCuratedTrack(curatedItem, saavnPool) {
  if (!Array.isArray(saavnPool) || saavnPool.length === 0) return null;

  const targetTitleRaw = cleanText(curatedItem.trackName || curatedItem.name || curatedItem.title || "");
  const targetAlbumRaw = cleanText(curatedItem.collectionName || curatedItem.albumName || "");
  const targetCore = normalizeTokenComparison(extractCoreTrackTitle(targetTitleRaw) || targetTitleRaw);
  const targetVariant = extractTrackVariantTag(targetTitleRaw, targetAlbumRaw);
  const targetArtists = String(curatedItem.artistName || curatedItem.artist || "")
    .split(/[,&/|]/)
    .map(a => normalizeTokenComparison(a))
    .filter(a => a && !/^(unknown|artist|various|spotify|apple|muse|openmuse)$/i.test(a));
  const targetDur = curatedItem.trackTimeMillis
    ? Math.round(curatedItem.trackTimeMillis / 1000)
    : (curatedItem.durationSec || 0);

  let bestMatch = null;
  let bestScore = -999;

  for (const s of saavnPool) {
    if (!s || isLowQualityJunkTrack(s, targetTitleRaw)) continue;
    const sTitleRaw = cleanText(s.title || s.song || "");
    const sAlbumRaw = cleanText(s.more_info?.album || s.album || "");
    const sCore = normalizeTokenComparison(extractCoreTrackTitle(sTitleRaw) || sTitleRaw);
    const sVariant = extractTrackVariantTag(sTitleRaw, sAlbumRaw);

    if (!sCore || !targetCore) continue;
    if (targetVariant !== sVariant) continue;

    let score = 0;
    const titleSim = computeStringSimilarity(sCore, targetCore);
    if (sCore === targetCore) {
      score += 110;
    } else if (titleSim >= 0.85) {
      score += Math.round(titleSim * 95);
    } else if ((sCore.includes(targetCore) || targetCore.includes(sCore)) && Math.min(sCore.length, targetCore.length) >= 5) {
      score += 78;
    } else {
      const aWords = targetCore.split(" ").filter(w => w.length >= 3);
      const matched = aWords.filter(w => sCore.includes(w));
      if (aWords.length >= 2 && matched.length === aWords.length) {
        score += 72;
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
    for (const aa of targetArtists) {
      const significantWords = aa.split(" ").filter(w => w.length >= 3);
      if (
        sArtistStr.includes(aa) ||
        (significantWords.length > 0 && significantWords.every(w => sArtistStr.includes(w))) ||
        significantWords.some(w => w.length >= 5 && sArtistStr.includes(w))
      ) {
        score += 75;
        artistMatched = true;
        break;
      }
    }

    const sAlbumNorm = normalizeTokenComparison(sAlbumRaw);
    const targetAlbNorm = normalizeTokenComparison(targetAlbumRaw);
    const albumMatched = Boolean(
      targetAlbNorm &&
      sAlbumNorm &&
      targetAlbNorm !== targetCore &&
      (sAlbumNorm.includes(targetAlbNorm) || targetAlbNorm.includes(sAlbumNorm))
    );
    if (albumMatched) score += 45;

    const sDur = parseInt(s.more_info?.duration || s.duration || "0", 10) || 0;
    let tightDurationMatch = false;
    if (targetDur > 0 && sDur > 0) {
      const diff = Math.abs(targetDur - sDur);
      if (diff <= 4) {
        score += 65;
        tightDurationMatch = true;
      } else if (diff <= 10) {
        score += 38;
      } else if (diff <= 20) {
        score += 12;
      } else if (diff > 32) {
        score -= 75;
      }
    }

    // Critical Safeguard: If target has known artists, do not accept a Saavn track that matches NEITHER artist NOR album NOR tight duration!
    if (targetArtists.length > 0 && !artistMatched && !albumMatched && !tightDurationMatch) {
      score -= 85;
    }

    if (s.more_info?.encrypted_media_url || s.encrypted_media_url) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = s;
    }
  }

  return bestScore >= 135 ? bestMatch : null;
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
// SECONDARY HIGH-RESOLUTION AUDIO ENGINE (YOUTUBE MUSIC / PIPED / INVIDIOUS)
// & OFFICIAL HIGHEST-QUALITY VIDEO-ONLY STREAMING ENGINE (`/video`)
// ============================================================================

function extractYoutubeVideoId(urlOrId) {
  if (!urlOrId) return "";
  const str = String(urlOrId).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:v=|\/videos\/|embed\/|youtu\.be\/|\/v\/|watch\?.*v=)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : "";
}

/**
 * Searches Piped & Invidious instances concurrently for YouTube Music / YouTube items.
 * filterType: "music_songs" | "music_videos" | "videos" | "all"
 */
async function searchYouTubeCluster(query, filterType = "music_songs", timeoutMs = 3600) {
  if (!query) return [];

  const pipedTasks = PIPED_API_INSTANCES.slice(0, 4).map(async (base) => {
    const res = await fetchWithTimeout(
      `${base}/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filterType)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" } },
      timeoutMs
    );
    if (!res.ok) throw new Error(`Piped search ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) throw new Error("Empty Piped items");
    return items.map(it => ({
      videoId: extractYoutubeVideoId(it.url || it.id),
      title: cleanText(it.title || ""),
      uploaderName: cleanText(it.uploaderName || it.author || ""),
      uploaderVerified: Boolean(it.uploaderVerified),
      duration: Number(it.duration || 0),
      views: Number(it.views || 0),
      thumbnail: upgradeImage(it.thumbnail || ""),
      isShort: Boolean(it.isShort)
    })).filter(x => x.videoId && x.title);
  });

  const invidiousTasks = INVIDIOUS_API_INSTANCES.slice(0, 3).map(async (base) => {
    const res = await fetchWithTimeout(
      `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" } },
      timeoutMs
    );
    if (!res.ok) throw new Error(`Invidious search ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) throw new Error("Empty Invidious items");
    return items.map(it => ({
      videoId: extractYoutubeVideoId(it.videoId),
      title: cleanText(it.title || ""),
      uploaderName: cleanText(it.author || ""),
      uploaderVerified: Boolean(it.authorVerified),
      duration: Number(it.lengthSeconds || 0),
      views: Number(it.viewCount || 0),
      thumbnail: upgradeImage(it.videoThumbnails?.[0]?.url || ""),
      isShort: Boolean(it.isUpcoming || (it.lengthSeconds > 0 && it.lengthSeconds < 45))
    })).filter(x => x.videoId && x.title);
  });

  try {
    return await Promise.any([...pipedTasks, ...invidiousTasks]);
  } catch {
    return [];
  }
}

/**
 * Fetches full adaptive audio & video streams for a YouTube videoId from Piped / Invidious clusters.
 */
async function fetchYouTubeStreamsForVideoId(videoId, timeoutMs = 4200) {
  if (!videoId) return null;

  const pipedStreamTasks = PIPED_API_INSTANCES.slice(0, 5).map(async (base) => {
    const res = await fetchWithTimeout(
      `${base}/streams/${encodeURIComponent(videoId)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" } },
      timeoutMs
    );
    if (!res.ok) throw new Error(`Piped stream ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.audioStreams) && !Array.isArray(data?.videoStreams)) {
      throw new Error("Invalid Piped stream payload");
    }
    return {
      provider: `Piped (${new URL(base).hostname})`,
      videoId,
      title: cleanText(data.title || ""),
      uploader: cleanText(data.uploader || ""),
      uploaderVerified: Boolean(data.uploaderVerified),
      duration: Number(data.duration || 0),
      thumbnailUrl: upgradeImage(data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`),
      hls: data.hls || null,
      audioStreams: (data.audioStreams || []).map(a => ({
        url: a.url,
        mimeType: a.mimeType || "audio/mp4",
        codec: a.codec || "",
        bitrate: Number(a.bitrate || 0),
        quality: a.quality || `${Math.round(Number(a.bitrate || 160000) / 1000)}kbps`,
        contentLength: Number(a.contentLength || 0)
      })).filter(a => a.url),
      videoStreams: (data.videoStreams || []).map(v => ({
        url: v.url,
        mimeType: v.mimeType || "video/mp4",
        codec: v.codec || "",
        format: v.format || "",
        quality: v.quality || `${v.height || 1080}p`,
        width: Number(v.width || 0),
        height: Number(v.height || parseInt(v.quality || "0", 10) || 0),
        fps: Number(v.fps || 30),
        bitrate: Number(v.bitrate || 0),
        videoOnly: Boolean(v.videoOnly)
      })).filter(v => v.url)
    };
  });

  const invidiousStreamTasks = INVIDIOUS_API_INSTANCES.slice(0, 3).map(async (base) => {
    const res = await fetchWithTimeout(
      `${base}/api/v1/videos/${encodeURIComponent(videoId)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" } },
      timeoutMs
    );
    if (!res.ok) throw new Error(`Invidious video ${res.status}`);
    const data = await res.json();
    const adaptive = Array.isArray(data?.adaptiveFormats) ? data.adaptiveFormats : [];
    const muxed = Array.isArray(data?.formatStreams) ? data.formatStreams : [];
    if (adaptive.length === 0 && muxed.length === 0) throw new Error("Empty Invidious formats");

    const audioStreams = adaptive
      .filter(f => String(f.type || "").startsWith("audio/") && f.url)
      .map(a => ({
        url: a.url,
        mimeType: String(a.type).split(";")[0].trim(),
        codec: a.encoding || "",
        bitrate: Number(a.bitrate || 0),
        quality: `${Math.round(Number(a.bitrate || 160000) / 1000)}kbps`,
        contentLength: Number(a.clen || 0)
      }));

    const videoOnlyStreams = adaptive
      .filter(f => String(f.type || "").startsWith("video/") && f.url)
      .map(v => {
        const resParts = String(v.size || "").split("x").map(Number);
        const height = resParts[1] || parseInt(v.qualityLabel || "0", 10) || 0;
        return {
          url: v.url,
          mimeType: String(v.type).split(";")[0].trim(),
          codec: v.encoding || "",
          format: v.container || "",
          quality: v.qualityLabel || `${height}p`,
          width: resParts[0] || 0,
          height,
          fps: Number(v.fps || 30),
          bitrate: Number(v.bitrate || 0),
          videoOnly: true
        };
      });

    const muxedStreams = muxed
      .filter(f => f.url)
      .map(v => {
        const height = parseInt(v.resolution || v.qualityLabel || "0", 10) || 720;
        return {
          url: v.url,
          mimeType: String(v.type || "video/mp4").split(";")[0].trim(),
          codec: v.encoding || "",
          format: v.container || "mp4",
          quality: v.qualityLabel || `${height}p`,
          width: 0,
          height,
          fps: Number(v.fps || 30),
          bitrate: Number(v.bitrate || 0),
          videoOnly: false
        };
      });

    return {
      provider: `Invidious (${new URL(base).hostname})`,
      videoId,
      title: cleanText(data.title || ""),
      uploader: cleanText(data.author || ""),
      uploaderVerified: Boolean(data.authorVerified),
      duration: Number(data.lengthSeconds || 0),
      thumbnailUrl: upgradeImage(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`),
      hls: data.hlsUrl || null,
      audioStreams,
      videoStreams: [...videoOnlyStreams, ...muxedStreams]
    };
  });

  try {
    return await Promise.any([...pipedStreamTasks, ...invidiousStreamTasks]);
  } catch {
    return null;
  }
}

/**
 * Secondary High-Resolution Audio Resolver (`resolveSecondaryHighResAudioStream`)
 * Triggered automatically when a song is unavailable on JioSaavn!
 * Finds the official YouTube Music ("- Topic" / Official Audio) master track and selects the highest bitrate AAC/Opus audio stream.
 */
async function resolveSecondaryHighResAudioStream({ title, artist, album, durationSec = 0, ytVideoId = "", preferredQuality = "320" }) {
  const coreTitle = extractCoreTrackTitle(title) || cleanText(title);
  const primaryArtist = cleanText(String(artist || "").split(/[,&]/)[0]);
  const memoKey = `sec_audio__${normalizeTokenComparison(coreTitle)}__${normalizeTokenComparison(primaryArtist)}__${preferredQuality}`;

  if (SECONDARY_AUDIO_MEMO.has(memoKey)) {
    return SECONDARY_AUDIO_MEMO.get(memoKey);
  }

  let candidateVideoIds = [];
  if (ytVideoId) {
    candidateVideoIds.push(ytVideoId);
  }

  if (candidateVideoIds.length === 0 && coreTitle) {
    const query = [coreTitle, primaryArtist || album].filter(Boolean).join(" ").trim();
    const [ytmSongs, ytmVideos] = await Promise.all([
      searchYouTubeCluster(query, "music_songs", 3400),
      searchYouTubeCluster(`${query} official audio`, "all", 3400)
    ]);

    const combined = [...ytmSongs, ...ytmVideos];
    const targetVariant = extractTrackVariantTag(title, album);
    const normTargetTitle = normalizeTokenComparison(coreTitle);
    const normTargetArtist = normalizeTokenComparison(primaryArtist);

    const scored = [];
    const seenIds = new Set();

    for (const item of combined) {
      if (!item.videoId || seenIds.has(item.videoId) || item.isShort) continue;
      seenIds.add(item.videoId);

      const itemTitleNorm = normalizeTokenComparison(extractCoreTrackTitle(item.title) || item.title);
      const itemUploaderNorm = normalizeTokenComparison(item.uploaderName.replace(/\s*-\s*topic$/i, ""));
      const itemVariant = extractTrackVariantTag(item.title, "");

      if (targetVariant === "standard" && itemVariant !== "standard") continue;
      if (/\b(karaoke|8d|ringtone|cover|tutorial|reaction|instrumental\s+version)\b/i.test(item.title) && !/\b(karaoke|cover|instrumental)\b/i.test(title)) {
        continue;
      }

      let score = 0;
      const sim = computeStringSimilarity(itemTitleNorm, normTargetTitle);
      if (itemTitleNorm === normTargetTitle) score += 110;
      else if (sim >= 0.78) score += Math.round(sim * 95);
      else if (itemTitleNorm.includes(normTargetTitle) || normTargetTitle.includes(itemTitleNorm)) score += 78;
      else continue;

      if (normTargetArtist) {
        const artistWords = normTargetArtist.split(" ").filter(w => w.length >= 3);
        if (
          itemUploaderNorm.includes(normTargetArtist) ||
          itemTitleNorm.includes(normTargetArtist) ||
          artistWords.some(w => w.length >= 4 && (itemUploaderNorm.includes(w) || itemTitleNorm.includes(w)))
        ) {
          score += 75;
        }
      }

      // Boost Official YouTube Music "- Topic" Auto-Generated Master Tracks & Verified Channels
      if (/-\s*topic$/i.test(item.uploaderName)) score += 65;
      if (item.uploaderVerified || /vevo|official/i.test(item.uploaderName)) score += 35;
      if (/\b(official\s+audio|lyrical|lyric\s+video)\b/i.test(item.title)) score += 30;

      if (durationSec > 0 && item.duration > 0) {
        const diff = Math.abs(durationSec - item.duration);
        if (diff <= 5) score += 60;
        else if (diff <= 15) score += 35;
        else if (diff > 60) score -= 50;
      }

      scored.push({ videoId: item.videoId, score });
    }

    scored.sort((a, b) => b.score - a.score);
    candidateVideoIds = scored.slice(0, 3).map(x => x.videoId);
  }

  for (const vid of candidateVideoIds) {
    const streamData = await fetchYouTubeStreamsForVideoId(vid, 4000);
    if (!streamData || !Array.isArray(streamData.audioStreams) || streamData.audioStreams.length === 0) continue;

    // Sort audio streams: prefer highest bitrate, and prefer AAC/M4A (audio/mp4) for universal Safari/iOS/HTML5 compatibility
    const sortedAudio = [...streamData.audioStreams].sort((a, b) => {
      const aIsMp4 = a.mimeType.includes("mp4") || a.mimeType.includes("m4a") ? 1 : 0;
      const bIsMp4 = b.mimeType.includes("mp4") || b.mimeType.includes("m4a") ? 1 : 0;
      if (preferredQuality === "320") {
        // Highest bitrate first, with slight boost for M4A when bitrates are close
        const scoreA = a.bitrate + aIsMp4 * 18000;
        const scoreB = b.bitrate + bIsMp4 * 18000;
        return scoreB - scoreA;
      }
      return a.bitrate - b.bitrate;
    });

    const bestAudio = sortedAudio[0];
    if (bestAudio?.url) {
      const result = {
        videoId: vid,
        streamUrl: bestAudio.url,
        mimeType: bestAudio.mimeType || "audio/mp4",
        bitrate: bestAudio.bitrate ? `${Math.round(bestAudio.bitrate / 1000)}kbps` : "160kbps",
        provider: streamData.provider,
        title: streamData.title || title,
        uploader: streamData.uploader || artist,
        duration: streamData.duration || durationSec,
        thumbnailUrl: streamData.thumbnailUrl
      };
      setBoundedMemo(SECONDARY_AUDIO_MEMO, memoKey, result, 600);
      return result;
    }
  }

  return null;
}

/**
 * Official Music Video Classifier (`scoreOfficialMusicVideoCandidate`)
 * Strictly selects the official live-action / studio Music Video ("Official Video", "Video Song", "Full Video")
 * and REJECTS:
 * - Animation / Animated / AMV / Anime / Cartoon / 3D / Gacha / Fan-Made videos
 * - Lyric / Lyrical videos / Audio-only / Visualizers / "- Topic" static art tracks
 * - Karaoke / Cover / Dance Practice / Reaction / Shorts
 */
function scoreOfficialMusicVideoCandidate(item, coreTitle, primaryArtist, albumName, targetDurationSec = 0) {
  if (!item || !item.videoId || !item.title || item.isShort) return -999;

  const rawTitle = item.title;
  const lowerTitle = rawTitle.toLowerCase();
  const uploader = item.uploaderName || "";
  const lowerUploader = uploader.toLowerCase();

  // 1. STRICT REJECTION OF ANIMATION, LYRIC VIDEOS, AUDIO TRACKS, AND NON-OFFICIAL JUNK
  const forbiddenVideoPatterns = [
    /\b(animation|animated|animatic|amv|anime\s+mv|anime\s+music\s+video|cartoon|gacha|minecraft|roblox|fortnite|3d\s+animation|fan\s*made|fan\s+animation|ai\s+video|ai\s+generated)\b/i,
    /\b(lyric\s*video|lyrical\s*video|lyrical\s*song|lyrical|lyrics|official\s+audio|audio\s+only|audio\s+song|full\s+audio|visualizer|visualiser|pseudo\s+video)\b/i,
    /\b(karaoke|instrumental|8d\s+audio|slowed|reverb|sped\s+up|nightcore|ringtone|reaction|review|tutorial|guitar\s+lesson|piano\s+cover|cover\s+version|dance\s+cover|choreography|making\s+of|behind\s+the\s+scenes|teaser|trailer)\b/i
  ];

  for (const rx of forbiddenVideoPatterns) {
    if (rx.test(lowerTitle)) return -999;
  }

  // Reject YouTube Music "- Topic" auto-generated static album cover tracks
  if (/-\s*topic$/i.test(uploader) || /auto-generated\s+by\s+youtube/i.test(lowerTitle)) {
    return -999;
  }

  if (item.duration > 0 && (item.duration < 65 || item.duration > 900)) {
    return -999;
  }

  // 2. VERIFY SONG TITLE MATCH
  const normTargetTitle = normalizeTokenComparison(coreTitle);
  const normItemTitle = normalizeTokenComparison(extractCoreTrackTitle(rawTitle) || rawTitle);
  const normAlbum = normalizeTokenComparison(albumName || "");
  const normArtist = normalizeTokenComparison(primaryArtist || "");

  let score = 0;
  const titleSim = computeStringSimilarity(normItemTitle, normTargetTitle);

  if (normItemTitle === normTargetTitle) {
    score += 120;
  } else if (normItemTitle.includes(normTargetTitle) || normTargetTitle.includes(normItemTitle)) {
    score += 95;
  } else if (titleSim >= 0.75) {
    score += Math.round(titleSim * 90);
  } else {
    const titleWords = normTargetTitle.split(" ").filter(w => w.length >= 3);
    const matched = titleWords.filter(w => normItemTitle.includes(w));
    if (titleWords.length > 0 && matched.length === titleWords.length) {
      score += 75;
    } else {
      return -500;
    }
  }

  // 3. BOOST OFFICIAL VIDEO / FULL VIDEO SONG INDICATORS
  if (/\b(official\s+music\s+video|official\s+video|official\s+mv|full\s+video\s+song|video\s+song|full\s+video|4k\s+video|4k\s+remaster)\b/i.test(rawTitle)) {
    score += 110;
  } else if (/\b(music\s+video|mv|video)\b/i.test(rawTitle)) {
    score += 65;
  }

  // 4. BOOST VERIFIED LABELS, VEVO, & MATCHING ARTIST/MOVIE
  if (item.uploaderVerified) score += 55;
  if (/vevo|t-series|sony\s*music|saregama|zee\s*music|yrf|think\s*music|aditya\s*music|lahari|muzic247|manorama\s*music|bhavna\s*studios|hombale|junglee|universal\s*music|warner\s*music|atlantic|interscope|republic\s*records|columbia/i.test(lowerUploader)) {
    score += 65;
  }

  if (normArtist) {
    const artWords = normArtist.split(" ").filter(w => w.length >= 3);
    if (
      lowerUploader.includes(normArtist) ||
      normItemTitle.includes(normArtist) ||
      artWords.some(w => w.length >= 4 && (lowerUploader.includes(w) || normItemTitle.includes(w)))
    ) {
      score += 70;
    }
  }

  if (normAlbum && normAlbum !== "openmuse" && normItemTitle.includes(normAlbum)) {
    score += 50;
  }

  // 5. DURATION PROXIMITY (Official music videos are usually within 0s-75s of the studio audio track)
  if (targetDurationSec > 0 && item.duration > 0) {
    const diff = Math.abs(targetDurationSec - item.duration);
    if (diff <= 15) score += 55;
    else if (diff <= 45) score += 35;
    else if (diff <= 90) score += 15;
    else if (diff > 180) score -= 60;
  }

  // 6. VIEW COUNT AUTHORITY BOOST
  if (item.views > 10_000_000) score += 35;
  else if (item.views > 1_000_000) score += 20;

  return score;
}

/**
 * Resolves the Official Music Video in Highest Quality (4K / 1440p / 1080p)
 * By default (`includeAudio = false`), selects the highest-resolution **video-only** adaptive stream (`videoOnly === true`)
 * so no audio bandwidth is wasted and no YouTube iframe or captions are ever loaded!
 */
async function resolveOfficialMusicVideoStream({
  songId = "",
  title = "",
  artist = "",
  album = "",
  durationSec = 0,
  explicitVideoId = "",
  includeAudio = false,
  maxHeight = 2160,
  preferContainer = "mp4"
}) {
  if (songId && SONG_META_MEMO.has(songId)) {
    const memo = SONG_META_MEMO.get(songId);
    if (!title) title = memo.title || "";
    if (!artist) artist = memo.artist || "";
    if (!album || album === "OpenMuse") album = memo.album || "";
    if (!durationSec && memo.duration) durationSec = memo.duration;
  }

  const coreTitle = extractCoreTrackTitle(title) || cleanText(title);
  const primaryArtist = cleanText(String(artist || "").split(/[,&]/)[0]);
  const cleanAlbum = cleanText(album && album !== "OpenMuse" ? album : "");

  const memoKey = `vid_v11__${explicitVideoId || normalizeTokenComparison(`${coreTitle}_${primaryArtist}`)}__a${includeAudio ? 1 : 0}__h${maxHeight}`;
  if (VIDEO_STREAM_MEMO.has(memoKey)) {
    return VIDEO_STREAM_MEMO.get(memoKey);
  }

  let candidateVideos = [];

  if (explicitVideoId) {
    candidateVideos.push({ videoId: extractYoutubeVideoId(explicitVideoId), score: 999 });
  } else if (coreTitle) {
    const q1 = [coreTitle, primaryArtist, "official music video"].filter(Boolean).join(" ");
    const q2 = cleanAlbum && cleanAlbum.toLowerCase() !== coreTitle.toLowerCase()
      ? `${coreTitle} ${cleanAlbum} official video song`
      : `${coreTitle} ${primaryArtist} full video song`;

    const [res1, res2] = await Promise.all([
      searchYouTubeCluster(q1, "videos", 3800),
      searchYouTubeCluster(q2, "music_videos", 3800)
    ]);

    const seenIds = new Set();
    for (const item of [...res1, ...res2]) {
      if (!item?.videoId || seenIds.has(item.videoId)) continue;
      seenIds.add(item.videoId);
      const sc = scoreOfficialMusicVideoCandidate(item, coreTitle, primaryArtist, cleanAlbum, durationSec);
      if (sc >= 95) {
        candidateVideos.push({ ...item, score: sc });
      }
    }

    candidateVideos.sort((a, b) => b.score - a.score);
  }

  for (const cand of candidateVideos.slice(0, 3)) {
    const streamInfo = await fetchYouTubeStreamsForVideoId(cand.videoId, 4200);
    if (!streamInfo || !Array.isArray(streamInfo.videoStreams) || streamInfo.videoStreams.length === 0) {
      continue;
    }

    const allVideoStreams = streamInfo.videoStreams.filter(v => v && v.url);

    // Separate pure Video-Only adaptive streams (1080p / 1440p / 2160p 4K) from muxed streams
    const pureVideoOnly = allVideoStreams.filter(v => v.videoOnly === true && (!maxHeight || v.height <= maxHeight));
    const muxedVideoWithAudio = allVideoStreams.filter(v => v.videoOnly === false && (!maxHeight || v.height <= maxHeight));

    const rankStream = (v) => {
      const h = v.height || parseInt(v.quality || "0", 10) || 0;
      const isMp4 = String(v.mimeType || "").includes("mp4") || String(v.format || "").toLowerCase().includes("mpeg_4") ? 1 : 0;
      const isAvcOrHevc = /avc1|hev1|hvc1|av01/i.test(v.codec || "") ? 1 : 0;
      const containerBonus = preferContainer === "mp4" ? isMp4 * 45 : 0;
      return h * 100 + (v.fps >= 50 ? 25 : 0) + containerBonus + isAvcOrHevc * 15 + Math.round((v.bitrate || 0) / 100000);
    };

    pureVideoOnly.sort((a, b) => rankStream(b) - rankStream(a));
    muxedVideoWithAudio.sort((a, b) => rankStream(b) - rankStream(a));

    const selectedPool = includeAudio
      ? (muxedVideoWithAudio.length > 0 ? muxedVideoWithAudio : pureVideoOnly)
      : (pureVideoOnly.length > 0 ? pureVideoOnly : muxedVideoWithAudio);

    const bestVideo = selectedPool[0] || allVideoStreams[0];
    if (!bestVideo) continue;

    // Also attach highest-res audio stream info in metadata in case the client wants to sync or inspect it
    const bestAudio = Array.isArray(streamInfo.audioStreams) && streamInfo.audioStreams.length > 0
      ? [...streamInfo.audioStreams].sort((a, b) => b.bitrate - a.bitrate)[0]
      : null;

    const payload = {
      status: "ok",
      videoId: cand.videoId,
      title: streamInfo.title || cand.title || title,
      channel: streamInfo.uploader || cand.uploaderName || artist,
      channelVerified: Boolean(streamInfo.uploaderVerified || cand.uploaderVerified),
      duration: streamInfo.duration || cand.duration || durationSec,
      thumbnailUrl: streamInfo.thumbnailUrl || cand.thumbnail,
      provider: streamInfo.provider,
      audioIncluded: !bestVideo.videoOnly,
      captionsIncluded: false,
      embedUsed: false,
      selectedStream: {
        url: bestVideo.url,
        resolution: bestVideo.quality || `${bestVideo.height}p`,
        width: bestVideo.width || 0,
        height: bestVideo.height || 0,
        fps: bestVideo.fps || 30,
        mimeType: bestVideo.mimeType || "video/mp4",
        codec: bestVideo.codec || "",
        bitrate: bestVideo.bitrate || 0,
        videoOnly: Boolean(bestVideo.videoOnly)
      },
      companionAudioStream: bestAudio || null,
      availableVideoOnlyQualities: pureVideoOnly.slice(0, 8).map(v => ({
        resolution: v.quality || `${v.height}p`,
        height: v.height,
        fps: v.fps,
        mimeType: v.mimeType,
        codec: v.codec,
        videoOnly: true,
        url: v.url
      }))
    };

    setBoundedMemo(VIDEO_STREAM_MEMO, memoKey, payload, 500);
    return payload;
  }

  return null;
}

/**
 * `/video` Endpoint Handler:
 * - Default (`mode=redirect` or direct `<video src="/video?...">`): Returns a lightweight `302 Found` redirect straight to the highest-resolution video-only stream so the Worker uses near-zero CPU/bandwidth!
 * - `mode=stream` / `proxy=1`: Streams the video bytes with Range support through the Worker.
 * - `mode=json` / `meta=1`: Returns the JSON manifest with all 4K/1440p/1080p video-only stream URLs.
 */
async function handleVideoEndpoint(request, url, ctx) {
  const songId = (url.searchParams.get("id") || url.searchParams.get("pid") || "").trim();
  const explicitVideoId = (url.searchParams.get("videoId") || url.searchParams.get("v") || "").trim();
  let title = cleanText(url.searchParams.get("title") || url.searchParams.get("trackName") || url.searchParams.get("q") || "");
  let artist = cleanText(url.searchParams.get("artist") || url.searchParams.get("artistName") || "");
  let album = cleanText(url.searchParams.get("album") || url.searchParams.get("albumName") || "");
  let durationSec = parseInt(url.searchParams.get("duration") || "0", 10) || 0;

  // By default `audio=0` (pure video-only stream without video's audio track, as requested!)
  const includeAudio = url.searchParams.get("audio") === "1" || url.searchParams.get("audio") === "true";
  const maxHeight = parseInt(url.searchParams.get("maxHeight") || url.searchParams.get("resolution") || "2160", 10) || 2160;
  const mode = (url.searchParams.get("mode") || url.searchParams.get("format") || "redirect").toLowerCase();

  if (songId && !title && /^\d+$/.test(songId)) {
    try {
      const details = await fetchSaavnJson({ __call: "song.getDetails", pids: songId }, 2800);
      const rawSong = details?.[songId] || details?.songs?.[0] || Object.values(details || {})[0];
      if (rawSong) {
        const enriched = enrichSaavnSong(rawSong, url.origin);
        title = enriched.title;
        artist = enriched.artist;
        album = enriched.album;
        durationSec = enriched.duration;
      }
    } catch {}
  }

  if (!title && !explicitVideoId && !songId) {
    return jsonResponse({
      error: "MissingVideoQuery",
      message: "Pass ?id=<songId> or ?title=<songTitle>&artist=<artistName> to resolve the official highest-quality video stream."
    }, 400);
  }

  const resolvedVideo = await resolveOfficialMusicVideoStream({
    songId,
    title,
    artist,
    album,
    durationSec,
    explicitVideoId,
    includeAudio,
    maxHeight
  });

  if (!resolvedVideo || !resolvedVideo.selectedStream?.url) {
    return jsonResponse({
      error: "OfficialVideoNotFound",
      message: "Could not locate an official non-animated music video for this track."
    }, 404);
  }

  const directVideoUrl = resolvedVideo.selectedStream.url;
  const workerProxyStreamUrl = `${url.origin}/stream?url=${encodeURIComponent(directVideoUrl)}`;

  if (mode === "json" || mode === "meta" || url.searchParams.get("meta") === "1") {
    return jsonResponse({
      ...resolvedVideo,
      directStreamUrl: directVideoUrl,
      workerProxyStreamUrl
    }, 200, {
      "X-Video-Id": resolvedVideo.videoId,
      "X-Video-Resolution": resolvedVideo.selectedStream.resolution,
      "X-Video-Audio-Mode": resolvedVideo.selectedStream.videoOnly ? "VIDEO_ONLY_NO_AUDIO" : "MUXED"
    });
  }

  if (mode === "stream" || mode === "proxy" || url.searchParams.get("proxy") === "1") {
    const proxied = await handleSmartStream(request, directVideoUrl, url.origin, ctx, false, "320");
    const h = new Headers(proxied.headers);
    h.set("X-Video-Id", resolvedVideo.videoId);
    h.set("X-Video-Resolution", resolvedVideo.selectedStream.resolution);
    h.set("X-Video-Audio-Mode", resolvedVideo.selectedStream.videoOnly ? "VIDEO_ONLY_NO_AUDIO" : "MUXED");
    return new Response(proxied.body, { status: proxied.status, headers: h });
  }

  // Default: Zero-overhead 302 Redirect directly to the highest-quality video-only stream!
  return new Response(null, {
    status: 302,
    headers: {
      ...CORS_HEADERS,
      "Location": directVideoUrl,
      "Cache-Control": "public, max-age=3600",
      "X-Video-Id": resolvedVideo.videoId,
      "X-Video-Resolution": resolvedVideo.selectedStream.resolution,
      "X-Video-Codec": resolvedVideo.selectedStream.codec || "mp4",
      "X-Video-Audio-Mode": resolvedVideo.selectedStream.videoOnly ? "VIDEO_ONLY_NO_AUDIO" : "MUXED"
    }
  });
}

// ============================================================================
// SPOTIFY EMBED SSR, PARTNER GRAPHQL & RECOMMENDATION ENGINE (10 SONGS / CALL)
// ============================================================================

async function fetchSpotifyEmbedEntity(resourceType, resourceId, timeoutMs = 4200) {
  if (!resourceType || !resourceId) return null;
  const cleanId = String(resourceId).split("?")[0].split(":").pop().trim();
  const memoKey = `${resourceType}:${cleanId}`;

  if (resourceType === "artist" && SPOTIFY_ARTIST_MEMO.has(memoKey)) {
    return SPOTIFY_ARTIST_MEMO.get(memoKey);
  }
  if (resourceType === "playlist" && SPOTIFY_PLAYLIST_MEMO.has(memoKey)) {
    return SPOTIFY_PLAYLIST_MEMO.get(memoKey);
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/${encodeURIComponent(resourceType)}/${encodeURIComponent(cleanId)}`;
    const res = await fetchWithTimeout(embedUrl, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }, timeoutMs);
    if (!res.ok) return null;
    const html = await res.text();

    const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)
      || html.match(/type="application\/json">([\s\S]*?)<\/script>/i);

    if (!nextDataMatch || !nextDataMatch[1]) return null;

    const parsed = JSON.parse(nextDataMatch[1].trim());
    const state = parsed?.props?.pageProps?.state || parsed?.state || {};
    const entity = state?.data?.entity || {};

    const sessionToken = state?.settings?.session?.accessToken;
    if (sessionToken && typeof sessionToken === "string") {
      CACHED_SPOTIFY_ANON_TOKEN = sessionToken;
      CACHED_SPOTIFY_TOKEN_EXP = Date.now() + 25 * 60 * 1000;
    }

    const title = cleanText(entity.name || entity.title || "Spotify Collection");
    const subtitle = cleanText(entity.subtitle || entity.artists?.[0]?.name || "Spotify");
    const coverImg = entity.coverArt?.sources?.[0]?.url
      || entity.visualIdentity?.image?.[0]?.url
      || entity.images?.[0]?.url
      || "";

    const artists = [];
    if (Array.isArray(entity.artists)) {
      for (const a of entity.artists) {
        const aUri = String(a.uri || "").split(":");
        artists.push({
          id: aUri.length >= 3 ? aUri[2] : (a.id || ""),
          name: cleanText(a.name || a.title || "")
        });
      }
    }

    const rawTracks = Array.isArray(entity.trackList) ? entity.trackList : [];
    const tracks = [];

    for (const item of rawTracks) {
      if (!item || !item.title) continue;
      const uriStr = String(item.uri || "");
      // Strictly ensure we only push actual tracks/episodes and never a container header!
      if (uriStr && !uriStr.includes(":track:") && !uriStr.includes(":local:")) continue;

      const uriParts = uriStr.split(":");
      const spotifyId = uriParts.length >= 3 ? uriParts[2] : (item.id || "");
      const cleanSubtitle = cleanText(String(item.subtitle || "").replace(/\u00a0/g, " "));

      // Guard against playlist header lockup being mistaken for a song when URI is missing
      if (!spotifyId && cleanText(item.title) === title && (!cleanSubtitle || cleanSubtitle === subtitle)) {
        continue;
      }

      const itemImg = item.coverArt?.sources?.[0]?.url
        || item.image?.url
        || (resourceType === "album" ? coverImg : "");

      tracks.push({
        spotifyId,
        trackName: cleanText(item.title),
        artistName: cleanSubtitle || (resourceType === "album" ? subtitle : "Artist"),
        collectionName: resourceType === "album" ? title : cleanText(item.title),
        durationSec: item.duration ? Math.round(Number(item.duration) / 1000) : 0,
        artworkUrl: itemImg || coverImg
      });
    }

    // If this is a large Spotify playlist (e.g. 100+ tracks) and we have `CACHED_SPOTIFY_ANON_TOKEN`,
    // try Spotify's Web API (`api.spotify.com/v1/playlists/{id}/tracks`) to fetch individual album art & full tracklist!
    if (resourceType === "playlist" && CACHED_SPOTIFY_ANON_TOKEN && Date.now() < CACHED_SPOTIFY_TOKEN_EXP) {
      try {
        const webApiRes = await fetchWithTimeout(
          `https://api.spotify.com/v1/playlists/${encodeURIComponent(cleanId)}/tracks?limit=100&market=IN`,
          {
            headers: {
              "Authorization": `Bearer ${CACHED_SPOTIFY_ANON_TOKEN}`,
              "User-Agent": SAAVN_HEADERS["User-Agent"]
            }
          },
          2800
        );
        if (webApiRes.ok) {
          const webData = await webApiRes.json();
          if (Array.isArray(webData?.items) && webData.items.length > 0) {
            const enrichedApiTracks = [];
            for (const entry of webData.items) {
              const tr = entry?.track;
              if (!tr || tr.type !== "track" || !tr.name) continue;
              enrichedApiTracks.push({
                spotifyId: String(tr.id || ""),
                trackName: cleanText(tr.name),
                artistName: Array.isArray(tr.artists) ? tr.artists.map(a => cleanText(a.name)).filter(Boolean).join(", ") : "Artist",
                collectionName: cleanText(tr.album?.name || tr.name),
                durationSec: tr.duration_ms ? Math.round(tr.duration_ms / 1000) : 0,
                artworkUrl: tr.album?.images?.[0]?.url || coverImg
              });
            }
            if (enrichedApiTracks.length >= tracks.length) {
              tracks.length = 0;
              tracks.push(...enrichedApiTracks);
            }
          }
        }
      } catch {}
    }

    if (resourceType === "track" && tracks.length === 0 && title) {
      tracks.push({
        spotifyId: cleanId,
        trackName: title,
        artistName: artists.map(a => a.name).filter(Boolean).join(", ") || subtitle,
        collectionName: title,
        durationSec: entity.duration ? Math.round(Number(entity.duration) / 1000) : 0,
        artworkUrl: coverImg
      });
    }

    const result = {
      id: `spotify:${resourceType}:${cleanId}`,
      spotifyId: cleanId,
      resourceType,
      title,
      artist: artists.map(a => a.name).filter(Boolean).join(", ") || subtitle,
      artists,
      image: coverImg,
      tracks
    };

    if (resourceType === "artist" && tracks.length > 0) {
      setBoundedMemo(SPOTIFY_ARTIST_MEMO, memoKey, result, 500);
    }
    if (resourceType === "playlist" && tracks.length > 0) {
      setBoundedMemo(SPOTIFY_PLAYLIST_MEMO, memoKey, result, 300);
    }

    return result;
  } catch {
    return null;
  }
}

async function fetchSpotifyEmbedPlaylist(playlistId, timeoutMs = 4000) {
  const data = await fetchSpotifyEmbedEntity("playlist", playlistId, timeoutMs);
  if (!data) return { title: "", artist: "Spotify", image: "", tracks: [] };
  return {
    id: `spotify:playlist:${playlistId}`,
    playlistId,
    title: data.title,
    artist: data.artist || "Spotify Charts",
    image: data.image,
    tracks: data.tracks
  };
}

async function searchSpotifyCatalog(query, limit = 10, timeoutMs = 3400) {
  if (!query) return { tracks: [], artistIds: [] };
  try {
    const res = await fetchWithTimeout(
      `https://lyrics.paxsenix.org/spotify/search?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      timeoutMs
    );
    if (!res.ok) return { tracks: [], artistIds: [] };
    const data = await res.json();
    const list = Array.isArray(data)
      ? data
      : (Array.isArray(data?.results) ? data.results : (Array.isArray(data?.tracks) ? data.tracks : (Array.isArray(data?.data) ? data.data : [])));

    const tracks = [];
    const artistIds = [];

    for (const item of list.slice(0, limit)) {
      if (!item) continue;
      const spId = item.id || item.trackId || String(item.uri || "").split(":").pop() || "";
      const trackName = cleanText(item.name || item.title || item.trackName || "");
      if (!trackName) continue;

      let artistName = "";
      if (Array.isArray(item.artists)) {
        artistName = item.artists.map(a => {
          if (a?.id) artistIds.push(String(a.id));
          return cleanText(a?.name || a);
        }).filter(Boolean).join(", ");
      } else {
        artistName = cleanText(item.artist || item.artistName || item.subtitle || "");
      }

      const albumName = cleanText(item.album?.name || item.albumName || item.collectionName || trackName);
      const artUrl = item.album?.images?.[0]?.url || item.artworkUrl || item.image || item.cover || "";
      const durMs = Number(item.duration_ms || item.duration || item.trackTimeMillis || 0);

      tracks.push({
        spotifyId: String(spId),
        trackName,
        artistName,
        collectionName: albumName,
        durationSec: durMs > 1000 ? Math.round(durMs / 1000) : durMs,
        artworkUrl: artUrl
      });
    }

    return { tracks, artistIds: [...new Set(artistIds.filter(Boolean))] };
  } catch {
    return { tracks: [], artistIds: [] };
  }
}

async function fetchSpotifyAdaptiveRecommendations(request, url, ctx) {
  const rawPid = (url.searchParams.get("id") || url.searchParams.get("pid") || "").trim();
  const limit = Math.min(25, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));
  const langParam = (url.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu").toLowerCase();
  const quality = resolveRequestedAudioQuality(request, url);

  let seedTitle = cleanText(url.searchParams.get("title") || url.searchParams.get("trackName") || "");
  let seedArtist = cleanText(url.searchParams.get("artist") || url.searchParams.get("artistName") || "");
  let seedAlbum = cleanText(url.searchParams.get("album") || "");
  let seedSpotifyId = cleanText(url.searchParams.get("spotifyId") || (rawPid.startsWith("spotify:") ? rawPid.split(":").pop() : ""));
  let seedAllArtists = [];

  if (rawPid && SONG_META_MEMO.has(rawPid)) {
    const memo = SONG_META_MEMO.get(rawPid);
    if (!seedTitle) seedTitle = memo.title || "";
    if (!seedArtist) seedArtist = memo.artist || "";
    if (!seedAlbum) seedAlbum = memo.album || "";
    if (!seedSpotifyId && memo.spotifyId) seedSpotifyId = memo.spotifyId;
    if (Array.isArray(memo.allArtists)) seedAllArtists = memo.allArtists;
  } else if (rawPid && /^\d+$/.test(rawPid) && (!seedTitle || !seedArtist)) {
    try {
      const sDetails = await fetchSaavnJson({ __call: "song.getDetails", pids: rawPid }, 2800);
      const rawSong = sDetails?.[rawPid] || sDetails?.songs?.[0] || Object.values(sDetails || {})[0];
      if (rawSong) {
        const enriched = enrichSaavnSong(rawSong, url.origin, null, quality);
        seedTitle = enriched.title;
        seedArtist = enriched.artist;
        seedAlbum = enriched.album;
        seedAllArtists = enriched.allArtists || [];
      }
    } catch {}
  } else if (rawPid.startsWith("apple:") && (!seedTitle || !seedArtist)) {
    const appleId = rawPid.slice(6);
    try {
      const lRes = await fetchWithTimeout(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appleId)}&country=in`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 2500);
      if (lRes.ok) {
        const lj = await lRes.json();
        const hit = lj?.results?.[0];
        if (hit) {
          seedTitle = cleanText(hit.trackName || "");
          seedArtist = cleanText(hit.artistName || "");
          seedAlbum = cleanText(hit.collectionName || "");
        }
      }
    } catch {}
  }

  const clientProfile = getOrCreateClientProfile(request, url);
  if (seedTitle || rawPid) {
    recordClientTrackInteraction(request, url, {
      id: rawPid,
      spotifyId: seedSpotifyId,
      title: seedTitle,
      artist: seedArtist,
      allArtists: seedAllArtists
    });
  }

  const explicitExcludes = (url.searchParams.get("exclude") || url.searchParams.get("history") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const excludedIds = new Set([
    rawPid,
    seedSpotifyId ? `spotify:${seedSpotifyId}` : "",
    ...explicitExcludes,
    ...clientProfile.playedTrackIds.slice(0, 35)
  ].filter(Boolean));

  const seedCoreNorm = normalizeTokenComparison(extractCoreTrackTitle(seedTitle) || seedTitle);
  const excludedTitleSigs = new Set([
    seedCoreNorm,
    ...clientProfile.playedTrackSignatures.slice(0, 30)
  ].filter(Boolean));

  const primaryArtists = seedAllArtists.length > 0
    ? seedAllArtists
    : seedArtist.split(/[,&/|]/).map(cleanText).filter(Boolean);

  const sessionAffinityArtists = getTopClientAffinityArtists(clientProfile, 4);
  const explicitHistoryArtists = (url.searchParams.get("artists") || "")
    .split(",")
    .map(cleanText)
    .filter(Boolean);

  const targetArtists = [...new Set([
    ...primaryArtists.slice(0, 3),
    ...explicitHistoryArtists.slice(0, 2),
    ...sessionAffinityArtists.slice(0, 2)
  ])].filter(a => a && !/^(unknown|muse|openmuse|spotify|apple)/i.test(a));

  const cleanSeedTitle = extractCoreTrackTitle(seedTitle) || seedTitle;
  const spotifySearchQueries = [];
  if (cleanSeedTitle && targetArtists[0]) {
    spotifySearchQueries.push(`${cleanSeedTitle} ${targetArtists[0]}`);
  }
  for (const art of targetArtists.slice(0, 3)) {
    spotifySearchQueries.push(art);
  }
  if (seedAlbum && !/^(openmuse|muse)$/i.test(seedAlbum) && seedAlbum.toLowerCase() !== cleanSeedTitle.toLowerCase()) {
    spotifySearchQueries.push(`${seedAlbum} ${targetArtists[0] || ""}`.trim());
  }

  const uniqueSpQueries = [...new Set(spotifySearchQueries.filter(Boolean))].slice(0, 4);

  const [seedTrackEmbed, ...spSearchSettled] = await Promise.all([
    seedSpotifyId ? fetchSpotifyEmbedEntity("track", seedSpotifyId, 3200) : Promise.resolve(null),
    ...uniqueSpQueries.map(q => searchSpotifyCatalog(q, 12, 3400))
  ]);

  const discoveredSpotifyArtistIds = new Set();
  if (seedTrackEmbed?.artists?.length) {
    for (const a of seedTrackEmbed.artists) {
      if (a.id) discoveredSpotifyArtistIds.add(a.id);
    }
  }

  const rawSpotifyCandidates = [];
  for (const res of spSearchSettled) {
    if (res && Array.isArray(res.tracks)) {
      rawSpotifyCandidates.push(...res.tracks);
      for (const aId of (res.artistIds || [])) {
        discoveredSpotifyArtistIds.add(aId);
      }
    }
  }

  if (discoveredSpotifyArtistIds.size === 0 && rawSpotifyCandidates.length > 0 && rawSpotifyCandidates[0].spotifyId) {
    const firstEmbed = await fetchSpotifyEmbedEntity("track", rawSpotifyCandidates[0].spotifyId, 2800);
    if (firstEmbed?.artists?.length) {
      for (const a of firstEmbed.artists) {
        if (a.id) discoveredSpotifyArtistIds.add(a.id);
      }
    }
  }

  const artistIdsToFetch = [...discoveredSpotifyArtistIds].slice(0, 3);
  if (artistIdsToFetch.length > 0) {
    const artistEmbeds = await Promise.allSettled(
      artistIdsToFetch.map(aId => fetchSpotifyEmbedEntity("artist", aId, 3400))
    );
    for (const ae of artistEmbeds) {
      if (ae.status === "fulfilled" && ae.value?.tracks?.length) {
        rawSpotifyCandidates.unshift(...ae.value.tracks);
      }
    }
  }

  if (rawSpotifyCandidates.length < limit + 6) {
    const langs = langParam.split(",").map(s => s.trim());
    let fallbackPlId = SPOTIFY_HOME_PLAYLISTS.india_top.id;
    if (langs.includes("malayalam")) fallbackPlId = SPOTIFY_HOME_PLAYLISTS.malayalam_hits.id;
    else if (langs.includes("tamil")) fallbackPlId = SPOTIFY_HOME_PLAYLISTS.tamil_hits.id;
    else if (langs.includes("hindi")) fallbackPlId = SPOTIFY_HOME_PLAYLISTS.hindi_hits.id;
    else if (langs.includes("telugu")) fallbackPlId = SPOTIFY_HOME_PLAYLISTS.telugu_hits.id;
    else if (langs.includes("punjabi")) fallbackPlId = SPOTIFY_HOME_PLAYLISTS.punjabi_hits.id;

    const plEmbed = await fetchSpotifyEmbedPlaylist(fallbackPlId, 3000);
    if (plEmbed?.tracks?.length) {
      rawSpotifyCandidates.push(...plEmbed.tracks);
    }
  }

  const selectedSpotifyTracks = [];
  const seenCandidateCores = new Set();
  const artistCountInSelection = {};

  for (const cand of rawSpotifyCandidates) {
    if (!cand || !cand.trackName) continue;
    if (isLowQualityJunkTrack({ title: cand.trackName, album: cand.collectionName, duration: cand.durationSec })) continue;

    const candCore = normalizeTokenComparison(extractCoreTrackTitle(cand.trackName) || cand.trackName);
    const candPrimaryArtist = normalizeTokenComparison(String(cand.artistName || "").split(/[,&]/)[0]);
    const fullSig = `${candCore} ${candPrimaryArtist}`.trim();

    if (!candCore || candCore === seedCoreNorm) continue;
    if (seenCandidateCores.has(candCore)) continue;
    if (excludedTitleSigs.has(candCore) || excludedTitleSigs.has(fullSig)) continue;
    if (cand.spotifyId && excludedIds.has(`spotify:${cand.spotifyId}`)) continue;

    const artKey = candPrimaryArtist || "unknown";
    if ((artistCountInSelection[artKey] || 0) >= 3 && rawSpotifyCandidates.length > limit * 2) {
      continue;
    }

    seenCandidateCores.add(candCore);
    artistCountInSelection[artKey] = (artistCountInSelection[artKey] || 0) + 1;
    selectedSpotifyTracks.push(cand);

    if (selectedSpotifyTracks.length >= limit + 4) break;
  }

  const bridgedRecommendations = await bridgeCuratedTrackListEfficiently(
    selectedSpotifyTracks.slice(0, limit + 3),
    targetArtists,
    url.origin,
    quality,
    ctx
  );

  const finalSongs = deduplicateEnrichedSongs(bridgedRecommendations)
    .filter(s => !excludedIds.has(String(s.id)) && normalizeTokenComparison(extractCoreTrackTitle(s.title)) !== seedCoreNorm)
    .slice(0, limit);

  return {
    pid: rawPid,
    source: "SpotifyAdaptiveRecommendationEngine",
    seed: {
      id: rawPid,
      title: seedTitle,
      artist: seedArtist,
      spotifyArtistIds: artistIdsToFetch,
      affinityArtists: targetArtists
    },
    count: finalSongs.length,
    songs: finalSongs
  };
}

async function bridgeCuratedTrackListEfficiently(curatedTracks, hintArtists = [], origin, preferredQuality = "320", ctx = null) {
  if (!Array.isArray(curatedTracks) || curatedTracks.length === 0) return [];

  const resolvedMap = new Map();
  const uncachedTracks = [];

  await Promise.all(
    curatedTracks.map(async (item, idx) => {
      const core = normalizeTokenComparison(extractCoreTrackTitle(item.trackName || item.title || ""));
      const primArt = normalizeTokenComparison(String(item.artistName || item.artist || "").split(/[,&]/)[0]);
      const cacheKey = `bridge_v11_${core}_${primArt}`;
      if (TRACK_BRIDGE_MEMO.has(cacheKey)) {
        const cachedRaw = TRACK_BRIDGE_MEMO.get(cacheKey);
        resolvedMap.set(idx, buildCuratedBridgedSongObject(item, cachedRaw, origin, preferredQuality));
      } else {
        uncachedTracks.push({ item, idx, cacheKey });
      }
    })
  );

  if (uncachedTracks.length > 0) {
    const searchQueries = new Set();
    for (const a of hintArtists.slice(0, 3)) {
      if (a) searchQueries.add(a);
    }
    for (const u of uncachedTracks.slice(0, 12)) {
      const cleanT = extractCoreTrackTitle(u.item.trackName || u.item.title || "");
      const firstArt = String(u.item.artistName || u.item.artist || "").split(/[,&]/)[0].trim();
      if (cleanT) searchQueries.add(`${cleanT} ${firstArt}`.trim());
    }

    const uniqueQueries = [...searchQueries].slice(0, 12);
    const searchSettled = await Promise.allSettled(
      uniqueQueries.map(q =>
        fetchSaavnJson({
          __call: "search.getResults",
          api_version: "4",
          n: "10",
          p: "1",
          q
        }, 3200)
      )
    );

    const rawSaavnPool = [];
    for (const res of searchSettled) {
      if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
        rawSaavnPool.push(...res.value.results);
      }
    }

    const healedPool = await batchHealMissingMediaUrls(rawSaavnPool);

    for (const u of uncachedTracks) {
      const matched = findBestSaavnMatchForCuratedTrack(u.item, healedPool);
      if (matched) {
        setBoundedMemo(TRACK_BRIDGE_MEMO, u.cacheKey, matched, 2000);
      }
      resolvedMap.set(u.idx, buildCuratedBridgedSongObject(u.item, matched, origin, preferredQuality));
    }
  }

  return curatedTracks.map((_, idx) => resolvedMap.get(idx)).filter(Boolean);
}

// ============================================================================
// UPGRADED URL-TO-PLAYLIST IMPORTER ENGINE (`/import`)
// (FIXED: NEVER ADDS PLAYLIST NAME / HEADER LOCKUP AS FIRST SONG!)
// ============================================================================

async function getAppleMusicWebDeveloperToken(timeoutMs = 3800) {
  if (CACHED_APPLE_WEB_TOKEN && Date.now() < CACHED_APPLE_TOKEN_EXP) {
    return CACHED_APPLE_WEB_TOKEN;
  }
  try {
    const res = await fetchWithTimeout("https://music.apple.com/us/browse", {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "text/html"
      }
    }, timeoutMs);
    if (!res.ok) return null;
    const html = await res.text();

    const metaMatch = html.match(/<meta\s+name="desktop-music-app\/config\/environment"\s+content="([^"]+)"/i);
    if (metaMatch && metaMatch[1]) {
      const decoded = decodeURIComponent(metaMatch[1]);
      const jwtMatch = decoded.match(/eyJhbGciOiJFUzI1NiIsImtpZCI6I[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwtMatch) {
        CACHED_APPLE_WEB_TOKEN = jwtMatch[0];
        CACHED_APPLE_TOKEN_EXP = Date.now() + 60 * 60 * 1000;
        return CACHED_APPLE_WEB_TOKEN;
      }
    }

    const scriptMatch = html.match(/src="(\/assets\/index[^"]+\.js)"/i);
    if (scriptMatch && scriptMatch[1]) {
      const jsRes = await fetchWithTimeout(`https://music.apple.com${scriptMatch[1]}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, timeoutMs);
      if (jsRes.ok) {
        const jsText = await jsRes.text();
        const jwtMatch = jsText.match(/eyJhbGciOiJFUzI1NiIsImtpZCI6I[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        if (jwtMatch) {
          CACHED_APPLE_WEB_TOKEN = jwtMatch[0];
          CACHED_APPLE_TOKEN_EXP = Date.now() + 60 * 60 * 1000;
          return CACHED_APPLE_WEB_TOKEN;
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Extracts all tracks & metadata from an Apple Music Playlist URL
 * FIXED in v11.0:
 * - Explicitly skips `containerDetailHeaderLockup` / header sections after reading the playlist title so the playlist's own name is NEVER pushed as Track #1!
 * - Validates that each lockup item is a genuine song (`kind === "song"`, `itemKind === "trackLockup"`, or numeric `storeAdamID`) and not the playlist container itself.
 */
async function extractAppleMusicPlaylistFromUrl(appleUrlOrId, storefront = "in") {
  let cleanStorefront = storefront || "in";
  let playlistId = appleUrlOrId;
  let pageUrl = `https://music.apple.com/${cleanStorefront}/playlist/${encodeURIComponent(playlistId)}`;

  if (String(appleUrlOrId).startsWith("http")) {
    try {
      const u = new URL(appleUrlOrId);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 3 && parts[0].length === 2) {
        cleanStorefront = parts[0].toLowerCase();
      }
      playlistId = parts[parts.length - 1];
      pageUrl = u.toString();
    } catch {}
  }

  let playlistTitle = "Apple Music Playlist";
  let playlistArtist = "Apple Music";
  let playlistImage = "";
  const extractedTracks = [];
  const seenKeys = new Set();

  const isPlaylistHeaderEcho = (trackName, artistName, adamId) => {
    const normT = normalizeTokenComparison(trackName);
    const normPlTitle = normalizeTokenComparison(playlistTitle);
    const normA = normalizeTokenComparison(artistName);
    const normPlArt = normalizeTokenComparison(playlistArtist);

    // If there is no numeric song AdamID and the title matches the playlist name, it is the playlist header!
    if (!/^\d+$/.test(String(adamId || ""))) {
      if (normT && normPlTitle && normT === normPlTitle) return true;
      if (normA && normPlArt && normT === normPlTitle && normA === normPlArt) return true;
    }
    return false;
  };

  const pushTrack = (t) => {
    if (!t || !t.trackName) return;
    if (isPlaylistHeaderEcho(t.trackName, t.artistName, t.appleId)) return;
    const k = `${t.appleId || ""}__${normalizeTokenComparison(t.trackName)}__${normalizeTokenComparison(t.artistName)}`;
    if (seenKeys.has(k)) return;
    seenKeys.add(k);
    extractedTracks.push(t);
  };

  // Strategy 1: Fetch Apple Music Webpage & Parse `<script type="application/json" id="serialized-server-data">`
  try {
    const res = await fetchWithTimeout(pageUrl, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }, 5000);

    if (res.ok) {
      const html = await res.text();

      const metaJwt = html.match(/eyJhbGciOiJFUzI1NiIsImtpZCI6I[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (metaJwt && metaJwt[0]) {
        CACHED_APPLE_WEB_TOKEN = metaJwt[0];
        CACHED_APPLE_TOKEN_EXP = Date.now() + 60 * 60 * 1000;
      }

      const serializedMatch = html.match(/<script[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/i);
      if (serializedMatch && serializedMatch[1]) {
        const rawJson = JSON.parse(serializedMatch[1].trim());
        const rootData = Array.isArray(rawJson) ? rawJson[0]?.data : (rawJson?.data?.[0]?.data || rawJson?.data || rawJson);

        const seo = rootData?.seoData;
        if (seo) {
          playlistTitle = cleanText(
            (seo.appleTitle || seo.pageTitle || playlistTitle)
              .replace(/\s+by\s+.*?\s+on\s+Apple\s+Music.*$/i, "")
              .replace(/\s*-\s*Apple\s+Music.*$/i, "")
          );
          playlistImage = upgradeImage(seo.artworkUrl || "");
        }

        const sections = Array.isArray(rootData?.sections) ? rootData.sections : [];

        // Pass 1: Extract header metadata from `containerDetailHeaderLockup` first
        for (const sec of sections) {
          if (sec?.itemKind === "containerDetailHeaderLockup" || String(sec?.id || "").includes("header")) {
            const hdr = sec?.items?.[0];
            if (hdr) {
              if (hdr.title) playlistTitle = cleanText(hdr.title);
              const curator = cleanText(hdr.subtitleLinks?.[0]?.title || hdr.UpperSubtitleLinks?.[0]?.title || "");
              if (curator) playlistArtist = curator;
              const hdrArt = hdr.artwork?.dictionary?.url;
              if (hdrArt) playlistImage = upgradeImage(hdrArt);
            }
          }
        }

        // Pass 2: Extract ONLY actual song items (`trackLockup`), skipping header/footer sections completely!
        for (const sec of sections) {
          if (
            sec?.itemKind === "containerDetailHeaderLockup" ||
            String(sec?.id || "").includes("header") ||
            String(sec?.id || "").includes("footer")
          ) {
            continue;
          }

          if (Array.isArray(sec?.items)) {
            for (const item of sec.items) {
              if (!item || item.itemKind === "containerDetailHeaderLockup") continue;

              const descriptorKind = item?.contentDescriptor?.kind || "";
              if (descriptorKind && descriptorKind !== "song" && descriptorKind !== "musicVideo") {
                continue;
              }

              const rawStoreAdamId = item?.contentDescriptor?.identifiers?.storeAdamID
                || (String(item?.id || "").startsWith("track-lockup-") ? String(item.id).replace(/^track-lockup-/, "") : "");
              const numericAdamId = /^\d+$/.test(String(rawStoreAdamId)) ? String(rawStoreAdamId) : "";

              const isTrackLockup = item?.itemKind === "trackLockup"
                || sec?.itemKind === "trackLockup"
                || descriptorKind === "song"
                || Boolean(numericAdamId);

              if (!isTrackLockup) continue;

              const title = cleanText(item?.title || item?.trackName || "");
              const artist = cleanText(
                item?.artistName ||
                item?.subtitleLinks?.map(l => l.title).filter(Boolean).join(", ") ||
                ""
              );
              const album = cleanText(
                item?.albumName ||
                item?.collectionName ||
                item?.tertiaryLinks?.[0]?.title ||
                playlistTitle
              );
              const artUrl = upgradeImage(item?.artwork?.dictionary?.url || playlistImage);
              const durSec = item?.duration ? Math.round(Number(item.duration) / 1000) : 0;

              if (title && artist) {
                pushTrack({
                  appleId: numericAdamId,
                  trackName: title,
                  artistName: artist,
                  collectionName: album,
                  durationSec: durSec,
                  artworkUrl: artUrl
                });
              }
            }
          }
        }

        // Fallback to seo.ogSongs only if no trackLockup items were found
        if (extractedTracks.length === 0 && Array.isArray(seo?.ogSongs)) {
          for (const og of seo.ogSongs) {
            const attr = og?.attributes || og;
            const ogId = String(og?.id || attr?.playParams?.id || "");
            if (attr?.name && attr?.artistName) {
              pushTrack({
                appleId: /^\d+$/.test(ogId) ? ogId : "",
                trackName: cleanText(attr.name),
                artistName: cleanText(attr.artistName),
                collectionName: cleanText(attr.albumName || playlistTitle),
                durationSec: attr.durationInMillis ? Math.round(attr.durationInMillis / 1000) : 0,
                artworkUrl: upgradeImage(attr.artwork?.url || playlistImage)
              });
            }
          }
        }
      }
    }
  } catch {}

  // Strategy 2: Use Apple's AMP Web API (`amp-api.music.apple.com`) for full 100+ track playlists
  if (extractedTracks.length < 5) {
    const devToken = await getAppleMusicWebDeveloperToken(3200);
    if (devToken) {
      try {
        const ampUrl = `https://amp-api.music.apple.com/v1/catalog/${cleanStorefront}/playlists/${encodeURIComponent(playlistId)}?include=tracks`;
        const ampRes = await fetchWithTimeout(ampUrl, {
          headers: {
            "Authorization": `Bearer ${devToken}`,
            "Origin": "https://music.apple.com",
            "Referer": "https://music.apple.com/",
            "User-Agent": SAAVN_HEADERS["User-Agent"]
          }
        }, 4200);
        if (ampRes.ok) {
          const ampData = await ampRes.json();
          const plObj = ampData?.data?.[0];
          if (plObj) {
            playlistTitle = cleanText(plObj.attributes?.name || playlistTitle);
            playlistArtist = cleanText(plObj.attributes?.curatorName || playlistArtist);
            playlistImage = upgradeImage(plObj.attributes?.artwork?.url || playlistImage);
            const trackData = plObj.relationships?.tracks?.data || [];
            for (const tr of trackData) {
              if (tr?.type && tr.type !== "songs" && tr.type !== "music-videos") continue;
              const attr = tr?.attributes;
              if (!attr?.name) continue;
              pushTrack({
                appleId: String(tr.id || ""),
                trackName: cleanText(attr.name),
                artistName: cleanText(attr.artistName || ""),
                collectionName: cleanText(attr.albumName || playlistTitle),
                durationSec: attr.durationInMillis ? Math.round(attr.durationInMillis / 1000) : 0,
                artworkUrl: upgradeImage(attr.artwork?.url || playlistImage)
              });
            }
          }
        }
      } catch {}
    }
  }

  return {
    id: `apple:playlist:${playlistId}`,
    sourcePlatform: "AppleMusic",
    title: playlistTitle,
    artist: playlistArtist,
    image: playlistImage,
    tracks: extractedTracks
  };
}

/**
 * Extracts all tracks from a YouTube Music / YouTube Playlist (`music.youtube.com/playlist?list=PL...`)
 */
async function extractYouTubePlaylistFromUrl(urlOrListId) {
  let listId = String(urlOrListId).trim();
  const match = listId.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (match) listId = match[1];

  const pipedTasks = PIPED_API_INSTANCES.slice(0, 4).map(async (base) => {
    const res = await fetchWithTimeout(
      `${base}/playlists/${encodeURIComponent(listId)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" } },
      4200
    );
    if (!res.ok) throw new Error("Piped playlist miss");
    const data = await res.json();
    const videos = Array.isArray(data?.relatedStreams) ? data.relatedStreams : [];
    if (videos.length === 0) throw new Error("Empty YT playlist");
    return {
      id: `ytm:playlist:${listId}`,
      sourcePlatform: "YouTubeMusic",
      title: cleanText(data.name || "YouTube Music Playlist"),
      artist: cleanText(data.uploader || "YouTube Music"),
      image: upgradeImage(data.thumbnailUrl || videos[0]?.thumbnail || ""),
      tracks: videos.map(v => ({
        ytVideoId: extractYoutubeVideoId(v.url || v.id),
        trackName: cleanText(v.title || ""),
        artistName: cleanText(String(v.uploaderName || "").replace(/\s*-\s*topic$/i, "")),
        collectionName: cleanText(data.name || "YouTube Music"),
        durationSec: Number(v.duration || 0),
        artworkUrl: upgradeImage(v.thumbnail || "")
      })).filter(t => t.trackName)
    };
  });

  try {
    return await Promise.any(pipedTasks);
  } catch {
    return {
      id: `ytm:playlist:${listId}`,
      sourcePlatform: "YouTubeMusic",
      title: "YouTube Music Playlist",
      artist: "YouTube Music",
      image: "",
      tracks: []
    };
  }
}

/**
 * Universal Copy-Paste Playlist & Link Importer (`handleUniversalPlaylistImport`)
 * FIXED in v11.0:
 * 1. If a user copies share text from Spotify/Apple Music mobile apps (e.g., `"Check out my playlist 'Vibes' on Spotify\nhttps://open.spotify.com/playlist/..."`),
 *    we extract the embedded URL first so it NEVER falls into the plain-text parser and NEVER treats the playlist title line as Track #1!
 * 2. Supports custom playlist name override (`?name=...` or `body.playlistName`) without adding the name as a track.
 * 3. Supports Spotify, Apple Music, YouTube Music, JioSaavn, and clean plain-text tracklists.
 */
async function handleUniversalPlaylistImport(request, url, ctx) {
  let inputUrlOrText = (
    url.searchParams.get("url") ||
    url.searchParams.get("id") ||
    url.searchParams.get("link") ||
    url.searchParams.get("q") ||
    ""
  ).trim();

  let customPlaylistName = cleanText(url.searchParams.get("name") || url.searchParams.get("playlistName") || url.searchParams.get("title") || "");
  let offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  let batchSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("batchSize") || url.searchParams.get("limit") || "25", 10) || 25));
  const resolveAudioMode = (url.searchParams.get("resolveAudio") || "true").toLowerCase();
  const quality = resolveRequestedAudioQuality(request, url);

  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (body?.url || body?.link || body?.text || body?.playlistUrl) {
        inputUrlOrText = String(body.url || body.link || body.playlistUrl || body.text).trim();
      }
      if (body?.name || body?.playlistName || body?.title) {
        customPlaylistName = cleanText(body.name || body.playlistName || body.title);
      }
      if (typeof body?.offset === "number") offset = Math.max(0, body.offset);
      if (typeof body?.batchSize === "number") batchSize = Math.min(50, Math.max(5, body.batchSize));
    } catch {}
  }

  if (!inputUrlOrText) {
    return jsonResponse({
      error: "MissingPlaylistUrl",
      message: "Pass ?url=<Spotify_AppleMusic_YouTubeMusic_or_JioSaavn_Playlist_URL> or POST JSON { url: '...' }"
    }, 400);
  }

  // Step 0: If the user pasted multi-line share-sheet text that contains a URL AND a playlist title on line 1
  // (e.g. "My Custom Playlist Name\nhttps://open.spotify.com/playlist/..."), extract the URL and capture the custom name!
  const embeddedUrlMatch = inputUrlOrText.match(/https?:\/\/(?:open\.spotify\.com|spotify\.link|spoti\.fi|music\.apple\.com|apple\.co|(?:music\.|www\.)?youtube\.com|youtu\.be|(?:www\.)?jiosaavn\.com)\/[^\s"')<>]+/i);
  if (embeddedUrlMatch) {
    if (!customPlaylistName && inputUrlOrText.includes("\n")) {
      const nonUrlLines = inputUrlOrText
        .split(/\r?\n/)
        .map(l => l.replace(/https?:\/\/\S+/gi, "").trim())
        .filter(l => l.length >= 2 && !/^(?:listen\s+to|check\s+out|shared\s+from)/i.test(l));
      if (nonUrlLines.length === 1) {
        customPlaylistName = cleanText(nonUrlLines[0]);
      }
    }
    inputUrlOrText = embeddedUrlMatch[0].trim();
  }

  // 1. Follow short links (`spotify.link`, `spoti.fi`, `apple.co`)
  if (/^https?:\/\/(?:spotify\.link|spoti\.fi|apple\.co)\//i.test(inputUrlOrText)) {
    try {
      const redirRes = await fetchWithTimeout(inputUrlOrText, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 3500);
      if (redirRes.url) {
        inputUrlOrText = redirRes.url;
      }
    } catch {}
  }

  let extractedMeta = {
    id: `imported:${Date.now()}`,
    sourcePlatform: "Custom",
    title: customPlaylistName || "Imported Playlist",
    artist: "Muse Importer",
    image: "",
    tracks: []
  };

  // CASE A: Spotify URL or URI (`open.spotify.com/...` or `spotify:playlist:...`)
  const spotifyMatch = inputUrlOrText.match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|artist|track)\/|spotify:(playlist|album|artist|track):)([A-Za-z0-9]+)/i);
  if (spotifyMatch) {
    const resourceType = (spotifyMatch[1] || spotifyMatch[2]).toLowerCase();
    const resourceId = spotifyMatch[3];
    const spEntity = await fetchSpotifyEmbedEntity(resourceType, resourceId, 4800);
    if (spEntity) {
      extractedMeta = {
        id: spEntity.id,
        sourcePlatform: "Spotify",
        title: customPlaylistName || spEntity.title,
        artist: spEntity.artist,
        image: spEntity.image,
        tracks: spEntity.tracks
      };
    }
  }
  // CASE B: Apple Music URL (`music.apple.com/...`)
  else if (/music\.apple\.com\//i.test(inputUrlOrText) || /^pl\.[a-z0-9-]+$/i.test(inputUrlOrText)) {
    const amPlaylistMatch = inputUrlOrText.match(/music\.apple\.com\/([a-z]{2})\/playlist\/(?:[^/]+\/)?(pl\.[a-zA-Z0-9.-]+)/i)
      || (inputUrlOrText.startsWith("pl.") ? [null, "in", inputUrlOrText] : null);

    if (amPlaylistMatch) {
      extractedMeta = await extractAppleMusicPlaylistFromUrl(inputUrlOrText, amPlaylistMatch[1] || "in");
      if (customPlaylistName) extractedMeta.title = customPlaylistName;
    } else {
      const trackParamMatch = inputUrlOrText.match(/[?&]i=(\d+)/);
      const albumIdMatch = inputUrlOrText.match(/\/(?:album|song)\/(?:[^/]+\/)?(\d+)/i);
      const lookupId = trackParamMatch ? trackParamMatch[1] : (albumIdMatch ? albumIdMatch[1] : "");
      if (lookupId) {
        const albData = await resolveCompleteAlbum(`apple:${lookupId}`, url.origin, quality);
        return jsonResponse({
          status: "ok",
          sourcePlatform: "AppleMusic",
          id: albData.id,
          title: customPlaylistName || albData.title,
          artist: albData.artist,
          image: albData.image,
          coverUrl: albData.coverUrl,
          totalTracks: albData.songs.length,
          importedCount: albData.songs.length,
          hasMore: false,
          nextOffset: null,
          songs: albData.songs,
          tracks: albData.songs
        });
      }
    }
  }
  // CASE C: YouTube Music / YouTube Playlist URL (`music.youtube.com/playlist?list=...`)
  else if (/(?:youtube\.com|youtu\.be)\/.*[?&]list=([A-Za-z0-9_-]+)/i.test(inputUrlOrText)) {
    extractedMeta = await extractYouTubePlaylistFromUrl(inputUrlOrText);
    if (customPlaylistName) extractedMeta.title = customPlaylistName;
  }
  // CASE D: JioSaavn Playlist or Album URL
  else if (/jiosaavn\.com\//i.test(inputUrlOrText)) {
    const albData = await resolveCompleteAlbum(inputUrlOrText, url.origin, quality);
    return jsonResponse({
      status: "ok",
      sourcePlatform: "JioSaavn",
      id: albData.id,
      title: customPlaylistName || albData.title,
      artist: albData.artist,
      image: albData.image,
      coverUrl: albData.coverUrl,
      totalTracks: albData.songs.length,
      importedCount: albData.songs.length,
      hasMore: false,
      nextOffset: null,
      songs: albData.songs,
      tracks: albData.songs
    });
  }
  // CASE E: Plain Text Tracklist (`Artist - Song Title` on each line)
  else if (inputUrlOrText.includes("\n")) {
    const rawLines = inputUrlOrText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length >= 2 && !/^https?:\/\//i.test(l));

    // Guard against the first line being the user's custom playlist header (e.g., "My Workout Playlist:" or a line without separator when all other lines have `Artist - Song`)
    const linesWithSeparator = rawLines.filter(l => /\s+[-–—:]\s+/.test(l));
    let startIdx = 0;
    if (rawLines.length >= 2) {
      const firstLine = rawLines[0];
      if (
        /^(?:playlist|title|name)\s*[:\-–—]/i.test(firstLine) ||
        (customPlaylistName && normalizeTokenComparison(firstLine) === normalizeTokenComparison(customPlaylistName)) ||
        (!/\s+[-–—:]\s+/.test(firstLine) && linesWithSeparator.length >= Math.floor((rawLines.length - 1) * 0.7))
      ) {
        if (!customPlaylistName) {
          customPlaylistName = cleanText(firstLine.replace(/^(?:playlist|title|name)\s*[:\-–—]\s*/i, ""));
          extractedMeta.title = customPlaylistName || extractedMeta.title;
        }
        startIdx = 1;
      }
    }

    for (const rawLine of rawLines.slice(startIdx, startIdx + 100)) {
      const line = rawLine.replace(/^\d+[\s.)\-]+/, "").trim();
      if (!line) continue;
      if (customPlaylistName && normalizeTokenComparison(line) === normalizeTokenComparison(customPlaylistName)) {
        continue;
      }
      const parts = line.split(/\s*[-–—:]\s*/);
      const trackName = parts.length > 1 ? parts.slice(1).join(" - ") : parts[0];
      const artistName = parts.length > 1 ? parts[0] : "";
      extractedMeta.tracks.push({
        trackName: cleanText(trackName),
        artistName: cleanText(artistName),
        collectionName: extractedMeta.title,
        durationSec: 0,
        artworkUrl: ""
      });
    }
  }

  // Final safeguard: Ensure the first track is not an echo of the playlist's own name with no real artist/ID
  const plTitleNorm = normalizeTokenComparison(extractedMeta.title);
  const plArtistNorm = normalizeTokenComparison(extractedMeta.artist);
  const allRawTracks = (extractedMeta.tracks || []).filter((t, idx) => {
    if (!t || !t.trackName) return false;
    if (idx === 0 && !t.appleId && !t.spotifyId && !t.ytVideoId) {
      const tNorm = normalizeTokenComparison(t.trackName);
      const aNorm = normalizeTokenComparison(t.artistName || "");
      if (tNorm === plTitleNorm && (!aNorm || aNorm === plArtistNorm || aNorm === "apple music" || aNorm === "spotify")) {
        return false;
      }
    }
    return true;
  });

  const totalTracks = allRawTracks.length;

  if (totalTracks === 0) {
    return jsonResponse({
      error: "PlaylistEmptyOrPrivate",
      message: "Could not extract tracks from the provided link. Make sure the Spotify, Apple Music, or YouTube Music playlist is public."
    }, 404);
  }

  const eagerSlice = resolveAudioMode === "lazy"
    ? []
    : allRawTracks.slice(offset, offset + batchSize);

  const hintArtists = [...new Set(eagerSlice.map(t => String(t.artistName || "").split(/[,&]/)[0].trim()).filter(Boolean))].slice(0, 4);
  const eagerBridged = await bridgeCuratedTrackListEfficiently(eagerSlice, hintArtists, url.origin, quality, ctx);

  const fullPlaylistSongs = allRawTracks.map((rawItem, idx) => {
    if (idx >= offset && idx < offset + eagerBridged.length) {
      return eagerBridged[idx - offset];
    }
    const core = normalizeTokenComparison(extractCoreTrackTitle(rawItem.trackName || ""));
    const primArt = normalizeTokenComparison(String(rawItem.artistName || "").split(/[,&]/)[0]);
    const cacheKey = `bridge_v11_${core}_${primArt}`;
    const cachedMatch = TRACK_BRIDGE_MEMO.get(cacheKey) || null;
    return buildCuratedBridgedSongObject(rawItem, cachedMatch, url.origin, quality);
  });

  const hiImg = upgradeImage(extractedMeta.image || fullPlaylistSongs[0]?.image || "");
  const nextOffset = offset + batchSize < totalTracks ? offset + batchSize : null;

  return jsonResponse({
    status: "ok",
    sourcePlatform: extractedMeta.sourcePlatform,
    id: extractedMeta.id,
    title: extractedMeta.title,
    name: extractedMeta.title,
    artist: extractedMeta.artist,
    image: hiImg,
    coverUrl: proxyImg(hiImg, url.origin),
    totalTracks,
    eagerResolvedRange: { offset, count: eagerBridged.length },
    hasMoreToEagerResolve: Boolean(nextOffset !== null),
    nextOffset,
    songs: fullPlaylistSongs,
    tracks: fullPlaylistSongs,
    list: fullPlaylistSongs
  });
}

// ============================================================================
// SPOTIFY + APPLE MUSIC CURATED HOMEPAGE ENGINE (`/home`)
// ============================================================================

async function fetchSpotifyPublicChartsService(timeoutMs = 3000) {
  try {
    const res = await fetchWithTimeout("https://charts-spotify-com-service.spotify.com/public/v0/charts", {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "application/json"
      }
    }, timeoutMs);
    if (!res.ok) return [];
    const data = await res.json();
    const entries = data?.chartEntryViewResponses?.[0]?.entries || [];
    const tracks = [];
    for (const entry of entries) {
      const meta = entry?.trackMetadata;
      if (!meta || !meta.trackName) continue;
      const uriParts = String(meta.trackUri || "").split(":");
      const spotifyId = uriParts.length >= 3 ? uriParts[2] : "";
      const artistName = Array.isArray(meta.artists)
        ? meta.artists.map(a => cleanText(a.name)).filter(Boolean).join(", ")
        : "Artist";
      tracks.push({
        spotifyId,
        trackName: cleanText(meta.trackName),
        artistName,
        collectionName: cleanText(meta.trackName),
        durationSec: 0,
        artworkUrl: meta.displayImageUri || ""
      });
    }
    return tracks;
  } catch {
    return [];
  }
}

async function fetchAppleMusicCharts(timeoutMs = 3500) {
  const urls = [
    "https://rss.marketingtools.apple.com/api/v2/in/music/most-played/40/songs.json",
    "https://rss.marketingtools.apple.com/api/v2/us/music/most-played/25/songs.json",
    "https://rss.marketingtools.apple.com/api/v2/in/music/most-played/20/albums.json",
    "https://itunes.apple.com/in/rss/topsongs/limit=35/json"
  ];

  const settled = await Promise.allSettled(
    urls.map(u => fetchWithTimeout(u, { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, timeoutMs).then(r => r.ok ? r.json() : null))
  );

  const songs = [];
  const albums = [];

  const parseV2Songs = (data) => {
    const list = data?.feed?.results;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item?.id && item?.name) {
          songs.push({
            appleId: String(item.id),
            trackId: String(item.id),
            trackName: cleanText(item.name),
            artistName: cleanText(item.artistName || "Artist"),
            collectionName: cleanText(item.collectionName || item.name),
            artworkUrl100: item.artworkUrl100 || ""
          });
        }
      }
    }
  };

  if (settled[0].status === "fulfilled" && settled[0].value) parseV2Songs(settled[0].value);
  if (settled[1].status === "fulfilled" && settled[1].value) parseV2Songs(settled[1].value);

  if (settled[2].status === "fulfilled" && Array.isArray(settled[2].value?.feed?.results)) {
    for (const alb of settled[2].value.feed.results) {
      if (alb?.id && alb?.name) {
        albums.push({
          appleAlbumId: String(alb.id),
          title: cleanText(alb.name),
          artist: cleanText(alb.artistName || "Apple Music Chart"),
          year: alb.releaseDate ? String(alb.releaseDate).slice(0, 4) : "",
          image: upgradeImage(alb.artworkUrl100 || "")
        });
      }
    }
  }

  if (settled[3].status === "fulfilled" && Array.isArray(settled[3].value?.feed?.entry)) {
    for (const entry of settled[3].value.feed.entry) {
      const appleId = entry?.id?.attributes?.["im:id"] || "";
      const trackName = entry?.["im:name"]?.label || "";
      const artistName = entry?.["im:artist"]?.label || "";
      const collectionName = entry?.["im:collection"]?.["im:name"]?.label || trackName;
      const images = Array.isArray(entry?.["im:image"]) ? entry["im:image"] : [];
      const artworkUrl100 = images.length > 0 ? images[images.length - 1]?.label : "";
      const durationMs = parseInt(entry?.link?.[1]?.attributes?.["im:duration"] || "0", 10) || 0;
      if (appleId && trackName) {
        songs.push({
          appleId: String(appleId),
          trackId: String(appleId),
          trackName: cleanText(trackName),
          artistName: cleanText(artistName),
          collectionName: cleanText(collectionName),
          trackTimeMillis: durationMs,
          artworkUrl100
        });
      }
    }
  }

  return { songs, albums };
}

async function fetchSpotifyAndAppleHomeFeed(langParam, origin, request = null, url = null, ctx = null) {
  const quality = resolveRequestedAudioQuality(request, url);
  const langs = String(langParam || "english,hindi,malayalam,tamil,telugu")
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const isSingleLangMode = langs.length === 1 && langs[0] !== "all";
  const singleLang = isSingleLangMode ? langs[0] : null;

  const playlistsToFetch = [];
  if (singleLang === "malayalam") {
    playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.malayalam_hits, SPOTIFY_HOME_PLAYLISTS.malayalam_melody);
  } else if (singleLang === "tamil") {
    playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.tamil_hits, SPOTIFY_HOME_PLAYLISTS.kollywood_cream);
  } else if (singleLang === "hindi") {
    playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.hindi_hits, SPOTIFY_HOME_PLAYLISTS.bollywood_central);
  } else if (singleLang === "telugu") {
    playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.telugu_hits, SPOTIFY_HOME_PLAYLISTS.tollywood_pearls);
  } else if (singleLang === "punjabi") {
    playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.punjabi_hits, SPOTIFY_HOME_PLAYLISTS.punjabi_101);
  } else if (singleLang === "english") {
    playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.global_top, SPOTIFY_HOME_PLAYLISTS.todays_hits);
  } else {
    playlistsToFetch.push(
      SPOTIFY_HOME_PLAYLISTS.india_top,
      SPOTIFY_HOME_PLAYLISTS.todays_hits,
      SPOTIFY_HOME_PLAYLISTS.malayalam_hits,
      SPOTIFY_HOME_PLAYLISTS.hindi_hits,
      SPOTIFY_HOME_PLAYLISTS.tamil_hits
    );
  }

  const uniquePlaylists = [...new Map(playlistsToFetch.map(p => [p.id, p])).values()].slice(0, 5);

  const [
    spotifyPlaylistsSettled,
    spotifyPublicChartTracks,
    appleCharts,
    regionalSaavnTop
  ] = await Promise.all([
    Promise.allSettled(uniquePlaylists.map(p => fetchSpotifyEmbedPlaylist(p.id, 3600))),
    isSingleLangMode && singleLang !== "english" ? Promise.resolve([]) : fetchSpotifyPublicChartsService(2800),
    isSingleLangMode ? Promise.resolve({ songs: [], albums: [] }) : fetchAppleMusicCharts(3500),
    isSingleLangMode
      ? fetchSaavnJson({
          __call: "search.getResults",
          api_version: "4",
          n: "28",
          p: "1",
          q: `${singleLang} top hits 2026`
        }, 3400).catch(() => null)
      : Promise.resolve(null)
  ]);

  const curatedTracks = [];
  const curatedAlbums = [];
  const seenAlbumIds = new Set();
  const shelves = [];

  const playlistTrackArrays = [];
  for (let i = 0; i < uniquePlaylists.length; i++) {
    const meta = uniquePlaylists[i];
    const settledItem = spotifyPlaylistsSettled[i];
    if (settledItem?.status === "fulfilled" && settledItem.value?.tracks?.length > 0) {
      const pl = settledItem.value;
      playlistTrackArrays.push(pl.tracks);
      const plId = `spotify:${meta.id}`;
      if (!seenAlbumIds.has(plId)) {
        seenAlbumIds.add(plId);
        const hiImg = upgradeImage(pl.image || "");
        curatedAlbums.push({
          id: plId,
          albumid: plId,
          type: "playlist",
          itemType: "album",
          title: pl.title || meta.title,
          name: pl.title || meta.title,
          artist: meta.artist,
          subtitle: meta.artist,
          year: "2026",
          image: hiImg,
          coverUrl: proxyImg(hiImg, origin),
          workerAlbumUrl: `${origin}/album?id=${encodeURIComponent(plId)}`
        });
      }
    }
  }

  for (let row = 0; row < 16; row++) {
    for (const arr of playlistTrackArrays) {
      if (arr[row]) curatedTracks.push(arr[row]);
    }
  }

  for (const scTrack of spotifyPublicChartTracks.slice(0, 18)) {
    curatedTracks.push(scTrack);
  }

  for (const amTrack of appleCharts.songs) {
    curatedTracks.push(amTrack);
  }

  for (const amAlb of appleCharts.albums) {
    const albId = `apple:${amAlb.appleAlbumId}`;
    if (!seenAlbumIds.has(albId)) {
      seenAlbumIds.add(albId);
      curatedAlbums.push({
        id: albId,
        albumid: albId,
        type: "album",
        itemType: "album",
        title: amAlb.title,
        name: amAlb.title,
        artist: amAlb.artist,
        subtitle: amAlb.artist,
        year: amAlb.year || "2026",
        image: amAlb.image,
        coverUrl: proxyImg(amAlb.image, origin),
        workerAlbumUrl: `${origin}/album?id=${encodeURIComponent(albId)}`
      });
    }
  }

  const uniqueCuratedCandidates = [];
  const seenCuratedKeys = new Set();
  for (const item of curatedTracks) {
    const core = normalizeTokenComparison(extractCoreTrackTitle(item.trackName || "") || item.trackName || "");
    const variant = extractTrackVariantTag(item.trackName || "", item.collectionName || "");
    const primaryArt = normalizeTokenComparison(String(item.artistName || "").split(/[,&]/)[0]);
    const key = `${core}__${variant}__${primaryArt}`;
    if (!core || seenCuratedKeys.has(key)) continue;
    seenCuratedKeys.add(key);
    uniqueCuratedCandidates.push(item);
    if (uniqueCuratedCandidates.length >= 36) break;
  }

  const hintArtists = [...new Set(uniqueCuratedCandidates.slice(0, 10).map(t => String(t.artistName || "").split(/[,&]/)[0].trim()).filter(Boolean))];
  const enrichedHomeSongs = await bridgeCuratedTrackListEfficiently(
    uniqueCuratedCandidates,
    hintArtists,
    origin,
    quality,
    ctx
  );

  if (Array.isArray(regionalSaavnTop?.results)) {
    const healedReg = await filterAndUpgradeSongs(regionalSaavnTop.results, origin, singleLang || "", quality);
    enrichedHomeSongs.push(...healedReg);
  }

  const deduplicatedSongs = deduplicateEnrichedSongs(enrichedHomeSongs);
  const directReady = deduplicatedSongs.filter(s => s.decrypted_media_url && s.decrypted_media_url.includes("saavncdn.com"));
  const onDemandReady = deduplicatedSongs.filter(s => !s.decrypted_media_url || !s.decrypted_media_url.includes("saavncdn.com"));
  const finalSongs = [...directReady, ...onDemandReady].slice(0, 38);

  shelves.push(
    {
      id: "top_charts",
      title: isSingleLangMode ? `Top ${singleLang[0].toUpperCase() + singleLang.slice(1)} Chartbusters` : "Spotify & Apple Music Top Charts",
      subtitle: "Verified 320kbps streams & real artwork",
      type: "songs",
      items: finalSongs.slice(0, 16)
    },
    {
      id: "featured_collections",
      title: "Featured Playlists & Albums",
      subtitle: "Curated editorial collections",
      type: "albums",
      items: curatedAlbums.slice(0, 16)
    },
    {
      id: "viral_now",
      title: "Trending & Viral Hits",
      subtitle: "Most streamed tracks right now",
      type: "songs",
      items: finalSongs.slice(16, 36)
    }
  );

  return {
    source: "SpotifyAndAppleMusicCuratedCharts",
    audioQuality: `${quality}kbps`,
    songs: finalSongs,
    albums: curatedAlbums.slice(0, 20),
    shelves,
    results: finalSongs,
    list: finalSongs
  };
}

async function resolveCompleteAlbum(albumIdOrToken, origin, preferredQuality = "320") {
  const cleanId = String(albumIdOrToken || "").trim();
  if (!cleanId) throw new Error("Missing album ID");

  if (/^https?:\/\/(?:open\.spotify\.com|spotify\.link|music\.apple\.com|(?:music\.|www\.)?youtube\.com)\//i.test(cleanId)) {
    const fakeReq = new Request(`${origin}/import?url=${encodeURIComponent(cleanId)}&quality=${preferredQuality}`);
    const impRes = await handleUniversalPlaylistImport(fakeReq, new URL(fakeReq.url), null);
    const impData = await impRes.json();
    if (impData?.songs) {
      return {
        id: impData.id || cleanId,
        albumid: impData.id || cleanId,
        type: "playlist",
        itemType: "album",
        title: impData.title || "Imported Collection",
        name: impData.title || "Imported Collection",
        artist: impData.artist || "Curated",
        subtitle: impData.artist || "Curated",
        year: "2026",
        image: impData.image || "",
        coverUrl: impData.coverUrl || "",
        song_count: impData.songs.length,
        songs: impData.songs,
        list: impData.songs,
        relatedAlbums: []
      };
    }
  }

  if (cleanId.startsWith("spotify:")) {
    const parts = cleanId.split(":");
    const resourceType = parts.length >= 3 ? parts[1] : "playlist";
    const spId = parts[parts.length - 1];
    const plData = await fetchSpotifyEmbedEntity(resourceType, spId, 4200);
    if (plData && plData.tracks.length > 0) {
      const topTracks = plData.tracks.slice(0, 32);
      const hintArtists = [...new Set(topTracks.slice(0, 8).map(t => String(t.artistName || "").split(/[,&]/)[0].trim()).filter(Boolean))];
      const enrichedSongs = await bridgeCuratedTrackListEfficiently(topTracks, hintArtists, origin, preferredQuality);
      const hiImg = upgradeImage(plData.image || enrichedSongs[0]?.image || "");
      return {
        id: cleanId,
        albumid: cleanId,
        type: resourceType === "album" ? "album" : "playlist",
        itemType: "album",
        title: plData.title || "Spotify Chart",
        name: plData.title || "Spotify Chart",
        artist: plData.artist || "Spotify Charts",
        subtitle: "Curated Collection",
        year: "2026",
        image: hiImg,
        coverUrl: proxyImg(hiImg, origin),
        song_count: enrichedSongs.length,
        songs: enrichedSongs,
        list: enrichedSongs,
        relatedAlbums: []
      };
    }
  }

  if (cleanId.startsWith("apple:")) {
    const appleColId = cleanId.replace(/^apple:(?:playlist:)?/, "");
    if (appleColId.startsWith("pl.")) {
      const amPl = await extractAppleMusicPlaylistFromUrl(appleColId, "in");
      const enrichedSongs = await bridgeCuratedTrackListEfficiently(amPl.tracks.slice(0, 32), [], origin, preferredQuality);
      const hiImg = upgradeImage(amPl.image || enrichedSongs[0]?.image || "");
      return {
        id: cleanId,
        albumid: cleanId,
        type: "playlist",
        itemType: "album",
        title: amPl.title,
        name: amPl.title,
        artist: amPl.artist,
        subtitle: amPl.artist,
        year: "2026",
        image: hiImg,
        coverUrl: proxyImg(hiImg, origin),
        song_count: enrichedSongs.length,
        songs: enrichedSongs,
        list: enrichedSongs,
        relatedAlbums: []
      };
    }
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
          const matched = findBestSaavnMatchForCuratedTrack(t, saavnPool);
          return buildCuratedBridgedSongObject(t, matched, origin, preferredQuality);
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
    healedTracks.map(s => enrichSaavnSong(s, origin, null, preferredQuality)).filter(s => s && s.id)
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
// INTELLIGENT 3-WAY HYBRID SEARCH & RELEVANCE SCORING ENGINE (`/search` & `/suggest`)
// ============================================================================

function scoreSearchResultRelevance(song, rawQuery, queryVariantIntent, clientProfile = null) {
  if (!song || !song.title) return -999;

  const qNorm = normalizeTokenComparison(rawQuery);
  const qWords = qNorm.split(" ").filter(Boolean);
  if (qWords.length === 0) return 0;

  const titleCore = normalizeTokenComparison(extractCoreTrackTitle(song.title) || song.title);
  const titleFull = normalizeTokenComparison(song.title);
  const albumNorm = normalizeTokenComparison(song.album || "");
  const artistNorm = normalizeTokenComparison(song.artist || "");
  const combinedNorm = `${titleFull} ${albumNorm} ${artistNorm}`;

  let score = 0;

  if (titleCore === qNorm || titleFull === qNorm) {
    score += 180;
  } else if (titleCore.startsWith(qNorm)) {
    score += 145;
  } else if (titleCore.includes(qNorm) || qNorm.includes(titleCore)) {
    score += 115;
  } else {
    const sim = computeStringSimilarity(titleCore, qNorm);
    if (sim >= 0.72) {
      score += Math.round(sim * 125);
    }
  }

  if (albumNorm && albumNorm !== "openmuse") {
    if (albumNorm === qNorm) {
      score += 155;
    } else if (albumNorm.includes(qNorm) || qNorm.includes(albumNorm)) {
      score += 120;
    } else {
      const albSim = computeStringSimilarity(albumNorm, qNorm);
      if (albSim >= 0.78) score += Math.round(albSim * 100);
    }
  }

  if (artistNorm) {
    if (artistNorm === qNorm || artistNorm.includes(qNorm)) {
      score += 130;
    } else {
      const matchedArtistWords = qWords.filter(w => w.length >= 3 && artistNorm.includes(w));
      score += matchedArtistWords.length * 42;
    }
  }

  const matchedTokens = qWords.filter(w => combinedNorm.includes(w));
  if (matchedTokens.length === qWords.length) {
    score += 95;
  } else {
    score += (matchedTokens.length / qWords.length) * 60;
  }

  const songVariant = song.variant || extractTrackVariantTag(song.title, song.album);
  if (queryVariantIntent === "standard") {
    if (songVariant === "standard") {
      score += 65;
    } else {
      score -= 45;
    }
  } else if (songVariant.includes(queryVariantIntent)) {
    score += 110;
  }

  if (song.decrypted_media_url && String(song.decrypted_media_url).includes("saavncdn.com")) {
    score += 40;
  }
  if (song.spotifyId || song.appleId) {
    score += 25;
  }

  if (clientProfile && clientProfile.artistScores) {
    for (const [favArtist, weight] of Object.entries(clientProfile.artistScores)) {
      const normFav = normalizeTokenComparison(favArtist);
      if (normFav && artistNorm.includes(normFav)) {
        score += Math.min(35, Math.round(weight * 4));
        break;
      }
    }
  }

  return score;
}

async function executeIntelligentHybridSearch(query, origin, request = null, url = null, ctx = null) {
  const q = String(query || "Trending").trim();
  const quality = resolveRequestedAudioQuality(request, url);
  const clientProfile = request && url ? getOrCreateClientProfile(request, url) : null;

  if (/^https?:\/\/(?:open\.spotify\.com|spotify\.link|spoti\.fi|music\.apple\.com|(?:music\.|www\.)?youtube\.com)\//i.test(q) || /^spotify:(playlist|album|track|artist):/i.test(q)) {
    const fakeReq = new Request(`${origin}/import?url=${encodeURIComponent(q)}&quality=${quality}`);
    const impRes = await handleUniversalPlaylistImport(fakeReq, new URL(fakeReq.url), ctx);
    const impData = await impRes.json();
    if (impData?.songs?.length) {
      return {
        query: q,
        songs: impData.songs,
        albums: [{
          id: impData.id,
          albumid: impData.id,
          type: "playlist",
          itemType: "album",
          title: impData.title,
          name: impData.title,
          artist: impData.artist,
          subtitle: impData.artist,
          year: "2026",
          image: impData.image,
          coverUrl: impData.coverUrl,
          workerAlbumUrl: `${origin}/album?id=${encodeURIComponent(impData.id)}`
        }]
      };
    }
  }

  if (/^(trending|top\s*hits|top\s*songs|popular|home|new\s*releases)$/i.test(q)) {
    const homeFeed = await fetchSpotifyAndAppleHomeFeed("english,hindi,malayalam,tamil,telugu", origin, request, url, ctx);
    return {
      query: q,
      songs: homeFeed.songs,
      albums: homeFeed.albums
    };
  }

  const queryVariantIntent = extractTrackVariantTag(q, "");

  const [
    spotifyRes,
    itunesSongsRes,
    itunesAlbumsRes,
    saavnSongsRes,
    saavnAlbumsRes
  ] = await Promise.allSettled([
    searchSpotifyCatalog(q, 14, 3200),
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=18`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      3200
    ).then(r => r.ok ? r.json() : null),
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=album&limit=10`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      3200
    ).then(r => r.ok ? r.json() : null),
    fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "35", p: "1", q }, 4000),
    fetchSaavnJson({ __call: "search.getAlbumResults", api_version: "4", n: "16", p: "1", q }, 4000)
  ]);

  const spotifySongHits = (spotifyRes.status === "fulfilled" && Array.isArray(spotifyRes.value?.tracks))
    ? spotifyRes.value.tracks
    : [];

  const appleSongHits = (itunesSongsRes.status === "fulfilled" && Array.isArray(itunesSongsRes.value?.results))
    ? itunesSongsRes.value.results
    : [];

  let saavnRawSongs = (saavnSongsRes.status === "fulfilled" && Array.isArray(saavnSongsRes.value?.results))
    ? saavnSongsRes.value.results
    : [];

  const topCanonicalHit = spotifySongHits[0] || appleSongHits[0];
  if (topCanonicalHit && saavnRawSongs.length < 6) {
    const correctedQ = `${extractCoreTrackTitle(topCanonicalHit.trackName)} ${String(topCanonicalHit.artistName || "").split(/[,&]/)[0]}`.trim();
    if (correctedQ && normalizeTokenComparison(correctedQ) !== normalizeTokenComparison(q)) {
      try {
        const extraSaavn = await fetchSaavnJson({
          __call: "search.getResults",
          api_version: "4",
          n: "24",
          p: "1",
          q: correctedQ
        }, 2800);
        if (Array.isArray(extraSaavn?.results)) {
          saavnRawSongs.push(...extraSaavn.results);
        }
      } catch {}
    }
  }

  const saavnRawAlbums = (saavnAlbumsRes.status === "fulfilled" && Array.isArray(saavnAlbumsRes.value?.results))
    ? saavnAlbumsRes.value.results
    : [];

  if (saavnRawAlbums.length > 0) {
    const topAlb = saavnRawAlbums[0];
    const albTitleNorm = normalizeTokenComparison(topAlb.title || topAlb.name || "");
    if (albTitleNorm && (albTitleNorm === normalizeTokenComparison(q) || computeStringSimilarity(albTitleNorm, q) >= 0.85)) {
      try {
        const albDetails = await fetchSaavnJson({
          __call: "content.getAlbumDetails",
          api_version: "4",
          albumid: String(topAlb.id || topAlb.albumid)
        }, 2600);
        const albTracks = albDetails?.list || albDetails?.songs || [];
        if (Array.isArray(albTracks) && albTracks.length > 0) {
          saavnRawSongs.unshift(...albTracks);
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

  for (const spHit of spotifySongHits) {
    if (!spHit || !spHit.trackName) continue;
    if (isLowQualityJunkTrack({ title: spHit.trackName, album: spHit.collectionName, duration: spHit.durationSec }, q)) continue;
    const matchedSaavn = findBestSaavnMatchForCuratedTrack(spHit, healedSaavnPool);
    if (matchedSaavn) {
      usedSaavnIds.add(String(matchedSaavn.id));
      combinedCandidates.push(buildCuratedBridgedSongObject(spHit, matchedSaavn, origin, quality));
    } else {
      combinedCandidates.push(buildCuratedBridgedSongObject(spHit, null, origin, quality));
    }
  }

  for (const appleHit of appleSongHits) {
    if (!appleHit || !appleHit.trackId) continue;
    if (isLowQualityJunkTrack({ title: appleHit.trackName, album: appleHit.collectionName, duration: (appleHit.trackTimeMillis || 0) / 1000 }, q)) {
      continue;
    }
    const matchedSaavn = findBestSaavnMatchForCuratedTrack(appleHit, healedSaavnPool);
    if (matchedSaavn) {
      usedSaavnIds.add(String(matchedSaavn.id));
      combinedCandidates.push(buildCuratedBridgedSongObject(appleHit, matchedSaavn, origin, quality));
    } else {
      combinedCandidates.push(buildCuratedBridgedSongObject(appleHit, null, origin, quality));
    }
  }

  for (const sRaw of healedSaavnPool) {
    if (!sRaw || !sRaw.id) continue;
    if (usedSaavnIds.has(String(sRaw.id))) continue;
    combinedCandidates.push(enrichSaavnSong(sRaw, origin, null, quality));
  }

  const deduplicatedSongs = deduplicateEnrichedSongs(combinedCandidates);
  const scoredSongs = deduplicatedSongs.map((song, idx) => ({
    song,
    score: scoreSearchResultRelevance(song, q, queryVariantIntent, clientProfile) - idx * 0.5
  }));

  scoredSongs.sort((a, b) => b.score - a.score);
  const finalSongs = scoredSongs.map(x => x.song).slice(0, 34);

  const finalAlbums = [];
  const seenAlbumKeys = new Set();

  for (const a of saavnRawAlbums) {
    const enrichedAlb = enrichSaavnAlbum(a, origin);
    const key = normalizeTokenComparison(enrichedAlb.title);
    if (key && !seenAlbumKeys.has(key)) {
      seenAlbumKeys.add(key);
      finalAlbums.push(enrichedAlb);
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
    audioQuality: `${quality}kbps`,
    songs: finalSongs,
    albums: finalAlbums.slice(0, 18)
  };
}

async function handleSearchSuggestions(request, url) {
  const q = (url.searchParams.get("q") || "").trim();
  const profile = getOrCreateClientProfile(request, url);
  const affinityArtists = getTopClientAffinityArtists(profile, 6);

  if (!q) {
    return jsonResponse({
      query: "",
      personalizedArtists: affinityArtists,
      recentSeeds: profile.recentSeedTracks.slice(0, 6),
      suggestions: [
        ...affinityArtists.map(a => `${a} Hits`),
        "India Top Hits 2026",
        "Malayalam Top Hits",
        "Hindi Viral Hits",
        "Tamil Chartbusters"
      ].slice(0, 10)
    });
  }

  const [spRes, itunesRes] = await Promise.allSettled([
    searchSpotifyCatalog(q, 8, 2400),
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=6`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2400
    ).then(r => r.ok ? r.json() : null)
  ]);

  const textSuggestions = new Set();
  const tracks = [];

  if (spRes.status === "fulfilled" && Array.isArray(spRes.value?.tracks)) {
    for (const t of spRes.value.tracks) {
      textSuggestions.add(`${t.trackName} - ${t.artistName.split(",")[0]}`);
      tracks.push(t);
    }
  }
  if (itunesRes.status === "fulfilled" && Array.isArray(itunesRes.value?.results)) {
    for (const r of itunesRes.value.results) {
      if (r?.trackName) {
        textSuggestions.add(`${cleanText(r.trackName)} - ${cleanText(r.artistName || "").split(",")[0]}`);
      }
    }
  }

  return jsonResponse({
    query: q,
    suggestions: [...textSuggestions].slice(0, 10),
    tracks: tracks.slice(0, 8),
    affinityArtists
  });
}

// ============================================================================
// REAL-TIME WORD-BY-WORD LYRICS ENGINE v11.0
// (FIXED: STRICT ARTIST/ALBUM/DURATION CONTEXT GUARD — ZERO WRONG-SONG LYRICS!)
// ============================================================================

function isCreditOrMetadataJunkLine(rawLine, trackTitle = "", artistName = "", lineIndex = 0, lineTimeSec = 0) {
  if (!rawLine) return true;
  const s = cleanText(rawLine)
    .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, "")
    .trim();

  if (!s) return true;

  if (/^\[?(?:ti|ar|al|by|offset|length|re|ve|au|lr|id|tool|la|bg|Qq|total)\s*:/i.test(s)) {
    return true;
  }

  if (/^[\[(<~*-]*\s*(?:verse|chorus|pre-?\s*chorus|post-?\s*chorus|bridge|intro|outro|hook|interlude|refrain|instrumental(?:\s+break|\s+solo)?|guitar\s+solo|music(?:\s+break)?|solo|drop|beat\s+drop|repeat(?:\s+chorus)?|end)\s*\d*\s*[\])>~*-]*$/i.test(s)) {
    return true;
  }

  if (/^(?:lyrics?|lyricists?|words|written|composed|music|bgm|score|produced|producer|arranged|arranger|sung|singers?|vocals?|vocalists?|performed|featuring|synced|synchronized|sync|timed|timing|edited|editor|transcribed|uploaded|uploader|created|creator|subtitles?|captions?|translated|translation|mixed|mastered|recorded|published|publisher|label|album|movie|film|starring|cast|director|audio|source|author|lrc|karaoke|by)\s*[:：\-–—]/i.test(s)) {
    return true;
  }

  if (/^(?:lyrics?|words|written|composed|music|song\s+by|track\s+by|produced|arranged|synced|synchronized|sync|timed|timing|edited|transcribed|uploaded|created|subtitles?|captions?|translated|translation|lrc|karaoke|audio|mixed|mastered|recorded|published)\s+by\b/i.test(s)) {
    return true;
  }

  if ((lineIndex <= 2 || lineTimeSec < 12) && /^by\s+[@A-Za-z0-9_.\s]{2,35}$/i.test(s)) {
    if (!/^by\s+(?:the|your|my|me|now|side|myself|yourself|default|chance|heart|night|day|time|far|all|hand|grace|faith|blood|fire|water|light|god)\b/i.test(s)) {
      return true;
    }
  }

  if (/^(?:作词|作詞|作曲|编曲|編曲|制作人?|製作人?|演唱|歌手|主唱|混音|母带|母帶|吉他|贝斯|鼓|弦乐|弦樂|和声|和聲|录音|錄音|统筹|統籌|出品|发行|發行|监制|監製|词|詞|曲|编|編|原唱|翻唱|后期|後期|文案|封面|OP|SP|LRC)\s*[:：]/iu.test(s)) {
    return true;
  }

  if (/\b(?:www\.[a-z0-9-]+|https?:\/\/\S+|[a-z0-9-]+\.(?:com|net|org|io|me|in|co|ru|cn|info)\b|musixmatch|lrclib|lrcgenerator|megalobiz|rentanadviser|lyrics\.ovh|syair\.info|RCLyricsBand)/i.test(s)) {
    return true;
  }
  if (/this\s+lyrics?\s+is\s+not\s+for\s+commercial\s+use|\*{3,}|^[©℗]|all\s+rights\s+reserved|\bfollow\s+(?:me|us)\s+on\b|\bsubscribe\s+to\b/i.test(s)) {
    return true;
  }

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
  return cleanText(rawText)
    .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, " ")
    .replace(/\[(?:verse|chorus|pre-?chorus|post-?chorus|bridge|intro|outro|hook|interlude|instrumental|repeat)[^\]]*\]/gi, " ")
    .replace(/\[bg\s*:[^\]]*\]/gi, " ")
    .replace(/^(?:v\d+|male|female|both|duet|chorus|all|singer\s*\d*|voice\s*\d*|m|f)\s*[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
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
    .filter(a => a && !/^(unknown|unknown artist|various artists|ost|traditional|spotify|apple music|muse|openmuse)$/i.test(a));

  const uniqueArtists = [...new Set(allArtistsRaw)];

  const cleanAlbum = cleanText(rawAlbum || extractedMovie || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/original motion picture soundtrack/gi, "")
    .replace(/-\s*(?:single|ep|ost|original.*)$/gi, "")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const validAlbum = (
    cleanAlbum &&
    !/^(openmuse|muse|spotify.*|apple.*|today's top hits|hot hits.*)$/i.test(cleanAlbum) &&
    cleanAlbum.toLowerCase() !== primaryTitle.toLowerCase()
  )
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

  const totalUnits = Math.max(0.5, wordWeights.reduce((a, b) => a + b, 0) + pauseWeights.reduce((a, b) => a + b, 0));
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
    romanizedText: symbols.join(" "),
    nativeText: symbols.join(" "),
    isInstrumental: true,
    plainOnly: false,
    words,
    romanizedWords: words,
    nativeWords: words
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
        return `${lineTag} ${wordTags}`;
      }
      return `${lineTag} ${line.text}`;
    })
    .join("\n");
}

function buildStandardLrcFromTimeline(lines, useNative = false) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  return lines
    .filter(l => l && !l.isInstrumental)
    .map(line => `[${formatLrcTimestamp(line.time)}] ${useNative && line.nativeText ? line.nativeText : line.text}`)
    .join("\n");
}

function buildLyricsPlusCompatiblePayload(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((l, idx) => {
    const item = {
      time: Math.round(l.time * 1000),
      duration: Math.round(l.duration * 1000),
      text: l.text,
      romanizedText: l.romanizedText || l.text,
      nativeText: l.nativeText || l.text,
      syllabus: (l.words || []).map((w, wIdx, arr) => ({
        time: Math.round(w.time * 1000),
        duration: Math.round(Math.max(0.05, (w.endTime || w.time + 0.25) - w.time) * 1000),
        text: wIdx < arr.length - 1 ? `${w.word} ` : w.word
      })),
      element: { key: `L${idx + 1}` }
    };
    if (l.nativeText && l.nativeText !== l.romanizedText) {
      item.transliteration = {
        text: l.romanizedText,
        syllabus: item.syllabus
      };
    }
    return item;
  });
}

/**
 * Validates that a fetched timeline of lyrics actually matches the song's duration and isn't a corrupted/wrong-song match.
 */
function validateFetchedLyricsTimeline(lines, expectedDurationSec = 0) {
  if (!Array.isArray(lines) || lines.length < 2) return false;
  const vocalLines = lines.filter(l => l && !l.isInstrumental && cleanText(l.text));
  if (vocalLines.length < 2) return false;

  if (expectedDurationSec >= 90) {
    const lastVocalLine = vocalLines[vocalLines.length - 1];
    // If the last vocal line starts more than 45 seconds AFTER the entire song ends, it's from a much longer/wrong song!
    if (lastVocalLine.time > expectedDurationSec + 45) {
      return false;
    }
  }
  return true;
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

    let nativeLine = sanitizeLyricLineText(item.nativeText || cleanLine);
    let romanLine = item.romanizedText ? sanitizeLyricLineText(item.romanizedText) : "";

    if (!romanLine) {
      if (hasIndicScriptChars(cleanLine)) {
        romanLine = transliterateIndicToRoman(cleanLine);
      } else {
        romanLine = cleanLine;
      }
    }

    cleanedEntries.push({
      ...item,
      time: Math.max(0, Number(item.time) || 0),
      endTime: item.endTime ? Number(item.endTime) : 0,
      text: romanLine || cleanLine,
      romanizedText: romanLine || cleanLine,
      nativeText: nativeLine || cleanLine,
      translationText: item.translationText ? cleanText(item.translationText) : null
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
        if (hasIndicScriptChars(item.nativeText) && !hasIndicScriptChars(prev.nativeText)) {
          prev.nativeText = item.nativeText;
        }
        continue;
      }
      if (prev.text === "♪" || prev.text === "♪ • • •") {
        Object.assign(prev, item);
        continue;
      }
      if (item.text === "♪" || item.text === "♪ • • •") continue;

      const prevHasIndic = hasIndicScriptChars(prev.nativeText);
      const itemHasIndic = hasIndicScriptChars(item.nativeText);
      if (prevHasIndic && !itemHasIndic) {
        prev.romanizedText = item.romanizedText;
        prev.text = item.romanizedText;
        if (item.inlineWords?.length) prev.inlineWords = item.inlineWords;
        continue;
      }
      if (!prevHasIndic && itemHasIndic) {
        prev.nativeText = item.nativeText;
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
    let nativeWords = [];
    let lineEndTime = nextStartTime;

    if (Array.isArray(entry.inlineWords) && entry.inlineWords.length > 0) {
      const validInline = entry.inlineWords.filter(iw => iw && String(iw.word || iw.text || "").trim());
      const romanTokens = entry.romanizedText ? entry.romanizedText.split(/\s+/).filter(Boolean) : [];
      const canMapRoman1To1 = romanTokens.length === validInline.length;

      words = validInline.map((iw, wIdx) => {
        const nextIw = validInline[wIdx + 1];
        const rawWText = String(iw.word || iw.text || "").trim();
        const nativeWText = iw.nativeWord || rawWText;
        const romanWText = iw.romanizedWord
          || (canMapRoman1To1 ? romanTokens[wIdx] : (hasIndicScriptChars(rawWText) ? transliterateIndicToRoman(rawWText) : rawWText));

        const wStart = Number(Math.max(entry.time, Number(iw.time) || entry.time).toFixed(3));
        let rawEnd = iw.endTime ? Number(iw.endTime) : (nextIw ? Number(nextIw.time) : (entry.endTime || wStart + 0.42));
        if (nextIw && rawEnd > Number(nextIw.time)) {
          rawEnd = Number(nextIw.time);
        }
        const wEnd = Number(Math.max(wStart + 0.05, Math.min(nextStartTime, rawEnd)).toFixed(3));
        const wDur = Number(Math.max(0.05, wEnd - wStart).toFixed(3));

        nativeWords.push({
          word: nativeWText,
          text: nativeWText,
          time: wStart,
          endTime: wEnd,
          duration: wDur,
          timeMs: Math.round(wStart * 1000),
          durationMs: Math.round(wDur * 1000)
        });

        const wordObj = {
          word: romanWText || rawWText,
          text: romanWText || rawWText,
          nativeWord: nativeWText,
          romanizedWord: romanWText || rawWText,
          time: wStart,
          endTime: wEnd,
          duration: wDur,
          timeMs: Math.round(wStart * 1000),
          durationMs: Math.round(wDur * 1000)
        };
        if (Array.isArray(iw.syllables) && iw.syllables.length > 0) {
          wordObj.syllables = iw.syllables.map(syl => ({
            ...syl,
            text: hasIndicScriptChars(syl.text) ? transliterateIndicToRoman(syl.text) : syl.text,
            nativeText: syl.text
          }));
        }
        return wordObj;
      });

      if (!canMapRoman1To1 && entry.romanizedText && hasIndicScriptChars(validInline.map(x => x.word || x.text).join(" ")) && !hasIndicScriptChars(entry.romanizedText)) {
        const vocalStart = words[0]?.time ?? entry.time;
        const vocalEnd = words[words.length - 1]?.endTime ?? nextStartTime;
        words = distributeWordsAcrossWindow(entry.romanizedText, vocalStart, vocalEnd, nextStartTime);
      }

      const lastWordEnd = words.length > 0 ? words[words.length - 1].endTime : entry.time + 2.0;
      if (entry.endTime && entry.endTime > entry.time && entry.endTime <= nextStartTime) {
        lineEndTime = Number(Math.max(lastWordEnd, entry.endTime).toFixed(3));
      } else if (nextStartTime - lastWordEnd >= 5.5) {
        lineEndTime = Number(Math.min(nextStartTime, lastWordEnd + 0.6).toFixed(3));
      }
    } else {
      const wordList = entry.romanizedText.split(/\s+/).filter(Boolean);
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

      words = distributeWordsAcrossWindow(entry.romanizedText, entry.time, vocalEndSec, lineEndTime);
      nativeWords = entry.nativeText && entry.nativeText !== entry.romanizedText
        ? distributeWordsAcrossWindow(entry.nativeText, entry.time, vocalEndSec, lineEndTime)
        : words;
    }

    const lineDuration = Number(Math.max(0.18, lineEndTime - entry.time).toFixed(3));
    const finalRomanText = words.map(w => w.word).join(" ") || entry.romanizedText;
    const finalNativeText = entry.nativeText || finalRomanText;

    timeline.push({
      index: timeline.length,
      time: Number(entry.time.toFixed(3)),
      endTime: lineEndTime,
      duration: lineDuration,
      text: finalRomanText,
      romanizedText: finalRomanText,
      nativeText: finalNativeText,
      bilingualText: finalNativeText !== finalRomanText ? `${finalRomanText} • ${finalNativeText}` : finalRomanText,
      translationText: entry.translationText || null,
      isInstrumental: false,
      plainOnly: false,
      words,
      romanizedWords: words,
      nativeWords: nativeWords.length > 0 ? nativeWords : words
    });

    if (nextEntry && nextStartTime - lineEndTime >= 5.0) {
      timeline.push(createInstrumentalCueLine(lineEndTime, nextStartTime, timeline.length));
    }
  }

  return timeline;
}

function parsePaxsenixAppleJsonToTimeline(rawArray, totalDurationSec = 0, trackTitle = "", artistName = "") {
  const list = Array.isArray(rawArray)
    ? rawArray
    : (Array.isArray(rawArray?.lyrics) ? rawArray.lyrics : (Array.isArray(rawArray?.data) ? rawArray.data : (Array.isArray(rawArray?.content) ? rawArray.content : null)));

  if (!Array.isArray(list) || list.length === 0) return [];

  const entries = [];
  for (const line of list) {
    if (!line) continue;
    const lineStartSec = (Number(line.timestamp ?? line.time ?? line.startTime) || 0) / 1000;
    const lineEndSec = line.endtime || line.endTime
      ? Number(line.endtime ?? line.endTime) / 1000
      : (line.duration ? lineStartSec + Number(line.duration) / 1000 : 0);

    if (Array.isArray(line.text)) {
      const groupedWords = [];
      let curWord = "";
      let curStart = null;
      let curEnd = null;
      let curSyllables = [];

      for (let k = 0; k < line.text.length; k++) {
        const syl = line.text[k];
        if (!syl || syl.background) continue;
        const rawSyl = cleanText(syl.text || "");
        if (!rawSyl) continue;

        const sStart = (Number(syl.timestamp ?? syl.time) || (lineStartSec * 1000)) / 1000;
        const sEnd = syl.endtime || syl.endTime
          ? Number(syl.endtime ?? syl.endTime) / 1000
          : sStart + Math.max(0.06, (Number(syl.duration) || 220) / 1000);

        if (curStart === null) curStart = sStart;
        curEnd = Math.max(sStart + 0.05, sEnd);
        curWord += rawSyl;
        curSyllables.push({
          text: rawSyl,
          time: Number(sStart.toFixed(3)),
          endTime: Number(curEnd.toFixed(3))
        });

        const isPart = Boolean(syl.part);
        if (!isPart || k === line.text.length - 1) {
          groupedWords.push({
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

      if (groupedWords.length > 0) {
        const joinedNative = groupedWords.map(w => w.word).join(" ");
        const translitText = cleanText(line.transliteration?.text || line.transliteration || line.roman || "");
        entries.push({
          time: lineStartSec,
          endTime: lineEndSec,
          text: joinedNative,
          nativeText: joinedNative,
          romanizedText: translitText || (hasIndicScriptChars(joinedNative) ? transliterateIndicToRoman(joinedNative) : joinedNative),
          translationText: cleanText(line.translation?.text || line.translation || ""),
          inlineWords: groupedWords
        });
      }
    } else if (typeof line.text === "string" || typeof line.words === "string") {
      const txt = cleanText(line.text || line.words || "");
      if (!txt) continue;
      const translitText = cleanText(line.transliteration?.text || line.transliteration || line.roman || "");
      entries.push({
        time: lineStartSec,
        endTime: lineEndSec,
        text: txt,
        nativeText: txt,
        romanizedText: translitText || (hasIndicScriptChars(txt) ? transliterateIndicToRoman(txt) : txt),
        translationText: cleanText(line.translation?.text || line.translation || "")
      });
    }
  }

  return finalizeTimelineMonotonic(entries, totalDurationSec, trackTitle, artistName);
}

function parseLyricsPlusJsonToTimeline(data, totalDurationSec = 0, trackTitle = "", artistName = "") {
  const rawLyrics = data?.lyrics;
  if (!Array.isArray(rawLyrics) || rawLyrics.length === 0) return null;

  // Verify metadata returned by LyricsPlus if present so we never accept wrong-song lyrics!
  const returnedTitle = cleanText(data?.metadata?.title || data?.title || "");
  const returnedArtist = cleanText(data?.metadata?.artist || data?.artist || "");
  if (returnedTitle && trackTitle) {
    const tSim = computeStringSimilarity(extractCoreTrackTitle(returnedTitle) || returnedTitle, extractCoreTrackTitle(trackTitle) || trackTitle);
    const normRet = normalizeTokenComparison(returnedTitle);
    const normExp = normalizeTokenComparison(trackTitle);
    if (tSim < 0.55 && !normRet.includes(normExp) && !normExp.includes(normRet)) {
      return null;
    }
  }
  if (returnedArtist && artistName) {
    const normRetArt = normalizeTokenComparison(returnedArtist);
    const expArtists = String(artistName).split(/[,&/|]/).map(a => normalizeTokenComparison(a)).filter(Boolean);
    const artistOverlap = expArtists.some(ea => {
      const words = ea.split(" ").filter(w => w.length >= 3);
      return normRetArt.includes(ea) || ea.includes(normRetArt) || words.some(w => w.length >= 4 && normRetArt.includes(w));
    });
    if (!artistOverlap && expArtists.length > 0 && returnedTitle && normalizeTokenComparison(returnedTitle).length <= 8) {
      return null;
    }
  }

  const maxRawTime = rawLyrics.reduce((m, l) => Math.max(m, Number(l?.time) || 0), 0);
  const toSec = (val) => {
    const n = Number(val) || 0;
    return maxRawTime > 1000 ? n / 1000 : n;
  };

  let hasTrueWordSync = false;
  const entries = [];

  const groupSyllabusIntoWords = (syllabusArr) => {
    if (!Array.isArray(syllabusArr) || syllabusArr.length === 0) return null;
    const usesTrailingSpace = syllabusArr.some(s => typeof s?.text === "string" && /\s$/.test(s.text));
    if (usesTrailingSpace) {
      const grouped = [];
      let curWordText = "";
      let curStart = null;
      let curEnd = null;
      let curSyllables = [];

      for (let k = 0; k < syllabusArr.length; k++) {
        const syl = syllabusArr[k];
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

        const isWordEnd = /\s$/.test(rawSylText) || k === syllabusArr.length - 1;
        if (isWordEnd && curWordText) {
          grouped.push({
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
      return grouped.length > 0 ? grouped : null;
    }

    return syllabusArr
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
  };

  for (const line of rawLyrics) {
    if (!line) continue;
    const lineStart = toSec(line.time);
    const lineDur = toSec(line.duration);
    const lineEnd = lineDur > 0 ? lineStart + lineDur : 0;

    const syllabus = Array.isArray(line.syllabus) ? line.syllabus : [];
    let nativeLineText = cleanText(line.text || "");
    if (!nativeLineText && syllabus.length > 0) {
      nativeLineText = cleanText(syllabus.map(s => s.text || "").join(""));
    }
    if (!nativeLineText) continue;

    const translitObj = line.transliteration;
    const translitText = typeof translitObj === "string"
      ? cleanText(translitObj)
      : cleanText(translitObj?.text || line.romanized || "");
    const translitSyllabus = Array.isArray(translitObj?.syllabus) ? translitObj.syllabus : [];

    let inlineWords = null;
    if (translitSyllabus.length > 0) {
      hasTrueWordSync = true;
      inlineWords = groupSyllabusIntoWords(translitSyllabus);
    } else if (syllabus.length > 0) {
      hasTrueWordSync = true;
      inlineWords = groupSyllabusIntoWords(syllabus);
    }

    const effectiveRoman = translitText
      || (hasIndicScriptChars(nativeLineText) ? transliterateIndicToRoman(nativeLineText) : nativeLineText);

    entries.push({
      time: lineStart,
      endTime: lineEnd,
      text: effectiveRoman,
      nativeText: nativeLineText,
      romanizedText: effectiveRoman,
      translationText: cleanText(line.translation?.text || line.translation || ""),
      inlineWords
    });
  }

  const lines = finalizeTimelineMonotonic(entries, totalDurationSec, trackTitle, artistName);
  if (!validateFetchedLyricsTimeline(lines, totalDurationSec)) return null;

  return {
    lines,
    hasTrueWordSync: hasTrueWordSync || String(data?.type || "").toLowerCase() === "word",
    upstreamSource: data?.metadata?.source || "Apple"
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

  const translitMap = new Map();
  const translitWordsMap = new Map();
  const translationMap = new Map();

  const translitBlockMatch = ttmlXml.match(/<transliterations\b[^>]*>([\s\S]*?)<\/transliterations>/i);
  if (translitBlockMatch && translitBlockMatch[1]) {
    const textForRegex = /<text\b[^>]*\bfor\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/text>/gi;
    let tfMatch;
    while ((tfMatch = textForRegex.exec(translitBlockMatch[1])) !== null) {
      const key = tfMatch[1].trim();
      const inner = tfMatch[2] || "";
      const plainRoman = cleanText(inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
      if (plainRoman) translitMap.set(key, plainRoman);

      const spanRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>(\s*)/gi;
      let sm;
      const rWords = [];
      let curW = "";
      let curS = null;
      let curE = null;
      while ((sm = spanRegex.exec(inner)) !== null) {
        const sAttrs = sm[1] || "";
        const rawC = sm[2].replace(/<[^>]+>/g, "");
        const trail = sm[3] || "";
        const tok = cleanText(rawC);
        if (!tok) continue;
        const b = parseTtmlTimestamp(sAttrs.match(/\bbegin\s*=\s*["']([^"']+)["']/i)?.[1]);
        const e = parseTtmlTimestamp(sAttrs.match(/\bend\s*=\s*["']([^"']+)["']/i)?.[1]);
        if (b === null) continue;
        const effE = e !== null && e > b ? e : b + 0.24;
        if (curS === null) curS = b;
        curE = effE;
        curW += tok;
        if (trail.length > 0 || /\s$/.test(rawC)) {
          rWords.push({ word: curW, text: curW, time: Number(curS.toFixed(3)), endTime: Number(curE.toFixed(3)) });
          curW = "";
          curS = null;
          curE = null;
        }
      }
      if (curW && curS !== null) {
        rWords.push({ word: curW, text: curW, time: Number(curS.toFixed(3)), endTime: Number((curE || curS + 0.3).toFixed(3)) });
      }
      if (rWords.length > 0) translitWordsMap.set(key, rWords);
    }
  }

  const translationBlockMatch = ttmlXml.match(/<translations\b[^>]*>([\s\S]*?)<\/translations>/i);
  if (translationBlockMatch && translationBlockMatch[1]) {
    const textForRegex = /<text\b[^>]*\bfor\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/text>/gi;
    let trMatch;
    while ((trMatch = textForRegex.exec(translationBlockMatch[1])) !== null) {
      const key = trMatch[1].trim();
      const plainTr = cleanText(trMatch[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
      if (plainTr) translationMap.set(key, plainTr);
    }
  }

  const bodyMatch = ttmlXml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const bodyXml = bodyMatch ? bodyMatch[1] : ttmlXml;

  const entries = [];
  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let pMatch;

  while ((pMatch = pRegex.exec(bodyXml)) !== null) {
    const pAttrs = pMatch[1] || "";
    let pInner = pMatch[2] || "";

    const keyAttr = pAttrs.match(/\b(?:itunes:key|key)\s*=\s*["']([^"']+)["']/i)?.[1]?.trim() || "";

    let inlineRomanSpanText = "";
    pInner = pInner.replace(/<span\b[^>]*(?:ttm:role|role)\s*=\s*["']x-roman["'][^>]*>([\s\S]*?)<\/span>/gi, (_, rContent) => {
      inlineRomanSpanText += " " + cleanText(rContent.replace(/<[^>]+>/g, " "));
      return " ";
    });
    inlineRomanSpanText = inlineRomanSpanText.trim();

    pInner = pInner.replace(/<span\b[^>]*(?:ttm:role|role)\s*=\s*["']x-bg["'][^>]*>[\s\S]*?<\/span>/gi, " ");
    pInner = pInner.replace(/<span\b[^>]*(?:ttm:role|role)\s*=\s*["']x-translation["'][^>]*>[\s\S]*?<\/span>/gi, " ");

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

    const nativeLine = inlineWords.length > 0
      ? inlineWords.map(w => w.word).join(" ")
      : cleanText(pInner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

    if (!nativeLine) continue;
    const effectiveLineStart = lineStart !== null
      ? lineStart
      : (inlineWords[0]?.time ?? null);

    if (effectiveLineStart === null) continue;

    const officialRomanLine = (keyAttr && translitMap.get(keyAttr)) || inlineRomanSpanText || "";
    const officialRomanWords = (keyAttr && translitWordsMap.get(keyAttr)) || null;
    const effectiveRomanLine = officialRomanLine
      || (hasIndicScriptChars(nativeLine) ? transliterateIndicToRoman(nativeLine) : nativeLine);

    entries.push({
      time: effectiveLineStart,
      endTime: lineEnd || (inlineWords.length > 0 ? inlineWords[inlineWords.length - 1].endTime : 0),
      text: effectiveRomanLine,
      nativeText: nativeLine,
      romanizedText: effectiveRomanLine,
      translationText: (keyAttr && translationMap.get(keyAttr)) || null,
      inlineWords: officialRomanWords || (inlineWords.length > 0 ? inlineWords : null)
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
  const lineTimeRegex = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  const wordAnchorRegex = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>([^<]*)/g;

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
        nativeText: cleanLineText || "♪",
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
        nativeText: joined,
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
      text,
      nativeText: text
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

/**
 * Upgraded High-Precision Candidate Scorer for Apple Music, LRC.RED, Deezer, and LRCLIB
 * FIXED in v11.0:
 * - Strictly requires `artistMatched || albumMatched || tightDurationMatch` whenever artist/album/duration context is known,
 *   so a candidate with the same song title by a DIFFERENT artist is NEVER selected!
 */
function scoreLrcCandidate(item, tokens, durationSec, preferRomanScript = false) {
  if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -999;

  const rawItemTitle = String(item.trackName || item.name || item.title || "").toLowerCase();
  const rawSearchTitle = String(tokens.primaryTitle || "").toLowerCase();

  if (/\b(karaoke|8d|ringtone|tribute)\b/i.test(rawItemTitle) && !/\b(karaoke|8d|ringtone|tribute)\b/i.test(rawSearchTitle)) {
    return -500;
  }

  const itemVariant = extractTrackVariantTag(rawItemTitle, item.albumName || item.album || "");
  if (tokens.variantTag === "standard" && itemVariant !== "standard") {
    return -400;
  }

  const itemTitle = normalizeTokenComparison(extractCoreTrackTitle(item.trackName || item.name || item.title || "") || item.trackName || "");
  const itemArtist = normalizeTokenComparison(item.artistName || item.artist || "");
  const itemAlbum = normalizeTokenComparison(item.albumName || item.album || "");
  const targetTitle = normalizeTokenComparison(tokens.primaryTitle);
  const altTitle = normalizeTokenComparison(tokens.secondaryTitle);

  let titleScore = 0;
  const simPrimary = computeStringSimilarity(itemTitle, targetTitle);
  const simAlt = altTitle ? computeStringSimilarity(itemTitle, altTitle) : 0;

  if (targetTitle && itemTitle === targetTitle) {
    titleScore = 105;
  } else if (simPrimary >= 0.82) {
    titleScore = Math.round(simPrimary * 95);
  } else if (targetTitle && (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle)) && Math.min(itemTitle.length, targetTitle.length) >= 4) {
    titleScore = 82;
  } else if (altTitle && altTitle.length >= 3 && (itemTitle === altTitle || simAlt >= 0.84 || itemTitle.includes(altTitle))) {
    titleScore = 76;
  } else if (targetTitle) {
    const targetWords = targetTitle.split(" ").filter(w => w.length >= 3);
    const matchedWords = targetWords.filter(w => itemTitle.includes(w));
    if (targetWords.length >= 2 && matchedWords.length === targetWords.length) {
      titleScore = 75;
    } else if (targetWords.length >= 3 && matchedWords.length >= targetWords.length - 1) {
      titleScore = 58;
    }
  }

  if (titleScore === 0) return -500;

  let score = titleScore;
  let artistMatched = false;
  let albumMatched = false;
  let tightDurationMatch = false;

  for (const a of tokens.artists) {
    const normA = normalizeTokenComparison(a);
    if (!normA) continue;
    const words = normA.split(" ").filter(w => w.length >= 3);
    if (
      itemArtist.includes(normA) ||
      normA.includes(itemArtist) ||
      (words.length > 0 && words.every(w => itemArtist.includes(w))) ||
      words.some(w => w.length >= 5 && itemArtist.includes(w))
    ) {
      score += 85;
      artistMatched = true;
      break;
    }
    if (itemAlbum && words.some(w => w.length >= 5 && itemAlbum.includes(w))) {
      score += 55;
      albumMatched = true;
      break;
    }
  }

  if (tokens.album) {
    const normAlb = normalizeTokenComparison(tokens.album);
    const albWords = normAlb.split(" ").filter(w => w.length >= 3);
    if (
      normAlb &&
      normAlb !== targetTitle &&
      (itemAlbum.includes(normAlb) ||
       itemTitle.includes(normAlb) ||
       itemArtist.includes(normAlb) ||
       albWords.some(w => w.length >= 5 && (itemAlbum.includes(w) || itemArtist.includes(w))))
    ) {
      score += 75;
      albumMatched = true;
    }
  }

  const itemDur = Number(item.duration || 0);
  if (durationSec > 0 && itemDur > 0) {
    const diff = Math.abs(durationSec - itemDur);
    if (diff <= 3) {
      score += 90;
      tightDurationMatch = true;
    } else if (diff <= 8) {
      score += 65;
    } else if (diff <= 15) {
      score += 25;
    } else if (diff > 28) {
      // Heavy penalty if duration is off by more than 28 seconds!
      score -= 140;
    }
  }

  // CRITICAL WRONG-LYRICS GUARD:
  // If we know the song's artist(s) or album, and this candidate matches NEITHER artist NOR album:
  // - If it doesn't even have a tight duration match (`<= 3s`), or if the title is short/generic, REJECT IT!
  const hasKnownContext = tokens.artists.length > 0 || Boolean(tokens.album);
  if (hasKnownContext && !artistMatched && !albumMatched) {
    if (!tightDurationMatch) {
      return -500;
    }
    if (targetTitle.split(" ").length <= 2) {
      // A 1- or 2-word title (like "Stay", "Premam", "Illuminati", "Home") with a different artist is almost certainly a different song even if duration is close!
      return -450;
    }
    score -= 60;
  }

  if (item.syncedLyrics && item.syncedLyrics !== "1") {
    if (/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/.test(item.syncedLyrics)) {
      score += 95;
    } else {
      score += 65;
    }
  } else if (item.plainLyrics) {
    score += 20;
  }

  if (preferRomanScript && (item.syncedLyrics || item.plainLyrics) && item.syncedLyrics !== "1") {
    const sampleText = String(item.syncedLyrics || item.plainLyrics || "")
      .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, " ")
      .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, " ");
    const latinCount = (sampleText.match(/[a-zA-Z]/g) || []).length;
    const nonLatinCount = (sampleText.match(/[\u0900-\u0d7f\u4e00-\u9fff]/g) || []).length;
    if (latinCount + nonLatinCount > 20) {
      const ratio = latinCount / (latinCount + nonLatinCount);
      if (ratio >= 0.70) score += 65;
    }
  }

  return score;
}

/**
 * WORLD-CLASS 7-VECTOR TRACK IDENTITY RESOLVER (`resolveWorldClassTrackIdentity`)
 * FIXED in v11.0:
 * Only adopts an Apple Music / Deezer / LRC.RED identity if it passes the strict context guard (`score >= 145`),
 * so `identity.canonicalArtist` is NEVER polluted by a same-titled song from a different artist!
 */
async function resolveWorldClassTrackIdentity(tokens, durationSec, explicitAppleId = "", explicitSpotifyId = "") {
  const memoKey = `id_v11__${tokens.primaryTitle.toLowerCase()}__${(tokens.artists[0] || "").toLowerCase()}__${tokens.album.toLowerCase()}__${durationSec}`;
  if (TRACK_IDENTITY_MEMO.has(memoKey)) {
    return TRACK_IDENTITY_MEMO.get(memoKey);
  }

  const queries = [];
  if (tokens.primaryTitle && tokens.artists[0]) queries.push(`${tokens.primaryTitle} ${tokens.artists[0]}`);
  if (tokens.primaryTitle && tokens.album) queries.push(`${tokens.primaryTitle} ${tokens.album}`);
  if (tokens.primaryTitle && tokens.artists[1]) queries.push(`${tokens.primaryTitle} ${tokens.artists[1]}`);
  if (tokens.secondaryTitle && tokens.secondaryTitle.length >= 3) {
    queries.push(`${tokens.secondaryTitle} ${tokens.artists[0] || tokens.album || ""}`.trim());
  }
  if (tokens.primaryTitle) queries.push(tokens.primaryTitle);

  const uniqueQueries = [...new Set(queries.filter(Boolean))].slice(0, 4);
  const primaryQ = uniqueQueries[0] || tokens.primaryTitle;

  const [
    explicitLookupRes,
    itunesSettled,
    paxsenixAppleSearchRes,
    lrcRedSearchRes,
    deezerSearchRes
  ] = await Promise.all([
    (explicitAppleId && /^\d+$/.test(String(explicitAppleId)))
      ? fetchWithTimeout(
          `https://itunes.apple.com/lookup?id=${encodeURIComponent(explicitAppleId)}&country=in`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          2500
        ).then(r => (r.ok ? r.json() : null)).catch(() => null)
      : Promise.resolve(null),

    Promise.allSettled([
      ...uniqueQueries.slice(0, 3).map(q =>
        fetchWithTimeout(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=8`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          2600
        ).then(r => (r.ok ? r.json() : null))
      ),
      fetchWithTimeout(
        `https://itunes.apple.com/search?term=${encodeURIComponent(primaryQ)}&country=us&media=music&entity=song&limit=6`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2600
      ).then(r => (r.ok ? r.json() : null))
    ]),

    fetchWithTimeout(
      `https://lyrics.paxsenix.org/apple-music/search?q=${encodeURIComponent(primaryQ)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2800
    ).then(r => (r.ok ? r.json() : null)).catch(() => null),

    fetchWithTimeout(
      `https://lrc.red/search.json?q=${encodeURIComponent(primaryQ)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2500
    ).then(r => (r.ok ? r.json() : null)).catch(() => null),

    fetchWithTimeout(
      `https://api.deezer.com/search?q=${encodeURIComponent(primaryQ)}&limit=5`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2400
    ).then(r => (r.ok ? r.json() : null)).catch(() => null)
  ]);

  const appleCandidates = [];
  const seenAppleIds = new Set();

  const pushAppleCand = (id, trackName, artistName, collectionName, durationMs, isrc = "", isExplicitId = false) => {
    if (!id || !trackName || seenAppleIds.has(String(id))) return;
    seenAppleIds.add(String(id));
    appleCandidates.push({
      trackId: String(id),
      trackName: cleanText(trackName),
      artistName: cleanText(artistName || ""),
      collectionName: cleanText(collectionName || ""),
      durationSec: durationMs ? Math.round(Number(durationMs) / 1000) : 0,
      isrc: isrc || "",
      isExplicitId
    });
  };

  if (explicitLookupRes?.results?.[0]) {
    const r = explicitLookupRes.results[0];
    pushAppleCand(r.trackId, r.trackName, r.artistName, r.collectionName, r.trackTimeMillis, "", true);
  }

  for (const res of itunesSettled) {
    if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
      for (const r of res.value.results) {
        pushAppleCand(r.trackId, r.trackName, r.artistName, r.collectionName, r.trackTimeMillis);
      }
    }
  }

  const paxList = Array.isArray(paxsenixAppleSearchRes)
    ? paxsenixAppleSearchRes
    : (Array.isArray(paxsenixAppleSearchRes?.results) ? paxsenixAppleSearchRes.results : (Array.isArray(paxsenixAppleSearchRes?.data) ? paxsenixAppleSearchRes.data : []));
  for (const item of paxList) {
    const id = item?.id || item?.trackId || item?.attributes?.playParams?.id;
    const name = item?.trackName || item?.name || item?.title || item?.attributes?.name;
    const art = item?.artistName || item?.artist || item?.attributes?.artistName;
    const alb = item?.albumName || item?.collectionName || item?.album || item?.attributes?.albumName;
    const durMs = item?.durationInMillis || item?.duration || item?.trackTimeMillis || item?.attributes?.durationInMillis || 0;
    const isrc = item?.isrc || item?.attributes?.isrc || "";
    pushAppleCand(id, name, art, alb, durMs > 1000 ? durMs : durMs * 1000, isrc);
  }

  const scoredApple = [];
  for (const c of appleCandidates) {
    if (c.isExplicitId) {
      scoredApple.push({ cand: c, score: 500 });
      continue;
    }
    const sc = scoreLrcCandidate(
      {
        trackName: c.trackName,
        artistName: c.artistName,
        albumName: c.collectionName,
        duration: c.durationSec,
        syncedLyrics: "1"
      },
      tokens,
      durationSec,
      false
    );
    // Require high confidence (`sc >= 145`) so we never lock onto a wrong Apple Music track ID!
    if (sc >= 145) {
      scoredApple.push({ cand: c, score: sc });
    }
  }
  scoredApple.sort((a, b) => b.score - a.score);

  let resolvedIsrc = scoredApple[0]?.cand?.isrc || "";
  const lrcRedIsrcs = [];

  if (Array.isArray(lrcRedSearchRes?.hits)) {
    for (const hit of lrcRedSearchRes.hits) {
      const sc = scoreLrcCandidate(
        {
          trackName: hit.title,
          artistName: hit.artist,
          albumName: hit.album || "",
          duration: hit.duration ? Math.round(Number(hit.duration) / 1000) : 0,
          syncedLyrics: "1"
        },
        tokens,
        durationSec,
        false
      );
      if (sc >= 145 && hit.isrc) {
        lrcRedIsrcs.push(String(hit.isrc));
        if (!resolvedIsrc) resolvedIsrc = String(hit.isrc);
      }
    }
  }

  let deezerCanonical = null;
  if (Array.isArray(deezerSearchRes?.data)) {
    for (const dz of deezerSearchRes.data) {
      const sc = scoreLrcCandidate(
        {
          trackName: dz.title_short || dz.title,
          artistName: dz.artist?.name || "",
          albumName: dz.album?.title || "",
          duration: dz.duration || 0,
          syncedLyrics: "1"
        },
        tokens,
        durationSec,
        false
      );
      if (sc >= 145) {
        if (!resolvedIsrc && dz.isrc) resolvedIsrc = String(dz.isrc);
        if (dz.isrc && !lrcRedIsrcs.includes(String(dz.isrc))) lrcRedIsrcs.push(String(dz.isrc));
        deezerCanonical = {
          title: cleanText(dz.title_short || dz.title || ""),
          artist: cleanText(dz.artist?.name || ""),
          album: cleanText(dz.album?.title || ""),
          durationSec: dz.duration || durationSec
        };
        break;
      }
    }
  }

  const bestApple = scoredApple[0]?.cand || null;
  const allAppleIds = scoredApple.slice(0, 3).map(x => x.cand.trackId);
  if (explicitAppleId && !allAppleIds.includes(String(explicitAppleId))) {
    allAppleIds.unshift(String(explicitAppleId));
  }

  const cleanCanonicalTitle = bestApple
    ? (extractCoreTrackTitle(bestApple.trackName) || bestApple.trackName)
    : (deezerCanonical?.title || tokens.primaryTitle);

  const cleanCanonicalAlbum = bestApple
    ? bestApple.collectionName
        .replace(/\s*\((?:original\s+motion\s+picture\s+soundtrack|deluxe|special\s+edition).*?\)/gi, "")
        .replace(/\s*-\s*(?:Single|EP|Original Motion Picture Soundtrack)$/i, "")
        .trim()
    : (deezerCanonical?.album || tokens.album);

  const identity = {
    appleTrackId: allAppleIds[0] || null,
    appleTrackIds: allAppleIds,
    spotifyTrackId: explicitSpotifyId || null,
    isrc: resolvedIsrc || null,
    isrcList: [...new Set([resolvedIsrc, ...lrcRedIsrcs].filter(Boolean))].slice(0, 3),
    canonicalTitle: cleanCanonicalTitle || tokens.primaryTitle,
    fullAppleTitle: bestApple?.trackName || cleanCanonicalTitle || tokens.primaryTitle,
    canonicalArtist: bestApple?.artistName || deezerCanonical?.artist || tokens.artists[0] || "",
    primaryAppleArtist: cleanText(String(bestApple?.artistName || deezerCanonical?.artist || tokens.artists[0] || "").split(/[,&]/)[0]),
    canonicalAlbum: cleanCanonicalAlbum || tokens.album,
    canonicalDuration: bestApple?.durationSec || deezerCanonical?.durationSec || durationSec
  };

  setBoundedMemo(TRACK_IDENTITY_MEMO, memoKey, identity);
  return identity;
}

async function fetchPaxsenixAppleLyrics(identity, tokens, durationSec) {
  const appleIds = identity?.appleTrackIds || (identity?.appleTrackId ? [identity.appleTrackId] : []);
  if (appleIds.length === 0) return null;

  const title = identity?.canonicalTitle || tokens.primaryTitle;
  const artist = identity?.canonicalArtist || tokens.artists[0] || "";
  const dur = durationSec || identity?.canonicalDuration || 0;

  const trySingleAppleId = async (appleId) => {
    const [ttmlRes, jsonRes] = await Promise.allSettled([
      fetchWithTimeout(
        `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(appleId)}&ttml=true&v=2`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        5200
      ),
      fetchWithTimeout(
        `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(appleId)}`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        5200
      )
    ]);

    if (ttmlRes.status === "fulfilled" && ttmlRes.value.ok) {
      const rawTtml = await ttmlRes.value.text();
      if (rawTtml.includes("<p")) {
        const lines = parseTtmlToTimeline(rawTtml, dur, title, artist);
        if (validateFetchedLyricsTimeline(lines, dur)) {
          return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
        }
      }
      try {
        const parsedTtmlJson = JSON.parse(rawTtml);
        const xmlStr = parsedTtmlJson?.ttml || parsedTtmlJson?.data?.ttml || parsedTtmlJson?.content;
        if (typeof xmlStr === "string" && xmlStr.includes("<p")) {
          const lines = parseTtmlToTimeline(xmlStr, dur, title, artist);
          if (validateFetchedLyricsTimeline(lines, dur)) {
            return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
          }
        }
        const sylLines = parsePaxsenixAppleJsonToTimeline(parsedTtmlJson, dur, title, artist);
        if (validateFetchedLyricsTimeline(sylLines, dur)) {
          return { lines: sylLines, source: "AppleMusicDirectSyllableProvider", syncType: "WORD" };
        }
      } catch {}
    }

    if (jsonRes.status === "fulfilled" && jsonRes.value.ok) {
      const rawText = await jsonRes.value.text();
      if (rawText.includes("<p")) {
        const lines = parseTtmlToTimeline(rawText, dur, title, artist);
        if (validateFetchedLyricsTimeline(lines, dur)) {
          return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
        }
      }
      const parsedJson = JSON.parse(rawText);
      const sylLines = parsePaxsenixAppleJsonToTimeline(parsedJson, dur, title, artist);
      if (validateFetchedLyricsTimeline(sylLines, dur)) {
        return { lines: sylLines, source: "AppleMusicDirectSyllableProvider", syncType: "WORD" };
      }
    }

    throw new Error("No Apple lyrics for ID");
  };

  try {
    return await Promise.any(appleIds.slice(0, 3).map(id => trySingleAppleId(id)));
  } catch {
    return null;
  }
}

async function fetchLyricsPlusAppleCluster(identity, tokens, durationSec, sources = "apple,lyricsplus,musixmatch-word,musixmatch,spotify") {
  const queryTitle = identity?.canonicalTitle || tokens.primaryTitle;
  const queryArtist = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const queryAlbum = identity?.canonicalAlbum || tokens.album || "";
  const queryDur = durationSec || identity?.canonicalDuration || 0;

  if (!queryTitle || !queryArtist) return null;

  const v2QsWithAlb = new URLSearchParams({
    title: queryTitle,
    artist: queryArtist,
    album: queryAlbum,
    duration: String(queryDur),
    source: sources
  });

  const v2QsNoAlb = new URLSearchParams({
    title: queryTitle,
    artist: queryArtist,
    duration: String(queryDur),
    source: sources
  });

  const ttmlQs = new URLSearchParams({
    title: queryTitle,
    artist: queryArtist,
    duration: String(queryDur)
  });

  const tryMirror = async (baseUrl) => {
    const [v2Res, v2NoAlbRes, ttmlRes] = await Promise.allSettled([
      fetchWithTimeout(`${baseUrl}/v2/lyrics/get?${v2QsWithAlb.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" }
      }, 4200),
      queryAlbum
        ? fetchWithTimeout(`${baseUrl}/v2/lyrics/get?${v2QsNoAlb.toString()}`, {
            headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" }
          }, 4200)
        : Promise.reject(new Error("Skip")),
      fetchWithTimeout(`${baseUrl}/v1/ttml/get?${ttmlQs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 4200)
    ]);

    for (const candidateRes of [v2Res, v2NoAlbRes]) {
      if (candidateRes.status === "fulfilled" && candidateRes.value.ok) {
        const data = await candidateRes.value.json();
        const parsed = parseLyricsPlusJsonToTimeline(data, queryDur, queryTitle, queryArtist);
        if (parsed && parsed.lines.length >= 2) {
          return {
            lines: parsed.lines,
            hasTrueWordSync: parsed.hasTrueWordSync,
            source: `AppleLyricsPlus (${parsed.upstreamSource})`
          };
        }
      }
    }

    if (ttmlRes.status === "fulfilled" && ttmlRes.value.ok) {
      const raw = await ttmlRes.value.text();
      if (raw.includes("<p")) {
        const lines = parseTtmlToTimeline(raw, queryDur, queryTitle, queryArtist);
        if (validateFetchedLyricsTimeline(lines, queryDur)) {
          return { lines, hasTrueWordSync: true, source: "AppleLyricsPlusTtml" };
        }
      }
      try {
        const j = JSON.parse(raw);
        if (typeof j?.ttml === "string" && j.ttml.includes("<p")) {
          const lines = parseTtmlToTimeline(j.ttml, queryDur, queryTitle, queryArtist);
          if (validateFetchedLyricsTimeline(lines, queryDur)) {
            return { lines, hasTrueWordSync: true, source: "AppleLyricsPlusTtml" };
          }
        }
      } catch {}
    }

    throw new Error("Miss");
  };

  try {
    return await Promise.any(LYRICSPLUS_MIRRORS.slice(0, 5).map(m => tryMirror(m)));
  } catch {
    return null;
  }
}

async function fetchExternalAppleTtmlProviders(identity, tokens, durationSec) {
  const title = identity?.canonicalTitle || tokens.primaryTitle;
  const artist = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const album = identity?.canonicalAlbum || tokens.album || "";
  const dur = durationSec || identity?.canonicalDuration || 0;
  const isrcList = identity?.isrcList || (identity?.isrc ? [identity.isrc] : []);

  if (!title && isrcList.length === 0) return null;

  const tasks = [];

  for (const isrc of isrcList.slice(0, 2)) {
    tasks.push((async () => {
      const res = await fetchWithTimeout(`https://lrc.red/s/${encodeURIComponent(isrc)}.ttml`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 3600);
      if (!res.ok) throw new Error("No LRC.RED TTML");
      const xml = await res.text();
      if (xml.includes("<p")) {
        const lines = parseTtmlToTimeline(xml, dur, title, artist);
        if (validateFetchedLyricsTimeline(lines, dur)) return { lines, source: "AppleMusicLrcRedTtml", syncType: "WORD" };
      }
      throw new Error("Invalid TTML");
    })());
  }

  if (title && artist) {
    for (const unisonHost of ["https://unison.boidu.dev", "https://unison.betterlyrics.org"]) {
      tasks.push((async () => {
        const qs = new URLSearchParams({ song: title, artist });
        if (album) qs.set("album", album);
        if (dur > 0) qs.set("duration", String(dur));
        if (isrcList[0]) qs.set("isrc", isrcList[0]);

        const res = await fetchWithTimeout(`${unisonHost}/lyrics?${qs.toString()}`, {
          headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
        }, 3800);
        if (!res.ok) throw new Error("Unison miss");
        const text = await res.text();
        if (text.includes("<p")) {
          const lines = parseTtmlToTimeline(text, dur, title, artist);
          if (validateFetchedLyricsTimeline(lines, dur)) return { lines, source: "AppleMusicUnisonTtml", syncType: "WORD" };
        }
        const data = JSON.parse(text);
        const ttml = data?.ttml || data?.lyrics || data?.data?.ttml;
        if (typeof ttml === "string" && ttml.includes("<p")) {
          const lines = parseTtmlToTimeline(ttml, dur, title, artist);
          if (validateFetchedLyricsTimeline(lines, dur)) return { lines, source: "AppleMusicUnisonTtml", syncType: "WORD" };
        }
        if (typeof ttml === "string" && /\[\d{1,3}:\d{2}/.test(ttml)) {
          const parsed = parseLrcToTimeline(ttml, dur, title, artist);
          if (validateFetchedLyricsTimeline(parsed.lines, dur)) {
            return { lines: parsed.lines, source: "UnisonSyncedLrc", syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED" };
          }
        }
        throw new Error("No Unison TTML");
      })());
    }

    tasks.push((async () => {
      const qs = new URLSearchParams({ s: title, a: artist, title, artist });
      if (album) {
        qs.set("al", album);
        qs.set("album", album);
      }
      if (dur > 0) {
        qs.set("d", String(dur));
        qs.set("duration", String(dur));
      }
      const res = await fetchWithTimeout(`https://lyrics-api.boidu.dev/getLyrics?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 3600);
      if (!res.ok) throw new Error("Miss");
      const data = await res.json();
      const ttml = data?.ttml || data?.lyrics;
      if (typeof ttml === "string" && ttml.includes("<p")) {
        const lines = parseTtmlToTimeline(ttml, dur, title, artist);
        if (validateFetchedLyricsTimeline(lines, dur)) return { lines, source: "AppleMusicBetterLyricsTtml", syncType: "WORD" };
      }
      throw new Error("No TTML");
    })());

    tasks.push((async () => {
      const qs = new URLSearchParams({ track: title, artist });
      if (album) qs.set("album", album);
      const res = await fetchWithTimeout(`https://lyrics-api.binimum.org/?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 3600);
      if (!res.ok) throw new Error("Miss");
      const text = await res.text();
      if (text.includes("<p")) {
        const lines = parseTtmlToTimeline(text, dur, title, artist);
        if (validateFetchedLyricsTimeline(lines, dur)) return { lines, source: "AppleMusicBiniTtml", syncType: "WORD" };
      }
      const json = JSON.parse(text);
      const ttmlContent = json?.ttml || json?.lyrics || json?.results?.[0]?.ttml;
      if (typeof ttmlContent === "string" && ttmlContent.includes("<p")) {
        const lines = parseTtmlToTimeline(ttmlContent, dur, title, artist);
        if (validateFetchedLyricsTimeline(lines, dur)) return { lines, source: "AppleMusicBiniTtml", syncType: "WORD" };
      }
      throw new Error("No Bini TTML");
    })());
  }

  try {
    return await Promise.any(tasks);
  } catch {
    return null;
  }
}

async function searchLrclibCandidates(tokens, durationSec, identity = null) {
  const headers = { "User-Agent": `${WORKER_NAME}/${WORKER_VERSION} (https://projectvelo.tjcodewizard.workers.dev)` };
  const urls = [];

  const titleA = identity?.canonicalTitle || tokens.primaryTitle;
  const artistA = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const albumA = identity?.canonicalAlbum || tokens.album || "";
  const isrcList = identity?.isrcList || (identity?.isrc ? [identity.isrc] : []);

  if (titleA && artistA) {
    const getQsNoAlb = new URLSearchParams({ track_name: titleA, artist_name: artistA });
    if (durationSec > 0) getQsNoAlb.set("duration", String(durationSec));
    urls.push(`https://lrclib.net/api/get?${getQsNoAlb.toString()}`);
    urls.push(`https://api.lrcmux.dev/compat/lrclib/api/get?${getQsNoAlb.toString()}`);

    urls.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(titleA)}&artist_name=${encodeURIComponent(artistA)}`);
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${titleA} ${artistA}`)}`);
  }

  if (tokens.primaryTitle && tokens.artists[0] && (`${tokens.primaryTitle} ${tokens.artists[0]}` !== `${titleA} ${artistA}`)) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.artists[0]}`)}`);
  }
  if (tokens.primaryTitle && tokens.album) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.album}`)}`);
  }
  if (titleA && !artistA) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(titleA)}`);
  }

  const uniqueUrls = [...new Set(urls)].slice(0, 6);

  const [settled, lrcRedLrcSettled] = await Promise.all([
    Promise.allSettled(
      uniqueUrls.map(u =>
        fetchWithTimeout(u, { headers }, 4200).then(r => (r.ok ? r.json() : null))
      )
    ),
    isrcList.length > 0
      ? Promise.allSettled(
          isrcList.slice(0, 2).map(isrc =>
            fetchWithTimeout(`https://lrc.red/s/${encodeURIComponent(isrc)}.lrc`, { headers }, 3400)
              .then(r => (r.ok ? r.text() : null))
          )
        )
      : Promise.resolve([])
  ]);

  const seenIds = new Set();
  const allCandidates = [];

  for (const res of settled) {
    if (res.status === "fulfilled" && res.value) {
      const list = Array.isArray(res.value) ? res.value : [res.value];
      for (const item of list) {
        if (item && (item.syncedLyrics || item.plainLyrics)) {
          const cid = String(item.id || `${item.trackName}_${item.artistName}_${item.duration}`);
          if (!seenIds.has(cid)) {
            seenIds.add(cid);
            allCandidates.push(item);
          }
        }
      }
    }
  }

  for (const r of lrcRedLrcSettled) {
    if (r.status === "fulfilled" && typeof r.value === "string" && /\[\d{1,3}:\d{2}/.test(r.value)) {
      allCandidates.push({
        id: `lrcred_${isrcList[0]}`,
        trackName: titleA,
        artistName: artistA,
        albumName: albumA,
        duration: durationSec,
        syncedLyrics: r.value,
        plainLyrics: r.value.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, "").trim()
      });
    }
  }

  if (allCandidates.length === 0) return { bestSynced: null, bestPlain: null };

  const enrichedTokens = {
    ...tokens,
    primaryTitle: titleA || tokens.primaryTitle,
    artists: [...new Set([artistA, identity?.canonicalArtist, ...tokens.artists].filter(Boolean))],
    album: albumA || tokens.album
  };

  // Require `score >= 120` (which enforces artist/album/duration context match via `scoreLrcCandidate`)
  const scored = allCandidates
    .map(item => ({ item, score: scoreLrcCandidate(item, enrichedTokens, durationSec, true) }))
    .filter(x => x.score >= 120)
    .sort((a, b) => b.score - a.score);

  const bestSynced = scored.find(x => x.item.syncedLyrics)?.item || null;
  const bestPlain = scored.find(x => x.item.plainLyrics)?.item || null;

  return { bestSynced, bestPlain };
}

async function fetchSpotifyAndMusixmatchFallback(identity, tokens, durationSec) {
  const lpSpotify = await fetchLyricsPlusAppleCluster(
    identity,
    tokens,
    durationSec,
    "musixmatch-word,spotify,musixmatch"
  );
  if (lpSpotify && lpSpotify.lines.length >= 2) {
    return {
      lines: lpSpotify.lines,
      syncType: lpSpotify.hasTrueWordSync ? "WORD" : "LINE_ENHANCED",
      source: lpSpotify.source
    };
  }

  try {
    let spId = identity?.spotifyTrackId || "";
    const title = identity?.canonicalTitle || tokens.primaryTitle;
    const artist = identity?.primaryAppleArtist || tokens.artists[0] || "";
    if (!spId && title && artist) {
      const sRes = await fetchWithTimeout(
        `https://lyrics.paxsenix.org/spotify/search?q=${encodeURIComponent(`${title} ${artist}`.trim())}`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2800
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const hits = Array.isArray(sData) ? sData : (sData?.results || sData?.tracks || []);
        for (const h of hits.slice(0, 4)) {
          const hArt = Array.isArray(h.artists) ? h.artists.map(a => a.name).join(", ") : (h.artist || "");
          const sc = scoreLrcCandidate(
            {
              trackName: h.name || h.title,
              artistName: hArt,
              albumName: h.album?.name || "",
              duration: h.duration_ms ? Math.round(h.duration_ms / 1000) : 0,
              syncedLyrics: "1"
            },
            tokens,
            durationSec,
            false
          );
          if (sc >= 140 && h.id) {
            spId = String(h.id);
            break;
          }
        }
      }
    }
    if (spId) {
      const lRes = await fetchWithTimeout(
        `https://lyrics.paxsenix.org/spotify/lyrics?id=${encodeURIComponent(spId)}`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        3200
      );
      if (lRes.ok) {
        const lData = await lRes.json();
        const lines = parsePaxsenixAppleJsonToTimeline(lData, durationSec, title, artist);
        if (validateFetchedLyricsTimeline(lines, durationSec)) {
          return { lines, syncType: "LINE_ENHANCED", source: "SpotifyDirectSyncedProvider" };
        }
      }
    }
  } catch {}

  return null;
}

async function searchNeteaseAndKugouLyrics(tokens, durationSec, identity = null) {
  const title = identity?.canonicalTitle || tokens.primaryTitle;
  const artist = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const query = [title, artist || tokens.album || ""].filter(Boolean).join(" ").trim();
  if (!query) return null;

  try {
    const searchUrl = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(query)}&type=1&offset=0&limit=6`;
    const searchRes = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Referer": "https://music.163.com/"
      }
    }, 3200);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const songs = searchData?.result?.songs || [];
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

      if (bestSong && bestScore >= 135) {
        const lrcRes = await fetchWithTimeout(`https://music.163.com/api/song/lyric?id=${bestSong.id}&lv=1&kv=1&tv=-1&yv=1`, {
          headers: {
            "User-Agent": SAAVN_HEADERS["User-Agent"],
            "Referer": "https://music.163.com/"
          }
        }, 3200);

        if (lrcRes.ok) {
          const lrcJson = await lrcRes.json();
          const rawYrc = lrcJson?.yrc?.lyric || "";
          if (rawYrc && rawYrc.length > 30) {
            const yrcLines = parseNeteaseYrcToTimeline(rawYrc, durationSec, title, artist);
            if (validateFetchedLyricsTimeline(yrcLines, durationSec)) {
              return { source: "NetEaseVerbatimYrcProvider", syncType: "WORD", lines: yrcLines };
            }
          }
          const rawLrc = lrcJson?.lrc?.lyric || "";
          if (rawLrc && rawLrc.length >= 25) {
            const parsed = parseLrcToTimeline(rawLrc, durationSec, title, artist);
            if (validateFetchedLyricsTimeline(parsed.lines, durationSec)) {
              return {
                source: "NetEaseLrcProvider",
                syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
                lines: parsed.lines
              };
            }
          }
        }
      }
    }
  } catch {}

  try {
    const durMs = (durationSec || 200) * 1000;
    const kgSearchRes = await fetchWithTimeout(
      `http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(query)}&duration=${durMs}&hash=`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2800
    );
    if (kgSearchRes.ok) {
      const kgData = await kgSearchRes.json();
      const candidates = Array.isArray(kgData?.candidates) ? kgData.candidates : [];
      for (const cand of candidates.slice(0, 3)) {
        const sc = scoreLrcCandidate(
          {
            trackName: cand.song || title,
            artistName: cand.singer || "",
            albumName: "",
            duration: cand.duration ? Math.round(cand.duration / 1000) : durationSec,
            syncedLyrics: "1"
          },
          tokens,
          durationSec,
          false
        );
        if (sc >= 135 && cand.id && cand.accesskey) {
          const dlRes = await fetchWithTimeout(
            `http://lyrics.kugou.com/download?ver=1&client=pc&id=${cand.id}&accesskey=${cand.accesskey}&fmt=lrc&charset=utf8`,
            { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
            2800
          );
          if (dlRes.ok) {
            const dlJson = await dlRes.json();
            if (dlJson?.content) {
              const rawLrc = decodeURIComponent(escape(atob(dlJson.content)));
              const parsed = parseLrcToTimeline(rawLrc, durationSec, title, artist);
              if (validateFetchedLyricsTimeline(parsed.lines, durationSec)) {
                return {
                  source: "KugouLrcProvider",
                  syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
                  lines: parsed.lines
                };
              }
            }
          }
          break;
        }
      }
    }
  } catch {}

  return null;
}

function buildUnifiedLyricsResponse({
  source,
  syncType = "WORD",
  songId = null,
  trackName,
  artistName,
  albumName = "",
  appleTrackId = null,
  isrc = null,
  duration,
  isSynced = true,
  isAutoTimed = false,
  lines
}) {
  const vocalLines = lines.filter(l => l && !l.isInstrumental);
  const isInstrumentalOnly = vocalLines.length === 0;
  const cleanPlainRoman = (vocalLines.length > 0 ? vocalLines : lines)
    .map(l => l.romanizedText || l.text)
    .join("\n");
  const cleanPlainNative = (vocalLines.length > 0 ? vocalLines : lines)
    .map(l => l.nativeText || l.text)
    .join("\n");

  const hasDualScript = vocalLines.some(l => l.nativeText && l.romanizedText && l.nativeText !== l.romanizedText);

  const nativeLines = lines.map(l => ({
    ...l,
    text: l.nativeText || l.text,
    words: l.nativeWords || l.words
  }));

  const bilingualLines = lines.map(l => ({
    ...l,
    text: l.bilingualText || l.text
  }));

  const standardLrc = buildStandardLrcFromTimeline(lines, false);
  const nativeStandardLrc = buildStandardLrcFromTimeline(lines, true);
  const enhancedLrc = buildEnhancedLrcFromTimeline(lines);
  const lyricsPlusCompat = buildLyricsPlusCompatiblePayload(lines);

  const cleanTrack = trackName || "OpenMuse";
  const cleanArtist = artistName || "OpenMuse";
  const cleanAlbum = albumName || cleanTrack;
  const numericDur = Number(duration) || 185;
  const numericOrStringId = Number(appleTrackId || songId) || String(songId || appleTrackId || "1");

  const lrclibStandardObj = {
    id: numericOrStringId,
    name: cleanTrack,
    trackName: cleanTrack,
    artistName: cleanArtist,
    albumName: cleanAlbum,
    duration: numericDur,
    instrumental: isInstrumentalOnly,
    plainLyrics: cleanPlainRoman,
    syncedLyrics: standardLrc || "",
    enhancedLyrics: enhancedLrc || standardLrc || ""
  };

  return {
    ...lrclibStandardObj,
    source,
    syncType,
    wordSynced: true,
    hasDualScript,
    appleTrackId,
    isrc,
    isSynced,
    isAutoTimed,
    nativeSyncedLyrics: nativeStandardLrc || null,
    nativePlainLyrics: cleanPlainNative,
    lrclib: lrclibStandardObj,
    lines,
    romanizedLines: lines,
    nativeLines,
    bilingualLines,
    type: "Word",
    lyrics: lyricsPlusCompat
  };
}

async function resolveRealtimeLyrics(url, request = null) {
  let songId = url.searchParams.get("id") || url.searchParams.get("pid") || "";
  let explicitAppleId = url.searchParams.get("appleId") || "";
  let explicitSpotifyId = url.searchParams.get("spotifyId") || "";
  let trackName = url.searchParams.get("trackName") || url.searchParams.get("track_name") || url.searchParams.get("title") || "";
  let artistName = url.searchParams.get("artistName") || url.searchParams.get("artist_name") || url.searchParams.get("artist") || "";
  let albumName = url.searchParams.get("albumName") || url.searchParams.get("album_name") || url.searchParams.get("album") || "";
  let durationSec = parseInt(url.searchParams.get("duration") || "0", 10) || 0;
  const rawQ = url.searchParams.get("q") || "";
  let extraArtists = [];

  if (songId.startsWith("apple:") && !explicitAppleId) {
    explicitAppleId = songId.replace(/^apple:/, "");
  }
  if (songId.startsWith("spotify:") && !explicitSpotifyId) {
    explicitSpotifyId = songId.replace(/^spotify:/, "");
  }

  if (songId) {
    const memoSong = SONG_META_MEMO.get(String(songId));
    if (memoSong) {
      if (!explicitAppleId && memoSong.appleId) explicitAppleId = String(memoSong.appleId);
      if (!explicitSpotifyId && memoSong.spotifyId) explicitSpotifyId = String(memoSong.spotifyId);
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

  if (request && (trackName || songId)) {
    recordClientTrackInteraction(request, url, {
      id: songId,
      appleId: explicitAppleId,
      spotifyId: explicitSpotifyId,
      title: trackName,
      artist: artistName,
      allArtists: extraArtists
    });
  }

  const tokens = extractLyricsSearchTokens(trackName || rawQ, artistName, albumName, extraArtists);

  // STAGE 1: Strict 7-Vector Track Identification
  const identity = await resolveWorldClassTrackIdentity(tokens, durationSec, explicitAppleId, explicitSpotifyId);
  if (identity) {
    if (!durationSec && identity.canonicalDuration) {
      durationSec = identity.canonicalDuration;
    }
    if (identity.primaryAppleArtist && !tokens.artists.includes(identity.primaryAppleArtist)) {
      tokens.artists.unshift(identity.primaryAppleArtist);
    }
  }

  // STAGE 2 (TIER 1 — APPLE MUSIC HEAVY): Query All Apple Music Providers + LRCLIB Concurrently
  const [
    paxAppleHit,
    lpAppleHit,
    extTtmlHit,
    lrcResult
  ] = await Promise.all([
    fetchPaxsenixAppleLyrics(identity, tokens, durationSec),
    fetchLyricsPlusAppleCluster(identity, tokens, durationSec, "apple,lyricsplus,musixmatch-word"),
    fetchExternalAppleTtmlProviders(identity, tokens, durationSec),
    searchLrclibCandidates(tokens, durationSec, identity)
  ]);

  const appleHits = [
    lpAppleHit ? { ...lpAppleHit, syncType: lpAppleHit.hasTrueWordSync ? "WORD" : "LINE_ENHANCED" } : null,
    paxAppleHit,
    extTtmlHit ? { ...extTtmlHit, syncType: extTtmlHit.syncType || "WORD" } : null
  ].filter(h => h && Array.isArray(h.lines) && validateFetchedLyricsTimeline(h.lines, durationSec));

  if (appleHits.length > 0) {
    appleHits.sort((a, b) => {
      const aHasDual = a.lines.some(l => l.nativeText && l.romanizedText && l.nativeText !== l.romanizedText) ? 40 : 0;
      const bHasDual = b.lines.some(l => l.nativeText && l.romanizedText && l.nativeText !== l.romanizedText) ? 40 : 0;
      const aScore = (a.syncType === "WORD" ? 100 : 50) + aHasDual + Math.min(80, a.lines.length);
      const bScore = (b.syncType === "WORD" ? 100 : 50) + bHasDual + Math.min(80, b.lines.length);
      return bScore - aScore;
    });
    const bestAppleHit = appleHits[0];

    return buildUnifiedLyricsResponse({
      source: bestAppleHit.source,
      syncType: bestAppleHit.syncType || "WORD",
      songId,
      trackName: identity?.canonicalTitle || tokens.primaryTitle,
      artistName: identity?.canonicalArtist || tokens.artists[0] || artistName,
      albumName: identity?.canonicalAlbum || tokens.album || albumName,
      appleTrackId: identity?.appleTrackId || null,
      isrc: identity?.isrc || null,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: bestAppleHit.lines
    });
  }

  // STAGE 3 (TIER 2 — LRCLIB SYNCED & ENHANCED LRC):
  if (lrcResult?.bestSynced?.syncedLyrics) {
    const winner = lrcResult.bestSynced;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const parsed = parseLrcToTimeline(
      winner.syncedLyrics,
      effectiveDur,
      winner.trackName || tokens.primaryTitle,
      winner.artistName || artistName
    );
    if (validateFetchedLyricsTimeline(parsed.lines, effectiveDur)) {
      return buildUnifiedLyricsResponse({
        source: parsed.hasEnhancedWordTags ? "LrcLibEnhancedWordProvider" : "LrcLibRealtimeWordSyncProvider",
        syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
        songId: winner.id || songId,
        trackName: winner.trackName || identity?.canonicalTitle || tokens.primaryTitle,
        artistName: winner.artistName || identity?.canonicalArtist || artistName,
        albumName: winner.albumName || identity?.canonicalAlbum || tokens.album || albumName,
        appleTrackId: identity?.appleTrackId || null,
        isrc: identity?.isrc || null,
        duration: effectiveDur,
        isSynced: true,
        isAutoTimed: false,
        lines: parsed.lines
      });
    }
  }

  // STAGE 4 (TIER 2B — SPOTIFY, MUSIXMATCH, NETEASE YRC/LRC, KUGOU LRC):
  const [spotifyMxmHit, neteaseKugouHit] = await Promise.all([
    fetchSpotifyAndMusixmatchFallback(identity, tokens, durationSec),
    searchNeteaseAndKugouLyrics(tokens, durationSec, identity)
  ]);

  if (spotifyMxmHit && validateFetchedLyricsTimeline(spotifyMxmHit.lines, durationSec)) {
    return buildUnifiedLyricsResponse({
      source: spotifyMxmHit.source,
      syncType: spotifyMxmHit.syncType || "LINE_ENHANCED",
      songId,
      trackName: identity?.canonicalTitle || tokens.primaryTitle,
      artistName: identity?.canonicalArtist || tokens.artists[0] || artistName,
      albumName: identity?.canonicalAlbum || tokens.album || albumName,
      appleTrackId: identity?.appleTrackId || null,
      isrc: identity?.isrc || null,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: spotifyMxmHit.lines
    });
  }

  if (neteaseKugouHit && validateFetchedLyricsTimeline(neteaseKugouHit.lines, durationSec)) {
    return buildUnifiedLyricsResponse({
      source: neteaseKugouHit.source,
      syncType: neteaseKugouHit.syncType || "WORD",
      songId,
      trackName: identity?.canonicalTitle || tokens.primaryTitle,
      artistName: identity?.canonicalArtist || tokens.artists[0] || artistName,
      albumName: identity?.canonicalAlbum || tokens.album || albumName,
      appleTrackId: identity?.appleTrackId || null,
      isrc: identity?.isrc || null,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: neteaseKugouHit.lines
    });
  }

  // STAGE 5 (TIER 3 — LRCLIB PLAIN LYRICS -> TEMPO-ADAPTIVE WORD SYNC):
  if (lrcResult?.bestPlain?.plainLyrics) {
    const winner = lrcResult.bestPlain;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const plainLines = buildEstimatedTimelineFromPlain(
      winner.plainLyrics,
      effectiveDur,
      winner.trackName || tokens.primaryTitle,
      winner.artistName || artistName
    );
    if (plainLines.length >= 2) {
      return buildUnifiedLyricsResponse({
        source: "LrcLibCadenceSyncProvider",
        syncType: "CADENCE_ESTIMATED",
        songId: winner.id || songId,
        trackName: winner.trackName || identity?.canonicalTitle || tokens.primaryTitle,
        artistName: winner.artistName || identity?.canonicalArtist || artistName,
        albumName: winner.albumName || identity?.canonicalAlbum || tokens.album || albumName,
        appleTrackId: identity?.appleTrackId || null,
        isrc: identity?.isrc || null,
        duration: effectiveDur,
        isSynced: true,
        isAutoTimed: true,
        lines: plainLines
      });
    }
  }

  const fallbackLines = buildInstrumentalFallbackTimeline(
    identity?.canonicalTitle || tokens.primaryTitle || trackName,
    identity?.canonicalArtist || artistName,
    durationSec || 185
  );
  return buildUnifiedLyricsResponse({
    source: "ProjectVeloBeatSyncFallback",
    syncType: "CADENCE_ESTIMATED",
    songId,
    trackName: identity?.canonicalTitle || tokens.primaryTitle || trackName || "OpenMuse",
    artistName: identity?.canonicalArtist || artistName || "OpenMuse",
    albumName: identity?.canonicalAlbum || tokens.album || albumName,
    appleTrackId: identity?.appleTrackId || null,
    isrc: identity?.isrc || null,
    duration: durationSec || 185,
    isSynced: true,
    isAutoTimed: true,
    lines: fallbackLines
  });
}

// ============================================================================
// DEDICATED OFFLINE SONG DOWNLOAD ENGINE (`/download`)
// ============================================================================

function sanitizeDownloadFilename(str) {
  return cleanText(str || "Track")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

async function handleOfflineSongDownload(request, url, ctx) {
  const quality = resolveRequestedAudioQuality(request, url);
  const inlineMode = url.searchParams.get("inline") === "1" || url.searchParams.get("mode") === "blob";
  const metaOnly = url.searchParams.get("meta") === "1" || url.searchParams.get("format") === "json";

  let songId = (url.searchParams.get("id") || url.searchParams.get("pid") || "").trim();
  let title = cleanText(url.searchParams.get("title") || url.searchParams.get("trackName") || "");
  let artist = cleanText(url.searchParams.get("artist") || url.searchParams.get("artistName") || "");
  let album = cleanText(url.searchParams.get("album") || "");
  let cover = "";

  if (songId && SONG_META_MEMO.has(songId)) {
    const memo = SONG_META_MEMO.get(songId);
    if (!title) title = memo.title || "";
    if (!artist) artist = memo.artist || "";
    if (!album) album = memo.album || "";
    cover = memo.coverUrl || memo.image || "";
  }

  if (metaOnly && songId) {
    const songRes = await handleOneHopPlay(request, url, ctx, true);
    return jsonResponse(songRes || { error: "Could not resolve download metadata" });
  }

  const playRes = await handleOneHopPlay(request, url, ctx, false);
  if (!playRes || (!playRes.ok && playRes.status !== 206)) {
    return playRes;
  }

  if (!title && songId && SONG_META_MEMO.has(songId)) {
    const memo = SONG_META_MEMO.get(songId);
    title = memo.title || "Track";
    artist = memo.artist || "Artist";
    album = memo.album || "Muse";
    cover = memo.coverUrl || memo.image || "";
  }

  const dlHeaders = new Headers(playRes.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) dlHeaders.set(k, v);

  const resolvedBr = dlHeaders.get("X-Resolved-Bitrate") || `${quality}kbps`;
  const contentType = dlHeaders.get("Content-Type") || "audio/mp4";
  const ext = contentType.includes("mpeg") ? "mp3" : (contentType.includes("webm") ? "webm" : "m4a");
  const safeFileName = `${sanitizeDownloadFilename(artist ? `${artist} - ${title}` : title)} (${resolvedBr}).${ext}`;

  dlHeaders.set(
    "Content-Disposition",
    `${inlineMode ? "inline" : "attachment"}; filename="${safeFileName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`
  );
  dlHeaders.set("Cache-Control", "public, max-age=604800, immutable");
  if (title) dlHeaders.set("X-Track-Title", encodeURIComponent(title));
  if (artist) dlHeaders.set("X-Track-Artist", encodeURIComponent(artist));
  if (album) dlHeaders.set("X-Track-Album", encodeURIComponent(album));
  if (cover) dlHeaders.set("X-Track-Cover", encodeURIComponent(cover));

  return new Response(playRes.body, {
    status: playRes.status,
    headers: dlHeaders
  });
}

// ============================================================================
// MAIN WORKER ROUTER (ProjectVelo v11.0.0)
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
        const quality = resolveRequestedAudioQuality(request, url);
        return await handleSmartStream(request, target, url.origin, ctx, false, quality);
      }

      if (path === "/play") {
        return await handleOneHopPlay(request, url, ctx, false);
      }

      if (path === "/video" || path === "/mv" || path === "/videosong") {
        return await handleVideoEndpoint(request, url, ctx);
      }

      if (path === "/download") {
        return await handleOfflineSongDownload(request, url, ctx);
      }

      if (path === "/import" || path === "/playlist/import") {
        return await handleUniversalPlaylistImport(request, url, ctx);
      }

      if (path === "/suggest" || path === "/search/suggestions") {
        return await handleSearchSuggestions(request, url);
      }

      if (path === "/quality") {
        const profile = getOrCreateClientProfile(request, url);
        const setQ = url.searchParams.get("set") || url.searchParams.get("quality");
        if (setQ) {
          profile.preferredQuality = resolveRequestedAudioQuality(request, new URL(`${url.origin}/quality?quality=${encodeURIComponent(setQ)}`));
        }
        return jsonResponse({
          status: "ok",
          defaultQuality: "320kbps",
          activeQuality: `${profile.preferredQuality}kbps`,
          availableQualities: [
            { id: "320", label: "320kbps (Highest Resolution — Default)", bitrate: 320, codec: "AAC_LC" },
            { id: "160", label: "160kbps (Standard High Quality)", bitrate: 160, codec: "AAC_LC" },
            { id: "96", label: "96kbps (Data Saver)", bitrate: 96, codec: "AAC_LC" },
            { id: "auto", label: "Auto (Network Adaptive)", bitrate: "adaptive", codec: "AAC_LC" }
          ]
        });
      }

      if (path === "/taste") {
        const profile = getOrCreateClientProfile(request, url);
        if (request.method === "POST") {
          try {
            const body = await request.json();
            if (Array.isArray(body?.tracks)) {
              for (const t of body.tracks) recordClientTrackInteraction(request, url, t);
            } else if (body?.track) {
              recordClientTrackInteraction(request, url, body.track);
            }
          } catch {}
        }
        return jsonResponse({
          status: "ok",
          preferredQuality: `${profile.preferredQuality}kbps`,
          topAffinityArtists: getTopClientAffinityArtists(profile, 10),
          recentSeedTracks: profile.recentSeedTracks,
          playedTracksCount: profile.playedTrackIds.length
        });
      }

      if (path === "/lyrics" || path === "/lrclib" || path === "/lyrics/lrc") {
        return await withEdgeCache(request, ctx, 3600, async () => {
          const lyricsData = await resolveRealtimeLyrics(url, request);
          const rawFormat = (url.searchParams.get("format") || "").toLowerCase();
          if (path === "/lyrics/lrc" || rawFormat === "raw_lrc" || rawFormat === "lrc_text") {
            return new Response(lyricsData.syncedLyrics || lyricsData.plainLyrics || "", {
              status: 200,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": "text/plain; charset=utf-8",
                "X-Lyrics-Source": lyricsData.source || "ProjectVelo"
              }
            });
          }
          return jsonResponse(lyricsData, 200, {
            "X-Lyrics-Source": lyricsData.source || "ProjectVelo",
            "X-Lyrics-Sync-Type": lyricsData.syncType || "WORD",
            "X-Worker-Engine": `${WORKER_NAME}/${WORKER_VERSION}`
          });
        }, "v11-projectvelo-lyrics");
      }

      if (path === "/album") {
        const albumId = url.searchParams.get("id") || url.searchParams.get("albumid") || url.searchParams.get("token") || url.searchParams.get("url");
        const quality = resolveRequestedAudioQuality(request, url);
        return await withEdgeCache(request, ctx, 1800, async () => {
          const data = await resolveCompleteAlbum(albumId, url.origin, quality);
          return jsonResponse(data);
        }, "v11-projectvelo-album");
      }

      if (path === "/song") {
        const pids = url.searchParams.get("id") || url.searchParams.get("pids");
        if (!pids) return jsonResponse({ error: "Missing ?id= parameter" }, 400);
        const quality = resolveRequestedAudioQuality(request, url);
        return await withEdgeCache(request, ctx, 1800, async () => {
          const pidStr = String(pids);
          if (pidStr.startsWith("apple:") || pidStr.startsWith("spotify:") || pidStr.startsWith("ytm:") || pidStr.startsWith("curated:")) {
            const memo = SONG_META_MEMO.get(pidStr);
            let title = memo?.title || url.searchParams.get("title") || "";
            let artist = memo?.artist || url.searchParams.get("artist") || "";
            let album = memo?.album || url.searchParams.get("album") || "";
            let appleId = pidStr.startsWith("apple:") ? pidStr.slice(6) : (memo?.appleId || "");
            let spotifyId = pidStr.startsWith("spotify:") ? pidStr.split(":").pop() : (memo?.spotifyId || "");
            let ytVideoId = pidStr.startsWith("ytm:") ? pidStr.slice(4) : (memo?.ytVideoId || "");

            if ((!title || !artist) && appleId && /^\d+$/.test(appleId)) {
              const lookupRes = await fetchWithTimeout(
                `https://itunes.apple.com/lookup?id=${encodeURIComponent(appleId)}&country=in`,
                { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
                2800
              );
              if (lookupRes.ok) {
                const lj = await lookupRes.json();
                const hit = lj?.results?.[0];
                if (hit) {
                  title = cleanText(hit.trackName || title);
                  artist = cleanText(hit.artistName || artist);
                  album = cleanText(hit.collectionName || album);
                }
              }
            } else if ((!title || !artist) && spotifyId) {
              const spEnt = await fetchSpotifyEmbedEntity("track", spotifyId, 3000);
              if (spEnt) {
                title = spEnt.title || title;
                artist = spEnt.artist || artist;
              }
            }

            const q = `${extractCoreTrackTitle(title)} ${String(artist || "").split(/[,&]/)[0]}`.trim();
            const sData = await fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "8", p: "1", q }).catch(() => null);
            const pool = await batchHealMissingMediaUrls(sData?.results || []);
            const curatedItem = {
              appleId,
              spotifyId,
              ytVideoId,
              trackName: title || "Track",
              artistName: artist,
              collectionName: album,
              artworkUrl100: memo?.image || ""
            };
            // Only use `findBestSaavnMatchForCuratedTrack` (do NOT blindly fallback to `pool[0]` if it doesn't match!)
            const matched = findBestSaavnMatchForCuratedTrack(curatedItem, pool);
            const bridged = buildCuratedBridgedSongObject(curatedItem, matched, url.origin, quality);

            // If unavailable on JioSaavn, pre-warm Secondary High-Res Audio from YouTube Music!
            if (!matched) {
              const secAudio = await resolveSecondaryHighResAudioStream({
                title: bridged.title,
                artist: bridged.artist,
                album: bridged.album,
                durationSec: bridged.duration,
                ytVideoId,
                preferredQuality: quality
              });
              if (secAudio?.streamUrl) {
                bridged.decrypted_media_url = secAudio.streamUrl;
                bridged.streamUrl = `${url.origin}/stream?url=${encodeURIComponent(secAudio.streamUrl)}&quality=${quality}`;
                bridged.audioSource = secAudio.provider;
                if (!bridged.image && secAudio.thumbnailUrl) {
                  bridged.image = secAudio.thumbnailUrl;
                  bridged.coverUrl = proxyImg(secAudio.thumbnailUrl, url.origin);
                }
              }
            }

            return jsonResponse({ songs: [bridged], track: bridged });
          }

          const data = await fetchSaavnJson({ __call: "song.getDetails", pids });
          const rawList = Array.isArray(data?.songs)
            ? data.songs
            : Object.values(data || {}).filter(v => v && typeof v === "object" && v.id);
          const songs = rawList.map(s => enrichSaavnSong(s, url.origin, null, quality));
          return jsonResponse({ songs, track: songs[0] || null });
        }, "v11-projectvelo-song");
      }

      if (path === "/reco" || path === "/queue/recommendations") {
        const pid = url.searchParams.get("id") || url.searchParams.get("pid") || url.searchParams.get("title");
        if (!pid) return jsonResponse({ error: "Missing ?id=<songId> or ?title=<songTitle>" }, 400);
        const recoData = await fetchSpotifyAdaptiveRecommendations(request, url, ctx);
        return jsonResponse(recoData, 200, {
          "X-Reco-Source": "SpotifyAdaptiveRecommendationEngine"
        });
      }

      if (path === "/home") {
        return await withEdgeCache(request, ctx, 900, async () => {
          const langParam = url.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu";
          const homeData = await fetchSpotifyAndAppleHomeFeed(langParam, url.origin, request, url, ctx);
          return jsonResponse(homeData, 200, {
            "X-Home-Source": "SpotifyAndAppleMusicCharts"
          });
        }, "v11-projectvelo-home");
      }

      if (path === "/search") {
        return await handleSearchRoute(request, url, ctx);
      }

      return jsonResponse({
        service: `${WORKER_NAME} v${WORKER_VERSION} — Primary JioSaavn 320kbps + Secondary YouTube Music High-Res Audio + Official 4K/1080p Video-Only Streamer + High-Precision Apple/LRCLIB Word-Sync Engine`,
        repository: "ProjectVelo",
        status: "online",
        defaultAudioQuality: "320kbps (Highest Resolution)",
        endpoints: {
          stream: `${url.origin}/stream?url=<target>&quality=320|160|96|auto`,
          play: `${url.origin}/play?id=<songId>&appleId=<appleTrackId>&spotifyId=<spotifyTrackId>&title=<title>&artist=<artist>&quality=320|160|96`,
          video: `${url.origin}/video?id=<songId>&title=<title>&artist=<artist>&audio=0&mode=redirect|stream|json`,
          download: `${url.origin}/download?id=<songId>&title=<title>&artist=<artist>&quality=320|160|96`,
          import: `${url.origin}/import?url=<Spotify_AppleMusic_or_YouTubeMusic_Playlist_URL>`,
          lyrics: `${url.origin}/lyrics?id=<songId>&appleId=<appleTrackId>&trackName=<title>&artistName=<artist>&albumName=<album>&duration=<sec>`,
          lrclib: `${url.origin}/lrclib?trackName=<title>&artistName=<artist>&duration=<sec>`,
          reco: `${url.origin}/reco?id=<songId>&limit=10`,
          home: `${url.origin}/home?lang=english,hindi,malayalam,tamil,telugu`,
          search: `${url.origin}/search?q=<query>&format=json`,
          suggest: `${url.origin}/suggest?q=<query>`,
          quality: `${url.origin}/quality?set=320|160|96|auto`,
          taste: `${url.origin}/taste`,
          album: `${url.origin}/album?id=<albumId_or_Spotify_or_Apple_URL>`,
          song: `${url.origin}/song?id=<songId>&quality=320|160|96`
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

/**
 * One-Hop Play Resolver (`handleOneHopPlay`)
 * Upgraded in v11.0:
 * 1. Primary Source: JioSaavn 320kbps AAC/MP4 (verified via `findBestSaavnMatchForCuratedTrack` so wrong songs are never played).
 * 2. Secondary High-Res Audio Source: YouTube Music / Piped / Invidious Official Master Audio (`audio/mp4` / `audio/webm` highest bitrate)
 *    for any song unavailable on JioSaavn!
 */
async function handleOneHopPlay(request, url, ctx, returnMetaOnly = false) {
  const quality = resolveRequestedAudioQuality(request, url);
  const songId = (url.searchParams.get("id") || url.searchParams.get("pid") || "").trim();
  const appleId = (url.searchParams.get("appleId") || (songId.startsWith("apple:") ? songId.slice(6) : "")).trim();
  const spotifyId = (url.searchParams.get("spotifyId") || (songId.startsWith("spotify:") ? songId.split(":").pop() : "")).trim();
  const ytVideoId = (url.searchParams.get("ytVideoId") || (songId.startsWith("ytm:") ? songId.slice(4) : "")).trim();
  let rawMediaUrl = (url.searchParams.get("url") || "").trim();
  let title = (url.searchParams.get("title") || url.searchParams.get("trackName") || "").trim();
  let artist = (url.searchParams.get("artist") || url.searchParams.get("artistName") || "").trim();
  let album = (url.searchParams.get("album") || "").trim();
  let durationSec = parseInt(url.searchParams.get("duration") || "0", 10) || 0;

  if (rawMediaUrl && (rawMediaUrl.includes("/play?") || rawMediaUrl.includes("/download?"))) {
    rawMediaUrl = "";
  }

  if (songId && SONG_META_MEMO.has(songId)) {
    const memo = SONG_META_MEMO.get(songId);
    if (memo.decrypted_media_url && !memo.decrypted_media_url.includes("/play?")) {
      rawMediaUrl = memo.decrypted_media_url;
    }
    if (!title) title = memo.title || "";
    if (!artist) artist = memo.artist || "";
    if (!album) album = memo.album || "";
    if (!durationSec && memo.duration) durationSec = memo.duration;
  }

  if (songId && !songId.startsWith("apple:") && !songId.startsWith("spotify:") && !songId.startsWith("ytm:") && !songId.startsWith("curated:") && !rawMediaUrl) {
    try {
      const data = await fetchSaavnJson({ __call: "song.getDetails", pids: songId });
      const rawSong = data?.[songId] || data?.songs?.[0] || Object.values(data || {})[0];
      if (rawSong) {
        const enriched = enrichSaavnSong(rawSong, url.origin, null, quality);
        if (enriched.decrypted_media_url && !enriched.decrypted_media_url.includes("/play?")) {
          rawMediaUrl = enriched.decrypted_media_url;
        }
        if (!title) title = enriched.title;
        if (!artist) artist = enriched.artist;
        if (!durationSec) durationSec = enriched.duration;
        if (returnMetaOnly) return enriched;
      }
    } catch {}
  }

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
          if (!durationSec && hit.trackTimeMillis) durationSec = Math.round(hit.trackTimeMillis / 1000);
        }
      }
    } catch {}
  } else if ((!title || !artist) && spotifyId) {
    const spEnt = await fetchSpotifyEmbedEntity("track", spotifyId, 2800);
    if (spEnt) {
      if (!title) title = spEnt.title || "";
      if (!artist) artist = spEnt.artist || "";
      if (!durationSec && spEnt.tracks?.[0]?.durationSec) durationSec = spEnt.tracks[0].durationSec;
    }
  }

  if (title || songId) {
    recordClientTrackInteraction(request, url, { id: songId, appleId, spotifyId, title, artist });
  }

  if (rawMediaUrl) {
    const streamRes = await handleSmartStream(request, rawMediaUrl, url.origin, ctx, true, quality);
    if (streamRes && (streamRes.status === 200 || streamRes.status === 206)) {
      return streamRes;
    }
  }

  // TIER 1: Search JioSaavn with Strict Verification (`findBestSaavnMatchForCuratedTrack`)
  const tokens = extractLyricsSearchTokens(title, artist, album);
  const queriesToTry = [
    [tokens.primaryTitle, tokens.artists[0] || ""].filter(Boolean).join(" ").trim(),
    [tokens.primaryTitle, tokens.album || ""].filter(Boolean).join(" ").trim()
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
      const rawPool = await batchHealMissingMediaUrls(searchData?.results || []);
      const verifiedMatch = findBestSaavnMatchForCuratedTrack(
        {
          trackName: title,
          artistName: artist,
          collectionName: album,
          durationSec
        },
        rawPool
      );

      if (verifiedMatch) {
        const cand = enrichSaavnSong(verifiedMatch, url.origin, null, quality);
        if (cand.decrypted_media_url && !cand.decrypted_media_url.includes("/play?")) {
          if (returnMetaOnly) return cand;
          const healedStream = await handleSmartStream(request, cand.decrypted_media_url, url.origin, ctx, true, quality);
          if (healedStream && (healedStream.status === 200 || healedStream.status === 206)) {
            if (appleId) setBoundedMemo(SONG_META_MEMO, `apple:${appleId}`, cand);
            if (spotifyId) setBoundedMemo(SONG_META_MEMO, `spotify:${spotifyId}`, cand);
            if (songId) setBoundedMemo(SONG_META_MEMO, songId, cand);
            return healedStream;
          }
        }
      }
    } catch {}
  }

  // TIER 2: Secondary High-Resolution Audio Engine (YouTube Music / Piped / Invidious Master Audio)
  // Triggered when the track is unavailable on JioSaavn!
  const secondaryAudio = await resolveSecondaryHighResAudioStream({
    title,
    artist,
    album,
    durationSec,
    ytVideoId,
    preferredQuality: quality
  });

  if (secondaryAudio && secondaryAudio.streamUrl) {
    if (returnMetaOnly) {
      return {
        id: songId || `ytm:${secondaryAudio.videoId}`,
        title: title || secondaryAudio.title,
        artist: artist || secondaryAudio.uploader,
        album: album || title,
        duration: secondaryAudio.duration || durationSec,
        audioSource: secondaryAudio.provider,
        audioQuality: secondaryAudio.bitrate,
        decrypted_media_url: secondaryAudio.streamUrl,
        streamUrl: `${url.origin}/stream?url=${encodeURIComponent(secondaryAudio.streamUrl)}`
      };
    }

    const secRes = await handleSmartStream(request, secondaryAudio.streamUrl, url.origin, ctx, true, quality);
    if (secRes && (secRes.status === 200 || secRes.status === 206)) {
      const h = new Headers(secRes.headers);
      h.set("X-Audio-Source", secondaryAudio.provider || "YouTubeMusicHighRes");
      h.set("X-Resolved-Bitrate", secondaryAudio.bitrate || "160kbps");
      return new Response(secRes.body, { status: secRes.status, headers: h });
    }
  }

  return jsonResponse({
    error: "StreamUnavailable",
    message: "Official high-resolution stream could not be resolved from primary or secondary audio providers."
  }, 404);
}

async function handleSmartStream(request, targetUrl, origin, ctx, returnNullOnFail = false, preferredQuality = "320") {
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

    if (
      callType === "content.getTrending" ||
      callType === "content.getHomepageData" ||
      callType === "content.getCharts" ||
      callType === "content.getFeaturedPlaylists" ||
      callType === "webapi.getLaunchData"
    ) {
      return await withEdgeCache(request, ctx, 900, async () => {
        const lang = parsedTarget.searchParams.get("entity_language") || parsedTarget.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu";
        const homeData = await fetchSpotifyAndAppleHomeFeed(lang, origin, request, new URL(request.url), ctx);
        if (callType === "content.getTrending") {
          return jsonResponse([...homeData.songs, ...homeData.albums], 200, {
            "X-Home-Source": "SpotifyAndAppleMusicIntercepted"
          });
        }
        return jsonResponse(homeData, 200, {
          "X-Home-Source": "SpotifyAndAppleMusicIntercepted"
        });
      }, "v11-projectvelo-stream-home");
    }

    if (callType === "content.getAlbumDetails" || callType === "playlist.getDetails") {
      const albumId = parsedTarget.searchParams.get("albumid") || parsedTarget.searchParams.get("listid") || parsedTarget.searchParams.get("id");
      return await withEdgeCache(request, ctx, 1800, async () => {
        const enrichedAlbum = await resolveCompleteAlbum(albumId, origin, preferredQuality);
        return jsonResponse(enrichedAlbum);
      }, "v11-projectvelo-stream-album");
    }

    if (callType === "reco.getreco") {
      const pid = parsedTarget.searchParams.get("pid") || "";
      const recoUrl = new URL(`${origin}/reco?id=${encodeURIComponent(pid)}&limit=10`);
      const recoData = await fetchSpotifyAdaptiveRecommendations(request, recoUrl, ctx);
      return jsonResponse(recoData.songs, 200, {
        "X-Reco-Source": "SpotifyAdaptiveIntercepted"
      });
    }

    if (callType === "search.getResults" || callType === "search.getAlbumResults" || callType === "song.getDetails") {
      return await withEdgeCache(request, ctx, 900, async () => {
        if (callType === "search.getResults") {
          const userQ = parsedTarget.searchParams.get("q") || "";
          const hybrid = await executeIntelligentHybridSearch(userQ, origin, request, new URL(request.url), ctx);
          return jsonResponse({
            total: hybrid.songs.length,
            start: 1,
            results: hybrid.songs,
            songs: hybrid.songs,
            albums: hybrid.albums
          });
        }

        const res = await fetchWithTimeout(parsedTarget.toString(), { headers: SAAVN_HEADERS }, 5500);
        const text = (await res.text()).trim();
        const start = text.indexOf("{");
        const clean = start > 0 ? text.slice(start, text.lastIndexOf("}") + 1) : text;
        const data = JSON.parse(clean);

        if (callType === "search.getAlbumResults" && Array.isArray(data.results)) {
          data.results = data.results.map(a => enrichSaavnAlbum(a, origin));
        } else if (callType === "song.getDetails") {
          for (const key of Object.keys(data)) {
            if (data[key] && typeof data[key] === "object" && data[key].id) {
              data[key] = enrichSaavnSong(data[key], origin, null, preferredQuality);
            }
          }
          if (Array.isArray(data.songs)) {
            data.songs = data.songs.map(s => enrichSaavnSong(s, origin, null, preferredQuality));
          }
        }
        return jsonResponse(data);
      }, "v11-projectvelo-stream-api");
    }
  }

  const isImage = /\.(jpg|jpeg|png|webp|svg|avif)(\?.*)?$/i.test(parsedTarget.pathname)
    || host.includes("c.saavncdn.com")
    || host.includes("sop.saavncdn.com")
    || host.includes("mzstatic.com")
    || host.includes("scdn.co")
    || host.includes("spotifycdn.com")
    || host.includes("ytimg.com");

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
        "Referer": host.includes("mzstatic.com")
          ? "https://music.apple.com/"
          : (host.includes("scdn.co") || host.includes("spotifycdn.com") ? "https://open.spotify.com/" : "https://www.jiosaavn.com/")
      }
    }, 5000);

    if (imgRes.ok && imgRes.body) {
      const imgHeaders = new Headers(CORS_HEADERS);
      imgHeaders.set("Content-Type", imgRes.headers.get("Content-Type") || "image/jpeg");
      imgHeaders.set("Cache-Control", "public, max-age=604800, immutable");
      imgHeaders.set("X-Cache-Status", "MISS");

      const [streamForCache, streamForClient] = imgRes.body.tee();
      if (ctx) {
        ctx.waitUntil(cache.put(cacheKey, new Response(streamForCache, { status: 200, headers: imgHeaders })));
      }
      return new Response(streamForClient, { status: 200, headers: imgHeaders });
    }
  }

  const isSaavnCdn = host.includes("saavncdn.com");
  const isGoogleVideoCdn = host.includes("googlevideo.com");
  const isFullFileFetch = request.method === "GET" && !request.headers.has("Range") && !isGoogleVideoCdn;
  const cache = caches.default;

  const rawTargetStr = parsedTarget.toString();
  const edgeAudioCacheKey = new Request(`https://edge-audio.projectvelo.workers.dev/audio?u=${encodeURIComponent(rawTargetStr)}&q=${preferredQuality}`, {
    method: "GET"
  });

  if (isFullFileFetch) {
    try {
      const cachedAudio = await cache.match(edgeAudioCacheKey);
      if (cachedAudio && cachedAudio.ok) {
        const hitHeaders = new Headers(cachedAudio.headers);
        for (const [k, v] of Object.entries(CORS_HEADERS)) hitHeaders.set(k, v);
        hitHeaders.set("X-Cache-Status", "HIT");
        return new Response(cachedAudio.body, { status: 200, headers: hitHeaders });
      }
    } catch {}
  }

  const upstreamHeaders = new Headers({
    "User-Agent": SAAVN_HEADERS["User-Agent"],
    "Accept": request.headers.get("Accept") || "*/*",
    "Referer": isSaavnCdn ? "https://www.jiosaavn.com/" : (isGoogleVideoCdn ? "https://www.youtube.com/" : (parsedTarget.origin + "/"))
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

  const memoKey = `${rawTargetStr}__${preferredQuality}`;
  const memoizedWorkingUrl = WORKING_STREAM_MEMO.get(memoKey);
  const candidateUrls = memoizedWorkingUrl
    ? [memoizedWorkingUrl, ...buildSaavnBitrateCascade(rawTargetStr, preferredQuality)]
    : buildSaavnBitrateCascade(rawTargetStr, preferredQuality);

  let upstreamRes = null;
  let usedUrl = rawTargetStr;

  for (const candidate of [...new Set(candidateUrls)]) {
    usedUrl = candidate;
    try {
      const attemptRes = await fetchWithTimeout(candidate, {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: upstreamHeaders,
        redirect: "follow"
      }, 6800);

      if (attemptRes.ok || attemptRes.status === 206) {
        const contentLen = parseInt(attemptRes.headers.get("content-length") || "99999", 10);
        if (contentLen > 1024 || request.method === "HEAD") {
          upstreamRes = attemptRes;
          if (candidateUrls.length > 1) {
            setBoundedMemo(WORKING_STREAM_MEMO, memoKey, candidate);
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
    } else if (!resHeaders.has("Content-Type")) {
      resHeaders.set("Content-Type", "audio/mp4");
    }
  }

  resHeaders.delete("content-encoding");
  resHeaders.set("Cache-Control", "public, max-age=604800, immutable");

  if (!resHeaders.has("accept-ranges")) {
    resHeaders.set("Accept-Ranges", "bytes");
  }
  resHeaders.set("X-Worker-Engine", `${WORKER_NAME}/${WORKER_VERSION}`);
  resHeaders.set("X-Upstream-Status", String(upstreamRes.status));
  resHeaders.set("X-Upstream-Url", upstreamRes.url || usedUrl);
  resHeaders.set("X-Audio-Quality", `${preferredQuality}kbps`);
  resHeaders.set("X-Audio-Source", isSaavnCdn ? "JioSaavn320kbps" : "SecondaryHighResStream");

  const bitrateMatch = usedUrl.match(/_(320|160|96)(_p)?\.(mp4|mp3)/i);
  if (bitrateMatch) {
    resHeaders.set("X-Resolved-Bitrate", `${bitrateMatch[1]}kbps`);
  } else {
    resHeaders.set("X-Resolved-Bitrate", `${preferredQuality}kbps`);
  }

  if (isFullFileFetch && upstreamRes.status === 200 && upstreamRes.body && ctx) {
    const [bodyForEdge, bodyForClient] = upstreamRes.body.tee();
    ctx.waitUntil(
      cache.put(edgeAudioCacheKey, new Response(bodyForEdge, { status: 200, headers: resHeaders })).catch(() => {})
    );
    return new Response(bodyForClient, {
      status: 200,
      statusText: upstreamRes.statusText,
      headers: resHeaders
    });
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
      const searchPayload = await executeIntelligentHybridSearch(q, url.origin, request, url, ctx);
      return jsonResponse(searchPayload);
    }, "v11-projectvelo-search");
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const writeLine = async (obj) => writer.write(encoder.encode(JSON.stringify(obj) + "\n"));

  ctx.waitUntil((async () => {
    try {
      const { songs, albums } = await executeIntelligentHybridSearch(q, url.origin, request, url, ctx);

      for (const s of songs) {
        await writeLine({ event: "TrackDetails", source_name: "ProjectVeloSpotifyAppleSaavnBridge", data: s });
      }
      for (const a of albums) {
        await writeLine({ event: "AlbumDetails", source_name: "ProjectVeloSpotifyAppleSaavnBridge", data: a });
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

async function withEdgeCache(request, ctx, ttlSeconds, computeFn, cacheNamespace = "v11-projectvelo") {
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
    if (ctx) {
      ctx.waitUntil(cache.put(cacheKey, cloned));
    }
    return new Response(freshRes.body, { status: 200, headers: cacheHeaders });
  }

  return freshRes;
}

// --- END OF FILE worker(v11).js ---
