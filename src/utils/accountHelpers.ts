import {
  FaWallet,
  FaCreditCard,
  FaMoneyBillWave,
  FaCashRegister,
  FaMobileAlt,
} from 'react-icons/fa';
import type { AccountType } from '../types';

export const getAccountIcon = (type: AccountType) => {
  switch (type) {
    case 'savings':
    case 'current':
      return FaMoneyBillWave;
    case 'credit':
      return FaCreditCard;
    case 'cash':
      return FaCashRegister;
    case 'upi':
      return FaMobileAlt;
    default:
      return FaWallet;
  }
};

export const getAccountColor = (type: AccountType) => {
  switch (type) {
    case 'savings':
      return { border: 'border-blue-500', text: 'text-blue-500' };
    case 'current':
      return { border: 'border-green-500', text: 'text-green-500' };
    case 'credit':
      return { border: 'border-purple-500', text: 'text-purple-500' };
    case 'cash':
      return { border: 'border-yellow-500', text: 'text-yellow-500' };
    case 'upi':
      return { border: 'border-indigo-500', text: 'text-indigo-500' };
    default:
      return { border: 'border-gray-500', text: 'text-gray-500' };
  }
};