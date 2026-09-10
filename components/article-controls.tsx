"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

export function ArticleControls() {
  const progress = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const update = () => {
      const article = document.getElementById("article-body");
      if (!article || !progress.current) return;
      const rect = article.getBoundingClientRect();
      const distance = rect.height - window.innerHeight + 150;
      progress.current.style.transform = `scaleX(${Math.max(0, Math.min(1, (100 - rect.top) / Math.max(1, distance)))})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      clearTimeout(timer.current);
    };
  }, []);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setError(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
    }
  }
  return (
    <>
      <div className="reading-progress" ref={progress} aria-hidden="true" />
      <button className="copy-link" onClick={copyLink}>
        {copied ? <Check size={14} /> : <LinkIcon size={14} />}{" "}
        {copied ? "Link copied" : "Copy link"}
      </button>
      <span className="sr-only" role="status">
        {copied
          ? "Article link copied to clipboard"
          : error
            ? "Could not copy. Copy the link from your address bar."
            : ""}
      </span>
    </>
  );
}
