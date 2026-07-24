/**
 * Enhanced PDF Generation for GEPETROL RRHH
 * Generates professional payslip PDFs with logo and proper formatting
 */

export interface PayslipData {
  id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  position: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  deductions_amount: number;
  net_amount: number;
  currency: string;
  details?: Record<string, number>;
}

/**
 * Generate a payslip PDF as HTML string
 * This creates an HTML template that can be printed or converted to PDF
 */
export function generatePayslipHTML(payslip: PayslipData): string {
  const logoUrl = "/LOGO GEP.webp";
  const now = new Date();
  const formatDate = (date: string) => new Date(date).toLocaleDateString("es-CO");
  const formatCurrency = (value: number) =>
    `${payslip.currency} ${value.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;

  // Determine deduction items
  const deductionDetails = payslip.details
    ? Object.entries(payslip.details)
        .filter(([key]) => key.includes("deduction"))
        .map(([, value]) => value)
    : [];

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Nómina - ${payslip.employee_code}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    
    .page {
      background: white;
      max-width: 8.5in;
      height: 11in;
      margin: 0 auto;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 20px;
    }
    
    .logo {
      max-height: 60px;
      max-width: 150px;
    }
    
    .header-info {
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0;
      color: #1a1a1a;
    }
    
    .employee-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      font-size: 13px;
    }
    
    .field {
      margin-bottom: 8px;
    }
    
    .field-label {
      color: #666;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    
    .field-value {
      font-weight: 500;
      color: #1a1a1a;
    }
    
    .period-info {
      background: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #0066cc;
      margin-bottom: 25px;
    }
    
    .period-info .field {
      display: inline-block;
      margin-right: 30px;
      margin-bottom: 0;
    }
    
    .earnings-section,
    .deductions-section {
      margin-bottom: 20px;
    }
    
    .section-title {
      font-size: 12px;
      font-weight: bold;
      background: #e8f0ff;
      padding: 8px 12px;
      margin-bottom: 10px;
      border-left: 3px solid #0066cc;
      color: #0066cc;
    }
    
    .deductions-section .section-title {
      background: #ffe8e8;
      border-left-color: #d32f2f;
      color: #d32f2f;
    }
    
    .line-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      font-size: 12px;
      border-bottom: 1px dotted #e0e0e0;
    }
    
    .line-item:last-child {
      border-bottom: none;
    }
    
    .line-label {
      color: #555;
    }
    
    .line-amount {
      text-align: right;
      font-weight: 500;
      min-width: 80px;
    }
    
    .totals-section {
      margin-top: 20px;
      padding: 15px;
      border: 2px solid #0066cc;
      border-radius: 4px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 13px;
    }
    
    .total-row.gross {
      font-weight: 600;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .total-row.deductions {
      color: #d32f2f;
      font-weight: 600;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .total-row.net {
      font-size: 16px;
      font-weight: bold;
      color: #2e7d32;
      margin-top: 5px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
    
    .audit-stamp {
      position: absolute;
      bottom: 20px;
      right: 40px;
      font-size: 9px;
      color: #ccc;
      text-align: right;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .page {
        box-shadow: none;
        margin: 0;
        max-width: 100%;
        height: auto;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img src="${logoUrl}" alt="GEPETROL" class="logo" onerror="this.style.display='none'">
      <div class="header-info">
        <div><strong>RECIBO DE NÓMINA</strong></div>
        <div>Fecha: ${now.toLocaleDateString("es-CO")}</div>
      </div>
    </div>
    
    <div class="title">COMPROBANTE DE PAGO</div>
    
    <div class="employee-section">
      <div>
        <div class="field">
          <div class="field-label">Código Empleado</div>
          <div class="field-value">${payslip.employee_code}</div>
        </div>
        <div class="field">
          <div class="field-label">Nombre</div>
          <div class="field-value">${payslip.employee_name}</div>
        </div>
        <div class="field">
          <div class="field-label">Departamento</div>
          <div class="field-value">${payslip.department}</div>
        </div>
      </div>
      <div>
        <div class="field">
          <div class="field-label">Puesto</div>
          <div class="field-value">${payslip.position}</div>
        </div>
      </div>
    </div>
    
    <div class="period-info">
      <div class="field">
        <div class="field-label">Período de Pago</div>
        <div class="field-value">${formatDate(payslip.period_start)} al ${formatDate(payslip.period_end)}</div>
      </div>
    </div>
    
    <div class="earnings-section">
      <div class="section-title">PERCEPCIONES</div>
      <div class="line-item">
        <span class="line-label">Salario Base</span>
        <span class="line-amount">${formatCurrency(payslip.gross_amount)}</span>
      </div>
    </div>
    
    <div class="deductions-section">
      <div class="section-title">DEDUCCIONES</div>
      ${deductionDetails.length > 0
        ? deductionDetails
            .map(
              (amount, idx) => `
        <div class="line-item">
          <span class="line-label">Descuento ${idx + 1}</span>
          <span class="line-amount">-${formatCurrency(amount)}</span>
        </div>
      `
            )
            .join("")
        : `
        <div class="line-item">
          <span class="line-label">Total Descuentos</span>
          <span class="line-amount">-${formatCurrency(payslip.deductions_amount)}</span>
        </div>
      `}
    </div>
    
    <div class="totals-section">
      <div class="total-row gross">
        <span>Sueldo Bruto:</span>
        <span>${formatCurrency(payslip.gross_amount)}</span>
      </div>
      <div class="total-row deductions">
        <span>Descuentos:</span>
        <span>-${formatCurrency(payslip.deductions_amount)}</span>
      </div>
      <div class="total-row net">
        <span>SUELDO NETO A RECIBIR:</span>
        <span>${formatCurrency(payslip.net_amount)}</span>
      </div>
    </div>
    
    <div class="footer">
      <p>Este comprobante de pago es válido como recibo de salario. Conserva este documento para tus registros.</p>
      <p>GEPETROL - Recursos Humanos | ${now.getFullYear()}</p>
    </div>
    
    <div class="audit-stamp">
      ID: ${payslip.id.slice(0, 8)}<br>
      Impreso: ${now.toLocaleTimeString("es-CO")}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate PDF using the browser's print functionality
 * Opens print dialog with payslip
 */
export function printPayslip(payslip: PayslipData): void {
  const html = generatePayslipHTML(payslip);
  const printWindow = window.open("", "", "width=900,height=1000");

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

/**
 * Download payslip as HTML file (can be opened and printed later)
 */
export function downloadPayslipHTML(payslip: PayslipData): void {
  const html = generatePayslipHTML(payslip);
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `recibo_${payslip.employee_code}.html`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open payslip in new tab for preview/print
 */
export function previewPayslip(payslip: PayslipData): void {
  const html = generatePayslipHTML(payslip);
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
