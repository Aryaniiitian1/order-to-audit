# Order-to-Audit System for a Small Food Manufacturer
**Centre for Digital Infrastructure, NIT Tiruchirappalli**  
**Project Title:** Order-to-Audit System for a Small Food Manufacturer (Packaged South Indian Snacks)

---

## 1. Stack Selection & Architectural Justification

This project is built using **Next.js 14 (App Router) with TypeScript, Tailwind CSS, PostgreSQL / SQLite, and Prisma ORM**.

> **Justification:**  
> A monolithic Next.js architecture provides unified TypeScript contracts between mobile field interfaces and administrative billing engines, eliminating schema drift and cross-origin security overhead. Relational transactions via Prisma guarantee atomic stock deduction and immutable double-entry ledgering, while exact decimal and integer-paisa math ensures complete immunity against floating-point rounding drift.

---

## 2. Quick Setup & Run Instructions

### Prerequisites
- Node.js 18+ (tested on Node v20 & v26)
- npm or pnpm

### 1-Command Local Setup & Run
```bash
# 1. Clone the repository and enter the directory
git clone <repo-url>
cd order-to-audit

# 2. Install dependencies
npm install

# 3. Synchronize database schema and generate Prisma client
npx prisma db push

# 4. Seed benchmark master data (Section 5 scenario)
npx prisma db seed # or: npx ts-node prisma/seed.ts

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment
```bash
# Runs the containerized Next.js app on port 3000
docker compose up -d
```

---

## 3. Automated Benchmark Verification (Section 5)

We provide an automated verification runner that executes all 9 steps of Section 5 in sequence and tests all 11 evaluation checks:

```bash
# Run the benchmark test suite
npx ts-node -O '{"module":"commonjs"}' scripts/verify-benchmark.ts
```

### Benchmark Checklist Summary:
```
┌─────────┬──────────────────────────────────────────────────┬──────────────────┬──────────────────┬────────┐
│ (index) │ Criteria / Check                                 │ Actual Value     │ Expected Value   │ Status │
├─────────┼──────────────────────────────────────────────────┼──────────────────┼──────────────────┼────────┤
│ 0       │ Flour closing balance (120 kg)                   │ 120 kg           │ 120 kg           │ PASS   │
│ 1       │ Oil closing balance (19.5 L)                     │ 19.5 L           │ 19.5 L           │ PASS   │
│ 2       │ Pouches closing balance (306 pcs)                │ 306 pcs          │ 306 pcs          │ PASS   │
│ 3       │ Murukku FG after run (238 pkts)                  │ 238 pkts         │ 238 pkts         │ PASS   │
│ 4       │ Murukku FG after Retailer A dispatch (88 pkts)   │ 88 pkts          │ 88 pkts          │ PASS   │
│ 5       │ Yield variance (-6%, flagged)                    │ -6% (flag: true) │ -6%, flagged     │ PASS   │
│ 6       │ Oil consumption variance (+5%, flagged)          │ +5% (flag: true) │ +5%, flagged     │ PASS   │
│ 7       │ Retailer A invoice (₹7,875 total)                │ ₹7,875.00        │ ₹7,875.00        │ PASS   │
│ 8       │ Retailer A outstanding (₹3,875)                  │ ₹3,875.00        │ ₹3,875.00        │ PASS   │
│ 9       │ Distributor B shortage (32 pkts flagged)         │ Shortage 32 pkts │ Shortage 32 pkts │ PASS   │
│ 10      │ Murukku Cost per packet (₹30.90)                 │ ₹30.90           │ ₹30.90           │ PASS   │
└─────────┴──────────────────────────────────────────────────┴──────────────────┴──────────────────┴────────┘
ALL 11 BENCHMARK CHECKS PASSED: ✓ YES (100% COMPLIANT)
```

---

## 4. Scope & Feature Tier Delivery

### Must-Have (Tier 1 - 100% Completed)
- [x] **Role-Based Access Control (RBAC):** Simulated Persona Switcher in the top navigation bar supporting Salesman A, Salesman B, Factory Admin, Production Supervisor, Accountant/Auditor, and Owner.
- [x] **Master Data Management:** Product, Customer (with GSTIN & State Code), Supplier, Raw Material, Packaging Material, and Recipe (BOM) masters.
- [x] **Mobile Field Order Taking:** Responsive mobile UI for salesmen to select customers, view catalog prices, book quantities, and track statuses.
- [x] **Admin Verification & Stock Check:** Real-time visibility into finished goods stock availability before order approval.
- [x] **GST Tax Invoicing & PDF:** Place-of-Supply logic (CGST+SGST vs IGST), Indian FY numbering (`INV/2026-27/0001`), and printable PDF invoices.
- [x] **Recipe-Based Production Runs:** Automatic raw material consumption and finished goods credit linked directly to BOM standards.
- [x] **Variance Analysis Engine:** Planned vs actual consumption and yield comparison with automated adverse variance flagging ($\pm 3\%$).
- [x] **Immutable Stock Movement Ledger:** Double-entry ledger tracking purchases, issues, yields, dispatches, and scrap with source document links.
- [x] **Core Reports & Seed Data:** Seed script for benchmark, sales register, and stock ledger exportable to Excel (.xlsx).

### Should-Have (Tier 2 - 100% Completed)
- [x] **Purchases & Supplier Records:** Record raw material receipts at purchase rates updating stock and valuation.
- [x] **Payments, Outstanding & Aging:** Partial collections against invoices, customer outstanding dues, and debtor aging schedule.
- [x] **Cost per Packet with Overheads:** Allocates direct labour and power/gas overheads with FIFO valuation to compute exact unit cost and gross margin.
- [x] **GST Summary Report:** Outward supplies summary mapping to GSTR-1 (Table 12 HSN) and GSTR-3B tax liability.
- [x] **Owner Operations Dashboard:** Real-time KPIs for daily sales, low stock alerts, production variances, and receivables.

### Stretch Goals Implemented
- [x] **Interactive 1-Click Benchmark Simulator (`/benchmark`):** Step-by-step interactive simulator with live pass/fail audit badges.
- [x] **Multi-State Tax Prediction:** Auto-detection of inter-state supplies (Karnataka Code `29`) vs intra-state (Tamil Nadu Code `33`).
- [x] **Excel / Spreadsheet Export:** Native `.xlsx` download for Sales Register, GSTR-1 HSN summary, and Debtor Aging.

---

## 5. Test Logins & Role Personas

Use the **Active Persona** dropdown in the top header to seamlessly switch roles:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Factory Owner** | `owner` | `password123` | Executive operations overview, KPI cards, variance alerts |
| **Factory Admin** | `admin` | `password123` | Order verification, stock sufficiency check, GST billing, dispatch, payment recording |
| **Field Salesman A** | `salesman_a` | `password123` | Mobile field order taking for Tamil Nadu retailers |
| **Field Salesman B** | `salesman_b` | `password123` | Field order taking for Karnataka distributors |
| **Floor Supervisor** | `supervisor` | `password123` | BOM recipe execution, material issue, actual output & scrap entry |
| **Auditor / Accountant** | `accountant` | `password123` | Read-only access to sales register, GSTR-1/3B summary, and stock ledgers |

---

## 6. Assumptions & Implementation Notes

1. **FIFO Inventory Valuation:** Perishable food manufacturing ingredients (flour, oil, spices) follow physical First-In, First-Out rotation to prevent spoilage and satisfy AS-2 inventory accounting rules. Under FIFO, the 40 kg flour used in the benchmark is valued at the opening rate of ₹42/kg.
2. **Damaged Pouches & Scrap Accounting:** Damaged packaging (6 pouches) is recorded as scrap in the inventory ledger and added to product cost, ensuring total pouches consumed equals 194.
3. **Paisa Precision:** All currency arithmetic is performed with Decimal objects and stored both as rounded rupees and integer paisa (`* 100`) to guarantee zero float drift.
