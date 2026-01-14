/**
 * Step 1: Migration Strategy
 * --------------------------
 * 1. Fetch all companies. Ensure each has a unique 'companyCode'.
 *    If missing, generate one (e.g., first 3 chars or incrementing ID) and save it.
 * 2. Fetch all customers per company (querying by 'companyId').
 * 3. For each customer:
 *    a. Check if 'uid' field exists. If yes, skip.
 *    b. Determine 'companyCode'.
 *    c. Format Phone: last 10 digits.
 *    d. Generate Email: <companyCode>_<phone>@customer.app
 *    e. Generate Password: "Pass@" + last 4 digits of phone. (Default)
 *    f. Create Firebase Auth User.
 *    g. Update Firestore Customer doc with 'uid' and generated credentials (optional, or just handle communication).
 */

// import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
// import { db, auth } from '../firebaseConfig';
// import { createUserWithEmailAndPassword } from 'firebase/auth'; // Careful: Use a secondary app instance in real scenario

/**
 * CAUTION: This script uses the client-side SDK.
 * Using `createUserWithEmailAndPassword` will automatically sign in the new user,
 * logging out the current admin.
 * 
 * SOLUTION:
 * In a real deployment, use Firebase Admin SDK (Node.js backend) or Cloud Functions.
 * For this client-side demo/tool, we would need to initialize a "secondary app".
 * 
 * However, since I cannot easily add 'firebase-admin' here without node backend access setup,
 * I will write the logic for the Cloud Function or Backend Script below.
 */

/*
// --- CLOUD FUNCTION / BACKEND SCRIPT LOGIC ---

const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();
const db = admin.firestore();

exports.migrateCustomers = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.admin !== true) {
        // secure this endpoint
    }

    const customersScan = await db.collection('customers').get();
    let migratedCount = 0;

    for (const doc of customersScan.docs) {
        const cust = doc.data();
        if (cust.uid) continue; // Already linked to Auth

        // Get Company Code
        const companySnap = await db.collection('companies').doc(cust.companyId).get();
        if (!companySnap.exists) continue;
        
        const companyData = companySnap.data();
        const code = companyData.companyCode || companyData.name.substring(0,3).toLowerCase();
        
        // Generate Credentials
        const phone = cust.phone.replace(/\D/g, '').slice(-10);
        const email = `${code}_${phone}@customer.app`;
        const password = `Pass@${phone.slice(-4)}`;

        try {
            // Create Auth User
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: cust.name,
            });

            // Update Firestore
            await doc.ref.update({
                uid: userRecord.uid,
                // optionally store temp pass securely or just comms
            });
            migratedCount++;
        } catch(e) {
            console.error(`Failed for ${doc.id}`, e);
        }
    }

    return { success: true, migrated: migratedCount };
});

*/

/*
// --- FIRESTORE RULES ---

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check auth
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isCustomer(customerId) {
       // Check if the current Auth UID matches the UID stored in the customer document
       return resource.data.uid == request.auth.uid;
    }

    // Companies: Public Read (for checking code login), Admin Write
    match /companies/{companyId} {
      allow read: if true; 
      allow write: if isAuthenticated(); // Refine for Admin only
    }

    // Customers: 
    // - Admin can Read/Write all.
    // - Customer can Read their own doc.
    match /customers/{customerId} {
      allow read: if isAuthenticated() && (resource.data.uid == request.auth.uid || request.auth.token.role == 'admin');
      allow write: if isAuthenticated() && request.auth.token.role == 'admin';
    }

    // Records/Loans:
    // - Customer can read their own records (filtered by customerId potentially).
    // - Ideally records have a 'uid' or 'customerId' field.
    match /records/{recordId} {
       allow read: if isAuthenticated() && (
          get(/databases/$(database)/documents/customers/$(resource.data.customerId)).data.uid == request.auth.uid 
          || request.auth.token.role == 'admin'
       );
       allow write: if isAuthenticated() && request.auth.token.role == 'admin'; 
    }
    
    // Transactions/Payments
     match /transactions/{txnId} {
        allow read: if isAuthenticated() && (
          get(/databases/$(database)/documents/customers/$(resource.data.customerId)).data.uid == request.auth.uid 
          || request.auth.token.role == 'admin'
       );
    }
  }
}

*/
