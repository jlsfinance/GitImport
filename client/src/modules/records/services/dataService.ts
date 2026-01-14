import { collection, getDocs, addDoc, doc, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { recordsDb as db } from '../../../lib/firebase';
import { Customer, FinancialRecord as Record } from '../types';

export const fetchCustomers = async (companyId?: string): Promise<Customer[]> => {
  try {
    let q;
    if (companyId) {
      q = query(collection(db, "customers"), where("companyId", "==", companyId));
    } else {
      q = collection(db, "customers");
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  } catch (error) {
    console.error("Error fetching customers from Firebase:", error);
    return [];
  }
};

export const fetchCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const docRef = doc(db, "customers", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Customer;
    } else {
      console.log("No such customer document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return null;
  }
};

export const fetchRecordsByCustomerId = async (customerId: string): Promise<Record[]> => {
  try {
    const recordsQuery = query(
      collection(db, "records"),
      where("customerId", "==", customerId)
    );
    const querySnapshot = await getDocs(recordsQuery);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record));
    records.sort((a: any, b: any) => {
      const dateA = a.date?.toDate?.() || new Date(a.date) || new Date(0);
      const dateB = b.date?.toDate?.() || new Date(b.date) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    return records;
  } catch (error) {
    console.error("Error fetching records:", error);
    return [];
  }
};

export const fetchRecords = async (companyId?: string): Promise<Record[]> => {
  try {
    let q;
    if (companyId) {
      q = query(collection(db, "records"), where("companyId", "==", companyId));
    } else {
      q = collection(db, "records");
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record));
  } catch (error) {
    console.error("Error fetching records from Firebase:", error);
    return [];
  }
};

export const createCustomer = async (customer: Omit<Customer, 'id'> & { companyId: string }) => {
  try {
    const docRef = await addDoc(collection(db, "customers"), customer);
    return docRef.id;
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    // 1. Delete all associated records
    const recordsQuery = query(collection(db, "records"), where("customerId", "==", customerId));
    const recordsSnap = await getDocs(recordsQuery);

    const deleteRecordPromises = recordsSnap.docs.map(async (recordDoc) => {
      // Delete sub-collections of the record if any (e.g., 'ledger')
      // In this schema, ledger is a root collection with recordId
      const ledgerQuery = query(collection(db, "ledger"), where("recordId", "==", recordDoc.id));
      const ledgerSnap = await getDocs(ledgerQuery);
      const deleteLedgerPromises = ledgerSnap.docs.map(lDoc => deleteDoc(lDoc.ref));
      await Promise.all(deleteLedgerPromises);

      return deleteDoc(recordDoc.ref);
    });

    await Promise.all(deleteRecordPromises);

    // 2. Delete the customer document itself
    await deleteDoc(doc(db, "customers", customerId));

  } catch (error) {
    console.error("Error deleting customer and data:", error);
    throw error;
  }
};