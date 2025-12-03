# BillFlow - Invoice and Billing Management System

## Overview

BillFlow is a comprehensive invoice and billing management system designed for Indian businesses with full GST compliance support. The application enables users to create invoices, manage inventory, track customers, handle payments, and maintain detailed financial records. It features a modern web interface built with React and TypeScript, backed by Firebase for authentication and data persistence.

Key capabilities include:
- GST-compliant invoice generation with automatic tax calculations
- Multi-company support with role-based access control
- Customer and inventory management
- Payment tracking and customer ledger reports
- WhatsApp integration for invoice sharing
- PDF generation and export capabilities
- Excel import/export functionality
- Daybook and financial reporting

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite with hot module replacement
- **UI Components:** Radix UI primitives with shadcn/ui component library
- **Styling:** Tailwind CSS with custom design tokens
- **State Management:** React Context API for global state (Auth, Company)
- **Data Fetching:** TanStack Query for server state management
- **Routing:** Client-side routing with view state management

**Design Decisions:**
- Component-based architecture with separation of concerns between business logic and presentation
- Context providers handle cross-cutting concerns (authentication, company profile)
- Custom hooks for reusable logic (mobile detection, toast notifications)
- Type-safe development with comprehensive TypeScript interfaces
- Responsive design with mobile-first approach
- Accessibility-focused UI components from Radix UI

### Backend Architecture

**Server Framework:** Express.js running on Node.js 20
- Development mode uses Vite middleware for HMR
- Production mode serves static files from build directory
- Serverless deployment target (Vercel) with API routes
- Database operations abstracted through storage interface

**Data Layer:**
- Drizzle ORM for type-safe database operations
- PostgreSQL via Neon serverless driver with WebSocket connection pooling
- Schema-driven development with migrations support
- Storage service pattern provides abstraction over database and local storage

**Key Architectural Patterns:**
- Repository pattern for data access (IStorage interface)
- Service layer for business logic (StorageService, FirebaseService, etc.)
- Separation between local storage (browser) and cloud storage (Firebase/PostgreSQL)
- Dual-mode operation: offline-first with optional cloud sync

### Data Storage Strategy

**Hybrid Storage Model:**
- **Local Storage:** Browser localStorage for offline capability and quick access
- **Cloud Storage:** Firebase Firestore for real-time sync and multi-device access
- **PostgreSQL:** Structured data with Drizzle ORM (provisioned but not actively used in current implementation)

**Storage Service Design:**
- Implements caching layer with in-memory cache
- Automatic synchronization between local and cloud storage
- Seed data initialization for new users
- User-scoped data isolation with userId-based filtering

**Database Schema (PostgreSQL/Drizzle):**
```
customers
- id (uuid primary key)
- userId (varchar, not null)
- name, company, email, phone, address
- balance (decimal)
- notifications (jsonb)
- createdAt (timestamp)

products
- id (uuid primary key)
- userId (varchar, not null)
- name, price, stock, category
- createdAt (timestamp)

invoices
- id (uuid primary key)
- userId (varchar, not null)
- invoiceNumber, customerId (fk to customers)
- customerName, customerAddress
- date, dueDate
- subtotal, tax, total
- status (PENDING/PAID)
- createdAt (timestamp)

invoice_items
- id (uuid primary key)
- invoiceId (fk to invoices)
- productId, description, quantity, price, total
- createdAt (timestamp)

payments
- id (uuid primary key)
- userId (varchar, not null)
- customerId (fk to customers)
- amount, date, mode, reference, note
- createdAt (timestamp)
```

### Authentication and Authorization

**Firebase Authentication:**
- Email/password authentication strategy
- Session management via Firebase Auth state
- AuthContext provides global authentication state
- Automatic redirect handling for unauthenticated users

**Multi-Company Support:**
- CompanyContext manages company profiles and memberships
- Role-based access control (OWNER, ADMIN, STAFF)
- Company switching capability for users with multiple company access
- Invitation system for adding users to companies

**Permission Model:**
- User owns their primary company (created on first login)
- Can be invited to other companies with specific roles
- Firestore security rules enforce user-based access control
- Each user's data is scoped to their userId

