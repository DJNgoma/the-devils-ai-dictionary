self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {
        body: "A new daily word is waiting in the dictionary.",
        slug: null,
        title: "The Devil's AI Dictionary",
        url: "/",
      };

      try {
        const response = await fetch(
          new URL("/api/web/push/current-word", self.location.origin),
          {
          cache: "no-store",
          credentials: "same-origin",
          },
        );

        if (response.ok) {
          payload = await response.json();
        }
      } catch {
        // Fall back to the generic copy below if the network is unavailable.
      }

      await self.registration.showNotification(payload.title, {
        badge: "/favicon.ico",
        body: payload.body,
        data: {
          slug: payload.slug,
          url: payload.url,
        },
        icon: "/favicon.ico",
        tag: payload.slug ? `daily-word-${payload.slug}` : "daily-word",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const targetUrl = new URL(
        event.notification.data?.url || "/",
        self.location.origin,
      ).toString();
      const existingClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      for (const client of existingClients) {
        if ("focus" in client) {
          if ("navigate" in client && typeof client.navigate === "function") {
            await client.navigate(targetUrl);
          }
          await client.focus();
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
