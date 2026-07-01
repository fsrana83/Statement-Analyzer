# Software Requirements Specification (SRS)

## 1. Introduction
### 1.1 Purpose
This document specifies the software requirements for **LedgerFlow**, a comprehensive personal finance and budget management application. The SRS outlines the functional and non-functional requirements, target audience, and system behavior to ensure clear alignment on the product's capabilities.

### 1.2 Scope
LedgerFlow is designed to help users upload, analyze, and manage their bank statements. It provides tools for transaction categorization, budget tracking, ledger filtering, statement reconciliation, and AI-driven financial insights. The application operates entirely locally on the client-side within the browser, ensuring user privacy and data security. 

## 2. Overall Description
### 2.1 Product Perspective
LedgerFlow is a standalone web application built using modern web technologies (React, TypeScript, Tailwind CSS, Vite). It utilizes browser storage (Local Storage) to persist user data across sessions, ensuring no sensitive financial data is transmitted to external databases.

### 2.2 User Classes and Characteristics
- **Everyday Users**: Individuals looking to track their monthly expenses, manage category budgets, and understand their spending habits.
- **Power Users**: Users who need advanced features like transaction splitting, soft-deleting categories, exporting detailed reports, and reconciling ledger balances against actual bank accounts.

### 2.3 Operating Environment
- Modern web browsers (Chrome, Firefox, Safari, Edge).
- Responsive design supporting both Desktop and Mobile interfaces.

## 3. Functional Requirements

### 3.1 Statement Management & Parsing
- **FR 3.1.1**: The system must allow users to upload CSV bank statements.
- **FR 3.1.2**: The system shall parse the statement, extracting Date, Description, Amount, and Balance.
- **FR 3.1.3**: The system shall automatically categorize transactions. Specifically, any transaction containing the description 'Disbursement Credit' must be classified as 'UCLP Premium'.

### 3.2 Transaction Ledger & Filtering
- **FR 3.2.1**: The system must display a ledger of all imported transactions.
- **FR 3.2.2**: Users shall be able to filter the ledger by Date Range (Start Date and End Date).
- **FR 3.2.3**: Users shall be able to filter transactions by Category.
- **FR 3.2.4**: Users shall be able to filter transactions by Type (Income/Credit vs Expense/Debit).
- **FR 3.2.5**: Users shall be able to perform a text search on transaction descriptions and amounts.
- **FR 3.2.6**: The system must allow users to split a single transaction across multiple categories.

### 3.3 Budgeting & Category Management
- **FR 3.3.1**: Users can view and manage their spending across different categories.
- **FR 3.3.2**: Users can set a monthly budget cap for each category up to 1,000,000.
- **FR 3.3.3**: The system shall display a progress bar for category budget utilization per month.
- **FR 3.3.4**: Users can create, rename, and delete custom categories.
- **FR 3.3.5**: Deleting a category that has existing transactions will "soft-delete" (archive) it to preserve historical ledger integrity.
- **FR 3.3.6**: The system must maintain an Audit Log tracking all category renaming events (timestamp, action, and details).

### 3.4 Exporting & Reporting
- **FR 3.4.1**: Users can export the current ledger or dashboard view to a PDF report.
- **FR 3.4.2**: Users can export analyzed transactions to a structured CSV file.

### 3.5 AI Advisor
- **FR 3.5.1**: The system shall include an AI advisor capable of answering user queries regarding their spending habits, specific category totals, and general savings ideas based on the loaded dataset.

### 3.6 Data Persistence
- **FR 3.6.1**: All application state (transactions, categories, budgets, audit logs) must be cached locally in the browser to maintain state upon page reload.

## 4. Non-Functional Requirements

### 4.1 Security & Privacy
- **NFR 4.1.1**: User financial data (statements, balances) must remain entirely client-side. No backend databases are to be used for storing personal transaction records.
- **NFR 4.1.2**: Local storage implementation must safely serialize and deserialize data without exposing it to cross-site scripting (XSS) vulnerabilities.

### 4.2 Usability
- **NFR 4.2.1**: The user interface shall be highly responsive and accessible, utilizing Tailwind CSS for fluid layouts.
- **NFR 4.2.2**: The application must provide clear visual feedback for actions (e.g., budget overruns, successful exports, transaction splits).

### 4.3 Performance
- **NFR 4.3.1**: Parsing and loading of large CSV statements (up to thousands of rows) must execute without freezing the main browser UI thread, or provide a loading state.
- **NFR 4.3.2**: PDF generation utilizing `html-to-image` and `jspdf` must render cleanly in under 5 seconds for standard views.

### 4.4 Maintainability
- **NFR 4.4.1**: The codebase shall be written in TypeScript with strict typing to prevent runtime errors.
- **NFR 4.4.2**: Code must be modularized into distinct React components (e.g., `TransactionList`, `BudgetsCategories`, `CategoryDashboard`).
