"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("[PWA] Service Worker registered");
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
