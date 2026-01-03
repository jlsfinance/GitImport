
import { Invoice, Payment, CompanyProfile, Customer } from '../types';

export const WhatsAppService = {
  shareInvoice: (invoice: Invoice, customer: Customer | undefined, company: CompanyProfile, manualPhoneNumber?: string) => {
    let phone = (manualPhoneNumber || customer?.phone || '').replace(/\D/g, '');

    if (!phone) {
      return alert("Please provide a mobile number.");
    }

    if (phone.length < 10) return alert("Please enter a valid 10-digit mobile number.");

    const itemsSummary = invoice.items.map(i =>
      `- ${i.description} - ${i.quantity} x ₹${i.rate.toFixed(2)} = ₹${(i.totalAmount || 0).toFixed(2)}`
    ).join('%0A');

    // Simulated Links (Would be real URLs in a hosted app)
    const invoiceLink = `https://git-import.vercel.app/view/${invoice.id}`;
    const ledgerLink = customer ? `https://git-import.vercel.app/customer/${customer.id}/ledger` : '';

    const message = `*TAX INVOICE* %0A` +
      `*${company.name}* %0A%0A` +
      `Hello ${customer?.company || customer?.name || 'Customer'}, %0A` +
      `Here are your invoice details: %0A%0A` +
      `*Inv No:* ${invoice.invoiceNumber} %0A` +
      `*Date:* ${invoice.date} %0A` +
      `*Amount:* Rs. ${invoice.total.toFixed(2)} %0A` +
      `*Status:* ${invoice.status === 'PAID' ? 'PAID ✅' : 'PENDING ⏳'} %0A%0A` +
      `*Items:* %0A${itemsSummary} %0A%0A` +
      `📄 *View Invoice:* ${invoiceLink} %0A` +
      `📒 *View Ledger:* ${customer ? ledgerLink : 'N/A'} %0A%0A` +
      `Thank you for your business!`;

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  },

  sharePayment: (payment: Payment, customer: Customer | undefined, company: CompanyProfile, manualPhoneNumber?: string) => {
    if (!customer) return alert("Customer data not found.");

    const phone = (manualPhoneNumber || customer.phone || '').replace(/\D/g, '');
    if (!phone) return alert("Please provide a mobile number.");

    const ledgerLink = `https://git-import.vercel.app/customer/${customer.id}/ledger`;

    const message = `*PAYMENT RECEIPT* %0A` +
      `*${company.name}* %0A%0A` +
      `Hello ${customer.company || customer.name}, %0A` +
      `We have received your payment. %0A%0A` +
      `*Amount:* Rs. ${payment.amount.toFixed(2)} %0A` +
      `*Date:* ${payment.date} %0A` +
      `*Mode:* ${payment.mode} %0A` +
      `*Ref:* ${payment.reference || 'N/A'} %0A%0A` +
      `*Current Balance:* Rs. ${customer.balance.toFixed(2)} %0A%0A` +
      `📒 *View Ledger:* ${ledgerLink} %0A%0A` +
      `Thank you!`;

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }
};
