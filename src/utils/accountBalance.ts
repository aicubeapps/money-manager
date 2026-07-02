import type { Account, Transaction } from '../types';

// Single source of truth for an account's current balance: its opening
// balance plus every transaction that touches it. Transfers are stored as a
// single Transaction document with accountId set to fromAccountId, so a
// transfer's accountId never equals the destination account's id — matching
// on accountId alone would silently exclude the destination side and never
// credit it. Matching on accountId OR fromAccountId OR toAccountId ensures
// both sides of a transfer are found and correctly signed below.
export const calculateAccountBalance = (account: Account, transactions: Transaction[]): number => {
  let balance = account.openingBalance;

  transactions
    .filter(
      (t) =>
        t.accountId === account.id ||
        t.fromAccountId === account.id ||
        t.toAccountId === account.id
    )
    .forEach((t) => {
      if (t.type === 'transfer') {
        if (t.fromAccountId === account.id) balance -= t.amount;
        if (t.toAccountId === account.id) balance += t.amount;
      } else if (t.type === 'expense') {
        balance -= t.amount;
      } else if (t.type === 'income') {
        balance += t.amount;
      }
    });

  return balance;
};