### GST Tax System

**Tax Calculation Logic:**
- Global GST toggle (company-level setting)
- Automatic tax type detection based on state comparison:
  - Intra-state (same state): CGST + SGST (split equally)
  - Inter-state (different states): IGST (full rate)
- Product-level GST rate configuration with HSN/SAC codes
- Line-item tax calculation with base amount separation
- HSN summary generation grouped by HSN/SAC code

**Tax Compliance Features:**
- GST-compliant invoice template with mandatory fields
- GSTIN display for registered businesses
- HSN summary table (Tally-style format)
- Amount in words conversion
- Configurable HSN summary visibility
- Round-up options (to nearest 10 or 100)

### Invoice Generation System

**Invoice Workflow:**
1. Customer and product selection with autocomplete
2. Line item management with real-time calculations
3. Payment mode selection (CREDIT/CASH)
4. Tax calculation based on GST settings
5. Invoice preview with PDF export capability
6. WhatsApp sharing with deep links

**Invoice Numbering:**
- Pattern: `{Customer Initials}{Invoice Count}{Year}`
- Example: JD001/24 for first invoice to John Doe in 2024
- Automatic counter increment per customer

**PDF Generation:**
- html2canvas for DOM-to-canvas conversion
- jsPDF for PDF creation from canvas
- Includes company logo, GST details, item table, tax summary
- Supports both preview and download

## External Dependencies

### Third-Party Services

**Firebase (Primary Backend):**
- **Service:** Firebase Suite (Auth + Firestore)
- **Purpose:** User authentication and cloud data storage
- **Configuration:** Hardcoded in `client/src/lib/firebase.ts`
- **Integration Points:**
  - Authentication: Email/password sign-in/sign-up
  - Firestore: Company profiles, user data, memberships
  - Real-time sync for multi-device access
- **Security:** Firestore rules must allow authenticated user access to their own documents

**Neon PostgreSQL:**
- **Service:** Neon Serverless Postgres
- **Purpose:** Structured data storage with Drizzle ORM
- **Configuration:** DATABASE_URL environment variable
- **Integration:** Via `@neondatabase/serverless` with WebSocket support
- **Status:** Provisioned but underutilized in current implementation (Firebase Firestore is primary data store)

**Google Gemini AI:**
- **Service:** Google Generative AI (Gemini 2.5)
- **Purpose:** Text-to-speech for invoice narration
- **Configuration:** API_KEY environment variable
- **Integration:** `GeminiService` in `client/src/services/geminiService.ts`
- **Features:** Audio generation from invoice text

**WhatsApp Business API (Conceptual):**
- **Purpose:** Invoice and payment receipt sharing
- **Implementation:** URL scheme-based (wa.me links)
- **Features:** Formatted messages with invoice details and deep links

### Key Libraries and Frameworks

**Frontend:**
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Headless UI components (20+ components)
- `tailwindcss` - Utility-first CSS framework
- `drizzle-orm` - Type-safe ORM
- `zod` - Schema validation
- `react-hook-form` - Form state management
- `jspdf` + `html2canvas` - PDF generation
- `xlsx` - Excel import/export
- `date-fns` - Date manipulation

**Backend:**
- `express` - Web server framework
- `drizzle-kit` - Database migrations
- `connect-pg-simple` - PostgreSQL session store (available but unused)
- `tsx` - TypeScript execution

**Build and Development:**
- `vite` - Build tool and dev server
- `@vitejs/plugin-react` - React plugin for Vite
- `@replit/*` plugins - Replit-specific development tools
- Custom Vite plugin for meta image handling

### Deployment Configuration

**Vercel Deployment:**
- Serverless function: `api/index.ts` (Node.js runtime)
- Static asset serving from `/public` directory
- API route rewrites to serverless function
- Environment variables: DATABASE_URL, API_KEY

**Development Environment:**
- Node.js 20.x required
- Dual-mode server: dev (Vite HMR) vs production (static serving)
- Hot reload and error overlay for development
- TypeScript compilation with path aliases