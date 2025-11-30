
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Calendar, ArrowUpRight, ArrowDownLeft, Filter, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface DaybookProps {
  initialDate?: string | null;
}

const Daybook: React.FC<DaybookProps> = ({ initialDate }) => {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
      totalSales: 0,
      cashSales: 0,
      creditSales: 0,
      totalReceived: 0,
      totalTransactions: 0
  });

  useEffect(() => {
    const invoices = StorageService.getInvoices() || [];
    const payments = StorageService.getPayments() || [];

    // Filter by Date
    const dayInvoices = invoices.filter(i => i.date === date);
    const dayPayments = payments.filter(p => p.date === date);

    // Calculate Summary
    const sales = dayInvoices.reduce((sum, i) => sum + i.total, 0);
    const cashSales = dayInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0);
    const creditSales = dayInvoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.total, 0);
    
    const received = dayPayments.reduce((sum, p) => sum + p.amount, 0);

    setSummary({
        totalSales: sales,
        cashSales: cashSales,
        creditSales: creditSales,
        totalReceived: received + cashSales,
        totalTransactions: dayInvoices.length + dayPayments.length
    });

    // Combine and Sort
    const combined = [
        ...dayInvoices.map(i => ({
            id: i.id,
            time: 'Invoice', 
            type: 'SALE',
            party: i.customerName,
            amount: i.total,
            mode: i.status === 'PAID' ? 'CASH' : 'CREDIT',
            ref: i.invoiceNumber
        })),
        ...dayPayments.map(p => ({
            id: p.id,
            time: 'Payment',
            type: 'RECEIPT',
            party: 'Customer Payment', 
            amount: p.amount,
            mode: p.mode,
            ref: p.reference || 'N/A'
        }))
    ];

    setTransactions(combined);

  }, [date]);

  const downloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const company = StorageService.getCompanyProfile();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;
      const leftMargin = 10;
      const smallFont = 8;
      const normalFont = 9;
      const largeFont = 12;

      // Header
      doc.setFontSize(largeFont);
      doc.setFont('helvetica', 'bold');
      doc.text(company?.name || 'Company', pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      
      doc.setFontSize(normalFont);
      doc.setFont('helvetica', 'normal');
      doc.text(`Day Book - ${date}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
      yPos += 8;

      // Summary
      doc.setFontSize(smallFont);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Sales: ₹${summary.totalSales.toLocaleString()}`, leftMargin, yPos);
      yPos += 4;
      doc.text(`Cash Collection: ₹${summary.totalReceived.toLocaleString()}`, leftMargin, yPos);
      yPos += 4;
      doc.text(`Total Transactions: ${summary.totalTransactions}`, leftMargin, yPos);
      yPos += 8;

      // Table Header
      doc.setFont('helvetica', 'bold');
      doc.text('Type', leftMargin, yPos);
      doc.text('Party', leftMargin + 25, yPos);
      doc.text('Ref', leftMargin + 80, yPos);
      doc.text('Amount', pageWidth - leftMargin - 20, yPos, { align: 'right' });
      yPos += 4;
      doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
      yPos += 4;

      // Transactions
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(smallFont - 1);
      transactions.forEach((tx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 15;
        }
        doc.text(tx.type, leftMargin, yPos);
        doc.text(tx.party, leftMargin + 25, yPos);
        doc.text(tx.ref, leftMargin + 80, yPos);
        doc.text(`₹${tx.amount.toFixed(2)}`, pageWidth - leftMargin - 20, yPos, { align: 'right' });
        yPos += 4;
      });

      doc.save(`daybook-${date}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" /> Daybook
            </h2>
            <p className="text-sm text-slate-500">Daily transaction register</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
                <Filter className="w-4 h-4 text-gray-500" />
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="outline-none text-sm font-medium text-slate-700"
                    data-testid="input-daybook-date"
                />
            </div>
            <button 
                onClick={downloadPDF}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                data-testid="button-download-daybook-pdf"
            >
                <Download className="w-4 h-4" />
                Download
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Sales</div>
              <div className="text-2xl font-bold text-slate-800">₹{summary.totalSales.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">
                  Cash: {summary.cashSales} | Credit: {summary.creditSales}
              </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Cash Collection (In Hand)</div>
              <div className="text-2xl font-bold text-green-700">₹{summary.totalReceived.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">
                  From Sales & Payments
              </div>
          </div>

           <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-purple-500">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Transactions</div>
              <div className="text-2xl font-bold text-slate-800">{summary.totalTransactions}</div>
              <div className="text-xs text-gray-400 mt-1">
                  Entries for {date}
              </div>
          </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Party / Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ref / Invoice</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Mode</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-6 py-3">
                                <span className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-full w-fit ${tx.type === 'SALE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {tx.type === 'SALE' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                    {tx.type}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-slate-700">{tx.party}</td>
                            <td className="px-6 py-3 text-sm text-slate-500">{tx.ref}</td>
                            <td className="px-6 py-3 text-right text-sm font-bold text-slate-800">₹{tx.amount.toFixed(2)}</td>
                            <td className="px-6 py-3 text-center text-xs text-slate-500 uppercase">{tx.mode}</td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No transactions for this date.</td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default Daybook;
