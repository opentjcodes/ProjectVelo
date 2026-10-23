// --- START OF FILE worker.js ---

const WORKER_NAME = "ProjectVelo";
const WORKER_VERSION = "6.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Worker-Engine, X-Upstream-Status, X-Upstream-Url, X-Cache-Status, X-Resolved-Bitrate, X-Lyrics-Source"
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

const WORKING_STREAM_MEMO = new Map();
const SONG_META_MEMO = new Map();

function setBoundedMemo(map, key, value, maxEntries = 600) {
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
// Correct standard DES P-box table index 11 is 26
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

    // Strict PKCS#7 padding validation + null/control byte stripping
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
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
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

function isLowQualityJunkTrack(rawSong, userQuery = "") {
  if (!rawSong || typeof rawSong !== "object") return true;
  const more = rawSong.more_info || {};
  const title = cleanText(rawSong.title || rawSong.song || "").toLowerCase();
  const album = cleanText(more.album || rawSong.album || "").toLowerCase();
  const q = String(userQuery || "").toLowerCase();

  const duration = parseInt(more.duration || rawSong.duration || "0", 10) || 0;
  // Filter out ringtones / short snippets (< 42 seconds) unless explicitly searched
  if (duration > 0 && duration < 42 && !q.includes("intro") && !q.includes("ringtone")) {
    return true;
  }

  // Filter out karaoke / ringtone / 8D / tribute covers unless the user searched for them
  const junkPatterns = [
    /\bkaraoke\b/i,
    /\bringtone\b/i,
    /\bcaller\s*tune\b/i,
    /\b8d\s*audio\b/i,
    /\btribute\s+to\b/i,
    /\boriginally\s+performed\s+by\b/i,
    /\bdialogue\s+promo\b/i
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
    .filter(s => s && s.id && !(s.more_info?.encrypted_media_url || s.encrypted_media_url))
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

async function filterAndUpgradeSongs(rawSongs, origin, userQuery = "") {
  if (!Array.isArray(rawSongs)) return [];
  const filtered = rawSongs.filter(s => !isLowQualityJunkTrack(s, userQuery));
  const listToProcess = filtered.length > 0 ? filtered : rawSongs;
  const healed = await batchHealMissingMediaUrls(listToProcess);

  const seenKeys = new Set();
  const results = [];

  for (const s of healed) {
    const enriched = enrichSaavnSong(s, origin);
    if (!enriched || !enriched.id) continue;
    // Deduplicate identical title + primary artist combinations, keeping the highest-quality first hit
    const dedupKey = `${enriched.title.toLowerCase().replace(/\s+/g, " ")}__${enriched.artist.split(",")[0].toLowerCase().trim()}`;
    if (seenKeys.has(dedupKey) && results.length >= 8) continue;
    seenKeys.add(dedupKey);
    results.push(enriched);
  }

  return results;
}

function enrichSaavnSong(s, origin) {
  if (!s || typeof s !== "object") return s;
  const more = s.more_info || {};
  const enc = more.encrypted_media_url || s.encrypted_media_url;

  // Always prefer 320kbps AAC master URL first; /stream automatically cascades if 320 isn't on CDN
  let directUrl = decryptSaavnMediaUrl(enc, true);
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
  if (more.artistMap?.primary_artists?.length) {
    for (const a of more.artistMap.primary_artists) {
      if (a?.name) artistNames.push(cleanText(a.name));
    }
  }
  if (more.artistMap?.featured_artists?.length) {
    for (const a of more.artistMap.featured_artists) {
      if (a?.name) artistNames.push(cleanText(a.name));
    }
  }
  if (more.artistMap?.artists?.length) {
    for (const a of more.artistMap.artists) {
      if (a?.name) artistNames.push(cleanText(a.name));
    }
  }
  if (more.singers) {
    artistNames.push(...String(more.singers).split(",").map(cleanText));
  }
  if (more.primary_artists || s.primary_artists) {
    artistNames.push(...String(more.primary_artists || s.primary_artists).split(",").map(cleanText));
  }
  if (more.music) {
    artistNames.push(...String(more.music).split(",").map(cleanText));
  }

  const uniqueArtists = [...new Set(artistNames.filter(a => a && a.toLowerCase() !== "unknown"))];
  const primaryArtists = uniqueArtists.slice(0, 4).join(", ") || cleanText(s.subtitle || "Unknown Artist");

  const hiResImg = upgradeImage(s.image || s.coverUrl);
  const titleClean = cleanText(s.title || s.song || "Untitled");
  const albumTitle = cleanText(more.album || s.album || "OpenMuse");
  const albumId = more.album_id || s.album_id || null;
  const durationSec = parseInt(more.duration || s.duration || "0", 10) || 0;
  const hasLyrics = String(more.has_lyrics || s.has_lyrics || "false") === "true";
  const idStr = String(s.id);

  const workerStream = directUrl
    ? `${origin}/stream?url=${encodeURIComponent(directUrl)}`
    : `${origin}/play?id=${encodeURIComponent(idStr)}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}`;

  const playEndpointUrl = `${origin}/play?id=${encodeURIComponent(idStr)}${directUrl ? `&url=${encodeURIComponent(directUrl)}` : ""}&title=${encodeURIComponent(titleClean)}&artist=${encodeURIComponent(primaryArtists)}`;
  const lyricsEndpointUrl = `${origin}/lyrics?id=${encodeURIComponent(idStr)}&trackName=${encodeURIComponent(titleClean)}&artistName=${encodeURIComponent(primaryArtists)}&albumName=${encodeURIComponent(albumTitle)}&duration=${durationSec}`;

  const cascade = directUrl ? buildSaavnBitrateCascade(directUrl) : [];

  const enrichedObj = {
    ...s,
    id: idStr,
    type: "song",
    itemType: "song",
    title: titleClean,
    artist: primaryArtists,
    allArtists: uniqueArtists,
    subtitle: primaryArtists,
    album: albumTitle,
    albumId: albumId ? String(albumId) : null,
    duration: durationSec,
    hasLyrics,
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
  return enrichedObj;
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
  const enrichedSongs = healedTracks
    .map(s => enrichSaavnSong(s, origin))
    .filter(s => s && s.id);

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
// REAL-TIME WORD-BY-WORD LYRICS ENGINE (MULTI-PROVIDER + CADENCE WORD SYNC)
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
    .replace(/-\s*(from|feat|ft|original|ost|version|malayalam|tamil|telugu|hindi|kannada|punjabi|remix|lofi|slowed|reverb|unplugged|live|film|motion picture|video|lyrical).*$/gi, " ")
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
    .filter(a => a && !/^(unknown|unknown artist|various artists|ost)$/i.test(a));

  const uniqueArtists = [...new Set(allArtistsRaw)];

  const cleanAlbum = cleanText(rawAlbum || extractedMovie || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/original motion picture soundtrack/gi, "")
    .replace(/["'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const validAlbum = (cleanAlbum && cleanAlbum.toLowerCase() !== "openmuse" && cleanAlbum.toLowerCase() !== primaryTitle.toLowerCase())
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

function estimateWordWeight(word) {
  const clean = String(word || "");
  const len = Math.max(1, clean.replace(/[^a-zA-Z0-9\u0900-\u0d7f]/g, "").length);
  const vowelClusters = (clean.match(/[aeiouyAEIOUY]+/g) || []).length || Math.ceil(len / 2.5);
  let pauseBonus = 0;
  if (/[,;:]$/.test(clean)) pauseBonus = 1.2;
  else if (/[.!?…]+$/.test(clean)) pauseBonus = 2.0;
  else if (/[-—]$/.test(clean)) pauseBonus = 0.8;
  return Math.max(1, vowelClusters * 1.35 + len * 0.35 + pauseBonus);
}

function distributeWordsAcrossWindow(text, lineStartSec, vocalEndSec, lineHardEndSec) {
  const rawWords = String(text || "").split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) {
    return [{ word: "♪", time: lineStartSec, endTime: lineHardEndSec }];
  }

  const weights = rawWords.map(estimateWordWeight);
  const totalWeight = Math.max(1, weights.reduce((a, b) => a + b, 0));
  const activeSpan = Math.max(0.22, vocalEndSec - lineStartSec);

  let cursor = lineStartSec;
  return rawWords.map((w, idx) => {
    const share = (weights[idx] / totalWeight) * activeSpan;
    const wStart = Number(cursor.toFixed(3));
    const wEnd = idx === rawWords.length - 1
      ? Number(Math.max(wStart + 0.08, vocalEndSec).toFixed(3))
      : Number((cursor + share).toFixed(3));
    cursor += share;
    return {
      word: w,
      time: wStart,
      endTime: wEnd
    };
  });
}

function createIntroCueLine(endTimeSec) {
  const safeEnd = Number(Math.max(0.8, endTimeSec).toFixed(3));
  const symbols = ["♪", "•", "•", "•"];
  const step = safeEnd / symbols.length;
  const words = symbols.map((sym, i) => ({
    word: sym,
    time: Number((i * step).toFixed(3)),
    endTime: Number(((i + 1) * step).toFixed(3))
  }));
  return {
    index: 0,
    time: 0,
    endTime: safeEnd,
    duration: safeEnd,
    text: symbols.join(" "),
    isInstrumental: true,
    plainOnly: false,
    words
  };
}

function finalizeTimelineMonotonic(rawEntries, totalDurationSec = 0) {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) return [];

  // Ensure strictly increasing timestamps so index.html never gets stuck on duplicate timestamps
  const sorted = [...rawEntries].sort((a, b) => a.time - b.time);
  const deduped = [];

  for (const item of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(item.time - prev.time) < 0.06) {
      if (item.text === prev.text) continue;
      if (prev.text === "♪") {
        prev.text = item.text;
        prev.inlineWords = item.inlineWords;
        continue;
      }
      if (item.text === "♪") continue;
      item.time = Number((prev.time + 0.35).toFixed(3));
    }
    deduped.push(item);
  }

  const timeline = [];

  // If the first vocal line starts after 1.5s, prepend an active intro beat line from 0.0s
  if (deduped.length > 0 && deduped[0].time > 1.5) {
    timeline.push(createIntroCueLine(deduped[0].time));
  } else if (deduped.length > 0 && deduped[0].time > 0) {
    deduped[0].time = 0;
  }

  for (let i = 0; i < deduped.length; i++) {
    const entry = deduped[i];
    const nextEntry = deduped[i + 1];
    const fallbackEnd = totalDurationSec > entry.time ? totalDurationSec : entry.time + 4.5;
    const hardEndTime = nextEntry
      ? Number(Math.max(entry.time + 0.18, nextEntry.time).toFixed(3))
      : Number(Math.max(entry.time + 1.5, fallbackEnd).toFixed(3));

    const gapDuration = Number(Math.max(0.18, hardEndTime - entry.time).toFixed(3));
    let words = [];

    if (Array.isArray(entry.inlineWords) && entry.inlineWords.length > 0) {
      words = entry.inlineWords.map((iw, wIdx) => {
        const nextIw = entry.inlineWords[wIdx + 1];
        const wStart = Number(Math.max(entry.time, iw.time).toFixed(3));
        const wEnd = nextIw
          ? Number(Math.max(wStart + 0.05, Math.min(hardEndTime, nextIw.time)).toFixed(3))
          : Number(Math.max(wStart + 0.1, Math.min(hardEndTime, iw.endTime || (wStart + 0.45))).toFixed(3));
        return { word: iw.word, time: wStart, endTime: wEnd };
      });
    } else {
      const wordCount = entry.text.split(/\s+/).filter(Boolean).length;
      const charCount = entry.text.length;
      // Natural singing cadence: prevents words from lagging across 10s instrumental pauses
      const naturalVocalSpan = entry.text === "♪"
        ? gapDuration
        : Math.min(gapDuration * 0.94, Math.max(0.95, wordCount * 0.36 + charCount * 0.042));
      const vocalEndSec = Math.min(hardEndTime, entry.time + naturalVocalSpan);
      words = distributeWordsAcrossWindow(entry.text, entry.time, vocalEndSec, hardEndTime);
    }

    timeline.push({
      index: timeline.length,
      time: Number(entry.time.toFixed(3)),
      endTime: hardEndTime,
      duration: gapDuration,
      text: entry.text,
      isInstrumental: entry.text === "♪" || entry.text === "♪ • • •",
      plainOnly: false,
      words
    });
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
  const lineTimeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const inlineWordRegex = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>\s*([^<[\r\n]+)/g;

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
    const cleanLineText = contentRaw
      .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (/^(by|offset|ar|ti|al|length|re|ve|au|lr)\s*:/i.test(cleanLineText)) continue;

    // Parse inline Enhanced LRC <mm:ss.xx> word timestamps if present
    const inlineWords = [];
    inlineWordRegex.lastIndex = 0;
    let wMatch;
    while ((wMatch = inlineWordRegex.exec(contentRaw)) !== null) {
      const wTime = parseTimestampToSec(wMatch[1], wMatch[2], wMatch[3]);
      const chunkText = wMatch[4].trim();
      if (!chunkText) continue;
      const subWords = chunkText.split(/\s+/).filter(Boolean);
      subWords.forEach((sw, idx) => {
        inlineWords.push({
          word: sw,
          time: Number((wTime + idx * 0.14).toFixed(3))
        });
      });
    }

    for (const t of timestamps) {
      parsedEntries.push({
        time: t,
        text: cleanLineText || "♪",
        inlineWords: inlineWords.length > 0 ? inlineWords : null
      });
    }
  }

  return finalizeTimelineMonotonic(parsedEntries, totalDurationSec);
}

function parseNeteaseYrcToTimeline(yrcString, totalDurationSec = 0) {
  if (!yrcString || typeof yrcString !== "string") return [];
  const rawLines = yrcString.split(/\r?\n/);
  const entries = [];

  for (const line of rawLines) {
    const lineMeta = line.match(/^\[(\d+),(\d+)\](.*)$/);
    if (!lineMeta) continue;
    const lineStartSec = parseInt(lineMeta[1], 10) / 1000;
    const body = lineMeta[3] || "";

    const wordRegex = /\((\d+),(\d+),\d+\)([^\r\n(]*)/g;
    let wm;
    const inlineWords = [];
    const textParts = [];

    while ((wm = wordRegex.exec(body)) !== null) {
      const wStart = parseInt(wm[1], 10) / 1000;
      const wDur = Math.max(0.08, parseInt(wm[2], 10) / 1000);
      const wText = wm[3].trim();
      if (!wText) continue;
      textParts.push(wText);
      inlineWords.push({
        word: wText,
        time: Number(wStart.toFixed(3)),
        endTime: Number((wStart + wDur).toFixed(3))
      });
    }

    const joined = textParts.join(" ").replace(/\s+/g, " ").trim();
    if (joined) {
      entries.push({
        time: Number(lineStartSec.toFixed(3)),
        text: joined,
        inlineWords
      });
    }
  }

  return finalizeTimelineMonotonic(entries, totalDurationSec);
}

function buildEstimatedTimelineFromPlain(plainLyrics, totalDurationSec = 190) {
  if (!plainLyrics) return [];
  const rawLines = String(plainLyrics)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\r?\n/)
    .map(l => cleanText(l))
    .filter(l =>
      l &&
      !/^\[?(verse|chorus|bridge|intro|outro|hook|pre-chorus|interlude|refrain|instrumental).*?\]?$/i.test(l) &&
      !/^(lyrics|lyricist|music|singer|cast|composer|produced by|written by)\s*:/i.test(l)
    );

  if (rawLines.length === 0) return [];

  const effectiveTotal = totalDurationSec > 35 ? totalDurationSec : 195;
  const introOffset = Math.min(8.0, Math.max(2.5, effectiveTotal * 0.045));
  const outroBuffer = Math.min(12.0, Math.max(4.0, effectiveTotal * 0.06));
  const usableWindow = Math.max(30, effectiveTotal - introOffset - outroBuffer);

  const lineWeights = rawLines.map(line => {
    const words = line.split(/\s+/).filter(Boolean);
    const wordSum = words.reduce((acc, w) => acc + estimateWordWeight(w), 0);
    return Math.max(4, wordSum + 1.8);
  });
  const totalWeight = Math.max(1, lineWeights.reduce((a, b) => a + b, 0));

  let cursor = introOffset;
  const rawEntries = rawLines.map((text, idx) => {
    const span = Math.max(1.35, (lineWeights[idx] / totalWeight) * usableWindow);
    const startSec = Number(cursor.toFixed(3));
    cursor += span;
    return {
      time: startSec,
      text
    };
  });

  return finalizeTimelineMonotonic(rawEntries, effectiveTotal);
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
    .replace(/ph/g, "f")
    .replace(/[^a-z0-9\u0900-\u0d7f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLrcCandidate(item, tokens, durationSec) {
  if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -999;

  const rawItemTitle = String(item.trackName || item.name || "").toLowerCase();
  const rawSearchTitle = String(tokens.primaryTitle || "").toLowerCase();

  // Reject undesired remix/karaoke mismatch if original wasn't one
  if (/\b(karaoke|8d|instrumental)\b/i.test(rawItemTitle) && !/\b(karaoke|8d|instrumental)\b/i.test(rawSearchTitle)) {
    return -500;
  }

  const itemTitle = normalizeTokenComparison(item.trackName || item.name || "");
  const itemArtist = normalizeTokenComparison(item.artistName || "");
  const itemAlbum = normalizeTokenComparison(item.albumName || "");
  const targetTitle = normalizeTokenComparison(tokens.primaryTitle);
  const altTitle = normalizeTokenComparison(tokens.secondaryTitle);

  let titleScore = 0;
  if (targetTitle && itemTitle === targetTitle) {
    titleScore = 95;
  } else if (targetTitle && (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle))) {
    titleScore = 72;
  } else if (altTitle && altTitle.length >= 3 && (itemTitle === altTitle || itemTitle.includes(altTitle))) {
    titleScore = 65;
  } else if (targetTitle) {
    const targetWords = targetTitle.split(" ").filter(w => w.length >= 3);
    const matchedWords = targetWords.filter(w => itemTitle.includes(w));
    if (targetWords.length > 0 && matchedWords.length === targetWords.length) {
      titleScore = 68;
    } else if (targetWords.length >= 2 && matchedWords.length >= targetWords.length - 1) {
      titleScore = 48;
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
      score += 45;
      contextMatched = true;
      break;
    }
  }

  if (tokens.album) {
    const normAlb = normalizeTokenComparison(tokens.album);
    const albWords = normAlb.split(" ").filter(w => w.length >= 3);
    if (normAlb && (itemAlbum.includes(normAlb) || itemTitle.includes(normAlb) || albWords.some(w => w.length >= 4 && (itemAlbum.includes(w) || itemArtist.includes(w))))) {
      score += 60;
      contextMatched = true;
    }
  }

  if (durationSec > 0 && item.duration) {
    const diff = Math.abs(durationSec - Number(item.duration));
    if (diff <= 3) {
      score += 80;
      contextMatched = true;
    } else if (diff <= 8) {
      score += 55;
      contextMatched = true;
    } else if (diff <= 18) {
      score += 25;
    } else if (diff > 45 && !contextMatched) {
      score -= 45;
    }
  }

  if (item.syncedLyrics) score += 90;
  else if (item.plainLyrics) score += 25;

  return score;
}

async function searchLrclibCandidates(tokens, durationSec) {
  const headers = { "User-Agent": `${WORKER_NAME}/${WORKER_VERSION} (https://projectvelo.tjcodewizard.workers.dev)` };
  const urls = [];

  if (tokens.primaryTitle && tokens.artists[0]) {
    urls.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(tokens.primaryTitle)}&artist_name=${encodeURIComponent(tokens.artists[0])}`);
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.artists[0]}`)}`);
  }
  if (tokens.primaryTitle && tokens.album) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.album}`)}`);
  }
  if (tokens.primaryTitle && tokens.artists[1]) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.primaryTitle} ${tokens.artists[1]}`)}`);
  }
  if (tokens.primaryTitle) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(tokens.primaryTitle)}`);
  }
  if (tokens.secondaryTitle && tokens.secondaryTitle.length >= 3) {
    urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${tokens.secondaryTitle} ${tokens.artists[0] || ""}`.trim())}`);
  }

  const uniqueUrls = [...new Set(urls)].slice(0, 6);
  const settled = await Promise.allSettled(
    uniqueUrls.map(u => fetchWithTimeout(u, { headers }, 4200).then(r => r.ok ? r.json() : []))
  );

  const seenIds = new Set();
  const allCandidates = [];

  for (const res of settled) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      for (const item of res.value) {
        if (item && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allCandidates.push(item);
        }
      }
    }
  }

  if (allCandidates.length === 0) return { bestSynced: null, bestPlain: null };

  const scored = allCandidates
    .map(item => ({ item, score: scoreLrcCandidate(item, tokens, durationSec) }))
    .filter(x => x.score >= 55)
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
    }, 3800);

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
      const sc = scoreLrcCandidate(candidateItem, tokens, durationSec);
      if (sc > bestScore) {
        bestScore = sc;
        bestSong = s;
      }
    }

    if (!bestSong || bestScore < 65) return null;

    const lrcRes = await fetchWithTimeout(`https://music.163.com/api/song/lyric?id=${bestSong.id}&lv=1&kv=1&tv=-1&yv=1`, {
      headers: {
        "User-Agent": SAAVN_HEADERS["User-Agent"],
        "Referer": "https://music.163.com/"
      }
    }, 3800);

    if (!lrcRes.ok) return null;
    const lrcJson = await lrcRes.json();

    // First check NetEase YRC (exact word-by-word millisecond timing)
    const rawYrc = lrcJson?.yrc?.lyric || "";
    if (rawYrc && rawYrc.length > 30) {
      const yrcLines = parseNeteaseYrcToTimeline(rawYrc, durationSec);
      if (yrcLines.length >= 3) {
        return {
          source: "NetEaseVerbatimYrcProvider",
          isSynced: true,
          isAutoTimed: false,
          syncedLyrics: rawYrc,
          plainLyrics: yrcLines.map(l => l.text).join("\n"),
          lines: yrcLines
        };
      }
    }

    const rawLrc = lrcJson?.lrc?.lyric || "";
    if (!rawLrc || rawLrc.length < 25) return null;

    const lines = parseLrcToTimeline(rawLrc, durationSec);
    if (lines.length >= 3) {
      return {
        source: "NetEaseLrcProvider",
        isSynced: true,
        isAutoTimed: false,
        syncedLyrics: rawLrc,
        plainLyrics: lines.map(l => l.text).join("\n"),
        lines
      };
    }
  } catch {}
  return null;
}

