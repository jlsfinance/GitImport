
import React from 'react';
import { Link } from 'wouter';

const Daybook: React.FC = () => {
  // Sample data - replace with actual data from your application
  const invoices = [
    {
      invoiceNumber: 'INV-2025-233',
      customerName: 'rahul kumal',
      customerId: '123', // Assuming you have a customer ID
      date: '2025-11-26',
      amount: '₹10000.00',
    },
    {
      invoiceNumber: 'INV-2025-976',
      customerName: 'Thhhb',
      customerId: '456', // Assuming you have a customer ID
      date: '2025-11-26',
      amount: '₹100.00',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Daybook</h1>
      <table className="w-full mt-4">
        <thead>
          <tr>
            <th className="text-left">Invoice #</th>
            <th className="text-left">Customer</th>
            <th className="text-left">Date</th>
            <th className="text-left">Amount</th>
            <th className="text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.invoiceNumber}>
              <td>{invoice.invoiceNumber}</td>
              <td>
                <Link to={`/customers/${invoice.customerId}/ledger`}>
                  {invoice.customerName}
                </Link>
              </td>
              <td>{invoice.date}</td>
              <td>{invoice.amount}</td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Daybook;
