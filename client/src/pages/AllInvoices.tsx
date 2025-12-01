import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllInvoices, downloadInvoiceAsPDF } from '../lib/api';
import { Invoice } from '@/types';

const AllInvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState(new Set<string>());

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const fetchedInvoices = await getAllInvoices();
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      }
    };

    fetchInvoices();
  }, []);

  const handleSelectInvoice = (invoiceId: string) => {
    const newSelectedInvoices = new Set(selectedInvoices);
    if (newSelectedInvoices.has(invoiceId)) {
      newSelectedInvoices.delete(invoiceId);
    } else {
      newSelectedInvoices.add(invoiceId);
    }
    setSelectedInvoices(newSelectedInvoices);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allInvoiceIds = new Set(invoices.map(invoice => invoice.id));
      setSelectedInvoices(allInvoiceIds);
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleDownloadSelected = async () => {
    const selectedInvoicesArray = Array.from(selectedInvoices);
    for (const invoiceId of selectedInvoicesArray) {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
            try {
                await downloadInvoiceAsPDF(invoice);
            } catch (error) {
                console.error(`Error downloading invoice ${invoiceId}:`, error);
            }
        }
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">All Invoices</h1>
        <Button onClick={handleDownloadSelected} disabled={selectedInvoices.size === 0}>
          Download Selected
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                onCheckedChange={handleSelectAll}
                checked={selectedInvoices.size > 0 && selectedInvoices.size === invoices.length}
              />
            </TableHead>
            <TableHead>Invoice Number</TableHead>
            <TableHead>Client Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <Checkbox
                  onCheckedChange={() => handleSelectInvoice(invoice.id)}
                  checked={selectedInvoices.has(invoice.id)}
                />
              </TableCell>
              <TableCell>{invoice.invoiceNumber}</TableCell>
              <TableCell>{invoice.customerName}</TableCell>
              <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
              <TableCell>{invoice.total}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => downloadInvoiceAsPDF(invoice)}>
                  Download
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AllInvoicesPage;
