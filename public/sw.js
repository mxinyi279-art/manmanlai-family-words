const CACHE_PREFIX = "manmanlai-learning-v3-cache-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const PICTOGRAMS = [
  "air_conditioning", "apple", "arm", "aunt", "banana", "bed", "blanket", "bowl", "bread", "broom",
  "brush-teeth-soft", "brush_teeth", "chair", "chopsticks", "clock", "close-door", "close", "comb", "cup",
  "daughter", "detergent", "doctor", "door", "drink", "ear", "eat", "egg", "eye", "fan", "father", "fish",
  "foot", "garbage", "give", "glasses", "hand", "head", "kettle", "key", "lamp", "leg", "medicine", "metal",
  "milk", "mirror", "mop", "mother", "mouth", "nose", "nurse", "open-door", "open", "pillow", "plastic",
  "plate", "remote_control", "rice", "shampoo", "sit", "sleep", "soap", "sofa", "son", "spoon", "stand",
  "table", "take", "tea", "teeth", "telephone", "television", "tissue", "tissue_box", "toilet", "toilet_paper",
  "tooth-soft", "toothbrush", "toothpaste", "towel", "trash_can", "vegetables", "walk", "wallet", "wash_face",
  "wash_hands", "water", "wood", "pinyin_a", "pinyin_o", "pinyin_e", "pinyin_i", "pinyin_u", "pinyin_ü", "pinyin_y", "pinyin_w"
  , "play_piano", "play_flute", "tent", "suitcase", "tote_bag", "rope", "backpack",
  "cover_with_blanket", "microphone_handheld", "microphone_studio", "lock", "bank_card",
  "umbrella", "mobile_phone", "scrub_brush", "cigarette", "box", "fish_tank", "washbasin", "bathroom"
].map((name) => `pictograms/${name}.png`);

function scopedUrl(path) {
  return new URL(path, self.registration.scope).href;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const homeUrl = scopedUrl("./");
    const response = await fetch(homeUrl, { cache: "reload" });
    const html = await response.clone().text();
    await cache.put(homeUrl, response);
    const pageAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], homeUrl).href)
      .filter((url) => url.startsWith(self.registration.scope));
    const assets = ["index.html", "manifest.webmanifest", "og.png", ...PICTOGRAMS].map(scopedUrl);
    await Promise.allSettled([...new Set([...pageAssets, ...assets])].map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(scopedUrl("./"), response.clone());
        return response;
      } catch {
        return (await caches.match(scopedUrl("./"))) || (await caches.match(scopedUrl("index.html")));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
    }
    return response;
  })());
});
