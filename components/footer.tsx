import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { MotionToggle } from "@/components/motion-provider";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Link href="/" aria-label="Hyperlight home">
              <Brand />
            </Link>
            <p>
              Independent tools.
              <br />
              Considered from every angle.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/projects">Projects</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/about">About</Link>
            <a
              href="https://github.com/hyper-light"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub <ArrowUpRight size={13} />
            </a>
          </nav>
        </div>
        <div className="footer-wordmark" aria-hidden="true">
          <svg viewBox="0 0 1184 240" focusable="false">
            <text
              x="580"
              y="187"
              textAnchor="middle"
              fill="currentColor"
              fontFamily="Geist Variable, sans-serif"
              fontSize="226"
              fontWeight="540"
              letterSpacing="-17"
            >
              hyperlight
            </text>
          </svg>
          <span />
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Hyperlight</span>
          <span className="footer-note">
            <span className="spectral-dot" /> A little further into the light.
          </span>
          <div className="flex items-center gap-5">
            <MotionToggle />
            <a href="/feed.xml" className="flex min-h-11 items-center gap-1">
              RSS feed <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
