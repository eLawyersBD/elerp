const { jsPDF } = window.jspdf;

/**
 * Utility to convert numbers to English words (for payslips)
 */
function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += parseInt(n[1]) !== 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += parseInt(n[2]) !== 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += parseInt(n[3]) !== 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += parseInt(n[4]) !== 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += parseInt(n[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Taka Only' : 'Taka Only';
  return str.trim();
}

/**
 * Generates a PDF Payslip and triggers a download
 */
export function generatePayslipPDF(employee, payroll, monthName) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Borders & Branding
  doc.rect(5, 5, 200, 287); // Page border
  
  // Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Deep Navy Primary
  doc.text('ACCOUNTICA Cloud ERP', 105, 15, { align: 'center' });
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('House-12, Road-05, Banani, Dhaka-1213, Bangladesh', 105, 20, { align: 'center' });
  doc.text('Phone: +880-2-9884567 | Email: info@erpforu.com | Web: www.erpforu.com', 105, 24, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 51, 102);
  doc.line(10, 28, 200, 28);
  
  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 51, 102);
  doc.text(`PAYSLIP FOR THE MONTH OF ${monthName.toUpperCase()}`, 105, 36, { align: 'center' });

  // Employee Information Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(10, 42, 190, 32); // Info boundary
  
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  
  // Left Column
  doc.setFont('Helvetica', 'bold');
  doc.text('Employee Code:', 12, 48);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.employeeCode, 42, 48);

  doc.setFont('Helvetica', 'bold');
  doc.text('Name (English):', 12, 54);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.fullNameEnglish, 42, 54);

  doc.setFont('Helvetica', 'bold');
  doc.text('Designation:', 12, 60);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.designation, 42, 60);

  doc.setFont('Helvetica', 'bold');
  doc.text('Department:', 12, 66);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.department, 42, 66);

  doc.setFont('Helvetica', 'bold');
  doc.text('Joining Date:', 12, 72);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.joiningDate || 'N/A', 42, 72);

  // Right Column
  doc.setFont('Helvetica', 'bold');
  doc.text('Bank Name:', 110, 48);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.bankName || 'City Bank Ltd.', 140, 48);

  doc.setFont('Helvetica', 'bold');
  doc.text('Account No:', 110, 54);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.bankAccountNo || 'N/A', 140, 54);

  doc.setFont('Helvetica', 'bold');
  doc.text('TIN Number:', 110, 60);
  doc.setFont('Helvetica', 'normal');
  doc.text(employee.tin || 'N/A', 140, 60);

  doc.setFont('Helvetica', 'bold');
  doc.text('Paid Days:', 110, 66);
  doc.setFont('Helvetica', 'normal');
  doc.text(`${payroll.paidDays || 30} days`, 140, 66);

  doc.setFont('Helvetica', 'bold');
  doc.text('LWP Days:', 110, 72);
  doc.setFont('Helvetica', 'normal');
  doc.text(`${payroll.unpaidLeaveDays || 0} days`, 140, 72);

  // Earnings & Deductions Table Headers
  doc.setFillColor(240, 245, 250);
  doc.rect(10, 80, 95, 8, 'F');
  doc.rect(105, 80, 95, 8, 'F');
  doc.rect(10, 80, 95, 8);
  doc.rect(105, 80, 95, 8);
  
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('EARNINGS', 12, 85);
  doc.text('Amount (BDT)', 85, 85, { align: 'right' });
  doc.text('DEDUCTIONS', 107, 85);
  doc.text('Amount (BDT)', 180, 85, { align: 'right' });

  // Table Data Rows
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  const earnings = [
    { label: 'Basic Salary', val: payroll.basicSalary },
    { label: 'House Rent Allowance', val: payroll.houseRent },
    { label: 'Medical Allowance', val: payroll.medicalAllowance },
    { label: 'Conveyance Allowance', val: payroll.conveyanceAllowance },
    { label: 'Mobile Allowance', val: payroll.mobileAllowance },
    { label: 'Other Allowances', val: payroll.otherAllowances || 0 },
    { label: 'Overtime Allowance', val: payroll.overtimePay || 0 },
    { label: 'Bonus / Incentives', val: payroll.bonusPay || 0 }
  ];

  const deductions = [
    { label: 'TDS (Income Tax Deducted)', val: payroll.taxDeduction || 0 },
    { label: 'Provident Fund (Employer Contrib)', val: payroll.providentFund || 0 },
    { label: 'LWP Deduction', val: payroll.unpaidLeaveDeduction || 0 },
    { label: 'Advance/Loan Recovery', val: payroll.loanRecovery || 0 },
    { label: 'Other Deductions', val: payroll.otherDeductions || 0 }
  ];

  let y = 88;
  const maxRows = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxRows; i++) {
    doc.rect(10, y, 95, 8);
    doc.rect(105, y, 95, 8);

    if (earnings[i]) {
      doc.text(earnings[i].label, 12, y + 5);
      doc.text(Math.round(earnings[i].val).toLocaleString(), 85, y + 5, { align: 'right' });
    }
    if (deductions[i]) {
      doc.text(deductions[i].label, 107, y + 5);
      doc.text(Math.round(deductions[i].val).toLocaleString(), 180, y + 5, { align: 'right' });
    }
    y += 8;
  }

  // Totals Row
  doc.setFillColor(245, 245, 245);
  doc.rect(10, y, 95, 8, 'F');
  doc.rect(105, y, 95, 8, 'F');
  doc.rect(10, y, 95, 8);
  doc.rect(105, y, 95, 8);

  doc.setFont('Helvetica', 'bold');
  doc.text('Gross Earnings (A)', 12, y + 5);
  doc.text(Math.round(payroll.grossSalary).toLocaleString(), 85, y + 5, { align: 'right' });

  doc.text('Total Deductions (B)', 107, y + 5);
  doc.text(Math.round(payroll.totalDeductions).toLocaleString(), 180, y + 5, { align: 'right' });

  y += 8;

  // Net Pay Box
  doc.setFillColor(230, 240, 250);
  doc.rect(10, y + 4, 190, 10, 'F');
  doc.rect(10, y + 4, 190, 10);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.text('NET SALARY PAYABLE (A - B):', 12, y + 10.5);
  doc.text(`BDT ${Math.round(payroll.netSalary).toLocaleString()}/-`, 180, y + 10.5, { align: 'right' });

  // In Words
  y += 18;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text('In Words:', 10, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(numberToWords(Math.round(payroll.netSalary)), 28, y);

  // Signatures
  doc.setLineWidth(0.3);
  doc.setDrawColor(150, 150, 150);

  y += 35;
  doc.line(15, y, 65, y);
  doc.line(77, y, 127, y);
  doc.line(140, y, 190, y);

  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'bold');
  doc.text('Employee Signature', 40, y + 4, { align: 'center' });
  doc.text('Prepared By (HR)', 102, y + 4, { align: 'center' });
  doc.text('Authorized Signature', 165, y + 4, { align: 'center' });

  // Footer
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Note: This is a system-generated payslip and does not require a physical stamp unless specified.', 105, 275, { align: 'center' });

  doc.save(`Payslip_${employee.employeeCode}_${monthName.replace(/ /g, '_')}.pdf`);
}

