import fs from "node:fs";
import path from "node:path";

type NewPostOptions = { directory?: string; now?: Date };

export function createPost(
  title: string,
  options: NewPostOptions = {},
): { slug: string; filePath: string } {
  const cleanTitle = title.trim().replace(/\s+/g, " ");
  if (!cleanTitle)
    throw new Error('Provide a title: npm run post -- "Your post title"');
  const baseSlug = cleanTitle
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
  if (!baseSlug)
    throw new Error(
      "The title must contain at least one Latin letter or number to create a filename.",
    );

  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime()))
    throw new Error("The post date must be valid.");
  const date = now.toISOString().slice(0, 10);
  const directory =
    options.directory ?? path.join(process.cwd(), "content", "posts");
  const body = `---\ntitle: ${JSON.stringify(cleanTitle)}\ndescription: "A short summary of this post."\ndate: "${date}"\ncategory: "Notes"\nfeatured: false\ndraft: true\n---\n\nStart writing here.\n\n## The idea\n\nA little context goes a long way.\n`;

  fs.mkdirSync(directory, { recursive: true });
  for (let suffix = 1; suffix < 10_000; suffix++) {
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const filePath = path.join(directory, `${slug}.md`);
    try {
      // Exclusive creation is atomic: simultaneous invocations cannot overwrite
      // each other or an existing post, including an existing symlink.
      fs.writeFileSync(filePath, body, { encoding: "utf8", flag: "wx" });
      return { slug, filePath };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error(`Could not find an unused filename for "${cleanTitle}".`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve("scripts/new-post.ts")
) {
  try {
    const { filePath } = createPost(process.argv.slice(2).join(" "));
    console.log(`Created draft: ${path.relative(process.cwd(), filePath)}`);
    console.log(
      "Edit the Markdown, then set draft: false when you are ready to publish.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
