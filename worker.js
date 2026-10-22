/**
 * Soundbound Zero-Buffer Streaming Cloudflare Worker (worker.js)
 * Deploy via GitHub -> Cloudflare Workers / Pages
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range, X-Custom-Headers, X-Custom-UA, X-Custom-Referer",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Upstream-Status, X-Upstream-Url"
};

// All official Soundbound upstream repository mirrors
const SOUNDBOUND_REPOS = {
  "private-extensions": "https://soundbound.app/sources/private-extensions.json",
  "gitlab-private-extensions": "https://gitlab.com/shabinder/soundbound/-/raw/main/Experimental-Sources/private-extensions.json",
  "gitlab-sources": "https://gitlab.com/shabinder/soundbound/-/raw/main/Experimental-Sources/sources.json",
  "gitlab-main": "https://gitlab.com/shabinder/soundbound/-/raw/main/Experimental-Sources/main.json",
  "gitlab-hashes": "https://gitlab.com/shabinder/soundbound/-/raw/main/Experimental-Sources/hashes.json",
  "gitlab-ota-validation": "https://gitlab.com/shabinder/soundbound/-/raw/main/Experimental-Sources/ota-validation.json"
};

// Complete vocabulary, models, and enums used across Soundbound & soundbound-extensions-lib
const SOUNDBOUND_TERMS = {
  SourceModel_Fields: [
    "source_id",           // e.g. "in.shabinder.soundbound.extension.shabinder.spotify"
    "source_name",         // e.g. "SpotifyProvider"
    "source_version_code", // Int, e.g. 77
    "source_version_name", // String, e.g. "0.31.77"
    "link",                // Zipline manifest URL (.../manifest.zipline.json)
    "source_type",         // SourceType enum
    "enabledByDefault",    // Boolean
    "icon_url",            // Optional String URL
    "source_priority",     // Int (0 = highest priority, 99 = lowest)
    "extraDeps"            // Optional Array<SourceModel>
  ],
  SourceType_Enum: [
    "PROVIDER",              // Base / Lyrics / Utility provider (Genius, Musixmatch, LrcLib)
    "METADATA_PROVIDER",     // Link/Chart metadata resolver (Odesli, SoundCharts)
    "QUERYABLE_PROVIDER",    // Catalog/Playlist/Track search provider (Spotify, Gaana)
    "DOWNLOADABLE_PROVIDER", // Direct audio stream & download provider (YouTube, Saavn, SoundCloud, Deezer, Audius, Jamendo)
    "LYRICS_PROVIDER"        // Synced/Unsynced lyrics interface
  ],
  Known_Providers: [
    "in.shabinder.soundbound.extension.shabinder.spotify",
    "in.shabinder.soundbound.extension.shabinder.youtube",
    "in.shabinder.soundbound.extension.shabinder.saavn",
    "in.shabinder.soundbound.extension.shabinder.gaana",
    "in.shabinder.soundbound.extension.shabinder.soundcloud",
    "in.shabinder.soundbound.extension.shabinder.deezer",
    "in.shabinder.soundbound.extension.shabinder.audius",
    "in.shabinder.soundbound.extension.shabinder.jamendo",
    "in.shabinder.soundbound.extension.shabinder.tidal",
    "in.shabinder.soundbound.extension.shabinder.qobuz",
    "in.shabinder.soundbound.extension.shabinder.genius",
    "in.shabinder.soundbound.extension.shabinder.musixmatch",
    "in.shabinder.soundbound.extension.shabinder.lrclib",
    "in.shabinder.soundbound.extension.shabinder.odesli",
    "in.shabinder.soundbound.extension.shabinder.soundcharts"
  ],
  QueryParams_Fields: [
    "trackName",        // String
    "trackArtists",     // List<String>
    "trackDurationSec", // Int
    "genre",            // List<String>
    "year",             // Int?
    "albumName",        // String?
    "albumArtists",     // List<String>
    "trackLink",        // String?
    "isrc"              // String?
  ],
  TrackDetails_Fields: [
    "title", "artists", "durationSec", "albumName", "albumArtists",
    "year", "comment", "trackUrl", "videoID", "albumArtURL",
    "source", "downloaded", "audioQuality", "audioFormat", "lyrics", "isrc", "trackNumber"
  ],
  DownloadQueryResult_Fields: [
    "url",          // Direct media stream URL
    "audioFormat",  // AudioFormat enum
    "audioQuality", // AudioQuality enum
    "headers"       // Map<String, String> required for streaming
  ],
  AudioQuality_Enum: ["KBPS128", "KBPS160", "KBPS192", "KBPS256", "KBPS320", "FLAC", "UNKNOWN"],
  AudioFormat_Enum: ["MP3", "MP4", "OPUS", "FLAC", "OGG", "WAV", "AAC", "UNKNOWN"],
  DownloadStatus_Enum: ["NotDownloaded", "Queued", "Downloading", "Converting", "Downloaded", "Failed"],
  ZiplineManifest_Fields: ["unsigned", "modules", "version", "freshAtEpochMs", "signatures", "baseUrl", "mainModuleId", "mainFunction", "sha256", "dependsOnIds"],
  Exceptions: ["NoMatchFound", "GeoLocationBlocked", "AuthRequiredException", "ThrowableWrapper"]
};

// Last-resort snapshot in case all upstream servers are unreachable
const FALLBACK_EXTENSIONS = [
  {"source_id":"in.shabinder.soundbound.extension.shabinder.spotify","source_name":"SpotifyProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.spotify/77/manifest.zipline.json","source_type":"QUERYABLE_PROVIDER","enabledByDefault":true,"icon_url":"https://soundbound.app/assets/ic_spotify.svg","source_priority":0,"extraDeps":[{"source_id":"in.shabinder.soundbound.extension.shabinder.youtube","source_name":"YoutubeProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.youtube/77/manifest.zipline.json","source_type":"DOWNLOADABLE_PROVIDER","enabledByDefault":true,"icon_url":"https://soundbound.app/assets/ic_youtube.svg","source_priority":1}]},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.youtube","source_name":"YoutubeProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.youtube/77/manifest.zipline.json","source_type":"DOWNLOADABLE_PROVIDER","enabledByDefault":true,"icon_url":"https://soundbound.app/assets/ic_youtube.svg","source_priority":1},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.soundcharts","source_name":"SoundChartsProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.soundcharts/77/manifest.zipline.json","source_type":"METADATA_PROVIDER","enabledByDefault":true,"source_priority":1},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.saavn","source_name":"SaavnProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.saavn/77/manifest.zipline.json","source_type":"DOWNLOADABLE_PROVIDER","enabledByDefault":true,"icon_url":"https://soundbound.app/assets/ic_jiosaavn.svg","source_priority":2},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.odesli","source_name":"OdesliProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.odesli/77/manifest.zipline.json","source_type":"METADATA_PROVIDER","enabledByDefault":true,"source_priority":2},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.gaana","source_name":"GaanaProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.gaana/77/manifest.zipline.json","source_type":"QUERYABLE_PROVIDER","enabledByDefault":true,"icon_url":"https://soundbound.app/assets/ic_gaana.svg","source_priority":4},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.soundcloud","source_name":"SoundcloudProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.soundcloud/77/manifest.zipline.json","source_type":"DOWNLOADABLE_PROVIDER","enabledByDefault":true,"icon_url":"https://soundbound.app/assets/ic_soundcloud.svg","source_priority":5},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.deezer","source_name":"DeezerProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.deezer/77/manifest.zipline.json","source_type":"DOWNLOADABLE_PROVIDER","enabledByDefault":true,"icon_url":"https://upload.wikimedia.org/wikipedia/commons/0/0e/Deezer_New_Icon.svg","source_priority":5},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.musixmatch","source_name":"MusixmatchProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.musixmatch/77/manifest.zipline.json","source_type":"PROVIDER","enabledByDefault":true,"icon_url":"https://play-lh.googleusercontent.com/Gw0PKgbVNm5nbtJ7wIKJPRdO_C75yBp1MXyCZg641EZ5IYMv05lcBKXN-rzgVo3-OUQ=w240-h480","source_priority":40},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.lrclib","source_name":"LrcLibProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.lrclib/77/manifest.zipline.json","source_type":"PROVIDER","enabledByDefault":true,"icon_url":"https://lrclib.net/assets/lrclib-370c57eb.png","source_priority":50},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.genius","source_name":"GeniusProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.genius/77/manifest.zipline.json","source_type":"PROVIDER","enabledByDefault":true,"icon_url":"https://assets.genius.com/images/apple-touch-icon.png","source_priority":60},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.audius","source_name":"AudiusProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.audius/77/manifest.zipline.json","source_type":"DOWNLOADABLE_PROVIDER","enabledByDefault":false,"icon_url":"https://soundbound.app/assets/ic_audius.svg","source_priority":98},
  {"source_id":"in.shabinder.soundbound.extension.shabinder.jamendo","source_name":"JamendoProvider","source_version_code":77,"source_version_name":"0.31.77","link":"https://sources.soundbound.app/in.shabinder.soundbound.extension.shabinder.jamendo/77/manifest.zipline.json","source_type":"DOWNLOADABLE_PROVIDER","enabledByDefault":false,"icon_url":"https://soundbound.app/assets/ic_jamendo.svg","source_priority":99}
];

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight immediately
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. ZERO-BUFFER RAW STREAM PROXY: /stream?url=<encoded_url>
      if (path === "/stream" || path === "/proxy" || url.searchParams.has("streamUrl")) {
        const target = url.searchParams.get("url") || url.searchParams.get("streamUrl");
        return await handleZeroBufferStream(request, target);
      }

      // 2. NDJSON STREAMING REPO & ZIPLINE MANIFEST COLLECTOR: /collect
      if (path === "/collect") {
        return handleStreamingRepoCollect(request, url, ctx);
      }

      // 3. NDJSON STREAMING MULTI-PROVIDER TRACK/LYRICS/METADATA SEARCH: /search
      if (path === "/search") {
        return handleStreamingTrackSearch(request, url, ctx);
      }

      // 4. SOUNDBOUND TERMS & SCHEMA REFERENCE: /terms
      if (path === "/terms") {
        return new Response(JSON.stringify({
          repos: SOUNDBOUND_REPOS,
          terms: SOUNDBOUND_TERMS
        }, null, 2), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
        });
      }

      // Default: Return usage & health status
      return new Response(JSON.stringify({
        service: "Soundbound Streaming Worker",
        endpoints: {
          zeroBufferStreamProxy: `${url.origin}/stream?url=https://soundbound.app/sources/private-extensions.json`,
          ndjsonRepoCollector: `${url.origin}/collect?repo=private-extensions&resolveManifests=false`,
          ndjsonTrackSearch: `${url.origin}/search?trackName=Blinding+Lights&trackArtists=The+Weeknd`,
          soundboundTerms: `${url.origin}/terms`
        }
      }, null, 2), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: "ThrowableWrapper",
        message: err.message || String(err),
        stackTrace: err.stack || ""
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
      });
    }
  }
};

/**
 * 1. ZERO-BUFFER STREAM HANDLER
 * Never downloads or buffers the file into Worker memory.
 * Pipes the ReadableStream directly from upstream to client with Range support.
 */