/**
 * Generates a Bangladesh Income Tax Deduction / Clearance Certificate (Section 139)
 */
export function generateTaxCertificatePDF(employee, taxSummary, taxYear) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.rect(5, 5, 200, 287); // Border

  // Corporate Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 51, 102);
  doc.text('ACCOUNTICA Cloud ERP', 105, 18, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('House-12, Road-05, Banani, Dhaka-1213, Bangladesh', 105, 23, { align: 'center' });
  doc.text('Web: www.erpforu.com | Email: tax@erpforu.com', 105, 27, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 51, 102);
  doc.line(10, 31, 200, 31);

  // Certificate Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 51, 102);
  doc.text('TO WHOM IT MAY CONCERN', 105, 42, { align: 'center' });
  doc.text('CERTIFICATE OF INCOME TAX DEDUCTED FROM SALARY', 105, 48, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`Assessment Year: ${parseInt(taxYear.split('-')[0]) + 1}-${parseInt(taxYear.split('-')[1]) + 1} | Income Year: ${taxYear}`, 105, 54, { align: 'center' });

  // Body
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  
  let bodyY = 65;
  const bodyText = `This is to certify that ${employee.fullNameEnglish} is an employee of ACCOUNTICA Cloud ERP holding Employee Code ${employee.employeeCode}. He/She is registered under Tax Circle ${employee.taxCircle || 'N/A'}, Tax Zone ${employee.taxZone || 'N/A'} in Bangladesh and possesses National Identification Number (NID): ${employee.nid || 'N/A'} and Taxpayer's Identification Number (TIN): ${employee.tin || 'N/A'}.

During the Income Year ${taxYear}, salary particulars and income tax deducted at source under the provisions of the Income Tax Act 2023 are detailed below:`;

  const lines = doc.splitTextToSize(bodyText, 180);
  doc.text(lines, 15, bodyY);

  // Stats table
  bodyY += lines.length * 5 + 8;
  
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, bodyY, 180, 56);
  doc.line(15, bodyY + 8, 195, bodyY + 8);
  doc.line(15, bodyY + 16, 195, bodyY + 16);
  doc.line(15, bodyY + 24, 195, bodyY + 24);
  doc.line(15, bodyY + 32, 195, bodyY + 32);
  doc.line(15, bodyY + 40, 195, bodyY + 40);
  doc.line(15, bodyY + 48, 195, bodyY + 48);

  doc.line(125, bodyY, 125, bodyY + 56); // Column divider

  doc.setFont('Helvetica', 'bold');
  doc.text('Particulars', 18, bodyY + 5.5);
  doc.text('Amount (BDT)', 130, bodyY + 5.5);

  doc.setFont('Helvetica', 'normal');
  doc.text('1. Total Gross Salary (Basic, Allowances, Bonuses)', 18, bodyY + 13.5);
  doc.text(Math.round(taxSummary.annualGross).toLocaleString(), 130, bodyY + 13.5);

  doc.text('2. Consolidated Allowances Exemption (Section 76)', 18, bodyY + 21.5);
  doc.text(`(${Math.round(taxSummary.allowanceExemption).toLocaleString()})`, 130, bodyY + 21.5);

  doc.setFont('Helvetica', 'bold');
  doc.text('3. Net Annual Taxable Income (1 - 2)', 18, bodyY + 29.5);
  doc.text(Math.round(taxSummary.taxableIncome).toLocaleString(), 130, bodyY + 29.5);

  doc.setFont('Helvetica', 'normal');
  doc.text('4. Gross Tax Liability', 18, bodyY + 37.5);
  doc.text(Math.round(taxSummary.grossTax).toLocaleString(), 130, bodyY + 37.5);

  doc.text('5. Investment Tax Rebate (Section 78)', 18, bodyY + 45.5);
  doc.text(`(${Math.round(taxSummary.rebate).toLocaleString()})`, 130, bodyY + 45.5);

  doc.setFont('Helvetica', 'bold');
  doc.text('6. Net Tax Payable / Deducted at Source (TDS)', 18, bodyY + 53.5);
  doc.text(Math.round(taxSummary.netTax).toLocaleString(), 130, bodyY + 53.5);

  bodyY += 66;

  // In Words
  doc.setFont('Helvetica', 'bold');
  doc.text('Tax Deducted in Words:', 15, bodyY);
  doc.setFont('Helvetica', 'normal');
  doc.text(numberToWords(Math.round(taxSummary.netTax)), 57, bodyY);

  // Conclusion statement
  bodyY += 12;
  const conclusion = `The sum of BDT ${Math.round(taxSummary.netTax).toLocaleString()} has been deducted on a monthly basis from the employee's salary and deposited to the credit of the Government of the People's Republic of Bangladesh under the relevant treasury challans through Bank Transfer. 

We wish him/her success in all future endeavors.`;
  const conclusionLines = doc.splitTextToSize(conclusion, 180);
  doc.text(conclusionLines, 15, bodyY);

  // Signatures
  bodyY += conclusionLines.length * 5 + 30;
  doc.setLineWidth(0.3);
  doc.line(130, bodyY, 185, bodyY);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Manager, Human Resources & Accounts', 130, bodyY + 5);
  doc.setFont('Helvetica', 'normal');
  doc.text('ACCOUNTICA Cloud ERP', 130, bodyY + 9);

  // Date
  doc.setFont('Helvetica', 'bold');
  doc.text('Date of Issue:', 15, bodyY + 5);
  doc.setFont('Helvetica', 'normal');
  const today = new Date();
  doc.text(`${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`, 40, bodyY + 5);

  doc.save(`Tax_Certificate_${employee.employeeCode}_FY_${taxYear}.pdf`);
}
