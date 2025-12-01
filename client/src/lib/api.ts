import { FirebaseService } from '@/services/firebaseService';
import { Invoice } from '@/types';

// This function will fetch all invoices from the currently authenticated user.
export const getAllInvoices = async (): Promise<Invoice[]> => {
  if (!FirebaseService.isReady()) {
    throw new Error('Firebase is not initialized. Cannot fetch invoices.');
  }

  const invoices = await FirebaseService.getAllInvoices();
  return invoices;
};

// This is a placeholder function for downloading an invoice as a PDF.
// The actual implementation would require a PDF generation library (e.g., jsPDF, pdf-lib).
export const downloadInvoiceAsPDF = (invoice: Invoice) => {
  console.log('Downloading invoice as PDF:', invoice);
  // In a real application, you would generate a PDF here.
  alert(`Simulating PDF download for Invoice #${invoice.invoiceNumber}.\nCheck the console for invoice data.`);
};