async function handleZeroBufferStream(request, targetUrl) {
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing ?url= parameter" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid target URL" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  const reqUrl = new URL(request.url);
  const upstreamHeaders = new Headers();

  // Mimic Soundbound Android/JVM OkHttp client or custom UA
  upstreamHeaders.set(
    "User-Agent",
    reqUrl.searchParams.get("ua") ||
    request.headers.get("X-Custom-UA") ||
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
  );
  upstreamHeaders.set("Accept", request.headers.get("Accept") || "*/*");

  // Forward Range headers for partial audio/file streaming (HTTP 206)
  if (request.headers.has("Range")) {
    upstreamHeaders.set("Range", request.headers.get("Range"));
  }
  if (request.headers.has("If-Range")) {
    upstreamHeaders.set("If-Range", request.headers.get("If-Range"));
  }

  // Optional custom Referer or JSON headers
  const customReferer = reqUrl.searchParams.get("referer") || request.headers.get("X-Custom-Referer");
  if (customReferer) {
    upstreamHeaders.set("Referer", customReferer);
  } else {
    upstreamHeaders.set("Referer", parsedTarget.origin + "/");
  }

  const customHeadersRaw = reqUrl.searchParams.get("headers") || request.headers.get("X-Custom-Headers");
  if (customHeadersRaw) {
    try {
      const parsed = JSON.parse(customHeadersRaw);
      for (const [k, v] of Object.entries(parsed)) upstreamHeaders.set(k, String(v));
    } catch {}
  }

  const upstreamRes = await fetch(parsedTarget.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: upstreamHeaders,
    redirect: "follow"
  });

  // Prepare pass-through response headers
  const resHeaders = new Headers(CORS_HEADERS);
  const passThroughHeaderNames = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
    "last-modified",
    "content-disposition"
  ];

  for (const name of passThroughHeaderNames) {
    if (upstreamRes.headers.has(name)) {
      resHeaders.set(name, upstreamRes.headers.get(name));
    }
  }

  resHeaders.set("X-Upstream-Status", String(upstreamRes.status));
  resHeaders.set("X-Upstream-Url", upstreamRes.url || parsedTarget.toString());

  if (!upstreamRes.body) {
    return new Response(null, { status: upstreamRes.status, headers: resHeaders });
  }

  // Stream bytes directly without buffering into Worker RAM
  const { readable, writable } = new TransformStream();
  upstreamRes.body.pipeTo(writable).catch(() => {});

  return new Response(readable, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders
  });
}

