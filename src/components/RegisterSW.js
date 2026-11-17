"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isLocalDevelopment =
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

    if (isLocalDevelopment) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .then(() => caches.keys())
        .then((names) =>
          Promise.all(
            names
              .filter((name) => name.startsWith("sipanak-") || name.startsWith("posdigi-"))
              .map((name) => caches.delete(name))
          )
        )
        .catch((error) => console.error("Gagal membersihkan service worker lokal:", error));
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.error("Gagal mendaftarkan service worker:", error));
  }, []);
  return null;
}
