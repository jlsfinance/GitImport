# Project Split

This project has been split into two separate applications as requested:

## 1. BillBookApp (Billing / Invoices)
*   **Folder:** `BillBookApp`
*   **Package:** `com.jls.billbook`
*   **Function:** Invoicing, GST, Estimates.

## 2. LedgerRecordApp (Khata / Hisab)
*   **Folder:** `LedgerRecordApp`
*   **Package:** `com.jls.suite`
*   **Function:** Payment Records, Ledger, Customer History.

## How to Work
1.  Open the specific folder (`BillBookApp` or `LedgerRecordApp`) in VS Code.
2.  Open a terminal in that folder.
3.  Run `npm install` to set up dependencies.
4.  Run `npm run dev:client` to start.

## Google Services JSON
*   Place the `google-services.json` for **Billing App** in: `BillBookApp/android/app/`
*   Place the `google-services.json` for **Ledger App** in: `LedgerRecordApp/android/app/`
