/* 夫妻打卡 service worker：外壳离线可用，GitHub API 永不缓存 */
const CACHE = "cc-shell-v15";
const SHELL = ["./", "./index.html", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname === "api.github.com") return; // 打卡数据直连，绝不缓存

  // 页面本体：network-first，断网回退缓存（便于更新版本）
  if (e.request.mode === "navigate" || url.pathname.endsWith("index.html")) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
          return resp;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // 其他静态资源：cache-first
  e.respondWith(
    caches.match(e.request).then(
      (r) =>
        r ||
        fetch(e.request).then((resp) => {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
          return resp;
        })
    )
  );
});
