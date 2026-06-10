// CutNear push notifications service worker.
// Push-only: does not cache assets or intercept fetches.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = { title: "CutNear", body: event.data?.text() ?? "" }; }
  const { title = "CutNear", body = "", icon, actions } = data;
  const payload = data.data ?? {};
  const tag = payload.type ?? "general";
  const vibrate = payload.vibrate ?? [100, 50, 100];

  event.waitUntil(
    (async () => {
      // If a window is focused, also broadcast in-app
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = all.find((c) => c.focused);
      if (focused) {
        focused.postMessage({ kind: "push", title, body, data: payload });
      }
      await self.registration.showNotification(title, {
        body,
        icon: icon ?? "/icon.svg",
        badge: "/icon.svg",
        actions: actions ?? [],
        data: payload,
        vibrate,
        tag,
        renotify: true,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          c.postMessage({ kind: "navigate", url });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
