
import React from 'react';
import { useParams } from 'wouter';
import { StorageService } from '../services/storageService';

const CustomerLedger: React.FC = () => {
  const params = useParams();
  const customerId = params.id;
  const customer = customerId ? StorageService.getCustomers().find(c => c.id === customerId) : null;
  const customerName = customer ? customer.name : 'Customer';

  // Sample data - replace with actual ledger data
  const debitEntries = [
    { date: '2025-11-26', particulars: 'To Sales', jf: 'S-1', amount: 10000.00 },
  ];

  const creditEntries = [
     { date: '2025-11-26', particulars: 'By Cash', jf: 'R-1', amount: 5000.00 },
  ];

  const debitTotal = debitEntries.reduce((total, entry) => total + entry.amount, 0);
  const creditTotal = creditEntries.reduce((total, entry) => total + entry.amount, 0);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-center mb-4">Format of Ledger Account</h1>
      <h2 className="text-xl font-bold text-center mb-6">{customerName}</h2>
      <div className="grid grid-cols-2 gap-0 border border-black">
        {/* Debit Side */}
        <div className="border-r border-black">
          <div className="flex justify-between font-bold p-2 bg-gray-200">
            <span>Dr.</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-black">
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Particulars</th>
                <th className="p-2 text-left">J.F</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {debitEntries.map((entry, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="p-2">{entry.date}</td>
                  <td className="p-2">{entry.particulars}</td>
                  <td className="p-2">{entry.jf}</td>
                  <td className="p-2 text-right">{entry.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black font-bold">
                <td colSpan={3} className="p-2 text-right">Total</td>
                <td className="p-2 text-right">{debitTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Credit Side */}
        <div>
          <div className="flex justify-between font-bold p-2 bg-gray-200">
            <span>Cr.</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-black">
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Particulars</th>
                <th className="p-2 text-left">J.F</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
               {creditEntries.map((entry, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="p-2">{entry.date}</td>
                  <td className="p-2">{entry.particulars}</td>
                  <td className="p-2">{entry.jf}</td>
                  <td className="p-2 text-right">{entry.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black font-bold">
                <td colSpan={3} className="p-2 text-right">Total</td>
                <td className="p-2 text-right">{creditTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedger;
