// --- START OF FILE worker.js ---

const WORKER_NAME = "ProjectVelo";
const WORKER_VERSION = "9.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Worker-Engine, X-Upstream-Status, X-Upstream-Url, X-Cache-Status, X-Resolved-Bitrate, X-Lyrics-Source, X-Lyrics-Sync-Type, X-Home-Source"
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

// Verified active 2026 LyricsPlus / KPOE mirrors
const LYRICSPLUS_MIRRORS = [
  "https://lyricsplus.prjktla.my.id",
  "https://lyricsplus.prjktla.workers.dev",
  "https://lyricsplus.atomix.one",
  "https://lyricsplus.binimum.org"
];

// Official Spotify Editorial & Chart Playlists for Zero-Auth Embed Extraction
const SPOTIFY_HOME_PLAYLISTS = {
  global_top: { id: "37i9dQZEVXbMDoHDwVN2tF", title: "Spotify Top 50 — Global", artist: "Spotify Charts" },
  india_top: { id: "37i9dQZEVXbLZ52XmnySJg", title: "Spotify Top 50 — India", artist: "Spotify Charts" },
  todays_hits: { id: "37i9dQZF1DXcBWIGoYBM5M", title: "Today's Top Hits", artist: "Spotify Editorial" },
  hindi_hits: { id: "37i9dQZF1DX0XUfTFmNBRM", title: "Hot Hits Hindi", artist: "Spotify India" },
  tamil_hits: { id: "37i9dQZF1DWY4xHQp97fN6", title: "Hot Hits Tamil", artist: "Spotify India" },
  malayalam_hits: { id: "37i9dQZF1DWTwzVdyRpXm1", title: "Hot Hits Malayalam", artist: "Spotify India" },
  telugu_hits: { id: "37i9dQZF1DWWwrjLPC16W7", title: "Hot Hits Telugu", artist: "Spotify India" },
  punjabi_hits: { id: "37i9dQZF1DWXVJK4aT7pmk", title: "Hot Hits Punjabi", artist: "Spotify India" }
};

const WORKING_STREAM_MEMO = new Map();
const SONG_META_MEMO = new Map();
const TRACK_IDENTITY_MEMO = new Map();

