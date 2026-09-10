import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main" className="container not-found">
      <span className="eyebrow">404 / Outside the spectrum</span>
      <h1>
        A little too far
        <br />
        into the unknown.
      </h1>
      <p>This page doesn’t exist. There’s still plenty to explore.</p>
      <Link className="button button-primary" href="/">
        Back to Hyperlight <ArrowLeft size={16} />
      </Link>
    </main>
  );
}
