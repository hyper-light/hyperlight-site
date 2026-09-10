/** Canonical metadata must use an origin we can safely turn into absolute URLs. */
export function validateSiteUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP or HTTPS origin.",
    );
  }

  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    (url.protocol === "http:" && !local) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an HTTPS origin without credentials, a path, query, or fragment. HTTP is allowed for localhost.",
    );
  }

  return url.origin;
}

export const site = {
  name: "Hyperlight",
  description: "Infrastructure for agents and humans, any scale, any place.",
  url: validateSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  github: "https://github.com/hyper-light",
};
