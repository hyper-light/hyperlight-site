"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Pause, Play } from "lucide-react";

const MotionContext = createContext({
  paused: false,
  reduced: false,
  toggle: () => {},
});
function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerMotion = () => false;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeToMotion,
    getReducedMotion,
    getServerMotion,
  );
  useEffect(() => {
    document.documentElement.dataset.motion =
      paused || reduced ? "paused" : "playing";
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [paused, reduced]);
  return (
    <MotionContext.Provider
      value={{
        paused: paused || reduced,
        reduced,
        toggle: () => setPaused((value) => !value),
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}

export function useMotionPreference() {
  return useContext(MotionContext);
}

export function MotionToggle() {
  const { paused, reduced, toggle } = useMotionPreference();
  return (
    <button
      className="motion-toggle"
      onClick={toggle}
      aria-pressed={paused}
      disabled={reduced}
      title={
        reduced ? "Following your device’s reduced-motion setting" : undefined
      }
    >
      {paused ? (
        <Play size={12} aria-hidden="true" />
      ) : (
        <Pause size={12} aria-hidden="true" />
      )}
      {reduced ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}
    </button>
  );
}
