import type { ProofStep } from "../proof-work/proof-figure";

export const namespaceSteps: ProofStep[] = [
  {
    label: "File",
    title: "A file before it is opened",
    description:
      "The image.rs entry refers to inode 41. No reader has opened it yet: there is no handle and no connection to the reader. The file has one name.",
  },
  {
    label: "Open",
    title: "Open the image-processing file",
    description:
      "Open /src/image.rs. Its directory entry refers to inode 41, the file record that owns the content. The reader receives handle 7 and reads the same sample bytes shown on the document.",
  },
  {
    label: "Rename",
    title: "Rename the file while the reader stays open",
    description:
      "Rename /src/image.rs to /src/codec.rs. Only the directory entry changes. The document, its content and handle 7 remain unchanged. There is still one name for this file.",
    transitionDuration: 3.6,
  },
  {
    label: "Link",
    title: "Add another name for the same file",
    description:
      "Create /saved.rs as a hard link to inode 41. The second folder gains a directory entry, not a second copy of the content. The file now has two names; the open handle does not count as a name.",
  },
  {
    label: "Unlink",
    title: "Remove the renamed entry without closing the reader",
    description:
      "Unlink /src/codec.rs. That entry disappears, but /saved.rs and the open reader still refer to inode 41. The sample bytes do not change. The file has one remaining name.",
  },
];

export function namespaceSnapshot(selection: number) {
  const stage = Math.max(0, Math.min(4, Math.floor(selection)));
  const names =
    stage <= 1
      ? ["/src/image.rs"]
      : stage === 2
        ? ["/src/codec.rs"]
        : stage === 3
          ? ["/src/codec.rs", "/saved.rs"]
          : ["/saved.rs"];
  return {
    inode: 41,
    openHandle: stage >= 1 ? 7 : null,
    handleTarget: stage >= 1 ? 41 : null,
    handleAlive: stage >= 1,
    names,
    nlink: names.length,
    content: "format=webp\nquality=80\n",
  } as const;
}
