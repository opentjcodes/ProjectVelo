const WORKER_NAME = "ProjectVelo";
const WORKER_VERSION = "10.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Worker-Engine, X-Upstream-Status, X-Upstream-Url, X-Cache-Status, X-Resolved-Bitrate, X-Lyrics-Source, X-Lyrics-Sync-Type, X-Home-Source, X-Home-Date-Slice, X-UpNext-Url"
};

const SAAVN_API_BASE = "https://www.jiosaavn.com/api.php";

// Strictly ordered by user preference: Malayalam -> Tamil -> Hindi -> English
const DEFAULT_LANGUAGE_PRIORITY = ["malayalam", "tamil", "hindi", "english"];

const LANGUAGE_PREFERENCE_WEIGHTS = {
  malayalam: 100,
  tamil: 90,
  hindi: 70,
  english: 55,
  kannada: 25,
  punjabi: 20,
  bengali: 15,
  telugu: 10
};

const SAAVN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-IN,en-US;q=0.9,ml-IN;q=0.9,ta-IN;q=0.9,hi-IN;q=0.8",
  "Referer": "https://www.jiosaavn.com/",
  "Origin": "https://www.jiosaavn.com",
  "X-Forwarded-For": "49.36.128.1",
  "CF-IPCountry": "IN",
  "Cookie": "L=malayalam%2Ctamil%2Chindi%2Cenglish; gdpr_acceptance=true; DL=malayalam"
};

// Verified active 2026 LyricsPlus / KPOE / LRCMUX mirrors
const LYRICSPLUS_MIRRORS = [
  "https://lyricsplus.prjktla.my.id",
  "https://lyricsplus.prjktla.workers.dev",
  "https://lyricsplus-seven.vercel.app",
  "https://lyrics-plus-backend.vercel.app",
  "https://api.lrcmux.dev/compat/kpoe"
];

// Unison & BetterLyrics TTML mirrors
const UNISON_MIRRORS = [
  "https://unison.boidu.dev",
  "https://unison.betterlyrics.org",
  "https://unison.prjktla.my.id"
];

// Indian Regional Artist & Composer Knowledge Base for Accurate Language Disambiguation
const ARTIST_LANGUAGE_PROFILE = {
  malayalam: [
    "sushin shyam", "jakes bejoy", "vishnu vijay", "rex vijayan", "vineeth sreenivasan",
    "hesham abdul wahab", "k s harisankar", "harisankar", "govind vasantha", "dabzee",
    "fejo", "vedan", "job kurian", "shaan rahman", "gopi sundar", "alphons joseph",
    "bijibal", "stephen devassy", "sithara krishnakumar", "vidhu prathap", "najim arshad",
    "sachin warrier", "sooraj santhosh", "anne amie", "madhuvanthi narayan", "baby jean",
    "hanumankind", "thirumaali", "mu.ri", "marthyan", "kapil kapilan", "m g sreekumar",
    "k j yesudas", "k s chithra", "sujatha mohan", "shweta mohan", "neeraj madhav",
    "nivin pauly", "dulquer salmaan", "fahadh faasil", "prithviraj sukumaran", "tovino thomas",
    "naslen", "kalyani priyadarshan", "mohanlal", "mammootty", "christo xavier", "justin varghese",
    "ankit menon", "kailas menon", "4 musics", "avial", "thaikkudam bridge", "agniband"
  ],
  tamil: [
    "anirudh ravichander", "anirudh", "a r rahman", "yuvan shankar raja", "harris jayaraj",
    "santhosh narayanan", "g v prakash kumar", "g v prakash", "sean roldan", "sai abhyankkar",
    "pradeep kumar", "d imman", "hiphop tamizha", "sam c s", "ghibran", "vijay antony",
    "devi sri prasad", "sid sriram", "s p balasubrahmanyam", "mano", "hariharan",
    "shankar mahadevan", "karthik", "naresh iyer", "chinmayi", "shakthisree gopalan",
    "dhee", "arivu", "paal dabba", "asal kolaar", "ofro", "srikanth deva", "ilayaraja",
    "ilaiyaraaja", "dhanush", "sivakarthikeyan", "str", "silambarasan", "vijay", "ajith",
    "suriya", "vikram", "kamal haasan", "rajinikanth", "lokesh kanagaraj", "nelson",
    "nithya menen", "andrea jeremiah", "jonita gandhi", "adithya rk", " Leon james"
  ],
  hindi: [
    "arijit singh", "pritam", "vishal mishra", "sachin jigar", "sachin-jigar", "amit trivedi",
    "mithoon", "tanishk bagchi", "jaani", "b praak", "jubin nautiyal", "atif aslam",
    "shreya ghoshal", "sunidhi chauhan", "sonu nigam", "kk", "mohit chauhan", "shaan",
    "vishal shekhar", "vishal-shekhar", "salim sulaiman", "shankar ehsaan loy", "badshah",
    "yo yo honey singh", "raftaar", "kr$na", "divine", "seedhe maut", "anuv jain",
    "prateek kuhad", "darshan raval", "armaan malik", "amaal mallik", "sachet tandon",
    "parampara tandon", "sachet-parampara", "rochakkohli", "neha kakkar", "tony kakkar",
    "karan aujla", "diljit dosanjh", "ap dhillon", "talwiinder", "king", "mc stan"
  ],
  telugu: [
    "thaman s", "s thaman", "m m keeravani", "keeravani", "mani sharma", "mickey j meyer",
    "kalyani malik", "ram miriyala", "mangli", "penchal das", "roll rida", "anurag kulkarni",
    "kaala bhairava", "sri krishna", "geetha madhuri", "sunitha uppadrashta", "hema chandra",
    "bheems ceciroleo", "radhan", "chaitan bharadwaj", "mahati swara sagar"
  ]
};

// Dynamic Apple Music Regional Discovery Pools (Rotated Daily by Date Seed)
const APPLE_MUSIC_REGIONAL_POOLS = {
  malayalam: [
    "Malayalam Hits 2026",
    "Sushin Shyam",
    "Jakes Bejoy",
    "Vishnu Vijay",
    "Hesham Abdul Wahab",
    "Dabzee Malayalam",
    "Vineeth Sreenivasan",
    "Rex Vijayan",
    "Christo Xavier",
    "K.S. Harisankar",
    "Govind Vasantha Malayalam",
    "Shaan Rahman",
    "Fejo Malayalam",
    "Job Kurian"
  ],
  tamil: [
    "Tamil Hits 2026",
    "Anirudh Ravichander",
    "Sai Abhyankkar",
    "A.R. Rahman Tamil",
    "Yuvan Shankar Raja",
    "Santhosh Narayanan",
    "G.V. Prakash Kumar",
    "Sean Roldan",
    "Harris Jayaraj",
    "Pradeep Kumar Tamil",
    "Paal Dabba",
    "Hiphop Tamizha"
  ],
  hindi: [
    "Bollywood Hits 2026",
    "Arijit Singh",
    "Vishal Mishra",
    "Sachin-Jigar",
    "Pritam",
    "Anuv Jain",
    "Amit Trivedi",
    "Shreya Ghoshal Hindi",
    "Karan Aujla",
    "Diljit Dosanjh"
  ],
  english: [
    "Top Hits 2026",
    "The Weeknd",
    "Bruno Mars",
    "Billie Eilish",
    "Sabrina Carpenter",
    "Lady Gaga",
    "Kendrick Lamar",
    "Post Malone",
    "Taylor Swift",
    "Coldplay"
  ]
};

const WORKING_STREAM_MEMO = new Map();
const SONG_META_MEMO = new Map();
const TRACK_IDENTITY_MEMO = new Map();
const RECO_QUEUE_MEMO = new Map();
const RECENTLY_PLAYED_IDS = [];

function setBoundedMemo(map, key, value, maxEntries = 1200) {
  if (!key) return;
  if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

function recordRecentlyPlayed(songId) {
  if (!songId) return;
  const clean = String(songId).trim();
  const idx = RECENTLY_PLAYED_IDS.indexOf(clean);
  if (idx !== -1) RECENTLY_PLAYED_IDS.splice(idx, 1);
  RECENTLY_PLAYED_IDS.unshift(clean);
  if (RECENTLY_PLAYED_IDS.length > 50) RECENTLY_PLAYED_IDS.pop();
}

function getDynamicTimeSliceKey(hoursPerSlice = 4) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const slice = Math.floor(now.getUTCHours() / Math.max(1, hoursPerSlice));
  return `${yyyy}-${mm}-${dd}-s${slice}`;
}

function getDayOfYearSeed() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
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
// JIOSAAVN 320KBPS DES AUDIO DECRYPTION & FULL-LENGTH BITRATE CASCADE
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

/**
 * Builds a full-length bitrate cascade across BOTH .mp4 and .mp3 on aac.saavncdn.com and h.saavncdn.com.
 * Crucially excludes `_96_p.mp4` (30-second preview clip) by default so songs NEVER cut off at 30s
 * and jump to the end!
 */