async function searchKugouLyrics(tokens, durationSec) {
  try {
    const keyword = [tokens.primaryTitle, tokens.artists[0] || ""].filter(Boolean).join(" ").trim();
    if (!keyword) return null;

    const searchUrl = `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(keyword)}&page=1&pagesize=5`;
    const sRes = await fetchWithTimeout(searchUrl, { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, 3200);
    if (!sRes.ok) return null;
    const sJson = await sRes.json();
    const infoList = sJson?.data?.info || [];
    if (!infoList.length) return null;

    let chosen = null;
    for (const item of infoList) {
      const cand = {
        trackName: item.songname,
        artistName: item.singername,
        albumName: item.album_name || "",
        duration: item.duration || 0,
        syncedLyrics: "1"
      };
      if (scoreLrcCandidate(cand, tokens, durationSec) >= 65) {
        chosen = item;
        break;
      }
    }
    if (!chosen || !chosen.hash) return null;

    const durMs = (chosen.duration || durationSec || 180) * 1000;
    const kSearchUrl = `http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(tokens.primaryTitle)}&duration=${durMs}&hash=${chosen.hash}`;
    const kRes = await fetchWithTimeout(kSearchUrl, { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, 3200);
    if (!kRes.ok) return null;
    const kJson = await kRes.json();
    const candidate = kJson?.candidates?.[0];
    if (!candidate?.id || !candidate?.accesskey) return null;

    const dlUrl = `http://lyrics.kugou.com/download?ver=1&client=pc&id=${candidate.id}&accesskey=${candidate.accesskey}&fmt=lrc&charset=utf8`;
    const dlRes = await fetchWithTimeout(dlUrl, { headers: { "User-Agent": SAAVN_HEADERS["User-Agent"] } }, 3200);
    if (!dlRes.ok) return null;
    const dlJson = await dlRes.json();
    if (!dlJson?.content) return null;

    const binary = atob(dlJson.content.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const decodedLrc = new TextDecoder("utf-8").decode(bytes);

    const lines = parseLrcToTimeline(decodedLrc, durationSec);
    if (lines.length >= 3) {
      return {
        source: "KugouLrcProvider",
        isSynced: true,
        isAutoTimed: false,
        syncedLyrics: decodedLrc,
        plainLyrics: lines.map(l => l.text).join("\n"),
        lines
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
    }, 3500);
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
    }, 3800);
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

async function resolveRealtimeLyrics(url) {
  let songId = url.searchParams.get("id") || url.searchParams.get("pid") || "";
  let trackName = url.searchParams.get("trackName") || url.searchParams.get("title") || "";
  let artistName = url.searchParams.get("artistName") || url.searchParams.get("artist") || "";
  let albumName = url.searchParams.get("albumName") || url.searchParams.get("album") || "";
  let durationSec = parseInt(url.searchParams.get("duration") || "0", 10) || 0;
  const rawQ = url.searchParams.get("q") || "";
  let extraArtists = [];

  if (songId) {
    const memoSong = SONG_META_MEMO.get(String(songId));
    if (memoSong) {
      if (!trackName) trackName = memoSong.title;
      if (!artistName) artistName = memoSong.artist;
      if (!albumName || albumName === "OpenMuse") albumName = memoSong.album;
      if (!durationSec && memoSong.duration) durationSec = memoSong.duration;
      if (Array.isArray(memoSong.allArtists)) extraArtists = memoSong.allArtists;
    } else {
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

  // Tier 1: Parallel Synced Lyrics Search (LRCLIB + NetEase YRC/LRC + Kugou)
  const [lrcResult, neteaseHit, kugouHit] = await Promise.all([
    searchLrclibCandidates(tokens, durationSec),
    searchNeteaseLyrics(tokens, durationSec),
    searchKugouLyrics(tokens, durationSec)
  ]);

  if (neteaseHit && neteaseHit.source === "NetEaseVerbatimYrcProvider") {
    return {
      ...neteaseHit,
      trackName: tokens.primaryTitle,
      artistName,
      duration: durationSec || 185
    };
  }

  if (lrcResult?.bestSynced?.syncedLyrics) {
    const winner = lrcResult.bestSynced;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const lines = parseLrcToTimeline(winner.syncedLyrics, effectiveDur);
    if (lines.length > 0) {
      return {
        source: "LrcLibSyncedProvider",
        trackName: winner.trackName || tokens.primaryTitle,
        artistName: winner.artistName || artistName,
        duration: effectiveDur,
        isSynced: true,
        isAutoTimed: false,
        syncedLyrics: winner.syncedLyrics,
        plainLyrics: winner.plainLyrics || lines.map(l => l.text).join("\n"),
        lines
      };
    }
  }

  if (neteaseHit) {
    return {
      ...neteaseHit,
      trackName: tokens.primaryTitle,
      artistName,
      duration: durationSec || 185
    };
  }

  if (kugouHit) {
    return {
      ...kugouHit,
      trackName: tokens.primaryTitle,
      artistName,
      duration: durationSec || 185
    };
  }

  // Tier 2: Plain Lyrics + Cadence-Synced Word-by-Word Generator
  if (lrcResult?.bestPlain?.plainLyrics) {
    const winner = lrcResult.bestPlain;
    const effectiveDur = durationSec || Math.round(winner.duration || 185);
    const lines = buildEstimatedTimelineFromPlain(winner.plainLyrics, effectiveDur);
    if (lines.length > 0) {
      return {
        source: "LrcLibCadenceSyncProvider",
        trackName: winner.trackName || tokens.primaryTitle,
        artistName: winner.artistName || artistName,
        duration: effectiveDur,
        isSynced: true,
        isAutoTimed: true,
        syncedLyrics: null,
        plainLyrics: winner.plainLyrics,
        lines
      };
    }
  }

  if (songId) {
    for (const apiVer of ["4", ""]) {
      try {
        const params = { __call: "lyrics.getLyrics", lyrics_id: songId };
        if (apiVer) params.api_version = apiVer;
        const saavnLyrics = await fetchSaavnJson(params, 3500);
        if (saavnLyrics?.lyrics) {
          const plain = cleanText(saavnLyrics.lyrics.replace(/<br\s*\/?>/gi, "\n"));
          const lines = buildEstimatedTimelineFromPlain(plain, durationSec || 185);
          if (lines.length > 0) {
            return {
              source: "SaavnCadenceSyncProvider",
              trackName: tokens.primaryTitle,
              artistName,
              duration: durationSec || 185,
              isSynced: true,
              isAutoTimed: true,
              syncedLyrics: null,
              plainLyrics: plain,
              lines
            };
          }
        }
      } catch {}
    }
  }

  const geniusPlain = await searchGeniusPlainLyrics(tokens);
  if (geniusPlain) {
    const lines = buildEstimatedTimelineFromPlain(geniusPlain, durationSec || 185);
    if (lines.length > 0) {
      return {
        source: "GeniusCadenceSyncProvider",
        trackName: tokens.primaryTitle,
        artistName,
        duration: durationSec || 185,
        isSynced: true,
        isAutoTimed: true,
        syncedLyrics: null,
        plainLyrics: geniusPlain,
        lines
      };
    }
  }

  if (tokens.primaryTitle && tokens.artists[0]) {
    try {
      const ovhRes = await fetchWithTimeout(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(tokens.artists[0])}/${encodeURIComponent(tokens.primaryTitle)}`,
        {},
        3000
      );
      if (ovhRes.ok) {
        const ovhJson = await ovhRes.json();
        if (ovhJson?.lyrics) {
          const lines = buildEstimatedTimelineFromPlain(ovhJson.lyrics, durationSec || 185);
          if (lines.length > 0) {
            return {
              source: "LyricsOvhCadenceSyncProvider",
              trackName: tokens.primaryTitle,
              artistName: tokens.artists[0],
              duration: durationSec || 185,
              isSynced: true,
              isAutoTimed: true,
              syncedLyrics: null,
              plainLyrics: ovhJson.lyrics,
              lines
            };
          }
        }
      }
    } catch {}
  }

  // Guaranteed real-time fallback timeline so /lyrics never returns 404
  const fallbackLines = buildInstrumentalFallbackTimeline(tokens.primaryTitle || trackName, artistName, durationSec || 185);
  return {
    source: "ProjectVeloBeatSyncFallback",
    trackName: tokens.primaryTitle || trackName || "OpenMuse",
    artistName: artistName || "OpenMuse",
    duration: durationSec || 185,
    isSynced: true,
    isAutoTimed: true,
    syncedLyrics: null,
    plainLyrics: fallbackLines.map(l => l.text).join("\n"),
    lines: fallbackLines
  };
}

// ============================================================================
// MAIN WORKER ROUTER (ProjectVelo)
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
            "X-Worker-Engine": `${WORKER_NAME}/${WORKER_VERSION}`
          });
        }, "v6-projectvelo-lyrics");
      }

      if (path === "/album") {
        const albumId = url.searchParams.get("id") || url.searchParams.get("albumid") || url.searchParams.get("token");
        return await withEdgeCache(request, ctx, 1800, async () => {
          const data = await resolveCompleteAlbum(albumId, url.origin);
          return jsonResponse(data);
        }, "v6-projectvelo-album");
      }

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
        }, "v6-projectvelo-song");
      }

      if (path === "/reco") {
        const pid = url.searchParams.get("id") || url.searchParams.get("pid");
        if (!pid) return jsonResponse({ error: "Missing ?id=<songId>" }, 400);
        return await withEdgeCache(request, ctx, 900, async () => {
          const rawReco = await fetchSaavnJson({
            __call: "reco.getreco",
            api_version: "4",
            pid,
            language: url.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu"
          });
          const songs = await filterAndUpgradeSongs(Array.isArray(rawReco) ? rawReco : [], url.origin);
          return jsonResponse({ pid, count: songs.length, songs });
        }, "v6-projectvelo-reco");
      }

      if (path === "/home") {
        return await withEdgeCache(request, ctx, 900, async () => {
          const trendingData = await fetchSaavnJson({
            __call: "content.getTrending",
            api_version: "4",
            entity_type: url.searchParams.get("type") || "song",
            entity_language: url.searchParams.get("lang") || "english,hindi,malayalam,tamil,telugu"
          });
          const items = Array.isArray(trendingData) ? trendingData : [];
          const rawSongs = items.filter(x => x.type === "song" || x.more_info?.encrypted_media_url);
          const songs = await filterAndUpgradeSongs(rawSongs, url.origin);
          const albums = items
            .filter(x => x.type === "album" || x.type === "playlist")
            .map(a => enrichSaavnAlbum(a, url.origin));
          return jsonResponse({ songs, albums });
        }, "v6-projectvelo-home");
      }

      if (path === "/search") {
        return await handleSearchRoute(request, url, ctx);
      }

      return jsonResponse({
        service: `${WORKER_NAME} v${WORKER_VERSION} — High-Resolution Audio & Real-Time Word-Sync Engine`,
        repository: "ProjectVelo",
        status: "online",
        endpoints: {
          stream: `${url.origin}/stream?url=<target>`,
          play: `${url.origin}/play?id=<songId>&title=<title>&artist=<artist>`,
          lyrics: `${url.origin}/lyrics?id=<songId>&trackName=<title>&artistName=<artist>&albumName=<album>&duration=<sec>`,
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
  let rawMediaUrl = (url.searchParams.get("url") || "").trim();
  let title = (url.searchParams.get("title") || "").trim();
  let artist = (url.searchParams.get("artist") || "").trim();

  // Step 1: Resolve official master via JioSaavn song.getDetails
  if (songId) {
    try {
      const data = await fetchSaavnJson({ __call: "song.getDetails", pids: songId });
      const rawSong = data?.[songId] || data?.songs?.[0] || Object.values(data || {})[0];
      if (rawSong) {
        const enriched = enrichSaavnSong(rawSong, url.origin);
        if (enriched.decrypted_media_url) rawMediaUrl = enriched.decrypted_media_url;
        if (!title) title = enriched.title;
        if (!artist) artist = enriched.artist;
      }
    } catch {}
  }

  if (rawMediaUrl) {
    const streamRes = await handleSmartStream(request, rawMediaUrl, url.origin, ctx, true);
    if (streamRes && (streamRes.status === 200 || streamRes.status === 206)) {
      return streamRes;
    }
  }

  // Step 2: Self-Heal by searching JioSaavn for an alternate official 320kbps master of the same track
  // (No amateur Audius or 30s Deezer previews!)
  const tokens = extractLyricsSearchTokens(title, artist, "");
  const officialQuery = [tokens.primaryTitle, tokens.artists[0] || ""].filter(Boolean).join(" ").trim();

  if (officialQuery) {
    try {
      const searchData = await fetchSaavnJson({
        __call: "search.getResults",
        api_version: "4",
        n: "10",
        p: "1",
        q: officialQuery
      });
      const candidates = await filterAndUpgradeSongs(searchData?.results || [], url.origin, officialQuery);
      for (const cand of candidates) {
        if (cand.id === songId && rawMediaUrl) continue;
        if (!cand.decrypted_media_url) continue;
        const healedStream = await handleSmartStream(request, cand.decrypted_media_url, url.origin, ctx, true);
        if (healedStream && (healedStream.status === 200 || healedStream.status === 206)) {
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

  // Block amateur user-generated sources (Audius / 30s preview providers)
  if (host.includes("audius.co")) {
    return jsonResponse({ data: [] }, 200);
  }

  // Intercept JioSaavn API calls proxied via /stream?url=...
  if (host.includes("jiosaavn.com") && parsedTarget.pathname.includes("api.php")) {
    const callType = parsedTarget.searchParams.get("__call") || "";

    if (callType === "content.getAlbumDetails" || callType === "playlist.getDetails") {
      const albumId = parsedTarget.searchParams.get("albumid") || parsedTarget.searchParams.get("listid") || parsedTarget.searchParams.get("id");
      return await withEdgeCache(request, ctx, 1800, async () => {
        const enrichedAlbum = await resolveCompleteAlbum(albumId, origin);
        return jsonResponse(enrichedAlbum);
      }, "v6-projectvelo-stream-album");
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
      }, "v6-projectvelo-stream-api");
    }
  }

  // Edge-cached Artwork Proxy
  const isImage = /\.(jpg|jpeg|png|webp|svg|avif)(\?.*)?$/i.test(parsedTarget.pathname) || host.includes("c.saavncdn.com") || host.includes("sop.saavncdn.com");
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
        "Referer": "https://www.jiosaavn.com/"
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

  // High-Resolution Audio Stream Proxy (320kbps AAC-LC M4A Cascade)
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

  // Normalize audio MIME type so Safari/Chrome WebAudio never fails with MediaError
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
      const [sData, aData] = await Promise.allSettled([
        fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "28", p: "1", q }),
        fetchSaavnJson({ __call: "search.getAlbumResults", api_version: "4", n: "16", p: "1", q })
      ]);

      const rawSongs = sData.status === "fulfilled" && Array.isArray(sData.value?.results)
        ? sData.value.results
        : [];
      const songs = await filterAndUpgradeSongs(rawSongs, url.origin, q);

      const albums = aData.status === "fulfilled" && Array.isArray(aData.value?.results)
        ? aData.value.results.map(a => enrichSaavnAlbum(a, url.origin))
        : [];

      return jsonResponse({ query: q, songs, albums });
    }, "v6-projectvelo-search");
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const writeLine = async (obj) => writer.write(encoder.encode(JSON.stringify(obj) + "\n"));

  ctx.waitUntil((async () => {
    try {
      const [sData, aData] = await Promise.allSettled([
        fetchSaavnJson({ __call: "search.getResults", api_version: "4", n: "28", p: "1", q }),
        fetchSaavnJson({ __call: "search.getAlbumResults", api_version: "4", n: "16", p: "1", q })
      ]);

      if (sData.status === "fulfilled" && Array.isArray(sData.value?.results)) {
        const songs = await filterAndUpgradeSongs(sData.value.results, url.origin, q);
        for (const s of songs) {
          await writeLine({ event: "TrackDetails", source_name: "ProjectVeloSaavn", data: s });
        }
      }
      if (aData.status === "fulfilled" && Array.isArray(aData.value?.results)) {
        for (const a of aData.value.results) {
          await writeLine({ event: "AlbumDetails", source_name: "ProjectVeloSaavn", data: enrichSaavnAlbum(a, url.origin) });
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

async function withEdgeCache(request, ctx, ttlSeconds, computeFn, cacheNamespace = "v6-projectvelo") {
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
