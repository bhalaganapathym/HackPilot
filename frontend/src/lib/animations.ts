import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Checks if user prefers reduced motion (accessibility).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface GsapEntranceOptions {
  selector?: string;
  delay?: number;
  stagger?: number;
  y?: number;
  duration?: number;
}

/**
 * Hook for smooth GSAP staggered entrance on mounted elements.
 * Adheres to UI/UX Pro Max: 250-350ms, ease: 'power2.out', stagger: 0.04-0.08s.
 */
export function useGsapEntrance<T extends HTMLElement = HTMLDivElement>(
  optionsOrSelector?: string | GsapEntranceOptions,
  legacyDelay: number = 0.05
) {
  const containerRef = useRef<T>(null);

  const opts: GsapEntranceOptions =
    typeof optionsOrSelector === "string"
      ? { selector: optionsOrSelector, delay: legacyDelay }
      : optionsOrSelector ?? {};

  const {
    selector = ".gsap-fade-in",
    delay = 0.05,
    stagger = 0.05,
    y = 14,
    duration = 0.4,
  } = opts;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const elements = containerRef.current?.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        gsap.fromTo(
          elements,
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            duration,
            stagger,
            delay,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [selector, delay, stagger, y, duration]);

  return containerRef;
}

/**
 * Subtle tactile card hover interaction via GSAP.
 * Displacement: -3px, scale: 1.008, duration: 0.22s, ease: 'power2.out'.
 */
export function bindCardHover(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return () => {};

  const onEnter = () => {
    gsap.to(el, {
      y: -3,
      duration: 0.22,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const onLeave = () => {
    gsap.to(el, {
      y: 0,
      duration: 0.25,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  el.addEventListener("mouseenter", onEnter);
  el.addEventListener("mouseleave", onLeave);

  return () => {
    el.removeEventListener("mouseenter", onEnter);
    el.removeEventListener("mouseleave", onLeave);
  };
}

/**
 * Hook to attach tactile GSAP hover to a single element.
 */
export function useCardHover<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    return bindCardHover(ref.current);
  }, []);

  return ref;
}

/**
 * Smooth GSAP counter tween for numbers.
 */
export function animateCounter(
  targetObj: { val: number },
  endVal: number,
  duration: number = 0.9,
  onUpdateCallback?: () => void
) {
  if (prefersReducedMotion()) {
    targetObj.val = endVal;
    if (onUpdateCallback) onUpdateCallback();
    return;
  }

  gsap.to(targetObj, {
    val: endVal,
    duration,
    ease: "power2.out",
    onUpdate: onUpdateCallback,
  });
}