function buildSaavnBitrateCascade(rawAudioUrl, allowPreviewFallback = false) {
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
  const primaryExt = isMp3 ? "mp3" : "mp4";
  const altExt = isMp3 ? "mp4" : "mp3";

  const stemPath = parsed.pathname.replace(/_(320|160|96|96_p)\.(mp4|mp3)$/i, "");
  const aacBase = `https://aac.saavncdn.com${stemPath}`;
  const hBase = `https://h.saavncdn.com${stemPath}`;
  const previewBase = `https://preview.saavncdn.com${stemPath}`;

  const candidates = [
    `${aacBase}_320.${primaryExt}${searchSuffix}`,
    `${hBase}_320.${primaryExt}${searchSuffix}`,
    `${aacBase}_160.${primaryExt}${searchSuffix}`,
    `${hBase}_160.${primaryExt}${searchSuffix}`,
    `${aacBase}_96.${primaryExt}${searchSuffix}`,
    `${hBase}_96.${primaryExt}${searchSuffix}`,
    `${aacBase}_320.${altExt}${searchSuffix}`,
    `${hBase}_320.${altExt}${searchSuffix}`,
    `${aacBase}_160.${altExt}${searchSuffix}`,
    `${hBase}_160.${altExt}${searchSuffix}`,
    `${aacBase}_96.${altExt}${searchSuffix}`,
    `${hBase}_96.${altExt}${searchSuffix}`
  ];

  if (!/_96_p\.(mp4|mp3)/i.test(cleanUrl)) {
    candidates.push(cleanUrl);
  } else if (allowPreviewFallback) {
    candidates.push(`${previewBase}_96_p.mp4${searchSuffix}`);
  }

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

async function fetchSaavnJson(queryParamsObj, timeoutMs = 5000, customLanguages = null) {
  const qs = new URLSearchParams({
    _format: "json",
    _marker: "0",
    cc: "in",
    ctx: "web6dot0",
    ...queryParamsObj
  });
  const targetUrl = `${SAAVN_API_BASE}?${qs.toString()}`;
  const headers = { ...SAAVN_HEADERS };
  if (customLanguages) {
    const encodedLangs = encodeURIComponent(customLanguages);
    headers["Cookie"] = `L=${encodedLangs}; gdpr_acceptance=true; DL=malayalam`;
  }
  const res = await fetchWithTimeout(targetUrl, { headers }, timeoutMs);
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
// LANGUAGE DETECTION, NORMALIZATION & HIERARCHY INTELLIGENCE
// ============================================================================

function normalizeLanguageName(rawLang = "") {
  const s = String(rawLang || "").toLowerCase().trim();
  if (!s) return "";
  if (s.includes("malayalam") || s === "ml") return "malayalam";
  if (s.includes("tamil") || s === "ta" || s.includes("kollywood")) return "tamil";
  if (s.includes("hindi") || s === "hi" || s.includes("bollywood") || s.includes("hindustani")) return "hindi";
  if (s.includes("telugu") || s === "te" || s.includes("tollywood")) return "telugu";
  if (s.includes("kannada") || s === "kn" || s.includes("sandalwood")) return "kannada";
  if (s.includes("punjabi") || s === "pa") return "punjabi";
  if (s.includes("bengali") || s === "bn") return "bengali";
  if (s.includes("marathi") || s === "mr") return "marathi";
  if (s.includes("arabic") || s === "ar") return "arabic";
  if (
    s.includes("english") ||
    s === "en" ||
    s === "pop" ||
    s === "hip-hop/rap" ||
    s === "r&b/soul" ||
    s === "alternative" ||
    s === "rock" ||
    s === "dance" ||
    s === "electronic" ||
    s === "country"
  ) {
    return "english";
  }
  return "";
}

function inferTrackLanguage({
  explicitLanguage = "",
  primaryGenreName = "",
  title = "",
  album = "",
  artist = "",
  country = ""
} = {}) {
  const direct = normalizeLanguageName(explicitLanguage);
  if (direct) return direct;

  const genreLang = normalizeLanguageName(primaryGenreName);
  if (genreLang && genreLang !== "english") return genreLang;

  const combinedMeta = `${title} ${album}`.toLowerCase();
  if (/\b(malayalam|mollywood|kerala)\b/i.test(combinedMeta)) return "malayalam";
  if (/\b(tamil|kollywood|chennai)\b/i.test(combinedMeta)) return "tamil";
  if (/\b(hindi|bollywood)\b/i.test(combinedMeta)) return "hindi";
  if (/\b(telugu|tollywood)\b/i.test(combinedMeta)) return "telugu";
  if (/\b(kannada|sandalwood)\b/i.test(combinedMeta)) return "kannada";
  if (/\b(punjabi)\b/i.test(combinedMeta)) return "punjabi";
  if (/\b(arabic)\b/i.test(combinedMeta)) return "arabic";

  // Check Unicode script in title/album
  if (/[\u0D00-\u0D7F]/.test(combinedMeta)) return "malayalam";
  if (/[\u0B80-\u0BFF]/.test(combinedMeta)) return "tamil";
  if (/[\u0900-\u097F]/.test(combinedMeta)) return "hindi";
  if (/[\u0C00-\u0C7F]/.test(combinedMeta)) return "telugu";
  if (/[\u0C80-\u0CFF]/.test(combinedMeta)) return "kannada";

  // Check Artist / Composer Language Knowledge Base (ordered Malayalam -> Tamil -> Hindi -> Telugu)
  const lowerArtist = `${artist} ${album}`.toLowerCase();
  for (const [langKey, artistList] of Object.entries(ARTIST_LANGUAGE_PROFILE)) {
    for (const knownArtist of artistList) {
      if (lowerArtist.includes(knownArtist)) {
        return langKey;
      }
    }
  }

  if (genreLang === "english" && country && country.toLowerCase() === "us") {
    return "english";
  }
  return genreLang || "";
}

function detectExplicitLanguageInQuery(query = "") {
  const q = String(query || "").toLowerCase();
  if (/\b(malayalam|mollywood|mallu)\b/.test(q)) return "malayalam";
  if (/\b(tamil|kollywood)\b/.test(q)) return "tamil";
  if (/\b(hindi|bollywood)\b/.test(q)) return "hindi";
  if (/\b(telugu|tollywood)\b/.test(q)) return "telugu";
  if (/\b(kannada)\b/.test(q)) return "kannada";
  if (/\b(punjabi)\b/.test(q)) return "punjabi";
  if (/\b(english)\b/.test(q)) return "english";
  if (/\b(arabic)\b/.test(q)) return "arabic";
  return "";
}

function getLanguagePreferenceBoost(trackLang = "", explicitQueryLang = "") {
  const lang = normalizeLanguageName(trackLang);
  if (!lang) return 0;

  if (explicitQueryLang) {
    return lang === explicitQueryLang ? 160 : -120;
  }

  // Strictly enforce user's preferred hierarchy: Malayalam (100) > Tamil (90) > Hindi (70) > English (55) >> Telugu (-35)
  if (lang === "malayalam") return 100;
  if (lang === "tamil") return 90;
  if (lang === "hindi") return 70;
  if (lang === "english") return 55;
  if (lang === "telugu") return -35;
  return LANGUAGE_PREFERENCE_WEIGHTS[lang] || 0;
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
 * Guards against foreign-script lyrics collisions (e.g., Arabic, Cyrillic, Hebrew,
 * Hangul/Korean, Thai, or CJK lyrics accidentally returned for an Indian or English track).
 */
function isIncompatibleForeignScriptLyrics(lyricsText, expectedLanguage = "", trackTitle = "", artistName = "") {
  if (!lyricsText) return false;
  const sample = String(lyricsText)
    .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, " ")
    .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, " ")
    .trim();
  if (!sample) return false;

  const lang = normalizeLanguageName(expectedLanguage);
  const metaLower = `${trackTitle} ${artistName} ${lang}`.toLowerCase();

  // 1. Arabic / Persian / Urdu script block (\u0600-\u06FF, \u0750-\u077F, \uFB50-\uFDFF, \uFE70-\uFEFF)
  const arabicChars = (sample.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  if (arabicChars >= 4 && lang !== "arabic" && !/\b(arabic|arab|habibi|nasheed)\b/i.test(metaLower)) {
    return true;
  }

  // 2. Cyrillic script block (\u0400-\u04FF)
  const cyrillicChars = (sample.match(/[\u0400-\u04FF]/g) || []).length;
  if (cyrillicChars >= 5 && !/\b(russian|cyrillic|ukrainian)\b/i.test(metaLower)) {
    return true;
  }

  // 3. Hebrew (\u0590-\u05FF) or Thai (\u0E00-\u0E7F)
  const hebrewOrThaiChars = (sample.match(/[\u0590-\u05FF\u0E00-\u0E7F]/g) || []).length;
  if (hebrewOrThaiChars >= 5) {
    return true;
  }

  // 4. Korean Hangul (\uAC00-\uD7AF) or CJK (\u4E00-\u9FFF) when track is Indian/English
  const cjkOrHangulChars = (sample.match(/[\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FFF]/g) || []).length;
  if (
    cjkOrHangulChars >= 8 &&
    (lang === "malayalam" || lang === "tamil" || lang === "hindi" || lang === "telugu" || lang === "kannada" || lang === "punjabi")
  ) {
    return true;
  }

  return false;
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
// REMIX-AWARE & LANGUAGE-AWARE DEDUPLICATION & TRACK FINGERPRINTING ENGINE
// ============================================================================

function extractTrackVariantTag(rawTitle = "", rawAlbum = "") {
  const combined = `${rawTitle} ${rawAlbum}`.toLowerCase();
  const variantTokens = [];

  const variantMatchers = [
    { key: "remix", rx: /\b(remix|re-mix|remixed|club\s+mix|dance\s+mix|dj\s+mix|dj\b|bootleg|mashup|flip|vip\s+mix|extended\s+mix|festival\s+mix|trap\s+mix|edm\s+mix|house\s+mix|bass\s+boosted|psy\s+mix)\b/i },
    { key: "lofi", rx: /\b(lo-?fi|chill\s+mix|chillout)\b/i },
    { key: "slowed", rx: /\b(slowed|reverb|sped\s+up|nightcore)\b/i },
    { key: "unplugged", rx: /\b(unplugged|acoustic|stripped|piano\s+version|guitar\s+version|mtv\s+unplugged)\b/i },
    { key: "live", rx: /\b(live|concert\s+version|session)\b/i },
    { key: "reprise", rx: /\b(reprise|reprised|encore|reload|reloaded|version\s*2|part\s*2|pt\.?\s*2)\b/i },
    { key: "female", rx: /\b(female\s+version|female\s+vocals?)\b/i },
    { key: "male", rx: /\b(male\s+version|male\s+vocals?)\b/i },
    { key: "duet", rx: /\b(duet\s+version)\b/i },
    { key: "instrumental", rx: /\b(instrumental|karaoke|backing\s+track|bgm|theme\s+music)\b/i }
  ];

  for (const m of variantMatchers) {
    if (m.rx.test(combined)) {
      variantTokens.push(m.key);
    }
  }

  return variantTokens.length > 0 ? variantTokens.sort().join("+") : "standard";
}

/**
 * Extracts the clean core song title (stripping movie/OST suffixes AND trailing bare variant words
 * like "Kalyani Remix" -> "Kalyani", while `extractTrackVariantTag` captures `remix`).
 */
function extractCoreTrackTitle(rawTitle = "") {
  return cleanText(rawTitle)
    .replace(/\s*[\[(]\s*(?:from|movie|film|ost|original\s+motion\s+picture|soundtrack|motion\s+picture|featured\s+in)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*(?:from|movie|film|ost|original\s+motion\s+picture).*$/gi, " ")
    .replace(/\s*[\[(]\s*(?:official|audio|video|lyrical|full\s+song|full\s+video|hd|hq|hindi|tamil|telugu|malayalam|kannada|punjabi|bengali|english)\s*[\])]/gi, " ")
    .replace(/\s*[\[(][^)\]]*(?:remix|re-mix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit|dj)[^)\]]*[\])]/gi, " ")
    .replace(/\s*-\s*[^-]*(?:remix|re-mix|lo-?fi|slowed|reverb|unplugged|acoustic|live|reprise|reprised|encore|mix|flip|mashup|version|edit|dj).*$/gi, " ")
    .replace(/\b(?:remix|re-mix|lo-?fi\s+mix|lo-?fi|slowed\s+and\s+reverb|slowed|unplugged|reprise|mashup|club\s+mix|dj\s+mix|flip)\s*$/gi, " ")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts a variant-preserving clean title (so "Kalyani (From 'Marco') [Remix]" -> "Kalyani Remix"
 * while "Kalyani (From 'Marco')" -> "Kalyani"). Essential for accurate Remix vs Original lookup!
 */
function extractVariantAwareTrackTitle(rawTitle = "", rawAlbum = "") {
  const core = extractCoreTrackTitle(rawTitle);
  const variant = extractTrackVariantTag(rawTitle, rawAlbum);
  if (variant === "standard" || !core) return core || cleanText(rawTitle);
  const primaryVariantWord = variant.split("+")[0];
  if (new RegExp(`\\b${primaryVariantWord}\\b`, "i").test(core)) {
    return core;
  }
  return `${core} ${primaryVariantWord.charAt(0).toUpperCase() + primaryVariantWord.slice(1)}`.trim();
}

function buildTrackDedupSignature(song) {
  if (!song) return "";
  const rawTitle = song.title || song.song || "";
  const rawAlbum = song.album || song.more_info?.album || "";
  const coreTitle = normalizeTokenComparison(extractCoreTrackTitle(rawTitle) || rawTitle);
  const variantTag = song.variant || extractTrackVariantTag(rawTitle, rawAlbum);
  const langTag = normalizeLanguageName(song.language || song.more_info?.language || "") || "any";

  const artistList = (song.allArtists && song.allArtists.length > 0)
    ? song.allArtists
    : String(song.artist || song.primary_artists || "").split(",");

  const normArtists = artistList
    .map(a => normalizeTokenComparison(a))
    .filter(Boolean);

  const sortedTopArtists = [...new Set(normArtists)].slice(0, 2).sort().join("_");
  return `${coreTitle}__${variantTag}__${langTag}__${sortedTopArtists || "artist"}`;
}

function buildLooseTitleVariantSignature(song) {
  if (!song) return "";
  const rawTitle = song.title || song.song || "";
  const rawAlbum = song.album || song.more_info?.album || "";
  const coreTitle = normalizeTokenComparison(extractCoreTrackTitle(rawTitle) || rawTitle);
  const variantTag = song.variant || extractTrackVariantTag(rawTitle, rawAlbum);
  const langTag = normalizeLanguageName(song.language || song.more_info?.language || "") || "any";
  const durBucket = song.duration ? Math.round(Number(song.duration) / 8) : 0;
  return `${coreTitle}__${variantTag}__${langTag}__dur${durBucket}`;
}

function isLowQualityJunkTrack(rawSong, userQuery = "") {
  if (!rawSong || typeof rawSong !== "object") return true;
  const more = rawSong.more_info || {};
  const title = cleanText(rawSong.title || rawSong.song || "").toLowerCase();
  const album = cleanText(more.album || rawSong.album || "").toLowerCase();
  const q = String(userQuery || "").toLowerCase();

  const duration = parseInt(more.duration || rawSong.duration || "0", 10) || 0;
  if (duration > 0 && duration < 42 && !q.includes("intro") && !q.includes("ringtone") && !q.includes("theme")) {
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

async function filterAndUpgradeSongs(rawSongs, origin, userQuery = "") {
  if (!Array.isArray(rawSongs)) return [];
  const explicitLang = detectExplicitLanguageInQuery(userQuery);
  const filtered = rawSongs.filter(s => !isLowQualityJunkTrack(s, userQuery));
  const listToProcess = filtered.length > 0 ? filtered : rawSongs;
  const healed = await batchHealMissingMediaUrls(listToProcess);

  const enrichedList = healed
    .map(s => enrichSaavnSong(s, origin))
    .filter(s => s && s.id);

  const deduped = deduplicateEnrichedSongs(enrichedList);

  // Sort by language preference if multiple language versions of the same title exist
  return deduped.sort((a, b) => {
    const coreA = normalizeTokenComparison(extractCoreTrackTitle(a.title));
    const coreB = normalizeTokenComparison(extractCoreTrackTitle(b.title));
    if (coreA === coreB) {
      return getLanguagePreferenceBoost(b.language, explicitLang) - getLanguagePreferenceBoost(a.language, explicitLang);
    }
    return 0;
  });
}

function enrichSaavnSong(s, origin, externalMeta = null) {
  if (!s || typeof s !== "object") return s;
  const more = s.more_info || {};
  const enc = more.encrypted_media_url || s.encrypted_media_url;

  let directUrl = s.decrypted_media_url || decryptSaavnMediaUrl(enc, true);
  // Do NOT trust `media_preview_url` directly unless rewritten and verified through `/play` or `/stream`
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
    for (const a of more.artistMap.artistMap?.artists || more.artistMap.artists) {
      if (a?.name) artistNames.push(cleanText(a.name));
    }
  }
  if (more.music) {
    artistNames.push(...String(more.music).split(",").map(cleanText));
  }

  const uniqueArtists = [...new Set(artistNames.filter(a => a && a.toLowerCase() !== "unknown"))];
  const primaryArtists = uniqueArtists.slice(0, 4).join(", ") || cleanText(s.subtitle || "Unknown Artist");
  const composerName = cleanText(more.music || s.music || "");

  const rawImg = externalMeta?.artworkUrl || s.image || s.coverUrl;
  const hiResImg = upgradeImage(rawImg);
  const titleClean = cleanText(externalMeta?.trackName || s.title || s.song || "Untitled");
  const albumTitle = cleanText(externalMeta?.collectionName || more.album || s.album || "OpenMuse");
  const albumId = more.album_id || s.album_id || null;
  const durationSec = parseInt(more.duration || s.duration || externalMeta?.durationSec || "0", 10) || 0;
  const releaseYear = String(s.year || more.year || externalMeta?.releaseYear || "");
  const appleId = externalMeta?.appleTrackId || s.appleId || null;
  const spotifyId = externalMeta?.spotifyTrackId || s.spotifyId || null;
  const idStr = String(s.id);
  const variantTag = extractTrackVariantTag(titleClean, albumTitle);

  const resolvedLanguage = inferTrackLanguage({
    explicitLanguage: s.language || more.language || externalMeta?.language || "",
    primaryGenreName: externalMeta?.primaryGenreName || "",
    title: titleClean,
    album: albumTitle,
    artist: `${primaryArtists} ${composerName}`
  }) || "malayalam";

  const playQueryParams = new URLSearchParams({
    id: idStr,
    title: titleClean,
    artist: primaryArtists,
    album: albumTitle,
    lang: resolvedLanguage,
    variant: variantTag,
    duration: String(durationSec)
  });
  if (appleId) playQueryParams.set("appleId", String(appleId));
  if (spotifyId) playQueryParams.set("spotifyId", String(spotifyId));
  if (directUrl) playQueryParams.set("url", directUrl);

  const playEndpointUrl = `${origin}/play?${playQueryParams.toString()}`;
  const workerStream = directUrl
    ? `${origin}/stream?url=${encodeURIComponent(directUrl)}&id=${encodeURIComponent(idStr)}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}&lang=${encodeURIComponent(resolvedLanguage)}&variant=${encodeURIComponent(variantTag)}`
    : playEndpointUrl;

  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(idStr)}${appleId ? `&appleId=${encodeURIComponent(appleId)}` : ""}${spotifyId ? `&spotifyId=${encodeURIComponent(spotifyId)}` : ""}&trackName=${encodeURIComponent(titleClean)}&artistName=${encodeURIComponent(primaryArtists)}&albumName=${encodeURIComponent(albumTitle)}&lang=${encodeURIComponent(resolvedLanguage)}&variant=${encodeURIComponent(variantTag)}&duration=${durationSec}`;
  const recoEndpointUrl = `${origin}/reco?id=${encodeURIComponent(idStr)}&lang=${encodeURIComponent(resolvedLanguage)}`;

  const cascade = directUrl ? buildSaavnBitrateCascade(directUrl, false) : [];

  const enrichedObj = {
    ...s,
    id: idStr,
    appleId: appleId ? String(appleId) : null,
    spotifyId: spotifyId ? String(spotifyId) : null,
    language: resolvedLanguage,
    variant: variantTag,
    year: releaseYear,
    composer: composerName,
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
    recoUrl: recoEndpointUrl,
    more_info: {
      ...more,
      language: resolvedLanguage,
      encrypted_media_url: enc || "",
      "320kbps": "true",
      album: albumTitle,
      album_id: albumId ? String(albumId) : null,
      primary_artists: primaryArtists,
      music: composerName,
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
  const releaseYear = curatedItem.releaseDate ? String(curatedItem.releaseDate).slice(0, 4) : "";
  const artworkUrl = upgradeImage(curatedItem.artworkUrl100 || curatedItem.artworkUrl || matchedSaavnRaw?.image || "");

  const inferredLang = inferTrackLanguage({
    explicitLanguage: curatedItem.language || matchedSaavnRaw?.language || matchedSaavnRaw?.more_info?.language || "",
    primaryGenreName: curatedItem.primaryGenreName || "",
    title: trackName,
    album: collectionName,
    artist: artistName,
    country: curatedItem.country || ""
  });

  if (matchedSaavnRaw) {
    return enrichSaavnSong(matchedSaavnRaw, origin, {
      appleTrackId: appleTrackId || null,
      spotifyTrackId: spotifyTrackId || null,
      language: inferredLang || matchedSaavnRaw.language,
      primaryGenreName: curatedItem.primaryGenreName || "",
      releaseYear,
      trackName: matchedSaavnRaw.title && extractTrackVariantTag(matchedSaavnRaw.title) !== "standard" && extractTrackVariantTag(trackName) !== "standard"
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

  const variantTag = extractTrackVariantTag(trackName, collectionName);
  const effectiveLang = inferredLang || "malayalam";

  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(syntheticId)}${appleTrackId ? `&appleId=${encodeURIComponent(appleTrackId)}` : ""}${spotifyTrackId ? `&spotifyId=${encodeURIComponent(spotifyTrackId)}` : ""}&title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(collectionName)}&lang=${encodeURIComponent(effectiveLang)}&variant=${encodeURIComponent(variantTag)}&duration=${durationSec}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(syntheticId)}${appleTrackId ? `&appleId=${encodeURIComponent(appleTrackId)}` : ""}${spotifyTrackId ? `&spotifyId=${encodeURIComponent(spotifyTrackId)}` : ""}&trackName=${encodeURIComponent(trackName)}&artistName=${encodeURIComponent(artistName)}&albumName=${encodeURIComponent(collectionName)}&lang=${encodeURIComponent(effectiveLang)}&variant=${encodeURIComponent(variantTag)}&duration=${durationSec}`;
  const recoEndpointUrl = `${origin}/reco?id=${encodeURIComponent(syntheticId)}&lang=${encodeURIComponent(effectiveLang)}`;

  const bridgedObj = {
    id: syntheticId,
    appleId: appleTrackId || null,
    spotifyId: spotifyTrackId || null,
    language: effectiveLang,
    variant: variantTag,
    year: releaseYear,
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
    recoUrl: recoEndpointUrl,
    more_info: {
      language: effectiveLang,
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
 * Matches a curated Apple Music track to the exact JioSaavn 320kbps audio stream,
 * strictly enforcing:
 * 1. Exact Variant Match ("Kalyani" vs "Kalyani Remix" never cross-contaminate!)
 * 2. Language Disambiguation (Malayalam/Tamil tracks NEVER match Telugu audio!)
 * 3. Artist/Movie & Duration verification
 */
function findBestSaavnMatchForCuratedTrack(curatedItem, saavnPool, explicitQueryLang = "") {
  if (!Array.isArray(saavnPool) || saavnPool.length === 0) return null;

  const targetTitleRaw = cleanText(curatedItem.trackName || curatedItem.name || curatedItem.title || "");
  const targetAlbumRaw = cleanText(curatedItem.collectionName || curatedItem.albumName || "");
  const targetCore = normalizeTokenComparison(extractCoreTrackTitle(targetTitleRaw) || targetTitleRaw);
  const targetVariant = extractTrackVariantTag(targetTitleRaw, targetAlbumRaw);
  const targetArtists = String(curatedItem.artistName || curatedItem.artist || "")
    .split(/[,&/|]/)
    .map(a => normalizeTokenComparison(a))
    .filter(Boolean);
  const targetDur = curatedItem.trackTimeMillis
    ? Math.round(curatedItem.trackTimeMillis / 1000)
    : (curatedItem.durationSec || 0);

  const targetLang = explicitQueryLang || inferTrackLanguage({
    explicitLanguage: curatedItem.language || "",
    primaryGenreName: curatedItem.primaryGenreName || "",
    title: targetTitleRaw,
    album: targetAlbumRaw,
    artist: curatedItem.artistName || curatedItem.artist || ""
  });

  let bestMatch = null;
  let bestScore = -999;

  for (const s of saavnPool) {
    if (!s || isLowQualityJunkTrack(s, targetTitleRaw)) continue;
    const sTitleRaw = cleanText(s.title || s.song || "");
    const sAlbumRaw = cleanText(s.more_info?.album || s.album || "");
    const sCore = normalizeTokenComparison(extractCoreTrackTitle(sTitleRaw) || sTitleRaw);
    const sVariant = extractTrackVariantTag(sTitleRaw, sAlbumRaw);

    if (!sCore || !targetCore) continue;

    // STRICT VARIANT ISOLATION: Never match a Remix to a Standard track or vice versa!
    if (targetVariant !== sVariant) continue;

    const sLang = normalizeLanguageName(s.language || s.more_info?.language || "") || inferTrackLanguage({
      title: sTitleRaw,
      album: sAlbumRaw,
      artist: `${s.more_info?.primary_artists || s.primary_artists || ""} ${s.more_info?.music || ""}`
    });

    // STRICT LANGUAGE PROTECTION: If target language is known (e.g. tamil or malayalam) and candidate is telugu (or another conflicting language), reject or heavily penalize!
    if (targetLang && sLang && targetLang !== sLang) {
      if (
        (targetLang === "malayalam" || targetLang === "tamil" || targetLang === "hindi") &&
        (sLang === "telugu" || sLang === "kannada" || sLang === "bengali" || sLang === "bhojpuri")
      ) {
        continue;
      }
    }

    let score = 0;
    if (sCore === targetCore) {
      score += 105;
    } else if (sCore.includes(targetCore) || targetCore.includes(sCore)) {
      score += 78;
    } else {
      const aWords = targetCore.split(" ").filter(w => w.length >= 3);
      const matched = aWords.filter(w => sCore.includes(w));
      if (aWords.length > 0 && matched.length === aWords.length) {
        score += 70;
      } else {
        continue;
      }
    }

    // Language Scoring
    if (targetLang && sLang) {
      if (targetLang === sLang) {
        score += 110;
      } else {
        score -= 140;
      }
    } else if (sLang) {
      score += getLanguagePreferenceBoost(sLang, explicitQueryLang) * 0.65;
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
        score += 70;
        artistMatched = true;
        break;
      }
    }

    // Check Album / Movie match
    const normTargetAlbum = normalizeTokenComparison(extractCoreTrackTitle(targetAlbumRaw));
    const normSaavnAlbum = normalizeTokenComparison(extractCoreTrackTitle(sAlbumRaw));
    if (normTargetAlbum && normSaavnAlbum && (normSaavnAlbum.includes(normTargetAlbum) || normTargetAlbum.includes(normSaavnAlbum))) {
      score += 55;
      artistMatched = true;
    }

    const sDur = parseInt(s.more_info?.duration || s.duration || "0", 10) || 0;
    if (targetDur > 0 && sDur > 0) {
      const diff = Math.abs(targetDur - sDur);
      if (diff <= 4) score += 65;
      else if (diff <= 10) score += 35;
      else if (diff > 30 && !artistMatched) score -= 75;
    }

    if (s.more_info?.encrypted_media_url || s.encrypted_media_url) {
      score += 25;
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
  const lang = normalizeLanguageName(a.language || more.language || "") || inferTrackLanguage({
    title: a.title || a.name || "",
    artist
  });

  return {
    ...a,
    id,
    albumid: id,
    language: lang || "malayalam",
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
// 100% APPLE MUSIC HOMEPAGE ENGINE
// (OPTIMIZED FOR MALAYALAM -> TAMIL -> HINDI -> ENGLISH + DAILY AUTO-ROTATION)
// ============================================================================

/**
 * Fetches Apple Music Regional & Chart Tracks + Albums for a specific language
 * using a deterministic Daily Seed (`getDayOfYearSeed()`) + live Apple Music RSS feeds
 * so the homepage is 100% Apple Music, strictly language-ordered, and updates every single day!
 */
async function fetchAppleMusicRegionalCatalog(langKey, daySeed, timeoutMs = 3800) {
  const pool = APPLE_MUSIC_REGIONAL_POOLS[langKey] || APPLE_MUSIC_REGIONAL_POOLS.malayalam;
  // Pick 3 rotating queries per day + the flagship chart query for this language
  const q1 = pool[0];
  const q2 = pool[1 + (daySeed % (pool.length - 1))];
  const q3 = pool[1 + ((daySeed + 3) % (pool.length - 1))];
  const q4 = pool[1 + ((daySeed + 6) % (pool.length - 1))];

  const queries = [...new Set([q1, q2, q3, q4])].slice(0, 4);
  const country = langKey === "english" ? "us" : "in";

  const [songSettled, albumRes] = await Promise.all([
    Promise.allSettled(
      queries.map(q =>
        fetchWithTimeout(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=${country}&media=music&entity=song&limit=12`,
          {
            headers: {
              "User-Agent": SAAVN_HEADERS["User-Agent"],
              "Cache-Control": "no-cache"
            }
          },
          timeoutMs
        ).then(r => (r.ok ? r.json() : null))
      )
    ),
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q1)}&country=${country}&media=music&entity=album&limit=8`,
      {
        headers: {
          "User-Agent": SAAVN_HEADERS["User-Agent"],
          "Cache-Control": "no-cache"
        }
      },
      timeoutMs
    ).then(r => (r.ok ? r.json() : null)).catch(() => null)
  ]);

  const rawTracks = [];
  for (const s of songSettled) {
    if (s.status === "fulfilled" && Array.isArray(s.value?.results)) {
      for (const item of s.value.results) {
        if (!item?.trackId || !item?.trackName) continue;
        const detectedLang = inferTrackLanguage({
          primaryGenreName: item.primaryGenreName || "",
          title: item.trackName,
          album: item.collectionName,
          artist: item.artistName,
          country
        });
        // Reject Telugu/unrelated tracks when building Malayalam/Tamil shelves
        if (
          (langKey === "malayalam" || langKey === "tamil" || langKey === "hindi") &&
          detectedLang &&
          detectedLang !== langKey &&
          detectedLang !== "english"
        ) {
          continue;
        }
        rawTracks.push({
          appleId: String(item.trackId),
          trackId: String(item.trackId),
          trackName: cleanText(item.trackName),
          artistName: cleanText(item.artistName || "Artist"),
          collectionName: cleanText(item.collectionName || item.trackName),
          collectionId: item.collectionId ? String(item.collectionId) : null,
          trackTimeMillis: item.trackTimeMillis || 0,
          releaseDate: item.releaseDate || "",
          primaryGenreName: item.primaryGenreName || langKey,
          language: langKey,
          artworkUrl100: item.artworkUrl100 || ""
        });
      }
    }
  }

  // Sort tracks with a daily freshness score (boosting 2025/2026 releases + daily deterministic rotation)
  const currentYear = new Date().getUTCFullYear();
  rawTracks.sort((a, b) => {
    const yearA = parseInt(String(a.releaseDate || "").slice(0, 4), 10) || 2020;
    const yearB = parseInt(String(b.releaseDate || "").slice(0, 4), 10) || 2020;
    const recencyA = yearA >= currentYear - 1 ? 30 : (yearA >= currentYear - 2 ? 15 : 0);
    const recencyB = yearB >= currentYear - 1 ? 30 : (yearB >= currentYear - 2 ? 15 : 0);
    const dailyJitterA = ((parseInt(a.trackId, 10) || 0) + daySeed * 17) % 23;
    const dailyJitterB = ((parseInt(b.trackId, 10) || 0) + daySeed * 17) % 23;
    return (recencyB + dailyJitterB) - (recencyA + dailyJitterA);
  });

  const albums = [];
  if (Array.isArray(albumRes?.results)) {
    for (const alb of albumRes.results) {
      if (alb?.collectionId && alb?.collectionName) {
        albums.push({
          appleAlbumId: String(alb.collectionId),
          language: langKey,
          title: cleanText(alb.collectionName),
          artist: cleanText(alb.artistName || "Apple Music"),
          year: alb.releaseDate ? String(alb.releaseDate).slice(0, 4) : String(currentYear),
          image: upgradeImage(alb.artworkUrl100 || "")
        });
      }
    }
  }

  return { songs: rawTracks, albums };
}

/**
 * Fetches Apple Music's Live Official Top Charts (`rss.marketingtools.apple.com` + `itunes.apple.com/in/rss`)
 */
async function fetchAppleMusicLiveRssCharts(timeoutMs = 3600) {
  const sliceBuster = getDynamicTimeSliceKey(4);
  const urls = [
    `https://rss.marketingtools.apple.com/api/v2/in/music/most-played/50/songs.json?_ts=${sliceBuster}`,
    `https://rss.marketingtools.apple.com/api/v2/us/music/most-played/25/songs.json?_ts=${sliceBuster}`,
    `https://rss.marketingtools.apple.com/api/v2/in/music/most-played/25/albums.json?_ts=${sliceBuster}`,
    `https://itunes.apple.com/in/rss/topsongs/limit=40/json?_ts=${sliceBuster}`
  ];

  const settled = await Promise.allSettled(
    urls.map(u =>
      fetchWithTimeout(u, {
        headers: {
          "User-Agent": SAAVN_HEADERS["User-Agent"],
          "Cache-Control": "no-cache"
        }
      }, timeoutMs).then(r => (r.ok ? r.json() : null))
    )
  );

  const songs = [];
  const albums = [];

  const parseV2Songs = (data, defaultCountry) => {
    const list = data?.feed?.results;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item?.id && item?.name) {
          const genreName = item.genres?.[0]?.name || "";
          const lang = inferTrackLanguage({
            primaryGenreName: genreName,
            title: item.name,
            album: item.collectionName || item.name,
            artist: item.artistName || "",
            country: defaultCountry
          }) || (defaultCountry === "us" ? "english" : "hindi");

          songs.push({
            appleId: String(item.id),
            trackId: String(item.id),
            trackName: cleanText(item.name),
            artistName: cleanText(item.artistName || "Artist"),
            collectionName: cleanText(item.collectionName || item.name),
            releaseDate: item.releaseDate || "",
            primaryGenreName: genreName,
            language: lang,
            artworkUrl100: item.artworkUrl100 || ""
          });
        }
      }
    }
  };

  if (settled[0].status === "fulfilled" && settled[0].value) parseV2Songs(settled[0].value, "in");
  if (settled[1].status === "fulfilled" && settled[1].value) parseV2Songs(settled[1].value, "us");

  if (settled[2].status === "fulfilled" && Array.isArray(settled[2].value?.feed?.results)) {
    for (const alb of settled[2].value.feed.results) {
      if (alb?.id && alb?.name) {
        const lang = inferTrackLanguage({
          primaryGenreName: alb.genres?.[0]?.name || "",
          title: alb.name,
          artist: alb.artistName || ""
        }) || "hindi";
        albums.push({
          appleAlbumId: String(alb.id),
          language: lang,
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
      const genreName = entry?.category?.attributes?.label || "";
      const images = Array.isArray(entry?.["im:image"]) ? entry["im:image"] : [];
      const artworkUrl100 = images.length > 0 ? images[images.length - 1]?.label : "";
      const durationMs = parseInt(entry?.link?.[1]?.attributes?.["im:duration"] || "0", 10) || 0;
      if (appleId && trackName) {
        const lang = inferTrackLanguage({
          primaryGenreName: genreName,
          title: trackName,
          album: collectionName,
          artist: artistName
        }) || "hindi";
        songs.push({
          appleId: String(appleId),
          trackId: String(appleId),
          trackName: cleanText(trackName),
          artistName: cleanText(artistName),
          collectionName: cleanText(collectionName),
          primaryGenreName: genreName,
          language: lang,
          trackTimeMillis: durationMs,
          artworkUrl100
        });
      }
    }
  }

  return { songs, albums };
}

/**
 * Powers the Homepage 100% from Apple Music (Live Charts + Regional Curated Catalogs),
 * strictly ordered by:
 *   1. Malayalam (Mollywood OSTs & Hits)
 *   2. Tamil (Kollywood OSTs & Hits)
 *   3. Hindi (Bollywood Top Hits)
 *   4. English (Global Top Hits)
 * And rotates dynamically every day!
 */
async function fetchAppleMusicExclusiveHomeFeed(langParam, origin) {
  const daySeed = getDayOfYearSeed();
  const timeSlice = getDynamicTimeSliceKey(4);

  const [
    malayalamCatalog,
    tamilCatalog,
    hindiCatalog,
    englishCatalog,
    appleLiveRss
  ] = await Promise.all([
    fetchAppleMusicRegionalCatalog("malayalam", daySeed, 3800),
    fetchAppleMusicRegionalCatalog("tamil", daySeed, 3800),
    fetchAppleMusicRegionalCatalog("hindi", daySeed, 3800),
    fetchAppleMusicRegionalCatalog("english", daySeed, 3800),
    fetchAppleMusicLiveRssCharts(3600)
  ]);

  // Bucket Apple Music tracks strictly by language priority: Malayalam -> Tamil -> Hindi -> English
  const buckets = {
    malayalam: [...malayalamCatalog.songs],
    tamil: [...tamilCatalog.songs],
    hindi: [...hindiCatalog.songs],
    english: [...englishCatalog.songs]
  };

  for (const rssSong of appleLiveRss.songs) {
    const lang = normalizeLanguageName(rssSong.language || "");
    if (lang === "malayalam") buckets.malayalam.unshift(rssSong);
    else if (lang === "tamil") buckets.tamil.unshift(rssSong);
    else if (lang === "hindi") buckets.hindi.unshift(rssSong);
    else if (lang === "english") buckets.english.unshift(rssSong);
  }

  // Deduplicate within each language bucket
  const cleanBuckets = { malayalam: [], tamil: [], hindi: [], english: [] };
  const globalSeenKeys = new Set();

  for (const langKey of DEFAULT_LANGUAGE_PRIORITY) {
    for (const item of buckets[langKey]) {
      const core = normalizeTokenComparison(extractCoreTrackTitle(item.trackName || "") || item.trackName || "");
      const variant = extractTrackVariantTag(item.trackName || "", item.collectionName || "");
      const primaryArt = normalizeTokenComparison(String(item.artistName || "").split(/[,&]/)[0]);
      const key = `${core}__${variant}__${langKey}__${primaryArt}`;
      if (!core || globalSeenKeys.has(key)) continue;
      globalSeenKeys.add(key);
      cleanBuckets[langKey].push(item);
    }
  }

  // Compose the prioritized candidate list:
  // Top priority: Malayalam (12 tracks) & Tamil (11 tracks), followed by Hindi (8 tracks), and English last (6 tracks)
  const prioritizedCandidates = [
    // Lead with top Malayalam & Tamil hits interleaved so the hero/featured section is immediately Malayalam & Tamil
    ...cleanBuckets.malayalam.slice(0, 6),
    ...cleanBuckets.tamil.slice(0, 6),
    ...cleanBuckets.malayalam.slice(6, 12),
    ...cleanBuckets.tamil.slice(6, 11),
    ...cleanBuckets.hindi.slice(0, 8),
    ...cleanBuckets.english.slice(0, 6)
  ].slice(0, 38);

  // Batch-resolve top 28 Apple Music tracks on JioSaavn in parallel with language-aware queries
  const tracksToEagerResolve = prioritizedCandidates.slice(0, 28);
  const saavnLookups = await Promise.allSettled(
    tracksToEagerResolve.map(t => {
      const cleanT = extractVariantAwareTrackTitle(t.trackName || "", t.collectionName || "");
      const firstArt = String(t.artistName || "").split(/[,&]/)[0].trim();
      const langHint = t.language && t.language !== "english" ? t.language : "";
      return fetchSaavnJson(
        {
          __call: "search.getResults",
          api_version: "4",
          n: "5",
          p: "1",
          q: `${cleanT} ${firstArt}`.trim()
        },
        3400,
        langHint || "malayalam,tamil,hindi,english"
      );
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
  for (const curated of prioritizedCandidates) {
    const matchedSaavn = findBestSaavnMatchForCuratedTrack(curated, healedSaavnPool, curated.language || "");
    enrichedHomeSongs.push(buildCuratedBridgedSongObject(curated, matchedSaavn, origin));
  }

  const deduplicatedSongs = deduplicateEnrichedSongs(enrichedHomeSongs);

  // Sort strictly by our language hierarchy (Malayalam -> Tamil -> Hindi -> English) while preferring direct 320kbps CDN-ready tracks within each tier
  const langRank = { malayalam: 1, tamil: 2, hindi: 3, english: 4 };
  const finalSongs = deduplicatedSongs.sort((a, b) => {
    const rankA = langRank[a.language] || 5;
    const rankB = langRank[b.language] || 5;
    if (rankA !== rankB) return rankA - rankB;
    const readyA = a.decrypted_media_url?.includes("saavncdn.com") ? 0 : 1;
    const readyB = b.decrypted_media_url?.includes("saavncdn.com") ? 0 : 1;
    return readyA - readyB;
  }).slice(0, 36);

  // Build 100% Apple Music Featured Albums ordered Malayalam -> Tamil -> Hindi -> English
  const allRawAlbums = [
    ...malayalamCatalog.albums,
    ...tamilCatalog.albums,
    ...hindiCatalog.albums,
    ...appleLiveRss.albums,
    ...englishCatalog.albums
  ];
  const curatedAlbums = [];
  const seenAlbumIds = new Set();

  for (const amAlb of allRawAlbums) {
    const albId = `apple:${amAlb.appleAlbumId}`;
    const normTitle = normalizeTokenComparison(amAlb.title);
    if (!normTitle || seenAlbumIds.has(albId) || seenAlbumIds.has(normTitle)) continue;
    seenAlbumIds.add(albId);
    seenAlbumIds.add(normTitle);
    curatedAlbums.push({
      id: albId,
      albumid: albId,
      language: amAlb.language || "malayalam",
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

  const sortedAlbums = curatedAlbums.sort((a, b) => {
    return (langRank[a.language] || 5) - (langRank[b.language] || 5);
  }).slice(0, 24);

  return {
    source: "AppleMusicExclusiveCuratedCharts",
    updatedAt: new Date().toISOString(),
    dateSlice: timeSlice,
    languageOrder: DEFAULT_LANGUAGE_PRIORITY,
    songs: finalSongs,
    albums: sortedAlbums,
    sections: {
      malayalam: finalSongs.filter(s => s.language === "malayalam"),
      tamil: finalSongs.filter(s => s.language === "tamil"),
      hindi: finalSongs.filter(s => s.language === "hindi"),
      english: finalSongs.filter(s => s.language === "english"),
      featuredAlbums: sortedAlbums
    },
    results: finalSongs,
    list: finalSongs
  };
}

async function resolveCompleteAlbum(albumIdOrToken, origin) {
  const cleanId = String(albumIdOrToken || "").trim();
  if (!cleanId) throw new Error("Missing album ID");

  // Support Apple Music Bridged Albums (`apple:12345678`)
  if (cleanId.startsWith("apple:")) {
    const appleColId = cleanId.replace(/^apple:/, "");
    try {
      const res = await fetchWithTimeout(
        `https://itunes.apple.com/lookup?id=${encodeURIComponent(appleColId)}&entity=song&country=in`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        4200
      );
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        const colInfo = results.find(r => r.wrapperType === "collection") || results[0] || {};
        const trackItems = results.filter(r => r.wrapperType === "track");
        const albumTitle = cleanText(colInfo.collectionName || "Album");
        const artistName = cleanText(colInfo.artistName || "Artist");
        const albumLang = inferTrackLanguage({
          primaryGenreName: colInfo.primaryGenreName || "",
          title: albumTitle,
          artist: artistName
        });

        let saavnPool = [];
        try {
          const sSearch = await fetchSaavnJson(
            {
              __call: "search.getResults",
              api_version: "4",
              n: "30",
              p: "1",
              q: `${extractCoreTrackTitle(albumTitle)} ${artistName.split(/[,&]/)[0]}`
            },
            3800,
            albumLang || "malayalam,tamil,hindi,english"
          );
          saavnPool = await batchHealMissingMediaUrls(sSearch?.results || []);
        } catch {}

        const enrichedSongs = trackItems.map(t => {
          const matched = findBestSaavnMatchForCuratedTrack(t, saavnPool, albumLang);
          return buildCuratedBridgedSongObject({ ...t, language: albumLang }, matched, origin);
        });

        const hiResImg = upgradeImage(colInfo.artworkUrl100 || "");
        return {
          id: cleanId,
          albumid: cleanId,
          language: albumLang || "malayalam",
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
// INTELLIGENT MULTI-LANGUAGE & VARIANT-AWARE HYBRID SEARCH ENGINE v10.0
// ============================================================================

/**
 * Scores a search result candidate against the user's query with:
 * - Exact Variant Matching ("Kalyani" vs "Kalyani Remix")
 * - Language Priority Boosting (Malayalam > Tamil > Hindi > English, and demoting Telugu unless requested)
 * - Phonetic & Fuzzy Indian Transliteration Tolerance
 */
function scoreSearchCandidateForQuery(song, rawQuery, explicitQueryLang = "") {
  if (!song) return -999;
  const qNorm = normalizeTokenComparison(rawQuery);
  const qCore = normalizeTokenComparison(extractCoreTrackTitle(rawQuery) || rawQuery);
  const qVariant = extractTrackVariantTag(rawQuery);

  const sTitle = song.title || song.song || "";
  const sAlbum = song.album || song.more_info?.album || "";
  const sArtist = song.artist || song.primary_artists || "";
  const sCore = normalizeTokenComparison(extractCoreTrackTitle(sTitle) || sTitle);
  const sFullNorm = normalizeTokenComparison(sTitle);
  const sAlbumNorm = normalizeTokenComparison(sAlbum);
  const sArtistNorm = normalizeTokenComparison(sArtist);
  const sVariant = song.variant || extractTrackVariantTag(sTitle, sAlbum);

  let score = 0;

  // 1. Title Similarity
  if (sCore === qCore || sFullNorm === qNorm) {
    score += 130;
  } else if (sCore.startsWith(qCore) || qCore.startsWith(sCore)) {
    score += 95;
  } else if (sCore.includes(qCore) || sFullNorm.includes(qNorm)) {
    score += 75;
  } else if (sAlbumNorm === qCore || sAlbumNorm.includes(qCore)) {
    score += 65;
  } else if (sArtistNorm.includes(qCore)) {
    score += 60;
  } else {
    const qWords = qNorm.split(" ").filter(w => w.length >= 2);
    const combinedMeta = `${sFullNorm} ${sAlbumNorm} ${sArtistNorm}`;
    const matchedWords = qWords.filter(w => combinedMeta.includes(w));
    if (qWords.length > 0) {
      score += Math.round((matchedWords.length / qWords.length) * 65);
    }
  }

  // 2. Strict Variant Alignment ("Kalyani" vs "Kalyani Remix")
  if (qVariant !== "standard") {
    if (sVariant === qVariant) {
      score += 160; // User asked for Remix/LoFi/Slowed and this track is the exact Remix/LoFi/Slowed!
    } else {
      score -= 140; // User asked for Remix, demote standard version below the remix
    }
  } else {
    if (sVariant === "standard") {
      score += 55; // User asked for standard song, keep standard version above remixes
    } else {
      score -= 60;
    }
  }

  // 3. Language Preference Hierarchy (Malayalam > Tamil > Hindi > English >> Telugu)
  score += getLanguagePreferenceBoost(song.language, explicitQueryLang);

  // 4. Direct 320kbps CDN Readiness Bonus
  if (song.decrypted_media_url && song.decrypted_media_url.includes("saavncdn.com")) {
    score += 30;
  }

  return score;
}

async function executeIntelligentHybridSearch(query, origin) {
  const q = String(query || "Trending").trim();

  if (/^(trending|top\s*hits|top\s*songs|popular|home|new\s*releases|featured)$/i.test(q)) {
    const homeFeed = await fetchAppleMusicExclusiveHomeFeed("malayalam,tamil,hindi,english", origin);
    return {
      query: q,
      songs: homeFeed.songs,
      albums: homeFeed.albums
    };
  }

  const explicitLang = detectExplicitLanguageInQuery(q);
  const queryVariant = extractTrackVariantTag(q);
  const saavnCookieLangs = explicitLang
    ? `${explicitLang},malayalam,tamil,hindi,english`
    : "malayalam,tamil,hindi,english";

  // Build smart query variations (e.g., if searching for a song without language or with movie/artist tokens)
  const [
    itunesSongsInRes,
    itunesAlbumsInRes,
    saavnPrimaryRes,
    saavnAlbumsRes
  ] = await Promise.allSettled([
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=24`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      3400
    ).then(r => (r.ok ? r.json() : null)),
    fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=album&limit=12`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      3400
    ).then(r => (r.ok ? r.json() : null)),
    fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "35", p: "1", q }, 4200, saavnCookieLangs),
    fetchSaavnJson({ __call: "search.getAlbumResults", api_version: "4", n: "16", p: "1", q }, 4200, saavnCookieLangs)
  ]);

  const appleSongHits = (itunesSongsInRes.status === "fulfilled" && Array.isArray(itunesSongsInRes.value?.results))
    ? itunesSongsInRes.value.results
    : [];

  let saavnRawSongs = (saavnPrimaryRes.status === "fulfilled" && Array.isArray(saavnPrimaryRes.value?.results))
    ? [...saavnPrimaryRes.value.results]
    : [];

  // Check if JioSaavn returned predominantly Telugu results for a pan-Indian song when the user didn't ask for Telugu!
  const nonTeluguCount = saavnRawSongs.filter(s => {
    const l = normalizeLanguageName(s?.language || s?.more_info?.language || "");
    return l === "malayalam" || l === "tamil" || l === "hindi";
  }).length;

  const secondaryQueries = [];
  if (appleSongHits.length > 0) {
    const topApple = appleSongHits[0];
    const appleCleanQ = `${extractVariantAwareTrackTitle(topApple.trackName, topApple.collectionName)} ${String(topApple.artistName || "").split(/[,&]/)[0]}`.trim();
    if (appleCleanQ && appleCleanQ.toLowerCase() !== q.toLowerCase() && saavnRawSongs.length < 6) {
      secondaryQueries.push(appleCleanQ);
    }
  }

  // If Telugu dominated a generic query for an Indian song, fire parallel Tamil & Malayalam targeted queries on JioSaavn!
  if (!explicitLang && saavnRawSongs.length > 0 && nonTeluguCount < 2) {
    const coreQ = extractCoreTrackTitle(q) || q;
    secondaryQueries.push(`${coreQ} malayalam`);
    secondaryQueries.push(`${coreQ} tamil`);
  }

  // If the user searched for a Remix (or if a popular song also has a famous Remix), ensure variant coverage
  if (queryVariant !== "standard" && !saavnRawSongs.some(s => extractTrackVariantTag(s?.title || "", s?.more_info?.album || "") === queryVariant)) {
    const coreQ = extractCoreTrackTitle(q);
    const varWord = queryVariant.split("+")[0];
    if (coreQ) secondaryQueries.push(`${coreQ} ${varWord}`);
  }

  if (secondaryQueries.length > 0) {
    const extraSettled = await Promise.allSettled(
      [...new Set(secondaryQueries)].slice(0, 3).map(sq =>
        fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "16", p: "1", q: sq }, 3000, saavnCookieLangs)
      )
    );
    for (const ex of extraSettled) {
      if (ex.status === "fulfilled" && Array.isArray(ex.value?.results)) {
        saavnRawSongs.push(...ex.value.results);
      }
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

    const matchedSaavn = findBestSaavnMatchForCuratedTrack(appleHit, healedSaavnPool, explicitLang);
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

  // Rank all candidates using our variant-aware, language-hierarchy-aware scorer
  const scoredSongs = deduplicatedSongs
    .map(song => ({
      song,
      score: scoreSearchCandidateForQuery(song, q, explicitLang)
    }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.song)
    .slice(0, 32);

  const finalAlbums = [];
  const seenAlbumKeys = new Set();

  if (itunesAlbumsInRes.status === "fulfilled" && Array.isArray(itunesAlbumsInRes.value?.results)) {
    for (const col of itunesAlbumsInRes.value.results) {
      if (!col?.collectionId || !col?.collectionName) continue;
      const cleanName = cleanText(col.collectionName);
      const lang = inferTrackLanguage({
        primaryGenreName: col.primaryGenreName || "",
        title: cleanName,
        artist: col.artistName || ""
      });
      if (!explicitLang && lang === "telugu") continue;
      const key = `${normalizeTokenComparison(cleanName)}__${lang}`;
      if (key && !seenAlbumKeys.has(key)) {
        seenAlbumKeys.add(key);
        const hiImg = upgradeImage(col.artworkUrl100 || "");
        const appleAlbId = `apple:${col.collectionId}`;
        finalAlbums.push({
          id: appleAlbId,
          albumid: appleAlbId,
          language: lang || "malayalam",
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
      if (!explicitLang && enrichedAlb.language === "telugu") continue;
      const key = `${normalizeTokenComparison(enrichedAlb.title)}__${enrichedAlb.language}`;
      if (key && !seenAlbumKeys.has(key)) {
        seenAlbumKeys.add(key);
        finalAlbums.push(enrichedAlb);
      }
    }
  }

  return {
    query: q,
    songs: scoredSongs,
    albums: finalAlbums.slice(0, 18)
  };
}

// ============================================================================
// SPOTIFY-STYLE INTELLIGENT AUTOPLAY & SIMILAR SONGS ENGINE (`/reco`, `/upnext`)
// ============================================================================

/**
 * Multi-Vector Spotify-Grade Recommendation & Autoplay Engine:
 * 1. Extracts Track DNA (`seedLanguage`, `seedArtists`, `seedComposer`, `seedAlbum`, `seedVariant`, `seedYear`, `seedDuration`).
 * 2. Queries 4 parallel similarity graphs:
 *    - Graph A: JioSaavn Collaborative Filtering (`reco.getreco`) locked to the seed track's language
 *    - Graph B: Apple Music Artist & Genre Top Catalog (`itunes.apple.com/search`)
 *    - Graph C: Deezer Artist Radio & Top Tracks (`api.deezer.com/search`)
 *    - Graph D: Same-Language Composer & Peer Artist Discovery (`search.getResults` for composer + primary artist)
 * 3. Ranks every candidate using Acoustic & Contextual Affinity (Language Lock, Composer/Vocalist Match,
 *    Vibe/Variant Cohesion, Release Era Proximity) and applies Spotify's Anti-Fatigue Artist Spacing rule!
 */
async function resolveIntelligentRecommendations(seedIdOrQuery, origin, explicitLang = "") {
  let effectiveSeedId = String(seedIdOrQuery || "").trim();
  if (!effectiveSeedId && RECENTLY_PLAYED_IDS.length > 0) {
    effectiveSeedId = RECENTLY_PLAYED_IDS[0];
  }

  const cacheKey = `${effectiveSeedId}__${explicitLang}`;
  if (effectiveSeedId && RECO_QUEUE_MEMO.has(cacheKey)) {
    return RECO_QUEUE_MEMO.get(cacheKey);
  }

  // Step 1: Resolve full Seed Track DNA
  let seedSong = effectiveSeedId ? SONG_META_MEMO.get(effectiveSeedId) : null;
  if (!seedSong && /^\d+$/.test(effectiveSeedId)) {
    try {
      const d = await fetchSaavnJson({ __call: "song.getDetails", pids: effectiveSeedId }, 3200);
      const raw = d?.[effectiveSeedId] || d?.songs?.[0] || Object.values(d || {})[0];
      if (raw) seedSong = enrichSaavnSong(raw, origin);
    } catch {}
  } else if (!seedSong && effectiveSeedId.startsWith("apple:")) {
    const appleId = effectiveSeedId.slice(6);
    try {
      const r = await fetchWithTimeout(
        `https://itunes.apple.com/lookup?id=${encodeURIComponent(appleId)}&country=in`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        2800
      );
      if (r.ok) {
        const j = await r.json();
        if (j?.results?.[0]) {
          seedSong = buildCuratedBridgedSongObject(j.results[0], null, origin);
        }
      }
    } catch {}
  }

  const seedTitle = cleanText(seedSong?.title || "");
  const seedCoreTitle = normalizeTokenComparison(extractCoreTrackTitle(seedTitle) || seedTitle);
  const seedArtists = Array.isArray(seedSong?.allArtists) && seedSong.allArtists.length > 0
    ? seedSong.allArtists
    : String(seedSong?.artist || "").split(/[,&]/).map(cleanText).filter(Boolean);
  const primaryArtist = seedArtists[0] || "";
  const secondaryArtist = seedArtists[1] || "";
  const seedComposer = cleanText(seedSong?.composer || seedSong?.more_info?.music || "");
  const seedAlbum = cleanText(seedSong?.album || "");
  const seedVariant = seedSong?.variant || extractTrackVariantTag(seedTitle, seedAlbum);
  const seedYear = parseInt(seedSong?.year || "0", 10) || 2025;
  const seedDuration = seedSong?.duration || 210;

  const seedLanguage = normalizeLanguageName(explicitLang || seedSong?.language || "") || inferTrackLanguage({
    title: seedTitle,
    album: seedAlbum,
    artist: `${seedArtists.join(" ")} ${seedComposer}`
  }) || "malayalam";

  // Determine numeric JioSaavn PID if seed is `apple:...` or `spotify:...`
  let numericSaavnPid = /^\d+$/.test(effectiveSeedId) ? effectiveSeedId : "";
  if (!numericSaavnPid && seedTitle) {
    try {
      const lookupSaavn = await fetchSaavnJson(
        {
          __call: "search.getResults",
          api_version: "4",
          n: "4",
          p: "1",
          q: `${extractCoreTrackTitle(seedTitle)} ${primaryArtist}`.trim()
        },
        2600,
        seedLanguage
      );
      if (lookupSaavn?.results?.[0]?.id) {
        numericSaavnPid = String(lookupSaavn.results[0].id);
      }
    } catch {}
  }

  // Secondary companion language based on user hierarchy (Malayalam <-> Tamil -> Hindi -> English)
  const companionLang = seedLanguage === "malayalam"
    ? "tamil"
    : (seedLanguage === "tamil" ? "malayalam" : "malayalam");

  const recoLangCookie = `${seedLanguage},${companionLang},hindi,english`;

  // Step 2: Query all 4 Similarity Graphs in Parallel
  const [
    saavnCollabRes,
    saavnComposerArtistRes,
    saavnAlbumPeersRes,
    appleArtistGraphRes,
    deezerRadioRes
  ] = await Promise.allSettled([
    // Graph 1: JioSaavn Collaborative Filtering (`reco.getreco`)
    numericSaavnPid
      ? fetchSaavnJson(
          {
            __call: "reco.getreco",
            api_version: "4",
            pid: numericSaavnPid,
            language: recoLangCookie
          },
          3500,
          recoLangCookie
        )
      : Promise.resolve([]),

    // Graph 2: Same-Language Composer & Primary Artist Deep Search on JioSaavn
    fetchSaavnJson(
      {
        __call: "search.getResults",
        api_version: "4",
        n: "24",
        p: "1",
        q: `${seedComposer || primaryArtist} ${seedLanguage} hits`.trim()
      },
      3500,
      recoLangCookie
    ),

    // Graph 3: Companion Artist / Movie Vibe Search on JioSaavn
    fetchSaavnJson(
      {
        __call: "search.getResults",
        api_version: "4",
        n: "18",
        p: "1",
        q: secondaryArtist
          ? `${secondaryArtist} ${seedLanguage}`.trim()
          : `${primaryArtist} ${seedYear >= 2023 ? seedYear : ""} ${seedLanguage}`.trim()
      },
      3400,
      recoLangCookie
    ),

    // Graph 4: Apple Music Artist & Genre Popularity Graph
    primaryArtist
      ? fetchWithTimeout(
          `https://itunes.apple.com/search?term=${encodeURIComponent(`${primaryArtist} ${seedLanguage}`)}&country=in&media=music&entity=song&limit=15`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          3000
        ).then(r => (r.ok ? r.json() : null))
      : Promise.resolve(null),

    // Graph 5: Deezer Track/Artist Similarity Graph
    primaryArtist
      ? fetchWithTimeout(
          `https://api.deezer.com/search?q=${encodeURIComponent(`artist:"${primaryArtist}"`)}&limit=10`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          2600
        ).then(r => (r.ok ? r.json() : null))
      : Promise.resolve(null)
  ]);

  const rawSaavnPool = [];
  const collabIds = new Set();

  if (saavnCollabRes.status === "fulfilled" && Array.isArray(saavnCollabRes.value)) {
    for (const item of saavnCollabRes.value) {
      if (item?.id) {
        collabIds.add(String(item.id));
        rawSaavnPool.push(item);
      }
    }
  }
  if (saavnComposerArtistRes.status === "fulfilled" && Array.isArray(saavnComposerArtistRes.value?.results)) {
    rawSaavnPool.push(...saavnComposerArtistRes.value.results);
  }
  if (saavnAlbumPeersRes.status === "fulfilled" && Array.isArray(saavnAlbumPeersRes.value?.results)) {
    rawSaavnPool.push(...saavnAlbumPeersRes.value.results);
  }

  const filteredRaw = rawSaavnPool.filter(s => !isLowQualityJunkTrack(s, seedTitle));
  const healedPool = await batchHealMissingMediaUrls(filteredRaw);

  // Boost tracks that also appear in Apple Music's or Deezer's top artist tracks
  const popularTitlesSet = new Set();
  if (appleArtistGraphRes.status === "fulfilled" && Array.isArray(appleArtistGraphRes.value?.results)) {
    for (const r of appleArtistGraphRes.value.results) {
      const normT = normalizeTokenComparison(extractCoreTrackTitle(r.trackName || ""));
      if (normT) popularTitlesSet.add(normT);
    }
  }
  if (deezerRadioRes.status === "fulfilled" && Array.isArray(deezerRadioRes.value?.data)) {
    for (const d of deezerRadioRes.value.data) {
      const normT = normalizeTokenComparison(extractCoreTrackTitle(d.title_short || d.title || ""));
      if (normT) popularTitlesSet.add(normT);
    }
  }

  const enrichedCandidates = deduplicateEnrichedSongs(
    healedPool.map(s => enrichSaavnSong(s, origin)).filter(Boolean)
  );

  // Step 3: Score every candidate using our Spotify-Style Acoustic & Contextual Affinity Algorithm
  const normSeedArtists = seedArtists.map(a => normalizeTokenComparison(a)).filter(Boolean);
  const normSeedComposer = normalizeTokenComparison(seedComposer);
  const normSeedAlbum = normalizeTokenComparison(extractCoreTrackTitle(seedAlbum));

  const scoredCandidates = [];
  for (const cand of enrichedCandidates) {
    if (!cand || !cand.id) continue;
    // Never recommend the seed song itself or recently played songs
    if (String(cand.id) === String(effectiveSeedId) || String(cand.id) === String(numericSaavnPid)) continue;
    const candCore = normalizeTokenComparison(extractCoreTrackTitle(cand.title) || cand.title);
    if (seedCoreTitle && candCore === seedCoreTitle) continue;

    let affinity = 0;

    // 1. Language Continuity Lock (Prevents jarring language jumps; blocks unwanted Telugu drift)
    const candLang = normalizeLanguageName(cand.language);
    if (candLang === seedLanguage) {
      affinity += 130;
    } else if (candLang === companionLang) {
      affinity += 50;
    } else if (candLang === "telugu" && seedLanguage !== "telugu") {
      affinity -= 200;
      continue;
    } else {
      affinity += getLanguagePreferenceBoost(candLang) * 0.35;
    }

    // 2. Collaborative Filtering Signal (JioSaavn acoustic/co-listen graph)
    if (collabIds.has(String(cand.id))) {
      affinity += 80;
    }

    // 3. Apple Music & Deezer Popularity Verification Signal
    if (popularTitlesSet.has(candCore)) {
      affinity += 70;
    }

    // 4. Composer / Musical Director & Vocalist Affinity
    const candArtistNorm = normalizeTokenComparison(`${cand.artist} ${cand.composer || ""}`);
    let sharedArtistCount = 0;
    for (const sa of normSeedArtists) {
      if (sa && candArtistNorm.includes(sa)) {
        sharedArtistCount++;
      }
    }
    if (sharedArtistCount > 0) {
      affinity += Math.min(90, sharedArtistCount * 55);
    }
    if (normSeedComposer && candArtistNorm.includes(normSeedComposer)) {
      affinity += 65;
    }

    // 5. Same Movie/OST Companion Track Boost
    const candAlbumNorm = normalizeTokenComparison(extractCoreTrackTitle(cand.album || ""));
    if (normSeedAlbum && candAlbumNorm && normSeedAlbum === candAlbumNorm) {
      affinity += 45;
    }

    // 6. Vibe / Variant Cohesion (e.g. Remix -> Upbeat/Remix, LoFi -> LoFi/Melody)
    if (cand.variant === seedVariant) {
      affinity += 35;
    }

    // 7. Release Era Proximity
    const candYear = parseInt(cand.year || "0", 10);
    if (seedYear > 1970 && candYear > 1970) {
      const yearDiff = Math.abs(seedYear - candYear);
      if (yearDiff <= 2) affinity += 40;
      else if (yearDiff <= 5) affinity += 22;
      else if (yearDiff > 15) affinity -= 25;
    }

    // 8. Duration & Tempo Cohesion
    if (seedDuration > 0 && cand.duration > 0) {
      const durDiff = Math.abs(seedDuration - cand.duration);
      if (durDiff <= 35) affinity += 20;
    }

    // Penalize if recently played in session
    if (RECENTLY_PLAYED_IDS.includes(String(cand.id))) {
      affinity -= 60;
    }

    scoredCandidates.push({ cand, affinity });
  }

  scoredCandidates.sort((a, b) => b.affinity - a.affinity);

  // Step 4: Apply Spotify's Anti-Fatigue "Artist & Album Spread" Diversity Filter
  // Ensures we don't play 4 songs from the exact same movie or exact same artist consecutively
  const finalQueue = [];
  const deferredQueue = [];
  const recentArtistWindow = [];
  const albumCountMap = new Map();

  for (const { cand } of scoredCandidates) {
    const leadArt = normalizeTokenComparison(String(cand.artist || "").split(",")[0]);
    const albKey = normalizeTokenComparison(cand.album || "");
    const albCount = albumCountMap.get(albKey) || 0;

    const consecutiveSameArtist = recentArtistWindow.length >= 2 &&
      recentArtistWindow[recentArtistWindow.length - 1] === leadArt &&
      recentArtistWindow[recentArtistWindow.length - 2] === leadArt;

    if (consecutiveSameArtist || albCount >= 2) {
      deferredQueue.push(cand);
    } else {
      finalQueue.push(cand);
      recentArtistWindow.push(leadArt);
      if (albKey) albumCountMap.set(albKey, albCount + 1);
    }
    if (finalQueue.length >= 22) break;
  }

  for (const d of deferredQueue) {
    if (finalQueue.length >= 25) break;
    finalQueue.push(d);
  }

  const resultPayload = {
    pid: effectiveSeedId,
    seedTrack: seedSong
      ? {
          id: seedSong.id,
          title: seedSong.title,
          artist: seedSong.artist,
          language: seedLanguage,
          variant: seedVariant
        }
      : null,
    engine: "ProjectVeloSpotifyAffinityEngine/10.0",
    language: seedLanguage,
    count: finalQueue.length,
    upNext: finalQueue[0] || null,
    songs: finalQueue,
    results: finalQueue,
    list: finalQueue
  };

  if (effectiveSeedId) {
    setBoundedMemo(RECO_QUEUE_MEMO, cacheKey, resultPayload, 400);
  }
  return resultPayload;
}

// ============================================================================
// REAL-TIME WORD-BY-WORD LYRICS ENGINE v10.0
// (DEEP APPLE MUSIC TTML & SYLLABLES + ANTI-ARABIC/FOREIGN GUARD + REMIX ISOLATION)
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

/**
 * Extracts search tokens for Lyrics while strictly preserving:
 * - `coreTitle` (e.g. "Kalyani")
 * - `variantTitle` (e.g. "Kalyani Remix" when the track is a Remix!)
 * - `ostTitle` (e.g. "Kalyani (From \"Marco\")" for Apple Music India catalog matching!)
 * - `variantTag` (`standard` vs `remix`, `lofi`, `slowed`, `unplugged`, etc.)
 */
function extractLyricsSearchTokens(rawTitle, rawArtist, rawAlbum, extraArtists = [], explicitVariant = "", explicitLang = "") {
  const fullTitle = cleanText(rawTitle || "");
  let extractedMovie = "";
  const fromMatch = fullTitle.match(/(?:from|movie|film)\s+["'“”‘’]?([^)"'\]”’]+)["'“”‘’]?/i);
  if (fromMatch && fromMatch[1]) {
    extractedMovie = fromMatch[1].trim();
  }

  const variantTag = explicitVariant || extractTrackVariantTag(fullTitle, rawAlbum);
  const coreTitle = extractCoreTrackTitle(fullTitle) || fullTitle;
  const variantAwareTitle = extractVariantAwareTrackTitle(fullTitle, rawAlbum);

  const titleParts = coreTitle
    .split(/\s*[-–—:|/]\s*/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);

  // If this is a Remix/Variant track, `primaryTitle` is the variant-aware title (e.g., "Kalyani Remix")
  // and `coreTitle` is the base ("Kalyani"). That way, "Kalyani Remix" searches for "Kalyani Remix" first!
  const cleanCorePrimary = titleParts[0] || coreTitle || fullTitle;
  const primaryTitle = variantTag !== "standard" ? variantAwareTitle : cleanCorePrimary;
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
    cleanAlbum.toLowerCase() !== cleanCorePrimary.toLowerCase()
  )
    ? cleanAlbum
    : (extractedMovie || "");

  // Build Apple Music India OST-style title: `Song (From "Movie")`
  const ostTitle = validAlbum && variantTag === "standard"
    ? `${cleanCorePrimary} (From "${validAlbum}")`
    : fullTitle;

  const language = inferTrackLanguage({
    explicitLanguage: explicitLang,
    title: fullTitle,
    album: validAlbum,
    artist: uniqueArtists.join(" ")
  });

  return {
    primaryTitle,
    coreTitle: cleanCorePrimary,
    variantAwareTitle,
    ostTitle,
    fullRawTitle: fullTitle,
    secondaryTitle,
    baseTitle: coreTitle || primaryTitle,
    variantTag,
    language: language || "malayalam",
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
 * real-time word-by-word timeline.
 * Fixes the bug where relative syllable timestamps or raw millisecond numbers caused lines to
 * jump straight from start to end!
 */
function finalizeTimelineMonotonic(rawEntries, totalDurationSec = 0, trackTitle = "", artistName = "") {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) return [];

  // Auto-detect if entry.time values were accidentally left in milliseconds
  const maxEntryTime = rawEntries.reduce((m, e) => Math.max(m, Number(e?.time) || 0), 0);
  const timeScale = maxEntryTime > 1200 ? 0.001 : 1.0;

  const cleanedEntries = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const item = rawEntries[i];
    if (!item) continue;
    const rawText = String(item.text || "").trim();
    const scaledStart = Math.max(0, (Number(item.time) || 0) * timeScale);
    let scaledEnd = item.endTime ? Number(item.endTime) * timeScale : 0;
    if (scaledEnd > 1200 && timeScale === 1.0) {
      scaledEnd = scaledEnd / 1000;
    }

    if (rawText !== "♪" && rawText !== "♪ • • •") {
      if (isCreditOrMetadataJunkLine(rawText, trackTitle, artistName, cleanedEntries.length, scaledStart)) {
        continue;
      }
    }
    const cleanLine = (rawText === "♪" || rawText === "♪ • • •")
      ? rawText
      : sanitizeLyricLineText(rawText);

    if (!cleanLine) continue;
    if (cleanLine !== "♪" && cleanLine !== "♪ • • •" && isCreditOrMetadataJunkLine(cleanLine, trackTitle, artistName, cleanedEntries.length, scaledStart)) {
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
      time: scaledStart,
      endTime: scaledEnd > scaledStart ? scaledEnd : 0,
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
    const fallbackEnd = totalDurationSec > entry.time
      ? Math.min(totalDurationSec, entry.time + 6.0)
      : entry.time + 4.5;
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

      // Detect if inline word timestamps are relative offsets from `entry.time` or in milliseconds
      const maxInlineT = validInline.reduce((m, iw) => Math.max(m, Number(iw.time) || 0), 0);
      const inlineScale = maxInlineT > 1200 ? 0.001 : 1.0;
      const firstInlineSec = (Number(validInline[0]?.time) || 0) * inlineScale;
      const isRelativeToLine = entry.time > 2.5 && firstInlineSec < entry.time - 1.5 && firstInlineSec < 15;

      const romanTokens = entry.romanizedText ? entry.romanizedText.split(/\s+/).filter(Boolean) : [];
      const canMapRoman1To1 = romanTokens.length === validInline.length;

      let cursorSec = entry.time;
      words = validInline.map((iw, wIdx) => {
        const nextIw = validInline[wIdx + 1];
        const rawWText = String(iw.word || iw.text || "").trim();
        const nativeWText = iw.nativeWord || rawWText;
        const romanWText = iw.romanizedWord
          || (canMapRoman1To1 ? romanTokens[wIdx] : (hasIndicScriptChars(rawWText) ? transliterateIndicToRoman(rawWText) : rawWText));

        let rawWStart = (Number(iw.time) || 0) * inlineScale;
        let rawWEnd = iw.endTime ? Number(iw.endTime) * inlineScale : 0;
        if (isRelativeToLine) {
          rawWStart += entry.time;
          if (rawWEnd > 0) rawWEnd += entry.time;
        }

        const wStart = Number(Math.max(cursorSec, Math.min(nextStartTime - 0.05, rawWStart || cursorSec)).toFixed(3));
        let nextWordStart = nextIw
          ? ((Number(nextIw.time) || 0) * inlineScale + (isRelativeToLine ? entry.time : 0))
          : 0;
        let computedEnd = rawWEnd > wStart
          ? rawWEnd
          : (nextWordStart > wStart ? nextWordStart : wStart + 0.32);
        if (nextWordStart > wStart && computedEnd > nextWordStart) {
          computedEnd = nextWordStart;
        }
        const wEnd = Number(Math.max(wStart + 0.05, Math.min(nextStartTime, computedEnd)).toFixed(3));
        const wDur = Number(Math.max(0.05, wEnd - wStart).toFixed(3));
        cursorSec = wEnd;

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

/**
 * Parses Paxsenix's Native Apple Music JSON Syllable Array:
 * `[ { timestamp, endtime, text: [ { text, timestamp, endtime, part } ] } ]`
 * Automatically normalizes ms vs seconds and relative vs absolute syllable offsets.
 */
function parsePaxsenixAppleJsonToTimeline(rawArray, totalDurationSec = 0, trackTitle = "", artistName = "", expectedLang = "") {
  const list = Array.isArray(rawArray)
    ? rawArray
    : (Array.isArray(rawArray?.lyrics) ? rawArray.lyrics : (Array.isArray(rawArray?.data) ? rawArray.data : (Array.isArray(rawArray?.content) ? rawArray.content : null)));

  if (!Array.isArray(list) || list.length === 0) return [];

  const maxLineTs = list.reduce((m, l) => Math.max(m, Number(l?.timestamp ?? l?.time ?? l?.startTime) || 0), 0);
  const lineDivisor = maxLineTs > 1000 ? 1000 : 1;

  const entries = [];
  for (const line of list) {
    if (!line) continue;
    const lineStartSec = (Number(line.timestamp ?? line.time ?? line.startTime) || 0) / lineDivisor;
    const rawLineEnd = Number(line.endtime ?? line.endTime) || 0;
    const lineEndSec = rawLineEnd > 0
      ? rawLineEnd / (rawLineEnd > 1000 ? 1000 : lineDivisor)
      : (line.duration ? lineStartSec + Number(line.duration) / (Number(line.duration) > 500 ? 1000 : 1) : 0);

    if (Array.isArray(line.text)) {
      const groupedWords = [];
      let curWord = "";
      let curStart = null;
      let curEnd = null;
      let curSyllables = [];

      const maxSylTs = line.text.reduce((m, s) => Math.max(m, Number(s?.timestamp ?? s?.time) || 0), 0);
      const sylDivisor = maxSylTs > 1000 ? 1000 : lineDivisor;

      for (let k = 0; k < line.text.length; k++) {
        const syl = line.text[k];
        if (!syl || syl.background) continue;
        const rawSyl = cleanText(syl.text || "");
        if (!rawSyl) continue;

        let sStart = (Number(syl.timestamp ?? syl.time) || (lineStartSec * sylDivisor)) / sylDivisor;
        if (lineStartSec > 2.5 && sStart < lineStartSec - 1.5 && sStart < 15) {
          sStart += lineStartSec;
        }
        const rawSEnd = Number(syl.endtime ?? syl.endTime) || 0;
        let sEnd = rawSEnd > 0
          ? rawSEnd / (rawSEnd > 1000 ? 1000 : sylDivisor)
          : sStart + Math.max(0.06, (Number(syl.duration) || 220) / 1000);
        if (lineStartSec > 2.5 && sEnd < lineStartSec) {
          sEnd += lineStartSec;
        }

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

  const fullSample = entries.map(e => e.nativeText || e.text).join(" ");
  if (isIncompatibleForeignScriptLyrics(fullSample, expectedLang, trackTitle, artistName)) {
    return [];
  }

  return finalizeTimelineMonotonic(entries, totalDurationSec, trackTitle, artistName);
}

function parseLyricsPlusJsonToTimeline(data, totalDurationSec = 0, trackTitle = "", artistName = "", expectedLang = "") {
  const rawLyrics = data?.lyrics;
  if (!Array.isArray(rawLyrics) || rawLyrics.length === 0) return null;

  const maxRawTime = rawLyrics.reduce((m, l) => Math.max(m, Number(l?.time ?? l?.startTime) || 0), 0);
  const toSec = (val) => {
    const n = Number(val) || 0;
    if (n > 1200) return n / 1000;
    return maxRawTime > 1000 ? n / 1000 : n;
  };

  let hasTrueWordSync = false;
  const entries = [];

  const groupSyllabusIntoWords = (syllabusArr, lineStartSec) => {
    if (!Array.isArray(syllabusArr) || syllabusArr.length === 0) return null;
    const usesTrailingSpace = syllabusArr.some(s => typeof s?.text === "string" && /\s$/.test(s.text));
    const usesPartFlag = syllabusArr.some(s => typeof s?.part === "boolean");

    if (usesTrailingSpace || usesPartFlag) {
      const grouped = [];
      let curWordText = "";
      let curStart = null;
      let curEnd = null;
      let curSyllables = [];

      for (let k = 0; k < syllabusArr.length; k++) {
        const syl = syllabusArr[k];
        if (!syl || syl.isBackground || syl.background) continue;
        const rawSylText = String(syl.text || "");
        const trimmedSyl = cleanText(rawSylText);
        if (!trimmedSyl) continue;

        let sStart = toSec(syl.time ?? syl.timestamp);
        if (lineStartSec > 2.5 && sStart < lineStartSec - 1.5 && sStart < 15) {
          sStart += lineStartSec;
        }
        const rawDur = Number(syl.duration) || 0;
        const sDur = Math.max(0.05, rawDur > 50 ? rawDur / 1000 : (rawDur || 0.22));
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

        const isWordEnd = (usesPartFlag ? !syl.part : /\s$/.test(rawSylText)) || k === syllabusArr.length - 1;
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
        let sStart = toSec(s.time ?? s.timestamp);
        if (lineStartSec > 2.5 && sStart < lineStartSec - 1.5 && sStart < 15) {
          sStart += lineStartSec;
        }
        const rawDur = Number(s.duration) || 0;
        const sDur = Math.max(0.06, rawDur > 50 ? rawDur / 1000 : (rawDur || 0.25));
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
    const lineStart = toSec(line.time ?? line.startTime);
    const rawLineDur = Number(line.duration) || 0;
    const lineDur = rawLineDur > 500 ? rawLineDur / 1000 : toSec(rawLineDur);
    const lineEnd = lineDur > 0 ? lineStart + lineDur : 0;

    const syllabus = Array.isArray(line.syllabus) ? line.syllabus : (Array.isArray(line.words) ? line.words : []);
    let nativeLineText = cleanText(line.text || "");
    if (!nativeLineText && syllabus.length > 0) {
      nativeLineText = cleanText(syllabus.map(s => s.text || s.word || "").join(" "));
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
      inlineWords = groupSyllabusIntoWords(translitSyllabus, lineStart);
    } else if (syllabus.length > 0) {
      hasTrueWordSync = true;
      inlineWords = groupSyllabusIntoWords(syllabus, lineStart);
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

  const fullSample = entries.map(e => e.nativeText || e.text).join(" ");
  if (isIncompatibleForeignScriptLyrics(fullSample, expectedLang, trackTitle, artistName)) {
    return null;
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
  if (s.endsWith("m")) {
    return Math.max(0, parseFloat(s.slice(0, -1)) * 60);
  }
  if (s.endsWith("h")) {
    return Math.max(0, parseFloat(s.slice(0, -1)) * 3600);
  }

  const parts = s.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) {
    return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  if (parts.length === 2) {
    return Math.max(0, parts[0] * 60 + parts[1]);
  }
  // If raw numeric string without colons is > 1000, it is milliseconds!
  const val = Math.max(0, parts[0]);
  return (!s.includes(".") && val > 1000) ? val / 1000 : val;
}

/**
 * Parses Apple Music TTML XML directly into a word-by-word timeline,
 * INCLUDING `<iTunesMetadata><transliterations>` (English-written Romanized lyrics for Malayalam/Tamil/Hindi)
 * and `<translations>`!
 */
function parseTtmlToTimeline(ttmlXml, totalDurationSec = 0, trackTitle = "", artistName = "", expectedLang = "") {
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

  const fullSample = entries.map(e => e.nativeText || e.text).join(" ");
  if (isIncompatibleForeignScriptLyrics(fullSample, expectedLang, trackTitle, artistName)) {
    return [];
  }

  return finalizeTimelineMonotonic(entries, totalDurationSec, trackTitle, artistName);
}

function parseLrcToTimeline(lrcString, totalDurationSec = 0, trackTitle = "", artistName = "", expectedLang = "") {
  if (!lrcString || typeof lrcString !== "string") return { lines: [], hasEnhancedWordTags: false };

  if (isIncompatibleForeignScriptLyrics(lrcString, expectedLang, trackTitle, artistName)) {
    return { lines: [], hasEnhancedWordTags: false };
  }

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

function parseNeteaseYrcToTimeline(yrcString, totalDurationSec = 0, trackTitle = "", artistName = "", expectedLang = "") {
  if (!yrcString || typeof yrcString !== "string") return [];
  if (isIncompatibleForeignScriptLyrics(yrcString, expectedLang, trackTitle, artistName)) return [];

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

function buildEstimatedTimelineFromPlain(plainLyrics, totalDurationSec = 190, trackTitle = "", artistName = "", expectedLang = "") {
  if (!plainLyrics) return [];
  if (isIncompatibleForeignScriptLyrics(plainLyrics, expectedLang, trackTitle, artistName)) return [];

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

/**
 * Scores a lyrics candidate with:
 * - Anti-Arabic / Anti-Foreign-Script Rejection
 * - Strict Variant Isolation ("Kalyani" vs "Kalyani Remix" NEVER cross-match!)
 * - Mandatory Context Verification (requires Artist, Album, or exact Duration match so random foreign songs with the same title are rejected!)
 */
function scoreLrcCandidate(item, tokens, durationSec, preferRomanScript = false) {
  if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -999;

  const rawItemTitle = String(item.trackName || item.name || "");
  const rawItemAlbum = String(item.albumName || "");
  const rawSearchTitle = String(tokens.primaryTitle || "").toLowerCase();

  if (/\b(karaoke|8d|ringtone)\b/i.test(rawItemTitle) && !/\b(karaoke|8d|ringtone)\b/i.test(rawSearchTitle)) {
    return -500;
  }

  // 1. ANTI-ARABIC / FOREIGN SCRIPT REJECTION
  const sampleLyrics = String(item.syncedLyrics || item.plainLyrics || "");
  if (
    sampleLyrics.length > 5 &&
    isIncompatibleForeignScriptLyrics(sampleLyrics, tokens.language, tokens.primaryTitle, tokens.artists[0] || "")
  ) {
    return -999;
  }

  // 2. STRICT VARIANT ISOLATION ("Kalyani" vs "Kalyani Remix")
  const itemVariant = extractTrackVariantTag(rawItemTitle, rawItemAlbum);
  if (tokens.variantTag === "standard" && itemVariant !== "standard") {
    return -999; // NEVER give Remix lyrics to the Standard song!
  }
  if (tokens.variantTag !== "standard" && itemVariant !== tokens.variantTag) {
    return -999; // NEVER give Standard lyrics to the Remix song when scoring strict candidates!
  }

  const itemTitle = normalizeTokenComparison(extractCoreTrackTitle(rawItemTitle) || rawItemTitle);
  const itemArtist = normalizeTokenComparison(item.artistName || "");
  const itemAlbum = normalizeTokenComparison(rawItemAlbum);
  const targetTitle = normalizeTokenComparison(tokens.coreTitle || tokens.primaryTitle);
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
  let artistOrAlbumMatched = false;
  let durationCloseMatched = false;

  for (const a of tokens.artists) {
    const normA = normalizeTokenComparison(a);
    if (!normA) continue;
    const words = normA.split(" ").filter(w => w.length >= 3);
    if (itemArtist.includes(normA) || (itemArtist.length >= 3 && normA.includes(itemArtist)) || words.some(w => w.length >= 4 && itemArtist.includes(w))) {
      score += 80;
      artistOrAlbumMatched = true;
      break;
    }
    if (itemAlbum && words.some(w => w.length >= 4 && itemAlbum.includes(w))) {
      score += 55;
      artistOrAlbumMatched = true;
      break;
    }
  }

  if (tokens.album) {
    const normAlb = normalizeTokenComparison(tokens.album);
    const albWords = normAlb.split(" ").filter(w => w.length >= 3);
    if (normAlb && (itemAlbum.includes(normAlb) || itemTitle.includes(normAlb) || itemArtist.includes(normAlb) || albWords.some(w => w.length >= 4 && (itemAlbum.includes(w) || itemArtist.includes(w))))) {
      score += 70;
      artistOrAlbumMatched = true;
    }
  }

  if (durationSec > 0 && item.duration) {
    const diff = Math.abs(durationSec - Number(item.duration));
    if (diff <= 2) {
      score += 90;
      durationCloseMatched = true;
    } else if (diff <= 6) {
      score += 60;
      durationCloseMatched = true;
    } else if (diff <= 14) {
      score += 25;
    } else if (diff > 28 && !artistOrAlbumMatched) {
      return -500; // Different artist, different album, and >28s duration mismatch -> wrong song!
    } else if (diff > 40) {
      score -= 80;
    }
  }

  // MANDATORY CONTEXT CHECK: If neither Artist/Album NOR close Duration matched, reject to prevent foreign song collisions!
  if (!artistOrAlbumMatched && !durationCloseMatched) {
    return -400;
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
    const sampleText = sampleLyrics
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
 * WORLD-CLASS 5-VECTOR TRACK IDENTITY RESOLVER v10.0 (`resolveWorldClassTrackIdentity`)
 * Resolves up to 4 Apple Music Track IDs (`appleTrackIds`), ISRC, and BOTH:
 * - `canonicalTitle` (clean title, e.g., `"Kalyani"` or `"Kalyani Remix"`)
 * - `fullAppleTitle` (full Apple Music India OST title, e.g., `"Kalyani (From \"Marco\")"`)
 */
async function resolveWorldClassTrackIdentity(tokens, durationSec, explicitAppleId = "", explicitSpotifyId = "") {
  const memoKey = `${tokens.primaryTitle.toLowerCase()}__${tokens.variantTag}__${tokens.language}__${(tokens.artists[0] || "").toLowerCase()}__${tokens.album.toLowerCase()}__${durationSec}`;
  if (TRACK_IDENTITY_MEMO.has(memoKey)) {
    return TRACK_IDENTITY_MEMO.get(memoKey);
  }

  const searchTitle = tokens.variantTag !== "standard" ? tokens.variantAwareTitle : tokens.coreTitle;
  const queries = [];
  if (searchTitle && tokens.artists[0]) queries.push(`${searchTitle} ${tokens.artists[0]}`);
  if (searchTitle && tokens.album) queries.push(`${searchTitle} ${tokens.album}`);
  if (tokens.ostTitle && tokens.ostTitle !== searchTitle) queries.push(tokens.ostTitle);
  if (searchTitle && tokens.artists[1]) queries.push(`${searchTitle} ${tokens.artists[1]}`);
  if (searchTitle) queries.push(searchTitle);

  const uniqueQueries = [...new Set(queries.filter(Boolean))].slice(0, 4);
  const primaryQ = uniqueQueries[0] || searchTitle;

  const [
    explicitLookupRes,
    itunesSettled,
    paxsenixAppleSearchRes,
    deezerSearchRes
  ] = await Promise.all([
    (explicitAppleId && /^\d+$/.test(String(explicitAppleId)))
      ? fetchWithTimeout(
          `https://itunes.apple.com/lookup?id=${encodeURIComponent(explicitAppleId)}&country=in`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          2800
        ).then(r => (r.ok ? r.json() : null)).catch(() => null)
      : Promise.resolve(null),

    Promise.allSettled([
      ...uniqueQueries.slice(0, 3).map(q =>
        fetchWithTimeout(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=in&media=music&entity=song&limit=8`,
          { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
          3000
        ).then(r => (r.ok ? r.json() : null))
      ),
      fetchWithTimeout(
        `https://itunes.apple.com/search?term=${encodeURIComponent(primaryQ)}&country=us&media=music&entity=song&limit=6`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        3000
      ).then(r => (r.ok ? r.json() : null))
    ]),

    // Paxsenix Direct Apple Music Catalog Search (extended timeout to 4200ms)
    fetchWithTimeout(
      `https://lyrics.paxsenix.org/apple-music/search?q=${encodeURIComponent(primaryQ)}`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      4200
    ).then(r => (r.ok ? r.json() : null)).catch(() => null),

    fetchWithTimeout(
      `https://api.deezer.com/search?q=${encodeURIComponent(primaryQ)}&limit=6`,
      { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
      2600
    ).then(r => (r.ok ? r.json() : null)).catch(() => null)
  ]);

  const appleCandidates = [];
  const seenAppleIds = new Set();

  const pushAppleCand = (id, trackName, artistName, collectionName, durationMs, isrc = "", genreName = "") => {
    if (!id || !trackName || seenAppleIds.has(String(id))) return;
    seenAppleIds.add(String(id));
    appleCandidates.push({
      trackId: String(id),
      trackName: cleanText(trackName),
      artistName: cleanText(artistName || ""),
      collectionName: cleanText(collectionName || ""),
      durationSec: durationMs ? Math.round(Number(durationMs) / 1000) : 0,
      isrc: isrc || "",
      genreName: genreName || ""
    });
  };

  if (explicitLookupRes?.results?.[0]) {
    const r = explicitLookupRes.results[0];
    pushAppleCand(r.trackId, r.trackName, r.artistName, r.collectionName, r.trackTimeMillis, "", r.primaryGenreName);
  }

  for (const res of itunesSettled) {
    if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
      for (const r of res.value.results) {
        pushAppleCand(r.trackId, r.trackName, r.artistName, r.collectionName, r.trackTimeMillis, "", r.primaryGenreName);
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
    const genre = item?.attributes?.genreNames?.[0] || "";
    pushAppleCand(id, name, art, alb, durMs > 1000 ? durMs : durMs * 1000, isrc, genre);
  }

  const scoredApple = [];
  for (const c of appleCandidates) {
    // Reject wrong language version (e.g. Telugu Apple Music candidate when looking for Malayalam/Tamil)
    const cLang = inferTrackLanguage({
      primaryGenreName: c.genreName,
      title: c.trackName,
      album: c.collectionName,
      artist: c.artistName
    });
    if (tokens.language && cLang && tokens.language !== cLang && cLang === "telugu") {
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
    if (sc >= 60) {
      scoredApple.push({ cand: c, score: sc });
    }
  }
  scoredApple.sort((a, b) => b.score - a.score);

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
      if (sc >= 65) {
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
  const allAppleIds = scoredApple.slice(0, 4).map(x => x.cand.trackId);
  if (explicitAppleId && !allAppleIds.includes(String(explicitAppleId))) {
    allAppleIds.unshift(String(explicitAppleId));
  }

  const cleanCanonicalTitle = bestApple
    ? (tokens.variantTag !== "standard"
        ? extractVariantAwareTrackTitle(bestApple.trackName, bestApple.collectionName)
        : (extractCoreTrackTitle(bestApple.trackName) || bestApple.trackName))
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
    fullAppleTitle: bestApple?.trackName || tokens.ostTitle || cleanCanonicalTitle || tokens.primaryTitle,
    canonicalArtist: bestApple?.artistName || deezerCanonical?.artist || tokens.artists[0] || "",
    primaryAppleArtist: cleanText(String(bestApple?.artistName || deezerCanonical?.artist || tokens.artists[0] || "").split(/[,&]/)[0]),
    canonicalAlbum: cleanCanonicalAlbum || tokens.album,
    canonicalDuration: bestApple?.durationSec || deezerCanonical?.durationSec || durationSec,
    language: tokens.language
  };

  setBoundedMemo(TRACK_IDENTITY_MEMO, memoKey, identity);
  return identity;
}

/**
 * TIER 1A: Paxsenix Direct Apple Music Syllable & TTML Fetcher v10.0
 * Queries up to 3 resolved `appleTrackIds` in parallel with a 5800ms timeout
 * so live Apple Music TTML fetches complete without timing out!
 */
async function fetchPaxsenixAppleLyrics(identity, tokens, durationSec) {
  const appleIds = identity?.appleTrackIds || (identity?.appleTrackId ? [identity.appleTrackId] : []);
  if (appleIds.length === 0) return null;

  const title = identity?.canonicalTitle || tokens.primaryTitle;
  const artist = identity?.canonicalArtist || tokens.artists[0] || "";
  const dur = durationSec || identity?.canonicalDuration || 0;
  const expectedLang = identity?.language || tokens.language || "";

  const trySingleAppleId = async (appleId) => {
    const [ttmlRes, jsonRes] = await Promise.allSettled([
      fetchWithTimeout(
        `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(appleId)}&ttml=true&v=2`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        5800
      ),
      fetchWithTimeout(
        `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(appleId)}`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        5800
      )
    ]);

    if (ttmlRes.status === "fulfilled" && ttmlRes.value.ok) {
      const rawTtml = await ttmlRes.value.text();
      if (rawTtml.includes("<p")) {
        const lines = parseTtmlToTimeline(rawTtml, dur, title, artist, expectedLang);
        if (lines.length >= 2) {
          return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
        }
      }
      try {
        const parsedTtmlJson = JSON.parse(rawTtml);
        const xmlStr = parsedTtmlJson?.ttml || parsedTtmlJson?.data?.ttml || parsedTtmlJson?.content;
        if (typeof xmlStr === "string" && xmlStr.includes("<p")) {
          const lines = parseTtmlToTimeline(xmlStr, dur, title, artist, expectedLang);
          if (lines.length >= 2) {
            return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
          }
        }
        const sylLines = parsePaxsenixAppleJsonToTimeline(parsedTtmlJson, dur, title, artist, expectedLang);
        if (sylLines.length >= 2) {
          return { lines: sylLines, source: "AppleMusicDirectSyllableProvider", syncType: "WORD" };
        }
      } catch {}
    }

    if (jsonRes.status === "fulfilled" && jsonRes.value.ok) {
      const rawText = await jsonRes.value.text();
      if (rawText.includes("<p")) {
        const lines = parseTtmlToTimeline(rawText, dur, title, artist, expectedLang);
        if (lines.length >= 2) {
          return { lines, source: "AppleMusicDirectTtmlProvider", syncType: "WORD" };
        }
      }
      const parsedJson = JSON.parse(rawText);
      const sylLines = parsePaxsenixAppleJsonToTimeline(parsedJson, dur, title, artist, expectedLang);
      if (sylLines.length >= 2) {
        return { lines: sylLines, source: "AppleMusicDirectSyllableProvider", syncType: "WORD" };
      }
    }

    throw new Error("No Apple TTML for ID");
  };

  try {
    return await Promise.any(appleIds.slice(0, 3).map(id => trySingleAppleId(id)));
  } catch {
    return null;
  }
}

/**
 * TIER 1B: LyricsPlus (YouLy+ / KPOE / LRCMUX) Apple Music TTML (`/v1/ttml/get`) & V2 (`/v2/lyrics/get`) Cluster
 * Queries with both clean title and full Apple Music OST title, and avoids album-mismatch 404s.
 */
async function fetchLyricsPlusAppleCluster(identity, tokens, durationSec, sources = "apple,lyricsplus") {
  const cleanTitle = identity?.canonicalTitle || tokens.primaryTitle;
  const fullAppleTitle = identity?.fullAppleTitle || tokens.ostTitle || cleanTitle;
  const queryArtist = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const queryAlbum = identity?.canonicalAlbum || tokens.album || "";
  const queryDur = durationSec || identity?.canonicalDuration || 0;
  const expectedLang = identity?.language || tokens.language || "";

  if (!cleanTitle) return null;

  // Build parameter permutations:
  // 1. Clean title + primary artist (without album restriction so soundtrack album naming differences don't cause 404!)
  // 2. Full Apple OST title + primary artist
  // 3. Clean title + primary artist + album + duration
  const paramPermutations = [
    new URLSearchParams({
      title: cleanTitle,
      artist: queryArtist,
      ...(queryDur > 0 ? { duration: String(queryDur) } : {}),
      source: sources
    }),
    new URLSearchParams({
      title: fullAppleTitle,
      artist: queryArtist,
      ...(queryAlbum ? { album: queryAlbum } : {}),
      ...(queryDur > 0 ? { duration: String(queryDur) } : {}),
      source: sources
    })
  ];

  const tryMirrorAndParam = async (baseUrl, qs) => {
    const isLrcMux = baseUrl.includes("lrcmux.dev");
    const requests = [
      fetchWithTimeout(`${baseUrl}/v2/lyrics/get?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"], "Accept": "application/json" }
      }, 4800)
    ];
    if (!isLrcMux) {
      requests.push(
        fetchWithTimeout(`${baseUrl}/v1/ttml/get?${qs.toString()}`, {
          headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
        }, 4800)
      );
    }

    const settled = await Promise.allSettled(requests);

    // Check TTML endpoint first if available
    if (settled[1]?.status === "fulfilled" && settled[1].value.ok) {
      const raw = await settled[1].value.text();
      if (raw.includes("<p")) {
        const lines = parseTtmlToTimeline(raw, queryDur, cleanTitle, queryArtist, expectedLang);
        if (lines.length >= 2) {
          return { lines, hasTrueWordSync: true, source: "AppleLyricsPlusTtml" };
        }
      }
      try {
        const j = JSON.parse(raw);
        const ttmlStr = j?.ttml || j?.data?.ttml;
        if (typeof ttmlStr === "string" && ttmlStr.includes("<p")) {
          const lines = parseTtmlToTimeline(ttmlStr, queryDur, cleanTitle, queryArtist, expectedLang);
          if (lines.length >= 2) {
            return { lines, hasTrueWordSync: true, source: "AppleLyricsPlusTtml" };
          }
        }
      } catch {}
    }

    // Check V2 JSON endpoint
    if (settled[0]?.status === "fulfilled" && settled[0].value.ok) {
      const data = await settled[0].value.json();
      const parsed = parseLyricsPlusJsonToTimeline(data, queryDur, cleanTitle, queryArtist, expectedLang);
      if (parsed && parsed.lines.length >= 2) {
        return {
          lines: parsed.lines,
          hasTrueWordSync: parsed.hasTrueWordSync,
          source: `AppleLyricsPlus (${parsed.upstreamSource})`
        };
      }
    }

    throw new Error("Miss");
  };

  const tasks = [];
  for (const mirror of LYRICSPLUS_MIRRORS) {
    tasks.push(tryMirrorAndParam(mirror, paramPermutations[0]));
  }
  if (fullAppleTitle !== cleanTitle) {
    tasks.push(tryMirrorAndParam(LYRICSPLUS_MIRRORS[0], paramPermutations[1]));
    tasks.push(tryMirrorAndParam(LYRICSPLUS_MIRRORS[1], paramPermutations[1]));
  }

  try {
    return await Promise.any(tasks);
  } catch {
    return null;
  }
}

/**
 * TIER 1C: Unison (`unison.boidu.dev/lyrics`), BetterLyrics (`lyrics-api.boidu.dev/getLyrics`),
 * & BiniLyrics (`lyrics-api.binimum.org`) Apple Music TTML Providers
 */
async function fetchExternalAppleTtmlProviders(identity, tokens, durationSec) {
  const title = identity?.canonicalTitle || tokens.primaryTitle;
  const fullAppleTitle = identity?.fullAppleTitle || tokens.ostTitle || title;
  const artist = identity?.primaryAppleArtist || tokens.artists[0] || "";
  const album = identity?.canonicalAlbum || tokens.album || "";
  const dur = durationSec || identity?.canonicalDuration || 0;
  const expectedLang = identity?.language || tokens.language || "";

  if (!title) return null;

  const parseAnyTtmlOrRichResponse = async (res, sourceLabel) => {
    if (!res.ok) throw new Error("HTTP miss");
    const raw = await res.text();
    if (raw.includes("<p")) {
      const lines = parseTtmlToTimeline(raw, dur, title, artist, expectedLang);
      if (lines.length >= 2) return { lines, source: sourceLabel, syncType: "WORD" };
    }
    const json = JSON.parse(raw);
    const ttml = json?.ttml || json?.lyrics || json?.data?.ttml || json?.results?.[0]?.ttml;
    if (typeof ttml === "string" && ttml.includes("<p")) {
      const lines = parseTtmlToTimeline(ttml, dur, title, artist, expectedLang);
      if (lines.length >= 2) return { lines, source: sourceLabel, syncType: "WORD" };
    }
    if (Array.isArray(json?.lyrics)) {
      const lp = parseLyricsPlusJsonToTimeline(json, dur, title, artist, expectedLang);
      if (lp && lp.lines.length >= 2) {
        return { lines: lp.lines, source: sourceLabel, syncType: lp.hasTrueWordSync ? "WORD" : "LINE_ENHANCED" };
      }
    }
    const ttmlUrl = json?.results?.[0]?.ttmlUrl || json?.results?.[0]?.url || json?.ttmlUrl;
    if (ttmlUrl && String(ttmlUrl).startsWith("http")) {
      const ttmlRes = await fetchWithTimeout(ttmlUrl, {}, 3500);
      if (ttmlRes.ok) {
        const xml = await ttmlRes.text();
        const lines = parseTtmlToTimeline(xml, dur, title, artist, expectedLang);
        if (lines.length >= 2) return { lines, source: sourceLabel, syncType: "WORD" };
      }
    }
    throw new Error("No TTML in response");
  };

  const tasks = [
    // 1. Unison Mirrors (`?song=...&artist=...`)
    ...UNISON_MIRRORS.slice(0, 2).map(async (uBase) => {
      const qs = new URLSearchParams({ song: title, artist });
      if (dur > 0) qs.set("duration", String(dur));
      const res = await fetchWithTimeout(`${uBase}/lyrics?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 4500);
      return await parseAnyTtmlOrRichResponse(res, "AppleMusicUnisonTtml");
    }),

    // 2. BetterLyrics TTML (Clean Title)
    (async () => {
      const qs = new URLSearchParams({ s: title, a: artist });
      if (dur > 0) qs.set("d", String(dur));
      const res = await fetchWithTimeout(`https://lyrics-api.boidu.dev/getLyrics?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 4500);
      return await parseAnyTtmlOrRichResponse(res, "AppleMusicBetterLyricsTtml");
    })(),

    // 3. BetterLyrics TTML (Full Apple OST Title + Album)
    (async () => {
      const qs = new URLSearchParams({ s: fullAppleTitle, a: artist });
      if (album) qs.set("al", album);
      if (dur > 0) qs.set("d", String(dur));
      const res = await fetchWithTimeout(`https://lyrics-api.boidu.dev/getLyrics?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 4500);
      return await parseAnyTtmlOrRichResponse(res, "AppleMusicBetterLyricsTtml");
    })(),

    // 4. BiniLyrics TTML
    (async () => {
      const qs = new URLSearchParams({ track: title, artist });
      const res = await fetchWithTimeout(`https://lyrics-api.binimum.org/?${qs.toString()}`, {
        headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] }
      }, 4500);
      return await parseAnyTtmlOrRichResponse(res, "AppleMusicBiniTtml");
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
 * Enforces Anti-Arabic Script Guard and Strict Variant Isolation ("Kalyani" vs "Kalyani Remix")!
 */
async function searchLrclibCandidates(tokens, durationSec, identity = null) {
  const headers = { "User-Agent": `${WORKER_NAME}/${WORKER_VERSION} (https://projectvelo.tjcodewizard.workers.dev)` };
  const urls = [];

  const titleA = tokens.variantTag !== "standard"
    ? tokens.variantAwareTitle
    : (identity?.canonicalTitle || tokens.primaryTitle);
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
  if (titleA && tokens.album) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${titleA} ${tokens.album}`)}`);
  }
  if (titleA && tokens.artists[1]) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${titleA} ${tokens.artists[1]}`)}`);
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
    artists: [...new Set([artistA, identity?.canonicalArtist, ...tokens.artists].filter(Boolean))],
    album: albumA || tokens.album
  };

  const scored = allCandidates
    .map(item => ({ item, score: scoreLrcCandidate(item, enrichedTokens, durationSec, true) }))
    .filter(x => x.score >= 85)
    .sort((a, b) => b.score - a.score);

  const bestSynced = scored.find(x => x.item.syncedLyrics)?.item || null;
  const bestPlain = scored.find(x => x.item.plainLyrics)?.item || null;

  return { bestSynced, bestPlain };
}

/**
 * TIER 2B: Spotify & Musixmatch Word/Synced Fallback
 */
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
    const title = tokens.variantTag !== "standard" ? tokens.variantAwareTitle : (identity?.canonicalTitle || tokens.primaryTitle);
    const artist = identity?.primaryAppleArtist || tokens.artists[0] || "";
    const expectedLang = identity?.language || tokens.language || "";

    if (!spId && title) {
      const sRes = await fetchWithTimeout(
        `https://lyrics.paxsenix.org/spotify/search?q=${encodeURIComponent(`${title} ${artist}`.trim())}`,
        { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } },
        3200
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const hitList = Array.isArray(sData) ? sData : (sData?.results || sData?.tracks || []);
        for (const h of hitList) {
          const hTitle = h?.name || h?.trackName || h?.title || "";
          const hVariant = extractTrackVariantTag(hTitle, h?.album || "");
          if (hVariant === tokens.variantTag && h?.id) {
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
        3400
      );
      if (lRes.ok) {
        const lData = await lRes.json();
        const lines = parsePaxsenixAppleJsonToTimeline(lData, durationSec, title, artist, expectedLang);
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

    if (!bestSong || bestScore < 90) return null;

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
      const yrcLines = parseNeteaseYrcToTimeline(rawYrc, durationSec, tokens.primaryTitle, tokens.artists[0] || "", tokens.language);
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

    const parsed = parseLrcToTimeline(rawLrc, durationSec, tokens.primaryTitle, tokens.artists[0] || "", tokens.language);
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

function buildUnifiedLyricsResponse({
  source,
  syncType = "WORD",
  trackName,
  artistName,
  appleTrackId = null,
  isrc = null,
  language = "malayalam",
  variant = "standard",
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
    language,
    variant,
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
  let explicitLang = url.searchParams.get("lang") || "";
  let explicitVariant = url.searchParams.get("variant") || "";
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
      if (!explicitLang && memoSong.language) explicitLang = memoSong.language;
      if (!explicitVariant && memoSong.variant) explicitVariant = memoSong.variant;
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
          if (!explicitLang && enriched.language) explicitLang = enriched.language;
          if (!explicitVariant && enriched.variant) explicitVariant = enriched.variant;
          if (!durationSec && enriched.duration) durationSec = enriched.duration;
          if (Array.isArray(enriched.allArtists)) extraArtists = enriched.allArtists;
        }
      } catch {}
    }
  }

  const tokens = extractLyricsSearchTokens(
    trackName || rawQ,
    artistName,
    albumName,
    extraArtists,
    explicitVariant,
    explicitLang
  );

  // STAGE 1: World-Class 5-Vector Track Identification (Multi-ID Apple Music + ISRC + Variant-Strict Canonical Metadata)
  const identity = await resolveWorldClassTrackIdentity(tokens, durationSec, explicitAppleId, explicitSpotifyId);
  if (identity) {
    if (!durationSec && identity.canonicalDuration) {
      durationSec = identity.canonicalDuration;
    }
    if (identity.primaryAppleArtist && !tokens.artists.includes(identity.primaryAppleArtist)) {
      tokens.artists.unshift(identity.primaryAppleArtist);
    }
  }

  // STAGE 2 (TIER 1): Query All Apple Music TTML & Word-by-Word Providers Concurrently + LRCLIB
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

  const appleHits = [
    paxAppleHit,
    lpAppleHit ? { ...lpAppleHit, syncType: lpAppleHit.hasTrueWordSync ? "WORD" : "LINE_ENHANCED" } : null,
    extTtmlHit ? { ...extTtmlHit, syncType: extTtmlHit.syncType || "WORD" } : null
  ].filter(h => h && Array.isArray(h.lines) && h.lines.length >= 2);

  if (appleHits.length > 0) {
    appleHits.sort((a, b) => {
      const aHasDual = a.lines.some(l => l.nativeText && l.romanizedText && l.nativeText !== l.romanizedText) ? 45 : 0;
      const bHasDual = b.lines.some(l => l.nativeText && l.romanizedText && l.nativeText !== l.romanizedText) ? 45 : 0;
      const aScore = (a.syncType === "WORD" ? 120 : 50) + aHasDual + a.lines.length;
      const bScore = (b.syncType === "WORD" ? 120 : 50) + bHasDual + b.lines.length;
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
      language: tokens.language,
      variant: tokens.variantTag,
      duration: durationSec || 185,
      isSynced: true,
      isAutoTimed: false,
      lines: bestAppleHit.lines
    });
  }

  // STAGE 3 (TIER 2 SECONDARY): LRCLIB Synced Lyrics (Verified Variant & Anti-Arabic Guarded)
  if (lrcResult?.bestSynced?.syncedLyrics) {
    const winner = lrcResult.bestSynced;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const parsed = parseLrcToTimeline(
      winner.syncedLyrics,
      effectiveDur,
      winner.trackName || tokens.primaryTitle,
      winner.artistName || artistName,
      tokens.language
    );
    if (parsed.lines.length >= 2) {
      return buildUnifiedLyricsResponse({
        source: parsed.hasEnhancedWordTags ? "LrcLibEnhancedWordProvider" : "LrcLibRealtimeWordSyncProvider",
        syncType: parsed.hasEnhancedWordTags ? "WORD" : "LINE_ENHANCED",
        trackName: winner.trackName || identity?.canonicalTitle || tokens.primaryTitle,
        artistName: winner.artistName || identity?.canonicalArtist || artistName,
        appleTrackId: identity?.appleTrackId || null,
        isrc: identity?.isrc || null,
        language: tokens.language,
        variant: tokens.variantTag,
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
      language: tokens.language,
      variant: tokens.variantTag,
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
      language: tokens.language,
      variant: tokens.variantTag,
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
      winner.artistName || artistName,
      tokens.language
    );
    if (plainLines.length >= 2) {
      return buildUnifiedLyricsResponse({
        source: "LrcLibCadenceSyncProvider",
        syncType: "CADENCE_ESTIMATED",
        trackName: winner.trackName || identity?.canonicalTitle || tokens.primaryTitle,
        artistName: winner.artistName || identity?.canonicalArtist || artistName,
        appleTrackId: identity?.appleTrackId || null,
        isrc: identity?.isrc || null,
        language: tokens.language,
        variant: tokens.variantTag,
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
    language: tokens.language,
    variant: tokens.variantTag,
    duration: durationSec || 185,
    isSynced: true,
    isAutoTimed: true,
    lines: fallbackLines
  });
}

// ============================================================================
// MAIN WORKER ROUTER (ProjectVelo v10.0.0)
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
        return await handleSmartStream(request, target, url.origin, ctx, false, url);
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
        }, "v10-projectvelo-lyrics");
      }

      if (path === "/album") {
        const albumId = url.searchParams.get("id") || url.searchParams.get("albumid") || url.searchParams.get("token");
        return await withEdgeCache(request, ctx, 1800, async () => {
          const data = await resolveCompleteAlbum(albumId, url.origin);
          return jsonResponse(data);
        }, "v10-projectvelo-album");
      }

      if (path === "/song") {
        const pids = url.searchParams.get("id") || url.searchParams.get("pids");
        if (!pids) return jsonResponse({ error: "Missing ?id= parameter" }, 400);
        return await withEdgeCache(request, ctx, 1800, async () => {
          const pidStr = String(pids);
          let primaryTrack = null;
          let songsList = [];

          if (pidStr.startsWith("apple:") || pidStr.startsWith("spotify:") || pidStr.startsWith("curated:")) {
            const memo = SONG_META_MEMO.get(pidStr);
            let title = memo?.title || "";
            let artist = memo?.artist || "";
            let album = memo?.album || "";
            let lang = memo?.language || "";
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
                  lang = inferTrackLanguage({
                    primaryGenreName: hit.primaryGenreName || "",
                    title,
                    album,
                    artist
                  });
                }
              }
            }

            const q = `${extractVariantAwareTrackTitle(title, album)} ${String(artist || "").split(/[,&]/)[0]}`.trim();
            const sData = await fetchSaavnJson(
              { __call: "search.getResults", api_version: "4", n: "10", p: "1", q },
              3500,
              lang || "malayalam,tamil,hindi,english"
            );
            const pool = await batchHealMissingMediaUrls(sData?.results || []);
            const curatedItem = {
              appleId,
              spotifyId: memo?.spotifyId || "",
              language: lang,
              trackName: title || "Track",
              artistName: artist,
              collectionName: album,
              artworkUrl100: memo?.image || ""
            };
            const matched = findBestSaavnMatchForCuratedTrack(curatedItem, pool, lang) || pool[0] || null;
            primaryTrack = buildCuratedBridgedSongObject(curatedItem, matched, url.origin);
            songsList = [primaryTrack];
          } else {
            const data = await fetchSaavnJson({ __call: "song.getDetails", pids });
            const rawList = Array.isArray(data?.songs)
              ? data.songs
              : Object.values(data || {}).filter(v => v && typeof v === "object" && v.id);
            songsList = rawList.map(s => enrichSaavnSong(s, url.origin));
            primaryTrack = songsList[0] || null;
          }

          // Attach Spotify-style Intelligent Up-Next Recommendations directly to `/song` response
          let recoPayload = null;
          if (primaryTrack?.id) {
            try {
              recoPayload = await resolveIntelligentRecommendations(primaryTrack.id, url.origin, primaryTrack.language);
            } catch {}
          }

          return jsonResponse({
            songs: songsList,
            track: primaryTrack,
            upNext: recoPayload?.upNext || null,
            recommendations: recoPayload?.songs || []
          });
        }, "v10-projectvelo-song");
      }

      if (path === "/reco" || path === "/upnext" || path === "/recommendations" || path === "/radio") {
        const pid = url.searchParams.get("id") || url.searchParams.get("pid") || url.searchParams.get("seed") || "";
        const lang = url.searchParams.get("lang") || "";
        return await withEdgeCache(request, ctx, 900, async () => {
          const recoData = await resolveIntelligentRecommendations(pid, url.origin, lang);
          return jsonResponse(recoData);
        }, "v10-projectvelo-reco");
      }

      if (path === "/home") {
        const dynamicSlice = getDynamicTimeSliceKey(4);
        return await withEdgeCache(request, ctx, 1800, async () => {
          const langParam = url.searchParams.get("lang") || "malayalam,tamil,hindi,english";
          const homeData = await fetchAppleMusicExclusiveHomeFeed(langParam, url.origin);
          return jsonResponse(homeData, 200, {
            "X-Home-Source": "AppleMusicExclusiveCuratedCharts",
            "X-Home-Date-Slice": dynamicSlice
          });
        }, `v10-projectvelo-home-${dynamicSlice}`);
      }

      if (path === "/search") {
        return await handleSearchRoute(request, url, ctx);
      }

      return jsonResponse({
        service: `${WORKER_NAME} v${WORKER_VERSION} — 100% Apple Music Curated Homepage (Malayalam/Tamil/Hindi/English) + Apple TTML Word-Sync & Spotify Affinity Engine`,
        repository: "ProjectVelo",
        status: "online",
        languagePriority: DEFAULT_LANGUAGE_PRIORITY,
        endpoints: {
          stream: `${url.origin}/stream?url=<target>`,
          play: `${url.origin}/play?id=<songId>&appleId=<appleTrackId>&title=<title>&artist=<artist>&lang=<lang>&variant=<variant>`,
          lyrics: `${url.origin}/lyrics?id=<songId>&appleId=<appleTrackId>&trackName=<title>&artistName=<artist>&albumName=<album>&lang=<lang>&variant=<variant>&duration=<sec>`,
          home: `${url.origin}/home?lang=malayalam,tamil,hindi,english`,
          search: `${url.origin}/search?q=<query>&format=json`,
          album: `${url.origin}/album?id=<albumId_or_token>`,
          song: `${url.origin}/song?id=<songId>`,
          reco: `${url.origin}/reco?id=<songId>`,
          upnext: `${url.origin}/upnext?id=<songId>`
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
 * Resolves and streams a full-length 320kbps track while pre-warming the
 * Spotify-style Up-Next Recommendation Queue in the background via `ctx.waitUntil(...)`!
 */
async function handleOneHopPlay(request, url, ctx) {
  const songId = (url.searchParams.get("id") || "").trim();
  const appleId = (url.searchParams.get("appleId") || (songId.startsWith("apple:") ? songId.slice(6) : "")).trim();
  const spotifyId = (url.searchParams.get("spotifyId") || (songId.startsWith("spotify:") ? songId.slice(8) : "")).trim();
  let rawMediaUrl = (url.searchParams.get("url") || "").trim();
  let title = (url.searchParams.get("title") || "").trim();
  let artist = (url.searchParams.get("artist") || "").trim();
  let album = (url.searchParams.get("album") || "").trim();
  let lang = (url.searchParams.get("lang") || "").trim();
  let variant = (url.searchParams.get("variant") || "").trim();

  if (rawMediaUrl && (rawMediaUrl.includes("/play?") || /_96_p\.(mp4|mp3)/i.test(rawMediaUrl))) {
    rawMediaUrl = "";
  }

  if (songId) {
    recordRecentlyPlayed(songId);
  }

  if (songId && SONG_META_MEMO.has(songId)) {
    const memo = SONG_META_MEMO.get(songId);
    if (
      memo.decrypted_media_url &&
      memo.decrypted_media_url.includes("saavncdn.com") &&
      !/_96_p\.(mp4|mp3)/i.test(memo.decrypted_media_url)
    ) {
      rawMediaUrl = memo.decrypted_media_url;
    }
    if (!title) title = memo.title || "";
    if (!artist) artist = memo.artist || "";
    if (!album) album = memo.album || "";
    if (!lang) lang = memo.language || "";
    if (!variant) variant = memo.variant || "";
  }

  if (songId && !songId.startsWith("apple:") && !songId.startsWith("spotify:") && !songId.startsWith("curated:") && !rawMediaUrl) {
    try {
      const data = await fetchSaavnJson({ __call: "song.getDetails", pids: songId });
      const rawSong = data?.[songId] || data?.songs?.[0] || Object.values(data || {})[0];
      if (rawSong) {
        const enriched = enrichSaavnSong(rawSong, url.origin);
        if (
          enriched.decrypted_media_url &&
          !enriched.decrypted_media_url.includes("/play?") &&
          !/_96_p\.(mp4|mp3)/i.test(enriched.decrypted_media_url)
        ) {
          rawMediaUrl = enriched.decrypted_media_url;
        }
        if (!title) title = enriched.title;
        if (!artist) artist = enriched.artist;
        if (!lang) lang = enriched.language;
        if (!variant) variant = enriched.variant;
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
          if (!lang) {
            lang = inferTrackLanguage({
              primaryGenreName: hit.primaryGenreName || "",
              title,
              album,
              artist
            });
          }
        }
      }
    } catch {}
  }

  // Trigger background Spotify-style Up-Next Queue pre-warming so `/reco` is instant when the track finishes!
  if (ctx && (songId || title)) {
    ctx.waitUntil(
      resolveIntelligentRecommendations(songId || `curated:${title}_${artist}`, url.origin, lang).catch(() => {})
    );
  }

  if (rawMediaUrl) {
    const streamRes = await handleSmartStream(request, rawMediaUrl, url.origin, ctx, true, url);
    if (streamRes && (streamRes.status === 200 || streamRes.status === 206)) {
      return streamRes;
    }
  }

  const tokens = extractLyricsSearchTokens(title, artist, album, [], variant, lang);
  const searchTitle = tokens.variantTag !== "standard" ? tokens.variantAwareTitle : tokens.coreTitle;
  const queriesToTry = [
    [searchTitle, tokens.artists[0] || ""].filter(Boolean).join(" ").trim(),
    [searchTitle, tokens.album || ""].filter(Boolean).join(" ").trim(),
    searchTitle
  ].filter(Boolean);

  const saavnLangCookie = tokens.language
    ? `${tokens.language},malayalam,tamil,hindi,english`
    : "malayalam,tamil,hindi,english";

  for (const qStr of [...new Set(queriesToTry)].slice(0, 2)) {
    try {
      const searchData = await fetchSaavnJson(
        {
          __call: "search.getResults",
          api_version: "4",
          n: "14",
          p: "1",
          q: qStr
        },
        3600,
        saavnLangCookie
      );
      const candidates = await filterAndUpgradeSongs(searchData?.results || [], url.origin, qStr);
      for (const cand of candidates) {
        if (cand.id === songId && rawMediaUrl) continue;
        // Enforce Variant & Language Match when self-healing audio streams!
        if (tokens.variantTag === "standard" && cand.variant !== "standard") continue;
        if (tokens.variantTag !== "standard" && cand.variant !== tokens.variantTag) continue;
        if (
          tokens.language &&
          cand.language &&
          tokens.language !== cand.language &&
          cand.language === "telugu"
        ) {
          continue;
        }
        if (!cand.decrypted_media_url || cand.decrypted_media_url.includes("/play?")) continue;

        const healedStream = await handleSmartStream(request, cand.decrypted_media_url, url.origin, ctx, true, url);
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

async function handleSmartStream(request, targetUrl, origin, ctx, returnNullOnFail = false, reqUrlObj = null) {
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

    // INTERCEPT JIOSAAVN TRENDING / HOMEPAGE / CHARTS -> REPLACE 100% WITH APPLE MUSIC CURATED CHARTS!
    if (
      callType === "content.getTrending" ||
      callType === "content.getHomepageData" ||
      callType === "content.getCharts" ||
      callType === "content.getFeaturedPlaylists" ||
      callType === "webapi.getLaunchData"
    ) {
      const dynamicSlice = getDynamicTimeSliceKey(4);
      return await withEdgeCache(request, ctx, 1800, async () => {
        const lang = parsedTarget.searchParams.get("entity_language") || parsedTarget.searchParams.get("lang") || "malayalam,tamil,hindi,english";
        const homeData = await fetchAppleMusicExclusiveHomeFeed(lang, origin);
        if (callType === "content.getTrending") {
          return jsonResponse([...homeData.songs, ...homeData.albums], 200, {
            "X-Home-Source": "AppleMusicExclusiveIntercepted",
            "X-Home-Date-Slice": dynamicSlice
          });
        }
        return jsonResponse(homeData, 200, {
          "X-Home-Source": "AppleMusicExclusiveIntercepted",
          "X-Home-Date-Slice": dynamicSlice
        });
      }, `v10-projectvelo-stream-home-${dynamicSlice}`);
    }

    if (callType === "reco.getreco") {
      const pid = parsedTarget.searchParams.get("pid") || "";
      const lang = parsedTarget.searchParams.get("language") || "";
      return await withEdgeCache(request, ctx, 900, async () => {
        const recoData = await resolveIntelligentRecommendations(pid, origin, lang);
        return jsonResponse(recoData.songs);
      }, "v10-projectvelo-stream-reco");
    }

    if (callType === "content.getAlbumDetails" || callType === "playlist.getDetails") {
      const albumId = parsedTarget.searchParams.get("albumid") || parsedTarget.searchParams.get("listid") || parsedTarget.searchParams.get("id");
      return await withEdgeCache(request, ctx, 1800, async () => {
        const enrichedAlbum = await resolveCompleteAlbum(albumId, origin);
        return jsonResponse(enrichedAlbum);
      }, "v10-projectvelo-stream-album");
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
      }, "v10-projectvelo-stream-api");
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

  // Record & pre-warm recommendations when an audio stream is initiated
  const trackIdParam = reqUrlObj?.searchParams.get("id") || "";
  const trackTitleParam = reqUrlObj?.searchParams.get("title") || "";
  const trackArtistParam = reqUrlObj?.searchParams.get("artist") || "";
  const trackLangParam = reqUrlObj?.searchParams.get("lang") || "";
  const trackVariantParam = reqUrlObj?.searchParams.get("variant") || "";

  if (trackIdParam) {
    recordRecentlyPlayed(trackIdParam);
    if (ctx && !RECO_QUEUE_MEMO.has(`${trackIdParam}__${trackLangParam}`)) {
      ctx.waitUntil(
        resolveIntelligentRecommendations(trackIdParam, origin, trackLangParam).catch(() => {})
      );
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

  const rangeHeader = request.headers.get("Range") || "";
  if (rangeHeader) {
    upstreamHeaders.set("Range", rangeHeader);
  }
  if (request.headers.has("If-Range")) {
    upstreamHeaders.set("If-Range", request.headers.get("If-Range"));
  }

  const rawTargetStr = parsedTarget.toString();
  const memoizedWorkingUrl = WORKING_STREAM_MEMO.get(rawTargetStr);
  const candidateUrls = memoizedWorkingUrl
    ? [memoizedWorkingUrl, ...buildSaavnBitrateCascade(rawTargetStr, false)]
    : buildSaavnBitrateCascade(rawTargetStr, false);

  let upstreamRes = null;
  let usedUrl = rawTargetStr;

  // Check if client requested a small explicit sub-range (e.g. `bytes=0-1023`) vs full/open-ended (`bytes=0-` or no Range)
  const isSmallExplicitRange = /^bytes=\d+-\d+$/i.test(rangeHeader) &&
    (() => {
      const [s, e] = rangeHeader.replace(/bytes=/i, "").split("-").map(Number);
      return !isNaN(s) && !isNaN(e) && (e - s) < 500000;
    })();

  for (const candidate of [...new Set(candidateUrls)]) {
    // Never accept a 30-second `_96_p.` preview file in the primary full-length loop!
    if (/_96_p\.(mp4|mp3)/i.test(candidate)) continue;
    usedUrl = candidate;
    try {
      const attemptRes = await fetchWithTimeout(candidate, {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: upstreamHeaders,
        redirect: "follow"
      }, 6500);

      if (attemptRes.ok || attemptRes.status === 206) {
        const contentRange = attemptRes.headers.get("content-range") || "";
        const totalSizeFromRange = contentRange.includes("/")
          ? parseInt(contentRange.split("/")[1], 10)
          : 0;
        const contentLen = parseInt(attemptRes.headers.get("content-length") || "0", 10);
        const effectiveTotalBytes = totalSizeFromRange || contentLen || 999999;

        // A full-length song at 96–320kbps is > 600KB; a 30s preview or broken stub is < 480KB.
        // Reject tiny preview/stub files so songs NEVER start and jump straight to the end!
        if (effectiveTotalBytes > 520000 || isSmallExplicitRange || request.method === "HEAD") {
          upstreamRes = attemptRes;
          if (candidateUrls.length > 1) {
            setBoundedMemo(WORKING_STREAM_MEMO, rawTargetStr, candidate);
          }
          break;
        }
      }
    } catch {}
  }

  // If all CDN bitrates for this specific Saavn file path failed or were preview-only,
  // self-heal by resolving an alternate full-length JioSaavn upload of the same song!
  if (!upstreamRes && !returnNullOnFail && (trackTitleParam || trackIdParam)) {
    const playUrl = new URL(`${origin}/play`);
    if (trackIdParam) playUrl.searchParams.set("id", trackIdParam);
    if (trackTitleParam) playUrl.searchParams.set("title", trackTitleParam);
    if (trackArtistParam) playUrl.searchParams.set("artist", trackArtistParam);
    if (trackLangParam) playUrl.searchParams.set("lang", trackLangParam);
    if (trackVariantParam) playUrl.searchParams.set("variant", trackVariantParam);
    return await handleOneHopPlay(request, playUrl, ctx);
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
  if (trackIdParam) {
    resHeaders.set("X-UpNext-Url", `${origin}/reco?id=${encodeURIComponent(trackIdParam)}${trackLangParam ? `&lang=${encodeURIComponent(trackLangParam)}` : ""}`);
  }

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
    }, "v10-projectvelo-search");
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

async function withEdgeCache(request, ctx, ttlSeconds, computeFn, cacheNamespace = "v10-projectvelo") {
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
    cacheHeaders.set("Cache-Control", `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${Math.min(7200, ttlSeconds * 2)}`);
    cacheHeaders.set("X-Cache-Status", "MISS");
    const cloned = new Response(freshRes.clone().body, { status: 200, headers: cacheHeaders });
    ctx.waitUntil(cache.put(cacheKey, cloned));
    return new Response(freshRes.body, { status: 200, headers: cacheHeaders });
  }

  return freshRes;
}
