import { useEffect } from "react";
import { SEO } from "../data/seo";

const JSON_LD_ID = "seo-json-ld";

export function useSeo(path: string): void {
  useEffect(() => {
    const config = SEO[path];
    if (!config) return;

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
  }, [path]);
}
