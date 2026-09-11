import { test, expect } from "@playwright/test";

function metadata(html: string, key: string) {
  for (const tag of html.match(/<meta\s[^>]*>/g) ?? []) {
    const attributes = Object.fromEntries(
      Array.from(tag.matchAll(/([\w:-]+)="([^"]*)"/g), ([, name, value]) => [
        name,
        value.replaceAll("&amp;", "&"),
      ]),
    );
    if (attributes.property === key || attributes.name === key)
      return attributes.content;
  }
}

for (const route of ["/", "/blog/introducing-vorpal", "/projects/vorpal"]) {
  test(`sharing crawlers receive an image and a large card for ${route}`, async ({
    request,
  }, testInfo) => {
    for (const userAgent of ["Discordbot/2.0", "Twitterbot/1.0"]) {
      const response = await request.get(route, {
        headers: { "User-Agent": userAgent },
      });
      expect(response.ok()).toBe(true);
      const html = await response.text();
      const head = html.split("</head>")[0];
      const image = metadata(head, "og:image");
      expect(
        image,
        `${route} must supply og:image in the crawler's HTML`,
      ).toMatch(/^https?:\/\//);
      expect(metadata(head, "og:title")).toBeTruthy();
      expect(metadata(head, "og:description")).toBeTruthy();
      expect(metadata(head, "twitter:card")).toBe("summary_large_image");
      expect(metadata(head, "twitter:image")).toBe(image);
      const url = new URL(image!);
      const result = await request.get(url.pathname + url.search);
      expect(result.ok()).toBe(true);
      expect(result.headers()["content-type"]).toContain("image/png");
      const png = await result.body();
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
      if (userAgent.startsWith("Discord")) {
        await testInfo.attach("share-card", {
          body: png,
          contentType: "image/png",
        });
      }
    }
  });
}

test("share images are limited to published posts and known projects", async ({
  request,
}) => {
  for (const route of [
    "/share/blog/unknown-post",
    "/share/project/unknown-project",
    "/share/unknown/vorpal",
  ]) {
    const response = await request.get(route);
    expect(response.status()).toBe(404);
  }
});
