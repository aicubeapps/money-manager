import { useRef, useState, useEffect, type ReactNode } from 'react';
import { HiPencil, HiTrash } from 'react-icons/hi';

// Distance (px) a horizontal drag must cross to commit as a swipe action.
const SWIPE_COMMIT_THRESHOLD = 60;
// Distance (px) of movement (either axis) that cancels a pending long-press
// and marks the gesture as a drag (suppressing the tap-to-drill-down).
const MOVE_CANCEL_THRESHOLD = 10;
const LONG_PRESS_MS = 500;
const ACTION_PANEL_WIDTH = 128;

const vibrate = (durationMs: number) => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(durationMs);
  } catch {
    // Vibration is a nice-to-have; ignore unsupported/blocked environments.
  }
};

interface SwipeableAccountCardProps {
  children: ReactNode;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeRightQuickAdd: () => void;
  onLongPress: () => void;
}

const SwipeableAccountCard = ({
  children,
  onTap,
  onEdit,
  onDelete,
  onSwipeRightQuickAdd,
  onLongPress,
}: SwipeableAccountCardProps) => {
  // translateX (React state) only drives the *settled* position — panel
  // open (-ACTION_PANEL_WIDTH) or closed (0) — once a gesture ends. It is
  // intentionally NOT written on every touchmove: a state update only
  // reaches the DOM on React's next render pass, and at touchmove frequency
  // that meant the state was updating (confirmed via the debug overlay
  // reading it) while the actual `transform` on the element lagged behind
  // or never visibly caught up. The live drag position is instead painted
  // directly via dragXRef + applyTransform() below, bypassing React
  // entirely for the 60fps-sensitive part.
  const [translateX, setTranslateX] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragXRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const didDrag = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  // Touch devices fire a synthetic `click` ~shortly after `touchend`. We
  // funnel both mouse clicks (desktop) and genuine taps (touch, via that
  // synthetic click) through one onClick={onTap} handler, and use this flag
  // to suppress it after any gesture touchend already handled (drag, swipe,
  // long-press, or closing an open panel) so onTap doesn't also fire.
  const suppressNextClick = useRef(false);
  // Mirror of state that the native (non-React) touch listeners below need
  // to read without re-subscribing on every render.
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;

  const applyTransform = (x: number) => {
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${x}px)`;
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    onTap();
  };

  // React attaches its synthetic onTouchMove listener as passive, so
  // calling preventDefault() from a JSX handler silently fails to stop the
  // browser's own horizontal pan/scroll gesture from competing with (and,
  // on several mobile browsers, winning over) our transform-based drag —
  // touch-action: pan-y alone isn't consistently honored enough on its own
  // once nested inside a vertically-scrolling ancestor. Attaching the
  // listeners natively with { passive: false } makes preventDefault actually
  // work, which is what let the card visually track the finger at all.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      didDrag.current = false;
      longPressFired.current = false;
      dragXRef.current = panelOpenRef.current ? -ACTION_PANEL_WIDTH : 0;
      // Kill the settle transition immediately so the very first live-drag
      // frame doesn't animate/lag behind the finger.
      if (cardRef.current) cardRef.current.style.transition = 'none';

      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true;
        vibrate(20);
        onLongPress();
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (!didDrag.current && (Math.abs(dx) > MOVE_CANCEL_THRESHOLD || Math.abs(dy) > MOVE_CANCEL_THRESHOLD)) {
        didDrag.current = true;
        clearLongPressTimer();
      }

      // Once it's clearly a horizontal drag (not a vertical scroll), track it
      // and prevent the page from scrolling while dragging the card.
      if (didDrag.current && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        const base = panelOpenRef.current ? -ACTION_PANEL_WIDTH : 0;
        const next = base + dx;
        // Clamp: don't reveal the action panel further than its width, and
        // don't drag right past a small overshoot (right-swipe is a direct
        // trigger, not a reveal, so it doesn't need to travel far).
        const clamped = Math.max(-ACTION_PANEL_WIDTH, Math.min(ACTION_PANEL_WIDTH, next));
        dragXRef.current = clamped;
        // Paint directly on the DOM node — a React state update here only
        // reaches the element on React's next render, which at touchmove
        // frequency is what made the drag invisible despite the tracked
        // value changing correctly.
        applyTransform(clamped);
      }
    };

    const onTouchEnd = () => {
      clearLongPressTimer();
      // Hand the element back to React's controlled style (settle
      // animation) for the discrete post-gesture snap.
      if (cardRef.current) cardRef.current.style.transition = 'transform 200ms ease-out';

      if (longPressFired.current) {
        // Long-press already handled the gesture; snap back visually, suppress
        // the upcoming synthetic click, and stop.
        suppressNextClick.current = true;
        setTranslateX(panelOpenRef.current ? -ACTION_PANEL_WIDTH : 0);
        return;
      }

      if (!didDrag.current) {
        // A real tap. If the action panel is open, close it instead of
        // drilling down — suppress the synthetic click that would otherwise
        // fire onTap. Otherwise let the synthetic click fall through to
        // onClick={onTap} below, same path as a desktop mouse click.
        if (panelOpenRef.current) {
          suppressNextClick.current = true;
          setPanelOpen(false);
          setTranslateX(0);
        }
        return;
      }

      suppressNextClick.current = true;
      if (dragXRef.current <= -SWIPE_COMMIT_THRESHOLD) {
        vibrate(15);
        setPanelOpen(true);
        setTranslateX(-ACTION_PANEL_WIDTH);
      } else if (dragXRef.current >= SWIPE_COMMIT_THRESHOLD && !panelOpenRef.current) {
        vibrate(15);
        setTranslateX(0);
        onSwipeRightQuickAdd();
      } else {
        setPanelOpen(false);
        setTranslateX(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      clearLongPressTimer();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLongPress, onSwipeRightQuickAdd]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: ACTION_PANEL_WIDTH }}>
        <button
          onClick={() => { setPanelOpen(false); setTranslateX(0); onEdit(); }}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-gray-500 text-white text-xs font-medium"
        >
          <HiPencil className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={() => { setPanelOpen(false); setTranslateX(0); onDelete(); }}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 text-white text-xs font-medium"
        >
          <HiTrash className="w-4 h-4" /> Delete
        </button>
      </div>

      <div
        ref={cardRef}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: 'transform 200ms ease-out',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableAccountCard;
