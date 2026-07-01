import { useState, useEffect } from 'react';
import { HiPlus } from 'react-icons/hi';
import QuickAddModal from './QuickAddModal';
import { subscribeToMoreMenuOpen } from '../layout/BottomNav';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => subscribeToMoreMenuOpen(setMoreMenuOpen), []);

  if (moreMenuOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Quick Add Expense"
        onClick={() => setIsOpen(true)}
        className="
          fixed
          bottom-20
          right-4
          lg:bottom-6
          lg:right-6
          z-50
          h-14
          w-14
          rounded-full
          bg-blue-600
          text-white
          shadow-lg
          flex
          items-center
          justify-center
          hover:bg-blue-700
          transition-colors
        "
      >
        <HiPlus className="h-6 w-6" />
      </button>

      <QuickAddModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default FloatingActionButton;