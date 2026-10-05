import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../MaterialIcon";
import { Button } from "./Button";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const STEP = 0.5;

interface ImageLightboxProps {
  src: string;
  alt: string;
  /** Optional metadata shown under the photo inside the dialog. */
  caption?: ReactNode;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Full-screen preview for a delivery photo. Supports zooming (buttons,
 * wheel, double-click) and drag-to-pan, with focus trapping and Escape to
 * close so it stays usable from the keyboard.
 */
export function ImageLightbox({
  src,
  alt,
  caption,
  onClose,
}: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomTo = useCallback((next: number) => {
    const value = clamp(next, MIN_SCALE, MAX_SCALE);
    setScale(value);
    if (value === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }, []);

  // Escape closes the dialog; Tab is trapped inside it.
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = dialogRef.current;
    node?.focus();

    function focusables() {
      if (!node) return [];
      return Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex="-1"]',
        ),
      );
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  // Wheel zoom needs a non-passive listener so the page does not scroll.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      setScale((current) =>
        clamp(current - event.deltaY * 0.002, MIN_SCALE, MAX_SCALE),
      );
    }

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (scale === MIN_SCALE) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setOffset({
      x: dragOrigin.current.ox + (event.clientX - dragOrigin.current.x),
      y: dragOrigin.current.oy + (event.clientY - dragOrigin.current.y),
    });
  }

  function stopDragging() {
    setDragging(false);
  }

  function onStageClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && scale === MIN_SCALE) onClose();
  }

  const zoomed = scale > MIN_SCALE;
  const panned = offset.x !== 0 || offset.y !== 0;

  return (
    <section
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
      aria-label="Pratinjau foto POD"
    >
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="m-0 truncate text-[13px] font-semibold">{alt}</p>
        <Button
          variant="iconInverse"
          className="shrink-0"
          aria-label="Tutup pratinjau foto"
          onClick={onClose}
        >
          <MaterialIcon name="close" className="text-[22px]" />
        </Button>
      </header>

      <dialog
        ref={dialogRef}
        tabIndex={-1}
        open
        aria-modal="true"
        aria-label={alt}
        className="relative z-10 m-0 flex min-h-0 flex-1 flex-col bg-transparent p-0 focus:outline-none"
      >
        <div
          ref={stageRef}
          className={`relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden ${
            zoomed
              ? dragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-zoom-in"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onClick={onStageClick}
          onDoubleClick={() => (zoomed ? reset() : zoomTo(2))}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          />
        </div>

        {caption ? (
          <footer className="relative z-10 mx-auto mb-4 max-w-2xl rounded-xl bg-black/60 px-4 py-3 text-[12px] leading-relaxed text-white/90">
            {caption}
          </footer>
        ) : null}
      </dialog>

      <div className="relative z-10 flex items-center justify-center gap-2 pb-5">
        <Button
          variant="iconInverse"
          aria-label="Perkecil foto"
          disabled={scale <= MIN_SCALE}
          onClick={() => zoomTo(scale - STEP)}
        >
          <MaterialIcon name="zoom_out" className="text-[22px]" />
        </Button>
        <span className="tabular-nums min-w-14 text-center text-[12px] font-semibold text-white/90">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="iconInverse"
          aria-label="Perbesar foto"
          disabled={scale >= MAX_SCALE}
          onClick={() => zoomTo(scale + STEP)}
        >
          <MaterialIcon name="zoom_in" className="text-[22px]" />
        </Button>
        <Button
          variant="iconInverse"
          aria-label="Atur ulang tampilan foto"
          disabled={!zoomed && !panned}
          onClick={reset}
        >
          <MaterialIcon name="restart_alt" className="text-[22px]" />
        </Button>
      </div>
    </section>
  );
}
