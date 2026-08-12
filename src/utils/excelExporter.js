const XLSX = window.XLSX;

/**
 * General utility to export an array of JSON objects to Excel
 * 
 * @param {Array<Object>} data - Array of flat objects to export
 * @param {string} fileName - Destination filename (excluding extension)
 * @param {string} sheetName - Sheet tab name
 */
export function exportToExcel(data, fileName = 'export', sheetName = 'Sheet1') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return true;
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    return false;
  }
}

/**
 * Export a specialized Bank Transfer file for corporate accounts
 * 
 * @param {Array<Object>} payrollRows - Array of processed employee payroll records for a month
 * @param {string} bankName - Bank Name (e.g., Prime Bank, City Bank)
 * @param {string} paymentMonth - Format "YYYY-MM"
 */
export function exportBankTransferExcel(payrollRows, bankName = 'City Bank Ltd.', paymentMonth = 'June 2026') {
  try {
    const data = payrollRows.map((row, idx) => ({
      'Sl No.': idx + 1,
      'Employee Code': row.employeeCode,
      'Employee Name': row.name,
      'Designation': row.designation,
      'Department': row.department,
      'Bank Name': row.bankName || bankName,
      'Account Number': row.accountNo || 'N/A',
      'Net Salary (BDT)': row.netSalary,
      'Month': paymentMonth,
      'Signature/Remarks': ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths for better spacing
    const wscols = [
      { wch: 8 },  // Sl No
      { wch: 15 }, // Code
      { wch: 25 }, // Name
      { wch: 20 }, // Designation
      { wch: 15 }, // Department
      { wch: 20 }, // Bank Name
      { wch: 20 }, // Account No
      { wch: 18 }, // Net Salary
      { wch: 12 }, // Month
      { wch: 15 }  // Remarks
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank Advice');
    XLSX.writeFile(workbook, `ERP_for_U_Bank_Transfer_${paymentMonth.replace(/ /g, '_')}.xlsx`);
    return true;
  } catch (error) {
    console.error('Failed to export bank transfer sheet:', error);
    return false;
  }
}

/**
 * Export Tax Deductions and Calculations summary
 * 
 * @param {Array<Object>} taxSummaries - Computed tax objects
 * @param {string} taxYear - e.g., "2024-2025"
 */
export function exportTaxReportExcel(taxSummaries, taxYear = '2024-2025') {
  try {
    const data = taxSummaries.map((summary, idx) => ({
      'Sl No.': idx + 1,
      'Employee ID': summary.employeeCode,
      'Employee Name': summary.name,
      'TIN': summary.tin || 'N/A',
      'Tax Zone': summary.taxZone || 'N/A',
      'Tax Circle': summary.taxCircle || 'N/A',
      'Annual Gross Salary (BDT)': summary.annualGross,
      'Taxable Income (BDT)': summary.taxableIncome,
      'Gross Annual Tax (BDT)': summary.grossTax,
      'Investment Rebate (BDT)': summary.rebate,
      'Net Annual Tax (BDT)': summary.netTax,
      'Monthly Deducted Tax (BDT)': Math.round(summary.monthlyTaxDeduction)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Tax Summary FY ${taxYear}`);
    XLSX.writeFile(workbook, `ERP_for_U_Tax_Summary_FY_${taxYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Failed to export tax report:', error);
    return false;
  }
}