/**
 * 2. NDJSON STREAMING REPO & ZIPLINE MANIFEST COLLECTOR
 * Streams each Soundbound SourceModel & optional manifest.zipline.json line-by-line
 * as soon as data arrives, so the client sees items immediately.
 */
function handleStreamingRepoCollect(request, url, ctx) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const writeLine = async (obj) => {
    await writer.write(encoder.encode(JSON.stringify(obj) + "\n"));
  };

  const repoKey = url.searchParams.get("repo") || "private-extensions";
  const customRepoUrl = url.searchParams.get("url");
  const resolveManifests = url.searchParams.get("resolveManifests") === "true";

  // Filter parameters matching Soundbound terms
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const sourceTypeFilter = url.searchParams.get("source_type") || "ALL";
  const enabledFilter = url.searchParams.get("enabledByDefault") || "ALL";

  ctx.waitUntil((async () => {
    try {
      // Determine priority list of URLs to try
      const candidateUrls = customRepoUrl
        ? [customRepoUrl]
        : [
            SOUNDBOUND_REPOS[repoKey] || SOUNDBOUND_REPOS["private-extensions"],
            SOUNDBOUND_REPOS["gitlab-private-extensions"],
            SOUNDBOUND_REPOS["gitlab-sources"],
            SOUNDBOUND_REPOS["gitlab-main"]
          ];

      let sourcesList = null;
      let usedUrl = null;

      for (const candidate of [...new Set(candidateUrls)]) {
        try {
          await writeLine({ event: "status", message: `Connecting to ${candidate}...`, url: candidate });
          const res = await fetch(candidate, {
            headers: {
              "User-Agent": "Soundbound/2.1.0 (Android; Zipline)",
              "Accept": "application/json"
            }
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) {
              sourcesList = json;
              usedUrl = candidate;
              break;
            } else if (json && typeof json === "object") {
              // For object-based files like hashes.json or ota-validation.json
              await writeLine({ event: "raw_object", repoUrl: candidate, data: json });
              await writer.close();
              return;
            }
          }
        } catch (e) {
          await writeLine({ event: "warn", message: `Mirror failed: ${candidate} (${e.message})` });
        }
      }

      if (!sourcesList) {
        sourcesList = FALLBACK_EXTENSIONS;
        usedUrl = "embedded://fallback-private-extensions.json";
        await writeLine({ event: "status", message: "Using embedded Soundbound fallback manifest", url: usedUrl });
      } else {
        await writeLine({ event: "status", message: `Streaming from ${usedUrl}`, totalCount: sourcesList.length });
      }

      // Stream each matching SourceModel immediately
      for (const item of sourcesList) {
        if (sourceTypeFilter !== "ALL" && item.source_type !== sourceTypeFilter) continue;
        if (enabledFilter !== "ALL" && String(item.enabledByDefault) !== enabledFilter) continue;

        if (q) {
          const hay = [
            item.source_id,
            item.source_name,
            item.source_type,
            item.source_version_name,
            String(item.source_version_code),
            item.link,
            ...(item.extraDeps || []).map(d => `${d.source_id} ${d.source_name}`)
          ].filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(q)) continue;
        }

        const enrichedItem = {
          ...item,
          workerStreamManifestUrl: item.link ? `${url.origin}/stream?url=${encodeURIComponent(item.link)}` : null
        };

        await writeLine({
          event: "SourceModel",
          repoUrl: usedUrl,
          data: enrichedItem
        });

        // Optionally fetch and stream the Zipline manifest details for each provider
        if (resolveManifests && item.link) {
          try {
            const zRes = await fetch(item.link, {
              headers: { "User-Agent": "Soundbound/2.1.0 (Android; Zipline)" }
            });
            if (zRes.ok) {
              const zManifest = await zRes.json();
              const moduleKeys = zManifest.modules ? Object.keys(zManifest.modules) : [];
              await writeLine({
                event: "ZiplineManifest",
                source_id: item.source_id,
                source_name: item.source_name,
                version: zManifest.version,
                freshAtEpochMs: zManifest.freshAtEpochMs,
                unsigned: zManifest.unsigned,
                moduleCount: moduleKeys.length,
                modules: zManifest.modules
              });
            }
          } catch (zErr) {
            await writeLine({
              event: "ZiplineManifestError",
              source_id: item.source_id,
              error: zErr.message
            });
          }
        }
      }

      await writeLine({ event: "done", timestamp: Date.now() });
    } catch (err) {
      await writeLine({ event: "error", error: "ThrowableWrapper", message: err.message });
    } finally {
      await writer.close();
    }
  })());

  return new Response(readable, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

/**
 * 3. NDJSON STREAMING MULTI-PROVIDER SEARCH (Soundbound QueryParams -> TrackDetails / DownloadQueryResult)
 * Concurrently queries Soundbound-compatible public provider endpoints and streams results as they arrive.
 */
function handleStreamingTrackSearch(request, url, ctx) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const writeLine = async (obj) => {
    await writer.write(encoder.encode(JSON.stringify(obj) + "\n"));
  };

  // Extract Soundbound QueryParams
  const queryParams = {
    trackName: url.searchParams.get("trackName") || url.searchParams.get("q") || "",
    trackArtists: (url.searchParams.get("trackArtists") || "").split(",").map(s => s.trim()).filter(Boolean),
    trackDurationSec: parseInt(url.searchParams.get("trackDurationSec") || "0", 10) || null,
    albumName: url.searchParams.get("albumName") || null,
    trackLink: url.searchParams.get("trackLink") || null,
    isrc: url.searchParams.get("isrc") || null
  };

  const fullQuery = [queryParams.trackName, ...queryParams.trackArtists].join(" ").trim();

  ctx.waitUntil((async () => {
    try {
      await writeLine({ event: "QueryParams", data: queryParams });

      if (!fullQuery && !queryParams.trackLink) {
        await writeLine({
          event: "error",
          exception: "NoMatchFound",
          message: "Provide ?trackName=... (or ?q=...) or ?trackLink=..."
        });
        await writer.close();
        return;
      }

      const tasks = [];

      // Task A: JioSaavn (SaavnProvider - DOWNLOADABLE_PROVIDER)
      if (fullQuery) {
        tasks.push((async () => {
          try {
            const saavnUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(fullQuery)}`;
            const res = await fetch(saavnUrl, {
              headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
            });
            if (res.ok) {
              const data = await res.json();
              const songs = (data && data.songs && data.songs.data) || [];
              for (const s of songs) {
                await writeLine({
                  event: "TrackDetails",
                  source_id: "in.shabinder.soundbound.extension.shabinder.saavn",
                  source_name: "SaavnProvider",
                  source_type: "DOWNLOADABLE_PROVIDER",
                  data: {
                    title: s.title,
                    artists: [s.more_info?.primary_artists || s.music || ""],
                    albumName: s.album,
                    albumArtURL: s.image ? s.image.replace("50x50", "500x500") : null,
                    trackUrl: s.url,
                    videoID: s.id,
                    audioQuality: "KBPS320",
                    audioFormat: "MP4"
                  }
                });
              }
            }
          } catch (e) {
            await writeLine({ event: "ProviderError", source_name: "SaavnProvider", message: e.message });
          }
        })());
      }

      // Task B: Audius (AudiusProvider - DOWNLOADABLE_PROVIDER with direct MP3 stream)
      if (fullQuery) {
        tasks.push((async () => {
          try {
            const audiusSearch = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(fullQuery)}&app_name=Soundbound`;
            const res = await fetch(audiusSearch);
            if (res.ok) {
              const json = await res.json();
              const tracks = (json.data || []).slice(0, 5);
              for (const t of tracks) {
                const directStream = `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=Soundbound`;
                await writeLine({
                  event: "TrackDetails",
                  source_id: "in.shabinder.soundbound.extension.shabinder.audius",
                  source_name: "AudiusProvider",
                  source_type: "DOWNLOADABLE_PROVIDER",
                  data: {
                    title: t.title,
                    artists: [t.user?.name || "Unknown"],
                    durationSec: t.duration,
                    albumArtURL: t.artwork?.["480x480"] || null,
                    trackUrl: `https://audius.co${t.permalink || ""}`,
                    videoID: t.id,
                    downloaded: "NotDownloaded",
                    DownloadQueryResult: {
                      url: directStream,
                      workerStreamUrl: `${url.origin}/stream?url=${encodeURIComponent(directStream)}`,
                      audioFormat: "MP3",
                      audioQuality: "KBPS320"
                    }
                  }
                });
              }
            }
          } catch (e) {
            await writeLine({ event: "ProviderError", source_name: "AudiusProvider", message: e.message });
          }
        })());
      }

      // Task C: LrcLib (LrcLibProvider - PROVIDER / LYRICS_PROVIDER)
      if (fullQuery) {
        tasks.push((async () => {
          try {
            const lrcUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(fullQuery)}`;
            const res = await fetch(lrcUrl, {
              headers: { "User-Agent": "Soundbound-Worker/1.0" }
            });
            if (res.ok) {
              const list = (await res.json()).slice(0, 5);
              for (const item of list) {
                await writeLine({
                  event: "TrackDetails",
                  source_id: "in.shabinder.soundbound.extension.shabinder.lrclib",
                  source_name: "LrcLibProvider",
                  source_type: "PROVIDER",
                  data: {
                    title: item.trackName,
                    artists: [item.artistName],
                    albumName: item.albumName,
                    durationSec: Math.round(item.duration || 0),
                    lyrics: item.syncedLyrics || item.plainLyrics || null
                  }
                });
              }
            }
          } catch (e) {
            await writeLine({ event: "ProviderError", source_name: "LrcLibProvider", message: e.message });
          }
        })());
      }

      // Task D: Deezer Public API (DeezerProvider - DOWNLOADABLE_PROVIDER / Preview Stream + Metadata)
      if (fullQuery) {
        tasks.push((async () => {
          try {
            const dzUrl = `https://api.deezer.com/search?q=${encodeURIComponent(fullQuery)}&limit=6`;
            const res = await fetch(dzUrl);
            if (res.ok) {
              const json = await res.json();
              for (const item of (json.data || [])) {
                await writeLine({
                  event: "TrackDetails",
                  source_id: "in.shabinder.soundbound.extension.shabinder.deezer",
                  source_name: "DeezerProvider",
                  source_type: "DOWNLOADABLE_PROVIDER",
                  data: {
                    title: item.title,
                    artists: [item.artist?.name || ""],
                    albumName: item.album?.title || null,
                    durationSec: item.duration,
                    albumArtURL: item.album?.cover_big || null,
                    trackUrl: item.link,
                    videoID: String(item.id),
                    DownloadQueryResult: item.preview ? {
                      url: item.preview,
                      workerStreamUrl: `${url.origin}/stream?url=${encodeURIComponent(item.preview)}`,
                      audioFormat: "MP3",
                      audioQuality: "KBPS128"
                    } : null
                  }
                });
              }
            }
          } catch (e) {
            await writeLine({ event: "ProviderError", source_name: "DeezerProvider", message: e.message });
          }
        })());
      }

      // Task E: Odesli / Songlink (OdesliProvider - METADATA_PROVIDER for trackLink resolution)
      if (queryParams.trackLink) {
        tasks.push((async () => {
          try {
            const odesliUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(queryParams.trackLink)}`;
            const res = await fetch(odesliUrl);
            if (res.ok) {
              const data = await res.json();
              await writeLine({
                event: "MetadataResult",
                source_id: "in.shabinder.soundbound.extension.shabinder.odesli",
                source_name: "OdesliProvider",
                source_type: "METADATA_PROVIDER",
                data: {
                  entityUniqueId: data.entityUniqueId,
                  pageUrl: data.pageUrl,
                  linksByPlatform: data.linksByPlatform,
                  entitiesByUniqueId: data.entitiesByUniqueId
                }
              });
            }
          } catch (e) {
            await writeLine({ event: "ProviderError", source_name: "OdesliProvider", message: e.message });
          }
        })());
      }

      await Promise.allSettled(tasks);
      await writeLine({ event: "done", timestamp: Date.now() });
    } catch (err) {
      await writeLine({ event: "error", error: "ThrowableWrapper", message: err.message });
    } finally {
      await writer.close();
    }
  })());

  return new Response(readable, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
