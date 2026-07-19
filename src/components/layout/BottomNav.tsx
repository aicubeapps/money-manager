import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HiHome,
  HiCreditCard,
  HiCurrencyRupee,
  HiChartPie,
  HiCollection,
  HiDotsHorizontal,
  HiTag,
  HiCog,
} from 'react-icons/hi';
import { useTheme } from '../../hooks/useTheme';

const mainNavItems = [
  { to: '/', label: 'Home', cmd: 'HOME', icon: HiHome },
  { to: '/accounts', label: 'Accounts', cmd: 'ACCOUNTS', icon: HiCreditCard },
  { to: '/transactions', label: 'Txns', cmd: 'TXNS', icon: HiCurrencyRupee },
  { to: '/budgets', label: 'Budgets', cmd: 'BUDGETS', icon: HiCollection },
  { to: '/reports', label: 'Reports', cmd: 'REPORTS', icon: HiChartPie },
];

const moreNavItems = [
  { to: '/categories', label: 'Categories', cmd: 'CATEGORIES', icon: HiTag },
  { to: '/settings', label: 'Settings', cmd: 'SETTINGS', icon: HiCog },
];

// Lightweight shared state so sibling components (e.g. FloatingActionButton) can
// react to the More menu's open state without lifting state through the layout tree.
type MoreMenuListener = (open: boolean) => void;
let moreMenuOpenState = false;
const moreMenuListeners = new Set<MoreMenuListener>();

const broadcastMoreMenuOpen = (open: boolean) => {
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

const BottomNav = () => {
  const [moreOpen, setMoreOpenState] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { theme } = useTheme();

  const setMoreOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    setMoreOpenState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      broadcastMoreMenuOpen(next);
      return next;
    });
  };

  const moreActive = moreNavItems.some((item) => location.pathname === item.to);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (moreOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  {/* CYBERPUNK THEME */}
  if (theme === 'cyberpunk') {
    return (
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom"
        style={{
          background: '#000000',
          borderTop: '1px solid rgba(0,255,65,0.3)',
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px 0' }}>
          {mainNavItems.map(({ to, cmd }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 8px',
                fontSize: '10px',
                letterSpacing: '0.06em',
                textDecoration: 'none',
                color: isActive ? '#FF00FF' : '#00CC33',
                minWidth: '44px',
              })}
            >
              {({ isActive }) => (
                <span style={{ whiteSpace: 'nowrap' }}>
                  {isActive ? '>>' : '>'} {cmd}
                </span>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <div ref={moreRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 8px',
                fontSize: '10px',
                letterSpacing: '0.06em',
                background: 'transparent',
                border: 'none',
                color: moreActive ? '#FF00FF' : '#00CC33',
                cursor: 'pointer',
                fontFamily: 'inherit',
                minWidth: '44px',
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>{moreActive ? '>>' : '>'} MORE</span>
            </button>

            {/* Popover */}
            {moreOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  background: '#000000',
                  border: '1px solid rgba(0,255,65,0.4)',
                  minWidth: '140px',
                  marginBottom: '4px',
                  zIndex: 50,
                }}
              >
                {moreNavItems.map(({ to, cmd }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '10px 14px',
                      fontSize: '12px',
                      letterSpacing: '0.06em',
                      textDecoration: 'none',
                      color: isActive ? '#FF00FF' : '#00CC33',
                      background: isActive ? 'rgba(255,0,255,0.08)' : 'transparent',
                      borderBottom: '1px solid rgba(0,255,65,0.1)',
                      fontFamily: "'Courier New', Courier, monospace",
                    })}
                  >
                    {({ isActive }) => (
                      <span>{isActive ? '>> ' : '> '}{cmd}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700/80 z-40 safe-area-bottom">
      <div className="flex justify-around items-center px-2">
        {mainNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 text-xs transition-all duration-150 min-w-[48px] ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-lg transition-all duration-150 ${isActive ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="mt-0.5 font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <div ref={moreRef} className="relative flex flex-col items-center">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center py-2 px-3 text-xs transition-all duration-150 min-w-[48px] ${
              moreActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all duration-150 ${moreActive ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
              <HiDotsHorizontal className="w-5 h-5" />
            </div>
            <span className="mt-0.5 font-medium">More</span>
          </button>

          {/* Popover menu */}
          {moreOpen && (
            <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] animate-slide-up">
              {moreNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
