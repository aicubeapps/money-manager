// Lightweight shared state so sibling components (e.g. FloatingActionButton) can
// react to BottomNav's More menu open state without lifting state through the
// layout tree. Split into its own module (rather than living in BottomNav.tsx)
// so that file only exports the component, per react-refresh/only-export-components.
type MoreMenuListener = (open: boolean) => void;
let moreMenuOpenState = false;
const moreMenuListeners = new Set<MoreMenuListener>();

export const broadcastMoreMenuOpen = (open: boolean) => {
  moreMenuOpenState = open;
  moreMenuListeners.forEach((listener) => listener(open));
};

export const subscribeToMoreMenuOpen = (listener: MoreMenuListener) => {
  listener(moreMenuOpenState);
  moreMenuListeners.add(listener);
  return () => {
    moreMenuListeners.delete(listener);
  };
};
