import { useEffect } from "react";
import { SEO } from "../data/seo";
import type { SeoConfig } from "../types";

const JSON_LD_ID = "seo-json-ld";

const FALLBACK: SeoConfig = {
  title: "Anteraja Instant — Satria Rapid Field Dispatch",
  description:
    "Purwarupa antarmuka Anteraja Instant: aplikasi kurir Satria (mobile) dan konsol Admin/Hub untuk integritas pengiriman berbasis geolokasi.",
};

export function useSeo(path: string, fallbackPath?: string): void {
  useEffect(() => {
    const config =
      SEO[path] ?? (fallbackPath ? SEO[fallbackPath] : undefined) ?? FALLBACK;

    document.title = config.title;

    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", config.description);

    document.getElementById(JSON_LD_ID)?.remove();
    if (config.jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = JSON_LD_ID;
      script.textContent = JSON.stringify(config.jsonLd);
      document.head.appendChild(script);
    }
  }, [path, fallbackPath]);
}
