
import { storage } from '../storage';

// Placeholder for company settings - will be replaced with actual DB call
const getCompanySettings = async () => {
  return {
    invoicePrefix: 'INV',
    financialYearLogic: '24-25',
  };
};

export const generateNextInvoiceNumber = async () => {
  const settings = await getCompanySettings();
  const lastInvoice = await storage.getLastInvoice();

  if (!lastInvoice) {
    return `${settings.invoicePrefix}-${settings.financialYearLogic}-0001`;
  }

  const lastInvoiceNumber = lastInvoice.invoiceNumber;
  const parts = lastInvoiceNumber.split('-');
  const runningNumberStr = parts[parts.length - 1];
  const runningNumber = parseInt(runningNumberStr, 10);
  const nextRunningNumber = (runningNumber + 1).toString().padStart(4, '0');

  return `${settings.invoicePrefix}-${settings.financialYearLogic}-${nextRunningNumber}`;
};
