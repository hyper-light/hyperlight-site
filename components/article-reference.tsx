"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { Popover } from "radix-ui";
import { Info, Pause, Play, RotateCcw, X } from "lucide-react";
import { referenceNote, type ReferenceNote } from "@/lib/reference-notes";
import styles from "./article-reference.module.css";

// Closing a portal can expose a different link directly under the pointer.
// Require a fresh hover after that dismissal, rather than reopening a card.
let hoverBlockedUntil = 0;

function ReferenceExample({
  kind,
}: {
  kind: NonNullable<ReferenceNote["animation"]>;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setStep((value) => (value + 1) % 3), 1800);
    return () => clearInterval(timer);
  }, [playing]);
  const states = {
    rename: [
      ["Open file", "/src/image.rs → inode 41", "handle 7 → inode 41"],
      ["Rename entry", "/src/codec.rs → inode 41", "handle 7 → inode 41"],
      ["Read again", "format=webp", "Same handle. Same file bytes."],
    ],
    mapping: [
      ["Original target", "quality=80", "80 at bytes [8, 10)"],
      [
        "Insert 12 bytes before it",
        "format=webp\nquality=80",
        "80 moves to [20, 22)",
      ],
      [
        "Apply to mapped range",
        "format=webp\nquality=90",
        "Replace [20, 22), not [8, 10)",
      ],
    ],
    quorum: [
      [
        "Owner A stops replying",
        "A offline · B has v7 · C has v6",
        "Writes wait; suspicion is not authority.",
      ],
      [
        "Authorize and recover",
        "Epoch 5 → B and C",
        "B recovers v7 before serving.",
      ],
      [
        "Serve under current authority",
        "B + C retain v7 under epoch 5",
        "An epoch-4 writer is refused.",
      ],
    ],
  }[kind];
  return (
    <div
      className={styles.example}
      data-reference-example={kind}
      data-example-step={step}
    >
      <div className={styles.exampleHeader}>
        <span>Example · {step + 1}/3</span>
        <div className={styles.exampleControls}>
          <button
            type="button"
            aria-label="Restart example"
            onClick={() => {
              setPlaying(false);
              setStep(0);
            }}
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause example" : "Play example"}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      </div>
      <strong>{states[step][0]}</strong>
      <pre className={styles.exampleContent} key={step}>
        <code>{states[step][1]}</code>
      </pre>
      <p>{states[step][2]}</p>
      <button
        type="button"
        className={styles.next}
        onClick={() => {
          setPlaying(false);
          setStep((value) => (value + 1) % 3);
        }}
      >
        Next step →
      </button>
    </div>
  );
}

/** The source link still navigates normally. Its separate disclosure is touch- and keyboard-accessible. */
export function ArticleReference({
  children,
  "data-reference": reference,
  "data-reference-context": referenceContext,
  ...props
}: ComponentProps<"a"> & {
  "data-reference"?: string;
  "data-reference-context"?: string;
}) {
  const note = referenceNote(reference, referenceContext);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const interactive = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  if (!note) return <a {...props}>{children}</a>;
  const closeLater = () => {
    cancelClose();
    if (!pinned) closeTimer.current = setTimeout(() => setOpen(false), 220);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) hoverBlockedUntil = Date.now() + 500;
        if (value) interactive.current = true;
        setOpen(value);
        setPinned(value);
      }}
    >
      <span
        className={styles.reference}
        data-reference={reference}
        data-reference-context={referenceContext}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse" && Date.now() > hoverBlockedUntil) {
            cancelClose();
            interactive.current = false;
            setOpen(true);
          }
        }}
        onPointerLeave={closeLater}
      >
        <a
          {...props}
          onFocus={(event) => {
            props.onFocus?.(event);
            cancelClose();
            setOpen(true);
          }}
        >
          {children}
        </a>
        <Popover.Trigger asChild>
          <button
            className={styles.trigger}
            type="button"
            aria-label={`Explain: ${note.title}`}
            onClick={() => {
              cancelClose();
              interactive.current = true;
              setPinned(true);
            }}
          >
            <Info size={15} aria-hidden="true" />
          </button>
        </Popover.Trigger>
      </span>
      <Popover.Portal>
        <Popover.Content
          className={styles.content}
          sideOffset={10}
          collisionPadding={16}
          avoidCollisions
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onOpenAutoFocus={(event) => {
            if (!pinned) event.preventDefault();
          }}
          onPointerEnter={cancelClose}
          onPointerLeave={closeLater}
          onFocusCapture={() => {
            cancelClose();
            setPinned(true);
          }}
          onCloseAutoFocus={(event) => {
            if (!interactive.current) event.preventDefault();
          }}
        >
          <div className={styles.header}>
            <h3 id={titleId}>{note.title}</h3>
            <Popover.Close
              className={styles.close}
              aria-label="Close explanation"
            >
              <X size={18} />
            </Popover.Close>
          </div>
          <p id={descriptionId}>{note.explanation}</p>
          {note.example && (
            <pre className={styles.code}>
              <code>{note.example}</code>
            </pre>
          )}
          {note.animation && <ReferenceExample kind={note.animation} />}
          <a className={styles.source} href={props.href}>
            Read the source ↗
          </a>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
