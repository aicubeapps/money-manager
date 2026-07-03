import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiChevronLeft, HiChevronDown, HiOutlineMail, HiOutlineInformationCircle } from 'react-icons/hi';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Accounts',
    answer:
      'Add an account from the Accounts page with a name, type (savings, current, cash, UPI, or credit card), and an opening balance. Credit cards also track a credit limit. Tap an account to see its recent transactions, or use the Edit/Archive/Delete actions — archiving hides an account from active views without deleting its transaction history.',
  },
  {
    question: 'Transactions',
    answer:
      'Add income, expenses, or transfers from the Transactions page or the quick-add button. Expenses need a category; tags are optional and can carry default account/category presets to speed up entry. Edit or delete any transaction from its row.',
  },
  {
    question: 'Budgets',
    answer:
      'Each month has one overall budget amount, which you split across category allocations. Whatever is left unallocated is shown as "Misc" — it updates live as you add or change allocations, and can go negative if you allocate more than the overall amount, which just means your allocations no longer add up to the total.',
  },
  {
    question: 'Reports & Dashboard',
    answer:
      'The Dashboard summarizes net worth, income, expenses, and savings for the selected period, with charts for spending by category, monthly trends, and account distribution. Tap a summary card, chart segment, or budget line to drill into the underlying transactions. The Reports page lets you export a period as CSV.',
  },
  {
    question: 'Dark mode',
    answer: 'Toggle dark/light mode from Settings → Appearance. Your choice is remembered on this device.',
  },
  {
    question: 'CSV export',
    answer: 'From the Reports page, pick a period and use the CSV button to download a summary of income, expenses, and category breakdowns for that period.',
  },
];

const APP_VERSION = 'v1.0';

const BUG_REPORT_EMAIL = 'aicube.apps@gmail.com';
const BUG_REPORT_SUBJECT = 'ExpenseTracker Bug Report';
const BUG_REPORT_BODY = 'Describe the issue:\n\nSteps to reproduce:\n\nDevice/browser:';
const bugReportMailto = `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(BUG_REPORT_SUBJECT)}&body=${encodeURIComponent(BUG_REPORT_BODY)}`;

const AboutPage = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-2">
        <Link
          to="/settings"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back to Settings"
        >
          <HiChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">About</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Help &amp; support</p>
        </div>
      </div>

      {/* How-To / Wiki */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineInformationCircle className="w-4 h-4" /> How To
        </h2>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{item.question}</span>
                  <HiChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 pb-3 pr-6 leading-relaxed">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Report a bug */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <HiOutlineMail className="w-4 h-4" /> Report a Bug
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Found something broken or confusing? Send a note directly to the developer.
        </p>
        <a href={bugReportMailto} className="btn-primary text-sm inline-flex">
          <HiOutlineMail className="w-4 h-4" /> Email Bug Report
        </a>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-600 text-center pb-4">
        ExpenseTracker {APP_VERSION} · Built with React &amp; Firebase
      </div>
    </div>
  );
};

export default AboutPage;
