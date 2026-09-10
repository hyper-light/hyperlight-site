"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header className="site-header">
        <div className="header-inner container">
          <Link
            href="/"
            aria-label="Hyperlight home"
            className="inline-flex min-h-11 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090a]"
          >
            <Brand />
          </Link>
          <nav
            className="desktop-nav hidden md:grid"
            aria-label="Main navigation"
          >
            {navigation.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-11 items-center"
                aria-current={pathname.startsWith(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <a
            href="https://github.com/hyper-light"
            className="header-github hidden min-h-11 items-center gap-1.5 md:inline-flex"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ArrowUpRight size={14} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Dialog.Trigger asChild aria-controls="mobile-navigation">
            <Button
              variant="ghost"
              size="icon"
              className="menu-toggle md:hidden [&_svg]:size-5"
              aria-label="Open navigation"
            >
              <Menu aria-hidden="true" />
            </Button>
          </Dialog.Trigger>
        </div>
      </header>

      <Dialog.Portal>
        <Dialog.Overlay className="mobile-nav-overlay fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none" />
        <Dialog.Content
          id="mobile-navigation"
          className="mobile-nav-panel fixed inset-x-0 top-0 z-[90] max-h-[100dvh] overflow-y-auto border-b border-white/10 bg-[#08090a] px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-8 text-[#e4e5e7] shadow-2xl outline-none transition-[opacity,transform] duration-200 starting:-translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:px-8"
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Explore Hyperlight projects, the blog, and information about the
            studio.
          </Dialog.Description>
          <div className="flex min-h-11 items-center justify-between gap-4">
            <Dialog.Close asChild>
              <Link
                href="/"
                aria-label="Hyperlight home"
                className="inline-flex min-h-11 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090a]"
              >
                <Brand />
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close navigation">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <nav className="mt-8 flex flex-col" aria-label="Mobile navigation">
            {navigation.map(({ href, label }) => (
              <Dialog.Close key={href} asChild>
                <Link
                  href={href}
                  aria-current={pathname.startsWith(href) ? "page" : undefined}
                  className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 px-1 py-4 text-2xl tracking-tight text-[#a3a5ad] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white aria-[current=page]:text-white motion-reduce:transition-none"
                >
                  {label}
                  <ArrowUpRight className="size-5" aria-hidden="true" />
                </Link>
              </Dialog.Close>
            ))}
            <Dialog.Close asChild>
              <a
                href="https://github.com/hyper-light"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex min-h-14 items-center justify-between gap-4 rounded-lg px-1 py-3 text-sm text-[#a3a5ad] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
              >
                <span>
                  GitHub<span className="sr-only"> (opens in a new tab)</span>
                </span>
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </Dialog.Close>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
