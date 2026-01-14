# Changelog

All notable changes to BillBook App will be documented in this file.

## [1.8.0] - 2026-01-05

### 🐛 Bug Fixes - Ledger Report

#### Fixed Company Name Display Issue
- **Issue**: Ledger report was showing "ABC" or incorrect company name
- **Fix**: Now correctly displays customer name with fallback to company name
- **Impact**: Prevents blank or incorrect names in ledger reports

#### Fixed Closing Balance Calculation
- **Issue**: Closing balance was using stale `customer.balance` instead of calculating from filtered transactions
- **Fix**: Now calculates closing balance accurately from debit and credit totals within the selected date range
- **Formula**: `Closing Balance = Total Debit - Total Credit`
- **Impact**: Accurate financial reporting matching the transaction period

#### Fixed QR Code Payment Amount
- **Issue**: QR code was generating with incorrect amount (using stale customer balance)
- **Fix**: QR code now uses the calculated closing balance from the ledger report
- **Impact**: Customers can scan and pay the exact outstanding amount shown in the report

### ✨ Enhancements - Ledger Report

#### PAID Bills Visual Indicator
- **Feature**: PAID invoices now appear with visual distinction
- **Indicators**: 
  - Green color text
  - Checkmark symbol (✓) prefix
  - "(PAID)" suffix label
- **Calculation**: PAID bills are excluded from outstanding balance calculation
- **Impact**: Clear differentiation between pending and paid invoices, preventing confusion

#### Customer Name Fallback Logic
- **Feature**: Ledger header now always shows customer identification
- **Priority Order**:
  1. Customer name (if available)
  2. Company name (if name is blank)
  3. "Customer" (if both are blank)
- **Impact**: No more blank ledger headers

### 📊 Technical Details

#### Ledger Balance Logic
```
Debit Side:
- Invoices (PENDING only counted in total)
- PAID invoices shown but excluded from balance

Credit Side:
- Payments received
- Credit notes/returns

Closing Balance = Debit Total (PENDING) - Credit Total
```

#### QR Code Integration
- QR codes only generated when closing balance > 0 (customer owes money)
- Contains accurate UPI payment URL with correct amount
- Format: `upi://pay?pa={UPI_ID}&pn={NAME}&am={CLOSING_BALANCE}&cu=INR`

### 🔧 Build Improvements

#### Gradle Optimization
- Reduced memory allocation from 2GB to 1.5GB
- Disabled Gradle daemon for stability
- Fixed build crashes on memory-constrained systems

---

## [1.7.0] - Previous Release

### Features
- Initial ledger report implementation
- Customer transaction history
- T-format ledger view
- UPI QR code generation
- Payment tracking
- Invoice management

---

## How to Read Version Numbers

Version format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes or major feature additions
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes and minor improvements

**Example**: Version 1.8.0
- Major version: 1 (stable release)
- Minor version: 8 (new features added)
- Patch version: 0 (initial release of this minor version)