function setBoundedMemo(map, key, value, maxEntries = 1000) {
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

// ============================================================================
// JIOSAAVN 320KBPS DES AUDIO DECRYPTION & BITRATE CASCADE
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
// UNICODE BRAHMIC (TAMIL / MALAYALAM / HINDI / TELUGU / KANNADA / BENGALI / PUNJABI)
// TO ENGLISH-WRITTEN (ROMANIZED) PHONEMIC TRANSLITERATION ENGINE
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

/**
 * Converts any Indian script string (Tamil, Malayalam, Hindi/Devanagari, Telugu,
 * Kannada, Bengali, Punjabi, Gujarati) into clean English-written (Romanized) phonetics.
 */
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
        // Anusvara / Chandrabindu: 'm' before labials (p..m) or at end of word, 'n' otherwise
        out += (nextOffset >= 0x2A && nextOffset <= 0x2E) || nextOffset === -1 ? "m" : "n";
      } else if (offset === 0x03) {
        out += "h";
      } else if (BRAHMIC_INDEPENDENT_VOWELS[offset]) {
        out += BRAHMIC_INDEPENDENT_VOWELS[offset];
      } else if (block === 0x0D00 && MALAYALAM_CHILLU[offset]) {
        out += MALAYALAM_CHILLU[offset];
      } else if (BRAHMIC_CONSONANTS[offset]) {
        let baseCons = BRAHMIC_CONSONANTS[offset];
        // Tamil-specific softened intervocalic/voiced adjustments for natural reading
        if (block === 0x0B80 && offset === 0x24) baseCons = "th";
        out += baseCons;

        // Check if followed by Virama/Pulli (0x4D) or Dependent Vowel Matra
        if (nextOffset === 0x4D) {
          i++; // Consume virama/pulli, suppress inherent 'a'
        } else if (BRAHMIC_DEPENDENT_VOWELS[nextOffset]) {
          out += BRAHMIC_DEPENDENT_VOWELS[nextOffset];
          i++; // Consume dependent vowel sign
        } else if (nextOffset === 0x3C) {
          // Nukta followed by matra/virama check
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
          // North Indian schwa deletion at end of multi-letter words (Devanagari/Punjabi/Bengali/Gujarati)
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

  return out
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// REMIX-AWARE SMART DEDUPLICATION & TRACK FINGERPRINTING ENGINE
// ============================================================================

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
    .replace(/\s*[\[(]\s*(?:from|movie|film|ost|original\s+motion\s+picture|soundtrack|motion\s+picture|featured\s+in)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*(?:from|movie|film|ost|original\s+motion\s+picture).*$/gi, " ")
    .replace(/\s*[\[(]\s*(?:official|audio|video|lyrical|full\s+song|full\s+video|hd|hq|hindi|tamil|telugu|malayalam|kannada|punjabi|bengali|english)\s*[\])]/gi, " ")
    .replace(/\s*[\[(][^)\]]*(?:remix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*[^-]*(?:remix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit).*$/gi, " ")
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

function enrichSaavnSong(s, origin, externalMeta = null) {
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

  const rawImg = externalMeta?.artworkUrl || s.image || s.coverUrl;
  const hiResImg = upgradeImage(rawImg);
  const titleClean = cleanText(externalMeta?.trackName || s.title || s.song || "Untitled");
  const albumTitle = cleanText(externalMeta?.collectionName || more.album || s.album || "OpenMuse");
  const albumId = more.album_id || s.album_id || null;
  const durationSec = parseInt(more.duration || s.duration || externalMeta?.durationSec || "0", 10) || 0;
  const appleId = externalMeta?.appleTrackId || s.appleId || null;
  const spotifyId = externalMeta?.spotifyTrackId || s.spotifyId || null;
  const idStr = String(s.id);
  const variantTag = extractTrackVariantTag(titleClean, albumTitle);

  const workerStream = directUrl
    ? `${origin}/stream?url=${encodeURIComponent(directUrl)}`
    : `${origin}/play?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${spotifyId ? `&spotifyId=${encodeURIComponent(spotifyId)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;

  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${spotifyId ? `&spotifyId=${encodeURIComponent(spotifyId)}` : ""}${directUrl ? `&url=${encodeURIComponent(directUrl)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&album=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${spotifyId ? `&spotifyId=${encodeURIComponent(spotifyId)}` : ""}&trackName=${encodeURIComponent(titleClean)}&artistName=${encodeURIComponent(primaryArtists)}&albumName=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;

  const cascade = directUrl ? buildSaavnBitrateCascade(directUrl) : [];

  const enrichedObj = {
    ...s,
    id: idStr,
    appleId: appleId ? String(appleId) : null,
    spotifyId: spotifyId ? String(spotifyId) : null,
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
    hasLyrics: true,
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
  if (appleId) setBoundedMemo(SONG_META_MEMO, `apple:${appleId}`, enrichedObj);
  if (spotifyId) setBoundedMemo(SONG_META_MEMO, `spotify:${spotifyId}`, enrichedObj);
  return enrichedObj;
}

function buildCuratedBridgedSongObject(curatedItem, matchedSaavnRaw, origin) {
  const appleTrackId = curatedItem.trackId || curatedItem.appleId ? String(curatedItem.trackId || curatedItem.appleId) : "";
  const spotifyTrackId = curatedItem.spotifyId ? String(curatedItem.spotifyId) : "";
  const trackName = cleanText(curatedItem.trackName || curatedItem.name || curatedItem.title || "Untitled");
  const artistName = cleanText(curatedItem.artistName || curatedItem.artist || "Unknown Artist");
  const collectionName = cleanText(curatedItem.collectionName || curatedItem.albumName || trackName);
  const durationSec = curatedItem.trackTimeMillis
    ? Math.round(curatedItem.trackTimeMillis / 1000)
    : (curatedItem.durationSec || 0);
  const artworkUrl = upgradeImage(curatedItem.artworkUrl100 || curatedItem.artworkUrl || matchedSaavnRaw?.image || "");

  if (matchedSaavnRaw) {
    return enrichSaavnSong(matchedSaavnRaw, origin, {
      appleTrackId: appleTrackId || null,
      spotifyTrackId: spotifyTrackId || null,
      trackName: matchedSaavnRaw.title && extractTrackVariantTag(matchedSaavnRaw.title) !== "standard"
        ? cleanText(matchedSaavnRaw.title)
        : trackName,
      artistName,
      collectionName,
      durationSec: parseInt(matchedSaavnRaw.more_info?.duration || matchedSaavnRaw.duration || String(durationSec), 10) || durationSec,
      artworkUrl: artworkUrl || matchedSaavnRaw.image
    });
  }

  const syntheticId = appleTrackId
    ? `apple:${appleTrackId}`
    : (spotifyTrackId ? `spotify:${spotifyTrackId}` : `curated:${encodeURIComponent(`${trackName}_${artistName}`)}`);

  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(syntheticId)}${appleTrackId ? `&appleId=${encodeURIComponent(appleTrackId)}` : ""}${spotifyTrackId ? `&spotifyId=${encodeURIComponent(spotifyTrackId)}` : ""}&title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(collectionName)}&duration=${durationSec}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(syntheticId)}${appleTrackId ? `&appleId=${encodeURIComponent(appleTrackId)}` : ""}${spotifyTrackId ? `&spotifyId=${encodeURIComponent(spotifyTrackId)}` : ""}&trackName=${encodeURIComponent(trackName)}&artistName=${encodeURIComponent(artistName)}&albumName=${encodeURIComponent(collectionName)}&duration=${durationSec}`;

  const bridgedObj = {
    id: syntheticId,
    appleId: appleTrackId || null,
    spotifyId: spotifyTrackId || null,
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

function findBestSaavnMatchForCuratedTrack(curatedItem, saavnPool) {
  if (!Array.isArray(saavnPool) || saavnPool.length === 0) return null;

  const targetTitleRaw = cleanText(curatedItem.trackName || curatedItem.name || curatedItem.title || "");
  const targetAlbumRaw = cleanText(curatedItem.collectionName || "");
  const targetCore = normalizeTokenComparison(extractCoreTrackTitle(targetTitleRaw) || targetTitleRaw);
  const targetVariant = extractTrackVariantTag(targetTitleRaw, targetAlbumRaw);
  const targetArtists = String(curatedItem.artistName || curatedItem.artist || "")
    .split(/[,&/|]/)
    .map(a => normalizeTokenComparison(a))
    .filter(Boolean);
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
    if (sCore === targetCore) {
      score += 100;
    } else if (sCore.includes(targetCore) || targetCore.includes(sCore)) {
      score += 75;
    } else {
      const aWords = targetCore.split(" ").filter(w => w.length >= 3);
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
    for (const aa of targetArtists) {
      const firstWord = aa.split(" ").find(w => w.length >= 3);
      if (sArtistStr.includes(aa) || (firstWord && firstWord.length >= 4 && sArtistStr.includes(firstWord))) {
        score += 65;
        artistMatched = true;
        break;
      }
    }

    const sDur = parseInt(s.more_info?.duration || s.duration || "0", 10) || 0;
    if (targetDur > 0 && sDur > 0) {
      const diff = Math.abs(targetDur - sDur);
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

  return bestScore >= 105 ? bestMatch : null;
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
// SPOTIFY + APPLE MUSIC HOMEPAGE & PLAYLIST ENGINE (ZERO JIOSAAVN TRENDING)
// ============================================================================

/**
 * Extracts tracks and cover artwork directly from a public Spotify Playlist Embed page
 * (`https://open.spotify.com/embed/playlist/{playlistId}`) with zero API keys required.
 */
async function fetchSpotifyEmbedPlaylist(playlistId, timeoutMs = 3500) {
  if (!playlistId) return { title: "", artist: "Spotify", image: "", tracks: [] };
  try {
    const embedUrl = `https://open.spotify.com/embed/playlist/${encodeURIComponent(playlistId)}`;
    const res = await fetchWithTimeout(embedUrl, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }, timeoutMs);
    if (!res.ok) return { title: "", artist: "Spotify", image: "", tracks: [] };
    const html = await res.text();

    const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)
      || html.match(/type="application\/json">([\s\S]*?)<\/script>/i);

    if (!nextDataMatch || !nextDataMatch[1]) {
      return { title: "", artist: "Spotify", image: "", tracks: [] };
    }

    const parsed = JSON.parse(nextDataMatch[1].trim());
    const entity = parsed?.props?.pageProps?.state?.data?.entity || parsed?.state?.data?.entity || {};
    const playlistTitle = cleanText(entity.name || entity.title || "Spotify Chart");
    const playlistImg = entity.coverArt?.sources?.[0]?.url || entity.images?.[0]?.url || "";
    const rawTracks = Array.isArray(entity.trackList) ? entity.trackList : [];

    const tracks = [];
    for (const item of rawTracks) {
      if (!item || !item.title) continue;
      const uriParts = String(item.uri || "").split(":");
      const spotifyId = uriParts.length >= 3 ? uriParts[2] : "";
      const cleanSubtitle = cleanText(String(item.subtitle || "").replace(/\u00a0/g, " "));
      tracks.push({
        spotifyId,
        trackName: cleanText(item.title),
        artistName: cleanSubtitle || "Spotify Artist",
        collectionName: playlistTitle,
        durationSec: item.duration ? Math.round(Number(item.duration) / 1000) : 0,
        artworkUrl: playlistImg
      });
    }

    return {
      id: `spotify:playlist:${playlistId}`,
      playlistId,
      title: playlistTitle,
      artist: "Spotify Charts",
      image: playlistImg,
      tracks
    };
  } catch {
    return { title: "", artist: "Spotify", image: "", tracks: [] };
  }
}

/**
 * Fetches Spotify's Public Global Chart JSON (`charts-spotify-com-service.spotify.com/public/v0/charts`)
 */
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

/**
 * Fetches Apple Music's Official Top Songs & Top Albums using the updated 2026 domain
 * (`https://rss.marketingtools.apple.com/api/v2/...` + `itunes.apple.com/in/rss/topsongs`).
 */
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

  // Fallback iTunes Legacy RSS JSON parser (`feed.entry`)
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

/**
 * Powers the Homepage 100% from Spotify Charts/Editorial Playlists + Apple Music Charts,
 * then resolves the 320kbps JioSaavn audio streams in parallel batches.
 * ZERO JioSaavn `content.getTrending` pollution!
 */
async function fetchSpotifyAndAppleHomeFeed(langParam, origin) {
  const langs = String(langParam || "english,hindi,malayalam,tamil,telugu")
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // Select Spotify Playlists based on requested languages
  const playlistsToFetch = [
    SPOTIFY_HOME_PLAYLISTS.india_top,
    SPOTIFY_HOME_PLAYLISTS.todays_hits
  ];
  if (langs.includes("hindi")) playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.hindi_hits);
  if (langs.includes("tamil")) playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.tamil_hits);
  if (langs.includes("malayalam")) playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.malayalam_hits);
  if (langs.includes("telugu")) playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.telugu_hits);
  if (langs.includes("english")) playlistsToFetch.push(SPOTIFY_HOME_PLAYLISTS.global_top);

  const uniquePlaylists = [...new Map(playlistsToFetch.map(p => [p.id, p])).values()].slice(0, 5);

  const [
    spotifyPlaylistsSettled,
    spotifyPublicChartTracks,
    appleCharts
  ] = await Promise.all([
    Promise.allSettled(uniquePlaylists.map(p => fetchSpotifyEmbedPlaylist(p.id, 3500))),
    fetchSpotifyPublicChartsService(2800),
    fetchAppleMusicCharts(3500)
  ]);

  const curatedTracks = [];
  const curatedAlbums = [];
  const seenAlbumIds = new Set();

  // 1. Interleave tracks from Spotify Flagship Playlists so all chosen languages & charts are represented
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

  // Round-robin interleave Spotify playlist tracks
  for (let row = 0; row < 15; row++) {
    for (const arr of playlistTrackArrays) {
      if (arr[row]) curatedTracks.push(arr[row]);
    }
  }

  // 2. Add Spotify Public Chart Service tracks
  for (const scTrack of spotifyPublicChartTracks.slice(0, 20)) {
    curatedTracks.push(scTrack);
  }

  // 3. Interleave Apple Music Official Chart tracks (`rss.marketingtools.apple.com` + iTunes RSS)
  for (const amTrack of appleCharts.songs) {
    curatedTracks.push(amTrack);
  }

  // 4. Add Apple Music Official Top Albums
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

  // Deduplicate curated track candidates before resolving on JioSaavn
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

  // Batch-resolve top 24 Spotify + Apple Music tracks on JioSaavn in parallel for immediate 320kbps streaming
  const tracksToEagerResolve = uniqueCuratedCandidates.slice(0, 24);
  const saavnLookups = await Promise.allSettled(
    tracksToEagerResolve.map(t => {
      const cleanT = extractCoreTrackTitle(t.trackName || "");
      const firstArt = String(t.artistName || "").split(/[,&]/)[0].trim();
      return fetchSaavnJson({
        __call: "search.getResults",
        api_version: "4",
        n: "4",
        p: "1",
        q: `${cleanT} ${firstArt}`.trim()
      }, 3200);
    })
  );

  const rawSaavnMatches = [];
  for (const res of saavnLookups) {
    if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
      rawSaavnMatches.push(...res.value.results);
    }
  }

  const healedSaavnPool = await batchHealMissingMediaUrls(rawSaavnMatches);

  const enrichedHomeSongs = [];
  for (const curated of uniqueCuratedCandidates) {
    const matchedSaavn = findBestSaavnMatchForCuratedTrack(curated, healedSaavnPool);
    enrichedHomeSongs.push(buildCuratedBridgedSongObject(curated, matchedSaavn, origin));
  }

  const deduplicatedSongs = deduplicateEnrichedSongs(enrichedHomeSongs);
  // Put direct 320kbps CDN-ready tracks first while keeping all Spotify/Apple tracks playable via /play
  const directReady = deduplicatedSongs.filter(s => s.decrypted_media_url && s.decrypted_media_url.includes("saavncdn.com"));
  const onDemandReady = deduplicatedSongs.filter(s => !s.decrypted_media_url || !s.decrypted_media_url.includes("saavncdn.com"));
  const finalSongs = [...directReady, ...onDemandReady].slice(0, 36);

  return {
    source: "SpotifyAndAppleMusicCuratedCharts",
    songs: finalSongs,
    albums: curatedAlbums.slice(0, 20),
    results: finalSongs,
    list: finalSongs
  };
}

async function resolveCompleteAlbum(albumIdOrToken, origin) {
  const cleanId = String(albumIdOrToken || "").trim();
  if (!cleanId) throw new Error("Missing album ID");

  // 1. Support Spotify Bridged Playlists (`spotify:37i9dQ...` or `spotify:playlist:37i9dQ...`)
  if (cleanId.startsWith("spotify:")) {
    const spPlaylistId = cleanId.split(":").pop();
    const plData = await fetchSpotifyEmbedPlaylist(spPlaylistId, 4000);
    if (plData.tracks.length > 0) {
      const topTracks = plData.tracks.slice(0, 22);
      const saavnBatches = await Promise.allSettled(
        topTracks.slice(0, 16).map(t =>
          fetchSaavnJson({
            __call: "search.getResults",
            api_version: "4",
            n: "4",
            p: "1",
            q: `${extractCoreTrackTitle(t.trackName)} ${String(t.artistName || "").split(/[,&]/)[0]}`.trim()
          }, 3000)
        )
      );
      const rawPool = [];
      for (const b of saavnBatches) {
        if (b.status === "fulfilled" && Array.isArray(b.value?.results)) {
          rawPool.push(...b.value.results);
        }
      }
      const healedPool = await batchHealMissingMediaUrls(rawPool);
      const enrichedSongs = topTracks.map(t => {
        const matched = findBestSaavnMatchForCuratedTrack(t, healedPool);
        return buildCuratedBridgedSongObject(t, matched, origin);
      });
      const hiImg = upgradeImage(plData.image || enrichedSongs[0]?.image || "");
      return {
        id: cleanId,
        albumid: cleanId,
        type: "playlist",
        itemType: "album",
        title: plData.title || "Spotify Chart",
        name: plData.title || "Spotify Chart",
        artist: "Spotify Charts",
        subtitle: "Spotify Official Playlist",
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

  // 2. Support Apple Music Bridged Albums (`apple:12345678`)
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
          const matched = findBestSaavnMatchForCuratedTrack(t, saavnPool);
          return buildCuratedBridgedSongObject(t, matched, origin);
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

/**
 * Intelligent Hybrid Search powered by Apple iTunes Search + JioSaavn 320kbps Catalog.
 * If the query is a default homepage trigger ("Trending", "Top Hits", "Home"), routes to Spotify + Apple Music Charts!
 */
async function executeIntelligentHybridSearch(query, origin) {
  const q = String(query || "Trending").trim();

  if (/^(trending|top\s*hits|top\s*songs|popular|home|new\s*releases)$/i.test(q)) {
    const homeFeed = await fetchSpotifyAndAppleHomeFeed("english,hindi,malayalam,tamil,telugu", origin);
    return {
      query: q,
      songs: homeFeed.songs,
      albums: homeFeed.albums
    };
  }

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

  for (const appleHit of appleSongHits) {
    if (!appleHit || !appleHit.trackId) continue;
    if (isLowQualityJunkTrack({ title: appleHit.trackName, album: appleHit.collectionName, duration: (appleHit.trackTimeMillis || 0) / 1000 }, q)) {
      continue;
    }

    const matchedSaavn = findBestSaavnMatchForCuratedTrack(appleHit, healedSaavnPool);
    if (matchedSaavn) {
      usedSaavnIds.add(String(matchedSaavn.id));
      combinedCandidates.push(buildCuratedBridgedSongObject(appleHit, matchedSaavn, origin));
    } else {
      combinedCandidates.push(buildCuratedBridgedSongObject(appleHit, null, origin));
    }
  }

  for (const sRaw of healedSaavnPool) {
    if (!sRaw || !sRaw.id) continue;
    if (usedSaavnIds.has(String(sRaw.id))) continue;
    combinedCandidates.push(enrichSaavnSong(sRaw, origin));
  }

  const deduplicatedSongs = deduplicateEnrichedSongs(combinedCandidates);
  const directReady = deduplicatedSongs.filter(s => s.decrypted_media_url && s.decrypted_media_url.includes("saavncdn.com"));
  const onDemandBridged = deduplicatedSongs.filter(s => !s.decrypted_media_url || !s.decrypted_media_url.includes("saavncdn.com"));
  const finalSongs = [...directReady, ...onDemandBridged].slice(0, 30);

  const finalAlbums = [];
  const seenAlbumKeys = new Set();

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

  return {
    query: q,
    songs: finalSongs,
    albums: finalAlbums.slice(0, 18)
  };
}

// ============================================================================
// REAL-TIME WORD-BY-WORD LYRICS ENGINE v9.0
// (WORLD-CLASS 5-VECTOR APPLE/SPOTIFY/ISRC IDENTIFIER + BILINGUAL ROMANIZED/NATIVE
//  + PAXSENIX NATIVE JSON & TTML PARSER + ACCURATE LRCLIB ENHANCED FORMAT)
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
    .filter(a => a && !/^(unknown|unknown artist|various artists|ost|traditional|spotify|apple music)$/i.test(a));

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
    !/^(openmuse|spotify.*|apple.*|today's top hits|hot hits.*)$/i.test(cleanAlbum) &&
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

/**
 * Generates accurate LRCLIB Enhanced LRC (`[mm:ss.xx]<mm:ss.xx>word1 <mm:ss.xx>word2`)
 */
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

function buildStandardLrcFromTimeline(lines, useNative = false) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  return lines
    .filter(l => l && !l.isInstrumental)
    .map(line => `[${formatLrcTimestamp(line.time)}]${useNative && line.nativeText ? line.nativeText : line.text}`)
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
 * Finalizes raw lyric entries into a strictly monotonic, tempo-aware,
 * real-time word-by-word timeline with BOTH English-written (`romanizedText`)
 * AND Native (`nativeText`) scripts preserved on every line and word!
 */
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

    // Determine Native vs. English-written (Romanized) text for this line
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

  // Merge or space colliding timestamps gracefully (if one line is Native and the duplicate timestamp is its Romanized pair, merge them!)
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

      // Check if one colliding line is Indic/Native and the other is English/Romanized
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
      // If entry has a separate Romanized line (e.g. from Apple Music <transliterations>), align or transliterate per word
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

      // If Apple Music provided a human-curated transliteration with a different word count than the native syllables,
      // also distribute the human-curated Romanized words across the exact vocal window so the English words are 100% Apple's!
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

/**
 * Parses Paxsenix's Native Apple Music JSON Syllable Array:
 * `[ { timestamp, endtime, text: [ { text, timestamp, endtime, part } ] } ]`
 */
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

    // Case 1: `line.text` is an array of Apple Music syllables `{ text, timestamp, endtime, part }`
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

        // In Paxsenix Apple Music JSON, `part: true` means this syllable is a prefix/middle part of a multi-syllable word!
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

/**
 * Parses LyricsPlus / YouLy+ / KPOE V2 JSON response into our unified word-by-word timeline,
 * extracting BOTH `line.text` (native) AND `line.transliteration` (Apple Music English-written Romanized)!
 */
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

    // Extract Apple Music's English-written transliteration (`line.transliteration`) if present!
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
  if (lines.length === 0) return null;

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

/**
 * Parses Apple Music TTML XML directly into a word-by-word timeline,
 * INCLUDING `<iTunesMetadata><transliterations>` (English-written Romanized lyrics for Tamil/Hindi/Malayalam/etc.)
 * and `<translations>`!
 */
function parseTtmlToTimeline(ttmlXml, totalDurationSec = 0, trackTitle = "", artistName = "") {
  if (!ttmlXml || typeof ttmlXml !== "string" || !ttmlXml.includes("<p")) return [];

  // 1. Extract `<transliterations>` and `<translations>` keyed by `itunes:key` (`for="L1"`, `for="L2"`, etc.)
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

      // Also extract timed `<span>` syllables inside `<transliteration><text for="L1">` if present!
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

  // 2. Parse `<body>` `<p>` lines and `<span>` words/syllables
  const bodyMatch = ttmlXml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const bodyXml = bodyMatch ? bodyMatch[1] : ttmlXml;

  const entries = [];
  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let pMatch;

  while ((pMatch = pRegex.exec(bodyXml)) !== null) {
    const pAttrs = pMatch[1] || "";
    let pInner = pMatch[2] || "";

    const keyAttr = pAttrs.match(/\b(?:itunes:key|key)\s*=\s*["']([^"']+)["']/i)?.[1]?.trim() || "";

    // Extract inline `<span ttm:role="x-roman">` if present
    let inlineRomanSpanText = "";
    pInner = pInner.replace(/<span\b[^>]*(?:ttm:role|role)\s*=\s*["']x-roman["'][^>]*>([\s\S]*?)<\/span>/gi, (_, rContent) => {
      inlineRomanSpanText += " " + cleanText(rContent.replace(/<[^>]+>/g, " "));
      return " ";
    });
    inlineRomanSpanText = inlineRomanSpanText.trim();

    // Strip nested background vocal spans (`ttm:role="x-bg"`)
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

function scoreLrcCandidate(item, tokens, durationSec, preferRomanScript = false) {
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
    titleScore = 78;
  } else if (altTitle && altTitle.length >= 3 && (itemTitle === altTitle || itemTitle.includes(altTitle))) {
    titleScore = 70;
  } else if (targetTitle) {
    const targetWords = targetTitle.split(" ").filter(w => w.length >= 3);
    const matchedWords = targetWords.filter(w => itemTitle.includes(w));
    if (targetWords.length > 0 && matchedWords.length === targetWords.length) {
      titleScore = 72;
    } else if (targetWords.length >= 2 && matchedWords.length >= targetWords.length - 1) {
      titleScore = 54;
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

  if (preferRomanScript) {
    const sampleText = String(item.syncedLyrics || item.plainLyrics || "")
      .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, " ")
      .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, " ");
    const latinCount = (sampleText.match(/[a-zA-Z]/g) || []).length;
    const nonLatinCount = (sampleText.match(/[\u0900-\u0d7f\u4e00-\u9fff]/g) || []).length;
    if (latinCount + nonLatinCount > 20) {
      const ratio = latinCount / (latinCount + nonLatinCount);
      if (ratio >= 0.70) score += 85;
    }
  }

  return score;
}

/**
 * WORLD-CLASS 5-VECTOR TRACK IDENTITY RESOLVER (`resolveWorldClassTrackIdentity`)
 * Bridges any song from JioSaavn/Spotify/User Search to its exact:
 * - Apple Music Track ID (`appleTrackId`) via iTunes Multi-Storefront + Paxsenix Direct Apple Music Catalog Search
 * - Official ISRC (`isrc`) via Deezer Free API
 * - Spotify Track ID (`spotifyTrackId`) via Paxsenix Spotify Search
 * - Canonical Apple Music `trackName`, `artistName`, `collectionName`, and `duration`
 */
async function resolveWorldClassTrackIdentity(tokens, durationSec, explicitAppleId = "", explicitSpotifyId = "") {
  const memoKey = `${tokens.primaryTitle.toLowerCase()}__${(tokens.artists[0] || "").toLowerCase()}__${tokens.album.toLowerCase()}__${durationSec}`;
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

  // Run all 4 identification vectors concurrently for sub-350ms resolution
  const [
    explicitLookupRes,
    itunesSettled,
    paxsenixAppleSearchRes,
    deezerSearchRes
  ] = await Promise.all([
    // Vector 1: Explicit Apple ID lookup
    (explicitAppleId && /^\d+$/.test(String(explicitAppleId)))
      ? fetchWithTimeout(
          `https://itunes.apple.com/lookup?id=${encodeURIComponent(explicitAppleId)}&country=in`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          2400
        ).then(r => (r.ok ? r.json() : null)).catch(() => null)
      : Promise.resolve(null),

    // Vector 2: Multi-Storefront iTunes Search (IN + US across query permutations)
    Promise.allSettled([
      ...uniqueQueries.slice(0, 3).map(q =>
        fetchWithTimeout(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=6`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          2500
        ).then(r => (r.ok ? r.json() : null))
      ),
      fetchWithTimeout(
        `https://itunes.apple.com/search?term=${encodeURIComponent(primaryQ)}&country=us&media=music&entity=song&limit=5`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2500
      ).then(r => (r.ok ? r.json() : null))
    ]),

    // Vector 3: Paxsenix Direct Apple Music Catalog Search (`lyrics.paxsenix.org/apple-music/search`)
    fetchWithTimeout(
      `https://lyrics.paxsenix.org/apple-music/search?q=${encodeURIComponent(primaryQ)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2600
    ).then(r => (r.ok ? r.json() : null)).catch(() => null),

    // Vector 4: Deezer Public API ISRC & Canonical Metadata Lookup (`api.deezer.com/search`)
    fetchWithTimeout(
      `https://api.deezer.com/search?q=${encodeURIComponent(primaryQ)}&limit=5`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2400
    ).then(r => (r.ok ? r.json() : null)).catch(() => null)
  ]);

  const appleCandidates = [];
  const seenAppleIds = new Set();

  const pushAppleCand = (id, trackName, artistName, collectionName, durationMs, isrc = "") => {
    if (!id || !trackName || seenAppleIds.has(String(id))) return;
    seenAppleIds.add(String(id));
    appleCandidates.push({
      trackId: String(id),
      trackName: cleanText(trackName),
      artistName: cleanText(artistName || ""),
      collectionName: cleanText(collectionName || ""),
      durationSec: durationMs ? Math.round(Number(durationMs) / 1000) : 0,
      isrc: isrc || ""
    });
  };

  if (explicitLookupRes?.results?.[0]) {
    const r = explicitLookupRes.results[0];
    pushAppleCand(r.trackId, r.trackName, r.artistName, r.collectionName, r.trackTimeMillis);
  }

  for (const res of itunesSettled) {
    if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
      for (const r of res.value.results) {
        pushAppleCand(r.trackId, r.trackName, r.artistName, r.collectionName, r.trackTimeMillis);
      }
    }
  }

  // Parse Paxsenix Direct Apple Music Catalog Search results
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

  // Score all Apple Music candidates to pick the exact match (and up to 2 backup Apple Track IDs!)
  const scoredApple = [];
  for (const c of appleCandidates) {
    const cVariant = extractTrackVariantTag(c.trackName, c.collectionName);
    if (tokens.variantTag === "standard" && cVariant !== "standard") continue;
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
    if (sc >= 52) {
      scoredApple.push({ cand: c, score: sc });
    }
  }
  scoredApple.sort((a, b) => b.score - a.score);

  // Extract ISRC and canonical metadata from Deezer if matched
  let resolvedIsrc = scoredApple[0]?.cand?.isrc || "";
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
      if (sc >= 58) {
        if (!resolvedIsrc && dz.isrc) resolvedIsrc = String(dz.isrc);
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

/**
 * TIER 1A: Paxsenix Direct Apple Music Syllable & TTML Fetcher
 * Supports BOTH Paxsenix's native JSON syllable array (`[{ timestamp, text: [{ part }] }]`) AND TTML XML!
 */
async function fetchPaxsenixAppleLyrics(identity, tokens, durationSec) {
  const appleIds = identity?.appleTrackIds || (identity?.appleTrackId ? [identity.appleTrackId] : []);
  if (appleIds.length === 0) return null;

  const title = identity?.canonicalTitle || tokens.primaryTitle;
  const artist = identity?.canonicalArtist || tokens.artists[0] || "";
  const dur = durationSec || identity?.canonicalDuration || 0;

  for (const appleId of appleIds.slice(0, 2)) {
    try {
      // Query both native JSON syllable endpoint and TTML endpoint in parallel
      const [jsonRes, ttmlRes] = await Promise.allSettled([
        fetchWithTimeout(
          `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(appleId)}`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          3400
        ),
        fetchWithTimeout(
          `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(appleId)}&ttml=true&v=2`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          3400
        )
      ]);

      // 1. Check TTML XML response first (since TTML has <transliterations> and <translations> metadata)
      if (ttmlRes.status === "fulfilled" && ttmlRes.value.ok) {
        const rawTtml = await ttmlRes.value.text();
        if (rawTtml.includes("<p")) {
          const lines = parseTtmlToTimeline(rawTtml, dur, title, artist);
          if (lines.length >= 2) {
            return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
          }
        }
        try {
          const parsedTtmlJson = JSON.parse(rawTtml);
          const xmlStr = parsedTtmlJson?.ttml || parsedTtmlJson?.data?.ttml || parsedTtmlJson?.content;
          if (typeof xmlStr === "string" && xmlStr.includes("<p")) {
            const lines = parseTtmlToTimeline(xmlStr, dur, title, artist);
            if (lines.length >= 2) {
              return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
            }
          }
          const sylLines = parsePaxsenixAppleJsonToTimeline(parsedTtmlJson, dur, title, artist);
          if (sylLines.length >= 2) {
            return { lines: sylLines, source: "AppleMusicDirectSyllableProvider", syncType: "WORD" };
          }
        } catch {}
      }

      // 2. Check Native Paxsenix Apple Music Syllable JSON response
      if (jsonRes.status === "fulfilled" && jsonRes.value.ok) {
        const rawText = await jsonRes.value.text();
        if (rawText.includes("<p")) {
          const lines = parseTtmlToTimeline(rawText, dur, title, artist);
          if (lines.length >= 2) {
            return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
          }
        }
        const parsedJson = JSON.parse(rawText);
        const sylLines = parsePaxsenixAppleJsonToTimeline(parsedJson, dur, title, artist);
        if (sylLines.length >= 2) {
          return { lines: sylLines, source: "AppleMusicDirectSyllableProvider", syncType: "WORD" };
        }
      }
    } catch {}
  }

  return null;
}

/**
 * TIER 1B: LyricsPlus (YouLy+ / KPOE) Apple Music TTML (`/v1/ttml/get`) & V2 (`/v2/lyrics/get`) Cluster
 */
async function fetchLyricsPlusAppleCluster(identity, tokens, durationSec, sources = "apple,lyricsplus") {
  const queryTitle = identity?.canonicalTitle || tokens.primaryTitle;
  const queryArtist = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const queryAlbum = identity?.canonicalAlbum || tokens.album || "";
  const queryDur = durationSec || identity?.canonicalDuration || 0;

  if (!queryTitle) return null;

  const v2Qs = new URLSearchParams({
    title: queryTitle,
    artist: queryArtist,
    album: queryAlbum,
    duration: String(queryDur),
    source: sources
  });

  const ttmlQs = new URLSearchParams({
    title: queryTitle,
    artist: queryArtist,
    album: queryAlbum,
    duration: String(queryDur)
  });

  const tryMirror = async (baseUrl) => {
    const [v2Res, ttmlRes] = await Promise.allSettled([
      fetchWithTimeout(`${baseUrl}/v2/lyrics/get?${v2Qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" }
      }, 3400),
      fetchWithTimeout(`${baseUrl}/v1/ttml/get?${ttmlQs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 3400)
    ]);

    if (v2Res.status === "fulfilled" && v2Res.value.ok) {
      const data = await v2Res.value.json();
      const parsed = parseLyricsPlusJsonToTimeline(data, queryDur, queryTitle, queryArtist);
      if (parsed && parsed.lines.length >= 2) {
        return {
          lines: parsed.lines,
          hasTrueWordSync: parsed.hasTrueWordSync,
          source: `AppleLyricsPlus (${parsed.upstreamSource})`
        };
      }
    }

    if (ttmlRes.status === "fulfilled" && ttmlRes.value.ok) {
      const raw = await ttmlRes.value.text();
      if (raw.includes("<p")) {
        const lines = parseTtmlToTimeline(raw, queryDur, queryTitle, queryArtist);
        if (lines.length >= 2) {
          return { lines, hasTrueWordSync: true, source: "AppleLyricsPlusTtml" };
        }
      }
      try {
        const j = JSON.parse(raw);
        if (typeof j?.ttml === "string" && j.ttml.includes("<p")) {
          const lines = parseTtmlToTimeline(j.ttml, queryDur, queryTitle, queryArtist);
          if (lines.length >= 2) {
            return { lines, hasTrueWordSync: true, source: "AppleLyricsPlusTtml" };
          }
        }
      } catch {}
    }

    throw new Error("Miss");
  };

  try {
    return await Promise.any(LYRICSPLUS_MIRRORS.map(m => tryMirror(m)));
  } catch {
    // Secondary retry with JioSaavn's original primaryTitle/artist if Apple canonical title differed
    if (tokens.primaryTitle && tokens.primaryTitle.toLowerCase() !== queryTitle.toLowerCase()) {
      const altQs = new URLSearchParams({
        title: tokens.primaryTitle,
        artist: tokens.artists[0] || queryArtist,
        album: tokens.album || queryAlbum,
        duration: String(queryDur),
        source: sources
      });
      try {
        return await Promise.any(
          LYRICSPLUS_MIRRORS.slice(0, 2).map(async (baseUrl) => {
            const r = await fetchWithTimeout(`${baseUrl}/v2/lyrics/get?${altQs.toString()}`, {
              headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
            }, 3000);
            if (!r.ok) throw new Error("Miss");
            const d = await r.json();
            const p = parseLyricsPlusJsonToTimeline(d, queryDur, tokens.primaryTitle, tokens.artists[0] || "");
            if (!p || p.lines.length < 2) throw new Error("Empty");
            return {
              lines: p.lines,
              hasTrueWordSync: p.hasTrueWordSync,
              source: `AppleLyricsPlus (${p.upstreamSource})`
            };
          })
        );
      } catch {}
    }
    return null;
  }
}

/**
 * TIER 1C: BetterLyrics (`lyrics-api.boidu.dev`), Unison (`unison.boidu.dev`), & BiniLyrics (`lyrics-api.binimum.org`)
 */
async function fetchExternalAppleTtmlProviders(identity, tokens, durationSec) {
  const title = identity?.canonicalTitle || tokens.primaryTitle;
  const artist = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const album = identity?.canonicalAlbum || tokens.album || "";
  const dur = durationSec || identity?.canonicalDuration || 0;

  if (!title) return null;

  const tasks = [
    // 1. BetterLyrics TTML
    (async () => {
      const qs = new URLSearchParams({ s: title, a: artist });
      if (album) qs.set("al", album);
      if (dur > 0) qs.set("d", String(dur));
      const res = await fetchWithTimeout(`https://lyrics-api.boidu.dev/getLyrics?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 3300);
      if (!res.ok) throw new Error("Miss");
      const data = await res.json();
      const ttml = data?.ttml || data?.lyrics;
      if (typeof ttml === "string" && ttml.includes("<p")) {
        const lines = parseTtmlToTimeline(ttml, dur, title, artist);
        if (lines.length >= 2) return { lines, source: "AppleMusicBetterLyricsTtml" };
      }
      throw new Error("No TTML");
    })(),

    // 2. BiniLyrics TTML
    (async () => {
      const qs = new URLSearchParams({ track: title, artist });
      if (album) qs.set("album", album);
      const res = await fetchWithTimeout(`https://lyrics-api.binimum.org/?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 3300);
      if (!res.ok) throw new Error("Miss");
      const text = await res.text();
      if (text.includes("<p")) {
        const lines = parseTtmlToTimeline(text, dur, title, artist);
        if (lines.length >= 2) return { lines, source: "AppleMusicBiniTtml" };
      }
      const json = JSON.parse(text);
      const ttmlContent = json?.ttml || json?.lyrics || json?.results?.[0]?.ttml;
      if (typeof ttmlContent === "string" && ttmlContent.includes("<p")) {
        const lines = parseTtmlToTimeline(ttmlContent, dur, title, artist);
        if (lines.length >= 2) return { lines, source: "AppleMusicBiniTtml" };
      }
      const ttmlUrl = json?.results?.[0]?.ttmlUrl || json?.results?.[0]?.url || json?.ttmlUrl;
      if (ttmlUrl && String(ttmlUrl).startsWith("http")) {
        const ttmlRes = await fetchWithTimeout(ttmlUrl, {}, 2500);
        if (ttmlRes.ok) {
          const xml = await ttmlRes.text();
          const lines = parseTtmlToTimeline(xml, dur, title, artist);
          if (lines.length >= 2) return { lines, source: "AppleMusicBiniTtml" };
        }
      }
      throw new Error("No Bini TTML");
    })()
  ];

  try {
    return await Promise.any(tasks);
  } catch {
    return null;
  }
}

/**
 * TIER 2A: LRCLIB Multi-Vector Search (`lrclib.net/api/get` & `/api/search`)
 */
async function searchLrclibCandidates(tokens, durationSec, identity = null) {
  const headers = { "User-Agent": `${WORKER_NAME}/${WORKER_VERSION} (https://projectvelo.tjcodewizard.workers.dev)` };
  const urls = [];

  const titleA = identity?.canonicalTitle || tokens.primaryTitle;
  const artistA = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const albumA = identity?.canonicalAlbum || tokens.album || "";

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
      fetchWithTimeout(u, { headers }, 3600).then(r => (r.ok ? r.json() : null))
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
    artists: [...new Set([artistA, identity?.canonicalArtist, ...tokens.artists].filter(Boolean))],
    album: albumA || tokens.album
  };

  const scored = allCandidates
    .map(item => ({ item, score: scoreLrcCandidate(item, enrichedTokens, durationSec, true) }))
    .filter(x => x.score >= 50)
    .sort((a, b) => b.score - a.score);

  const bestSynced = scored.find(x => x.item.syncedLyrics)?.item || null;
  const bestPlain = scored.find(x => x.item.plainLyrics)?.item || null;

  return { bestSynced, bestPlain };
}

/**
 * TIER 2B: Free Spotify & Musixmatch Synced Lyrics Fallback
 * Queries Paxsenix Spotify Lyrics & LyricsPlus `musixmatch-word,musixmatch,spotify` sources
 */
async function fetchSpotifyAndMusixmatchFallback(identity, tokens, durationSec) {
  // 1. Try LyricsPlus with Spotify + Musixmatch-Word sources
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

  // 2. Try Paxsenix Direct Spotify Lyrics if spotifyTrackId is known or resolvable
  try {
    let spId = identity?.spotifyTrackId || "";
    const title = identity?.canonicalTitle || tokens.primaryTitle;
    const artist = identity?.primaryAppleArtist || tokens.artists[0] || "";
    if (!spId && title) {
      const sRes = await fetchWithTimeout(
        `https://lyrics.paxsenix.org/spotify/search?q=${encodeURIComponent(`${title} ${artist}`.trim())}`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2600
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const firstHit = Array.isArray(sData) ? sData[0] : (sData?.results?.[0] || sData?.tracks?.[0]);
        if (firstHit?.id) spId = String(firstHit.id);
      }
    }
    if (spId) {
      const lRes = await fetchWithTimeout(
        `https://lyrics.paxsenix.org/spotify/lyrics?id=${encodeURIComponent(spId)}`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2800
      );
      if (lRes.ok) {
        const lData = await lRes.json();
        const lines = parsePaxsenixAppleJsonToTimeline(lData, durationSec, title, artist);
        if (lines.length >= 2) {
          return { lines, syncType: "LINE_ENHANCED", source: "SpotifyDirectSyncedProvider" };
        }
      }
    }
  } catch {}

  return null;
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
    }, 3200);

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
    }, 3200);

    if (!lrcRes.ok) return null;
    const lrcJson = await lrcRes.json();

    const rawYrc = lrcJson?.yrc?.lyric || "";
    if (rawYrc && rawYrc.length > 30) {
      const yrcLines = parseNeteaseYrcToTimeline(rawYrc, durationSec, tokens.primaryTitle, tokens.artists[0] || "");
      if (yrcLines.length >= 3) {
        return {
          source: "NetEaseVerbatimYrcProvider",
          syncType: "WORD",
          lines: yrcLines
        };
      }
    }

    const rawLrc = lrcJson?.lrc?.lyric || "";
    if (!rawLrc || rawLrc.length < 25) return null;

    const parsed = parseLrcToTimeline(rawLrc, durationSec, tokens.primaryTitle, tokens.artists[0] || "");
    if (parsed.lines.length >= 3) {
      return {
        source: "NetEaseLrcProvider",
        syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
        lines: parsed.lines
      };
    }
  } catch {}
  return null;
}

/**
 * Formats the final `/lyrics` payload with:
 * - Primary `lines` (English-written / Romanized word-by-word timeline)
 * - `nativeLines` (Original script e.g. Tamil/Hindi/Malayalam word-by-word timeline)
 * - `romanizedLines` (English-written word-by-word timeline)
 * - `bilingualLines` (Combined English-written + Native script on each line)
 * - Accurate LRCLIB `syncedLyrics` (`[mm:ss.xx]Line`) AND `enhancedLyrics` (`[mm:ss.xx]<mm:ss.xx>Word1 <mm:ss.xx>Word2`)
 */
function buildUnifiedLyricsResponse({
  source,
  syncType = "WORD",
  trackName,
  artistName,
  appleTrackId = null,
  isrc = null,
  duration,
  isSynced = true,
  isAutoTimed = false,
  lines
}) {
  const vocalLines = lines.filter(l => l && !l.isInstrumental);
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

  return {
    source,
    syncType,
    wordSynced: true,
    hasDualScript,
    appleTrackId,
    isrc,
    trackName: trackName || "OpenMuse",
    artistName: artistName || "OpenMuse",
    duration: duration || 185,
    isSynced,
    isAutoTimed,
    syncedLyrics: standardLrc || null,
    enhancedLyrics: enhancedLrc || null,
    nativeSyncedLyrics: nativeStandardLrc || null,
    plainLyrics: cleanPlainRoman,
    nativePlainLyrics: cleanPlainNative,
    lines,
    romanizedLines: lines,
    nativeLines,
    bilingualLines,
    type: "Word",
    lyrics: lyricsPlusCompat
  };
}

async function resolveRealtimeLyrics(url) {
  let songId = url.searchParams.get("id") || url.searchParams.get("pid") || "";
  let explicitAppleId = url.searchParams.get("appleId") || "";
  let explicitSpotifyId = url.searchParams.get("spotifyId") || "";
  let trackName = url.searchParams.get("trackName") || url.searchParams.get("title") || "";
  let artistName = url.searchParams.get("artistName") || url.searchParams.get("artist") || "";
  let albumName = url.searchParams.get("albumName") || url.searchParams.get("album") || "";
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

  const tokens = extractLyricsSearchTokens(trackName || rawQ, artistName, albumName, extraArtists);

  // STAGE 1: World-Class 5-Vector Track Identification (Apple Music ID + ISRC + Canonical Metadata)
  const identity = await resolveWorldClassTrackIdentity(tokens, durationSec, explicitAppleId, explicitSpotifyId);
  if (identity) {
    if (!durationSec && identity.canonicalDuration) {
      durationSec = identity.canonicalDuration;
    }
    if (identity.primaryAppleArtist && !tokens.artists.includes(identity.primaryAppleArtist)) {
      tokens.artists.unshift(identity.primaryAppleArtist);
    }
  }

  // STAGE 2 (TIER 1): Query All Apple Music Providers Concurrently (Paxsenix Apple + LyricsPlus Apple + BetterLyrics/Bini TTML)
  // Plus LRCLIB in parallel so there is zero extra wait if Apple Music doesn't have this track
  const [
    paxAppleHit,
    lpAppleHit,
    extTtmlHit,
    lrcResult
  ] = await Promise.all([
    fetchPaxsenixAppleLyrics(identity, tokens, durationSec),
    fetchLyricsPlusAppleCluster(identity, tokens, durationSec, "apple,lyricsplus"),
    fetchExternalAppleTtmlProviders(identity, tokens, durationSec),
    searchLrclibCandidates(tokens, durationSec, identity)
  ]);

  // 1. Prefer Apple Music response that already has dual-script transliteration or true word-by-word sync
  const appleHits = [
    lpAppleHit ? { ...lpAppleHit, syncType: lpAppleHit.hasTrueWordSync ? "WORD" : "LINE_ENHANCED" } : null,
    paxAppleHit,
    extTtmlHit ? { ...extTtmlHit, syncType: "WORD" } : null
  ].filter(h => h && Array.isArray(h.lines) && h.lines.length >= 2);

  if (appleHits.length > 0) {
    // Pick the richest Apple Music result (preferring true WORD sync + official transliteration)
    appleHits.sort((a, b) => {
      const aScore = (a.syncType === "WORD" ? 100 : 50) + a.lines.length;
      const bScore = (b.syncType === "WORD" ? 100 : 50) + b.lines.length;
      return bScore - aScore;
    });
    const bestAppleHit = appleHits[0];

    return buildUnifiedLyricsResponse({
      source: bestAppleHit.source,
      syncType: bestAppleHit.syncType || "WORD",
      trackName: identity?.canonicalTitle || tokens.primaryTitle,
      artistName: identity?.canonicalArtist || tokens.artists[0] || artistName,
      appleTrackId: identity?.appleTrackId || null,
      isrc: identity?.isrc || null,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: bestAppleHit.lines
    });
  }

  // STAGE 3 (TIER 2 SECONDARY): LRCLIB Synced Lyrics (Enhanced `<mm:ss.xx>` or Tempo-Adaptive Phonetic Word-Sync)
  if (lrcResult?.bestSynced?.syncedLyrics) {
    const winner = lrcResult.bestSynced;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const parsed = parseLrcToTimeline(
      winner.syncedLyrics,
      effectiveDur,
      winner.trackName || tokens.primaryTitle,
      winner.artistName || artistName
    );
    if (parsed.lines.length >= 2) {
      return buildUnifiedLyricsResponse({
        source: parsed.hasEnhancedWordTags ? "LrcLibEnhancedWordProvider" : "LrcLibRealtimeWordSyncProvider",
        syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
        trackName: winner.trackName || identity?.canonicalTitle || tokens.primaryTitle,
        artistName: winner.artistName || identity?.canonicalArtist || artistName,
        appleTrackId: identity?.appleTrackId || null,
        isrc: identity?.isrc || null,
        duration: effectiveDur,
        isSynced: true,
        isAutoTimed: false,
        lines: parsed.lines
      });
    }
  }

  // STAGE 4 (TIER 2 SECONDARY): Spotify & Musixmatch Word/Synced + NetEase YRC/LRC
  const [spotifyMxmHit, neteaseHit] = await Promise.all([
    fetchSpotifyAndMusixmatchFallback(identity, tokens, durationSec),
    searchNeteaseLyrics(tokens, durationSec)
  ]);

  if (spotifyMxmHit && spotifyMxmHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: spotifyMxmHit.source,
      syncType: spotifyMxmHit.syncType || "LINE_ENHANCED",
      trackName: identity?.canonicalTitle || tokens.primaryTitle,
      artistName: identity?.canonicalArtist || tokens.artists[0] || artistName,
      appleTrackId: identity?.appleTrackId || null,
      isrc: identity?.isrc || null,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: spotifyMxmHit.lines
    });
  }

  if (neteaseHit && neteaseHit.lines.length >= 2) {
    return buildUnifiedLyricsResponse({
      source: neteaseHit.source,
      syncType: neteaseHit.syncType || "WORD",
      trackName: identity?.canonicalTitle || tokens.primaryTitle,
      artistName: identity?.canonicalArtist || tokens.artists[0] || artistName,
      appleTrackId: identity?.appleTrackId || null,
      isrc: identity?.isrc || null,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: neteaseHit.lines
    });
  }

  // STAGE 5 (TIER 3): LRCLIB Plain Lyrics -> Tempo-Adaptive Cadence Word-Sync
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
        trackName: winner.trackName || identity?.canonicalTitle || tokens.primaryTitle,
        artistName: winner.artistName || identity?.canonicalArtist || artistName,
        appleTrackId: identity?.appleTrackId || null,
        isrc: identity?.isrc || null,
        duration: effectiveDur,
        isSynced: true,
        isAutoTimed: true,
        lines: plainLines
      });
    }
  }

  // Guaranteed real-time fallback timeline
  const fallbackLines = buildInstrumentalFallbackTimeline(
    identity?.canonicalTitle || tokens.primaryTitle || trackName,
    identity?.canonicalArtist || artistName,
    durationSec || 185
  );
  return buildUnifiedLyricsResponse({
    source: "ProjectVeloBeatSyncFallback",
    syncType: "CADENCE_ESTIMATED",
    trackName: identity?.canonicalTitle || tokens.primaryTitle || trackName || "OpenMuse",
    artistName: identity?.canonicalArtist || artistName || "OpenMuse",
    appleTrackId: identity?.appleTrackId || null,
    isrc: identity?.isrc || null,
    duration: durationSec || 185,
    isSynced: true,
    isAutoTimed: true,
    lines: fallbackLines
  });
}

// ============================================================================
// MAIN WORKER ROUTER (ProjectVelo v9.0.0)
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
        }, "v9-projectvelo-lyrics");
      }

      if (path === "/album") {
        const albumId = url.searchParams.get("id") || url.searchParams.get("albumid") || url.searchParams.get("token");
        return await withEdgeCache(request, ctx, 1800, async () => {
          const data = await resolveCompleteAlbum(albumId, url.origin);
          return jsonResponse(data);
        }, "v9-projectvelo-album");
      }

      if (path === "/song") {
        const pids = url.searchParams.get("id") || url.searchParams.get("pids");
        if (!pids) return jsonResponse({ error: "Missing ?id= parameter" }, 400);
        return await withEdgeCache(request, ctx, 1800, async () => {
          const pidStr = String(pids);
          if (pidStr.startsWith("apple:") || pidStr.startsWith("spotify:") || pidStr.startsWith("curated:")) {
            const memo = SONG_META_MEMO.get(pidStr);
            let title = memo?.title || "";
            let artist = memo?.artist || "";
            let album = memo?.album || "";
            let appleId = pidStr.startsWith("apple:") ? pidStr.slice(6) : (memo?.appleId || "");

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
            }

            const q = `${extractCoreTrackTitle(title)} ${String(artist || "").split(/[,&]/)[0]}`.trim();
            const sData = await fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "8", p: "1", q });
            const pool = await batchHealMissingMediaUrls(sData?.results || []);
            const curatedItem = {
              appleId,
              spotifyId: memo?.spotifyId || "",
              trackName: title || "Track",
              artistName: artist,
              collectionName: album,
              artworkUrl100: memo?.image || ""
            };
            const matched = findBestSaavnMatchForCuratedTrack(curatedItem, pool) || pool[0] || null;
            const bridged = buildCuratedBridgedSongObject(curatedItem, matched, url.origin);
            return jsonResponse({ songs: [bridged], track: bridged });
          }

          const data = await fetchSaavnJson({ __call: "song.getDetails", pids });
          const rawList = Array.isArray(data?.songs)
            ? data.songs
            : Object.values(data || {}).filter(v => v && typeof v === "object" && v.id);
          const songs = rawList.map(s => enrichSaavnSong(s, url.origin));
          return jsonResponse({ songs, track: songs[0] || null });
        }, "v9-projectvelo-song");
      }

      if (path === "/reco") {
        const pid = url.searchParams.get("id") || url.searchParams.get("pid");
        if (!pid) return jsonResponse({ error: "Missing ?id=<songId>" }, 400);
        return await withEdgeCache(request, ctx, 900, async () => {
          let targetPid = String(pid);
          if (targetPid.startsWith("apple:") || targetPid.startsWith("spotify:") || targetPid.startsWith("curated:")) {
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
        }, "v9-projectvelo-reco");
      }

      if (path === "/home") {
        return await withEdgeCache(request, ctx, 900, async () => {
          const langParam = url.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu";
          const homeData = await fetchSpotifyAndAppleHomeFeed(langParam, url.origin);
          return jsonResponse(homeData, 200, {
            "X-Home-Source": "SpotifyAndAppleMusicCharts"
          });
        }, "v9-projectvelo-home");
      }

      if (path === "/search") {
        return await handleSearchRoute(request, url, ctx);
      }

      return jsonResponse({
        service: `${WORKER_NAME} v${WORKER_VERSION} — Spotify & Apple Music Curated Intelligence + JioSaavn 320kbps Audio & Bilingual Word-Sync Engine`,
        repository: "ProjectVelo",
        status: "online",
        endpoints: {
          stream: `${url.origin}/stream?url=<target>`,
          play: `${url.origin}/play?id=<songId>&appleId=<appleTrackId>&spotifyId=<spotifyTrackId>&title=<title>&artist=<artist>`,
          lyrics: `${url.origin}/lyrics?id=<songId>&appleId=<appleTrackId>&trackName=<title>&artistName=<artist>&albumName=<album>&duration=<sec>`,
          home: `${url.origin}/home?lang=english,hindi,malayalam,tamil,telugu`,
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
  const spotifyId = (url.searchParams.get("spotifyId") || (songId.startsWith("spotify:") ? songId.slice(8) : "")).trim();
  let rawMediaUrl = (url.searchParams.get("url") || "").trim();
  let title = (url.searchParams.get("title") || "").trim();
  let artist = (url.searchParams.get("artist") || "").trim();
  let album = (url.searchParams.get("album") || "").trim();

  if (rawMediaUrl && rawMediaUrl.includes("/play?")) {
    rawMediaUrl = "";
  }

  // Check memoized song object first
  if (songId && SONG_META_MEMO.has(songId)) {
    const memo = SONG_META_MEMO.get(songId);
    if (memo.decrypted_media_url && memo.decrypted_media_url.includes("saavncdn.com")) {
      rawMediaUrl = memo.decrypted_media_url;
    }
    if (!title) title = memo.title || "";
    if (!artist) artist = memo.artist || "";
    if (!album) album = memo.album || "";
  }

  if (songId && !songId.startsWith("apple:") && !songId.startsWith("spotify:") && !songId.startsWith("curated:") && !rawMediaUrl) {
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
          if (appleId) setBoundedMemo(SONG_META_MEMO, `apple:${appleId}`, cand);
          if (spotifyId) setBoundedMemo(SONG_META_MEMO, `spotify:${spotifyId}`, cand);
          if (songId) setBoundedMemo(SONG_META_MEMO, songId, cand);
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

  // Intercept JioSaavn API calls proxied via /stream?url=...
  if (host.includes("jiosaavn.com") && parsedTarget.pathname.includes("api.php")) {
    const callType = parsedTarget.searchParams.get("__call") || "";

    // INTERCEPT JIOSAAVN TRENDING / HOMEPAGE / CHARTS -> REPLACE WITH SPOTIFY + APPLE MUSIC CHARTS!
    if (
      callType === "content.getTrending" ||
      callType === "content.getHomepageData" ||
      callType === "content.getCharts" ||
      callType === "content.getFeaturedPlaylists" ||
      callType === "webapi.getLaunchData"
    ) {
      return await withEdgeCache(request, ctx, 900, async () => {
        const lang = parsedTarget.searchParams.get("entity_language") || parsedTarget.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu";
        const homeData = await fetchSpotifyAndAppleHomeFeed(lang, origin);
        // If caller expects a direct array (like content.getTrending), return an array with .songs/.albums attached or standard JSON
        if (callType === "content.getTrending") {
          return jsonResponse([...homeData.songs, ...homeData.albums], 200, {
            "X-Home-Source": "SpotifyAndAppleMusicIntercepted"
          });
        }
        return jsonResponse(homeData, 200, {
          "X-Home-Source": "SpotifyAndAppleMusicIntercepted"
        });
      }, "v9-projectvelo-stream-home");
    }

    if (callType === "content.getAlbumDetails" || callType === "playlist.getDetails") {
      const albumId = parsedTarget.searchParams.get("albumid") || parsedTarget.searchParams.get("listid") || parsedTarget.searchParams.get("id");
      return await withEdgeCache(request, ctx, 1800, async () => {
        const enrichedAlbum = await resolveCompleteAlbum(albumId, origin);
        return jsonResponse(enrichedAlbum);
      }, "v9-projectvelo-stream-album");
    }

    if (callType === "search.getResults" || callType === "search.getAlbumResults" || callType === "song.getDetails") {
      return await withEdgeCache(request, ctx, 900, async () => {
        if (callType === "search.getResults") {
          const userQ = parsedTarget.searchParams.get("q") || "";
          const hybrid = await executeIntelligentHybridSearch(userQ, origin);
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
              data[key] = enrichSaavnSong(data[key], origin);
            }
          }
          if (Array.isArray(data.songs)) {
            data.songs = data.songs.map(s => enrichSaavnSong(s, origin));
          }
        }
        return jsonResponse(data);
      }, "v9-projectvelo-stream-api");
    }
  }

  const isImage = /\.(jpg|jpeg|png|webp|svg|avif)(\?.*)?$/i.test(parsedTarget.pathname)
    || host.includes("c.saavncdn.com")
    || host.includes("sop.saavncdn.com")
    || host.includes("mzstatic.com")
    || host.includes("scdn.co")
    || host.includes("spotifycdn.com");

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
    }, "v9-projectvelo-search");
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const writeLine = async (obj) => writer.write(encoder.encode(JSON.stringify(obj) + "\n"));

  ctx.waitUntil((async () => {
    try {
      const { songs, albums } = await executeIntelligentHybridSearch(q, url.origin);

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

async function withEdgeCache(request, ctx, ttlSeconds, computeFn, cacheNamespace = "v9-projectvelo") {
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
