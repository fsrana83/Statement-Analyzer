import * as XLSX from "xlsx";

export interface DemoFile {
  name: string;
  type: "mt940" | "csv" | "excel";
  content: string | any[];
}

// Realistic demo statement datasets
export const DEMO_STATEMENTS: Record<string, DemoFile> = {
  mt940: {
    name: "NL_RABO_STATEMENT_2026.txt",
    type: "mt940",
    content: `:20:RABO20260628
:25:NL84RABO0394857210
:28C:00142/001
:60F:C260601EUR2450,50
:61:2606020602D45,20NTRFMS-849382
:86:REWE SUPERMARKET SE /EREF/REWE-93842-JUNE /NAME/REWE DEUTSCHLAND/SVWZ/GROCERIES WEEK 23
:61:2606030603D14,99NTRFMS-994827
:86:NETFLIX.COM SUBSCRIPTION /EREF/NETFLIX-9182 /NAME/NETFLIX RECURRING/SVWZ/STREAMING BILL
:61:2606050605D12,50NTRFMS-339281
:86:STARBUCKS CAFE BERLIN /EREF/STB-COFFEE-01 /NAME/STARBUCKS COFFEE/SVWZ/MORNING AMERICANO
:61:2606100610D850,00NTRFMS-448291
:86:APARTMENT RENT JUNE /EREF/RENT-JUNE-APARTMENT /NAME/SMITH PROPERTY MGMT/SVWZ/WARM RENT RESIDENCE
:61:2606150615D120,00NTRFMS-029481
:86:EXXON MOBIL GAS /EREF/GAS-FUEL-8821 /NAME/EXXONMOBIL INC/SVWZ/CAR FUEL UP
:61:2606250625C3150,00NTRFMS-Payroll
:86:EMPLOYER PAYROLL SE /EREF/PAY-948291-CORP /NAME/TECH CORP HOLDINGS/SVWZ/MONTHLY SALARY INCOME
:61:2606260626D65,80NTRFMS-773821
:86:ZARA CLOTHING ONLINE /EREF/ZARA-OUT-99 /NAME/ZARA RETAIL GROUP/SVWZ/SUMMER APPAREL SHOPPING
:61:2606270627D38,40NTRFMS-110284
:86:LA PIAZZA PIZZERIA /EREF/PIZZA-9921 /NAME/LA PIAZZA RESTAURANT/SVWZ/DINNER WITH TEAM
:61:2606280628D85,00NTRFMS-558291
:86:HEALTH INSURANCE PREMIUM /EREF/HEALTH-INS-JUNE /NAME/ALLIANZ HEALTHCARE/SVWZ/INSURANCE POLICY
:62F:C260628EUR4533,61`
  },
  csv: {
    name: "STANDARD_BANK_STATEMENT_JUNE.csv",
    type: "csv",
    content: `Date,Description,Debit,Credit,Counterparty,Reference
2026-06-01,Opening Balance,,2450.50,SYSTEM,START
2026-06-02,REWE SUPERMARKET GROCERIES,45.20,,REWE DEUTSCHLAND,REWE-93842
2026-06-03,NETFLIX.COM SUBSCRIPTION,14.99,,NETFLIX ENTERTAINMENT,NETFLIX-9182
2026-06-05,STARBUCKS CAFE MORNING,12.50,,STARBUCKS COFFEE,STB-COFFEE-01
2026-06-10,MONTHLY HOUSING APARTMENT RENT,850.00,,SMITH PROPERTY MGMT,RENT-JUNE
2026-06-15,EXXON MOBIL CAR FUEL STATION,120.00,,EXXONMOBIL INC,GAS-FUEL-8821
2026-06-25,SALARY PAYROLL FREELANCE,,3150.00,TECH CORP HOLDINGS,PAY-948291
2026-06-26,ZARA CLOTHING ORDER,65.80,,ZARA RETAIL GROUP,ZARA-OUT-99
2026-06-27,LA PIAZZA TEAM DINNER,38.40,,LA PIAZZA RESTAURANT,PIZZA-9921
2026-06-28,ALLIANZ INS POLICY HEALTH,85.00,,ALLIANZ HEALTHCARE,HEALTH-INS-JUNE`
  },
  excel: {
    name: "EXCEL_BANK_STATEMENT.xlsx",
    type: "excel",
    content: [
      { "Booking Date": "2026-06-02", "Details": "REWE SUPERMARKET GROCERIES", "Amount": -45.20, "Counterparty": "REWE DEUTSCHLAND", "Reference": "REWE-93842" },
      { "Booking Date": "2026-06-03", "Details": "NETFLIX.COM SUBSCRIPTION", "Amount": -14.99, "Counterparty": "NETFLIX ENTERTAINMENT", "Reference": "NETFLIX-9182" },
      { "Booking Date": "2026-06-05", "Details": "STARBUCKS CAFE MORNING", "Amount": -12.50, "Counterparty": "STARBUCKS COFFEE", "Reference": "STB-COFFEE-01" },
      { "Booking Date": "2026-06-10", "Details": "MONTHLY HOUSING APARTMENT RENT", "Amount": -850.00, "Counterparty": "SMITH PROPERTY MGMT", "Reference": "RENT-JUNE" },
      { "Booking Date": "2026-06-15", "Details": "EXXON MOBIL CAR FUEL STATION", "Amount": -120.00, "Counterparty": "EXXONMOBIL INC", "Reference": "GAS-FUEL-8821" },
      { "Booking Date": "2026-06-25", "Details": "SALARY PAYROLL FREELANCE", "Amount": 3150.00, "Counterparty": "TECH CORP HOLDINGS", "Reference": "PAY-948291" },
      { "Booking Date": "2026-06-26", "Details": "ZARA CLOTHING ORDER", "Amount": -65.80, "Counterparty": "ZARA RETAIL GROUP", "Reference": "ZARA-OUT-99" },
      { "Booking Date": "2026-06-27", "Details": "LA PIAZZA TEAM DINNER", "Amount": -38.40, "Counterparty": "LA PIAZZA RESTAURANT", "Reference": "PIZZA-9921" },
      { "Booking Date": "2026-06-28", "Details": "ALLIANZ INS POLICY HEALTH", "Amount": -85.00, "Counterparty": "ALLIANZ HEALTHCARE", "Reference": "HEALTH-INS-JUNE" }
    ]
  }
};

/**
 * Parsers helper to convert uploaded files into content sent to the server.
 */
export async function parseFileContent(file: File): Promise<{ type: "mt940" | "csv" | "excel"; content: string | any[] }> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (extension === "xlsx" || extension === "xls") {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve({ type: "excel", content: jsonData });
        } catch (err) {
          reject(new Error("Failed to parse Excel file. Ensure it is a valid spreadsheet."));
        }
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsArrayBuffer(file);
    } else if (extension === "csv") {
      reader.onload = (e) => {
        resolve({ type: "csv", content: e.target?.result as string });
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsText(file);
    } else {
      // Default to text parsing for MT940 (.txt, .sta, .940) or general files
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const type = text.includes(":20:") && text.includes(":61:") ? "mt940" : "csv";
        resolve({ type, content: text });
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsText(file);
    }
  });
}
