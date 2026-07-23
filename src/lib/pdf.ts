import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/format";

type PayslipInput = {
  payslip: { id: string; gross: number; net: number; deductions: number; currency: string; audit_hash?: string | null };
  employee: { first_name?: string; last_name?: string; employee_code?: string | null; national_id?: string | null } | null;
  run: { period_start?: string; period_end?: string; pay_date?: string | null } | null;
  items: Array<{
    base_amount: number | null;
    quantity: number | null;
    amount: number;
    payroll_concepts: { code: string; name: string; kind: string } | null;
  }>;
  auditHash?: string | null;
};

function shortHash(value?: string | null) {
  return value ? `${value.slice(0, 12)}...${value.slice(-8)}` : "-";
}

export function generatePayslipPDF({ payslip, employee, run, items, auditHash }: PayslipInput) {
  const doc = new jsPDF();
  const currency = payslip.currency;
  const resolvedHash = auditHash ?? payslip.audit_hash ?? null;

  doc.setFillColor(0, 106, 91);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("GEPETROL", 14, 14);
  doc.setFontSize(10);
  doc.text("Guinea Ecuatorial de Petroleos", 14, 20);
  doc.setFontSize(14);
  doc.text("Recibo de Nomina", 196, 18, { align: "right" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  let y = 40;
  const empName = employee ? `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() : "-";
  doc.text(`Empleado: ${empName}`, 14, y);
  doc.text(`Codigo: ${employee?.employee_code ?? "-"}`, 120, y);
  y += 6;
  doc.text(`DNI: ${employee?.national_id ?? "-"}`, 14, y);
  if (run) {
    doc.text(
      `Periodo: ${run.period_start ? new Date(run.period_start).toLocaleDateString() : "-"} - ${run.period_end ? new Date(run.period_end).toLocaleDateString() : "-"}`,
      120,
      y,
    );
  }
  y += 6;
  if (run?.pay_date) {
    doc.text(`Fecha de pago: ${new Date(run.pay_date).toLocaleDateString()}`, 14, y);
    y += 6;
  }
  doc.setFontSize(8);
  doc.setTextColor(0, 106, 91);
  doc.text(`Hash auditable: ${shortHash(resolvedHash)}`, 14, y);
  y += 6;

  const earnings = items.filter((i) => i.payroll_concepts?.kind === "earning" || i.payroll_concepts?.kind === "bonus");
  const deductions = items.filter((i) => i.payroll_concepts?.kind === "deduction");

  autoTable(doc, {
    startY: y + 4,
    head: [["Codigo", "Concepto", "Base", "Cant.", "Importe"]],
    body: earnings.map((i) => [
      i.payroll_concepts?.code ?? "",
      i.payroll_concepts?.name ?? "",
      i.base_amount != null ? formatCurrency(i.base_amount, currency) : "-",
      i.quantity ?? "-",
      formatCurrency(i.amount, currency),
    ]),
    headStyles: { fillColor: [0, 168, 143] },
    theme: "striped",
    didDrawPage: (d) => {
      doc.setFontSize(11);
      doc.setTextColor(0, 106, 91);
      doc.text("Percepciones", 14, d.cursor?.y ? d.cursor.y - 4 : y + 2);
    },
  });

  const afterEarn = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: afterEarn,
    head: [["Codigo", "Concepto", "Base", "Cant.", "Importe"]],
    body: deductions.map((i) => [
      i.payroll_concepts?.code ?? "",
      i.payroll_concepts?.name ?? "",
      i.base_amount != null ? formatCurrency(i.base_amount, currency) : "-",
      i.quantity ?? "-",
      formatCurrency(i.amount, currency),
    ]),
    headStyles: { fillColor: [180, 60, 60] },
    theme: "striped",
    didDrawPage: (d) => {
      doc.setFontSize(11);
      doc.setTextColor(180, 60, 60);
      doc.text("Deducciones", 14, d.cursor?.y ? d.cursor.y - 4 : afterEarn - 4);
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(`Bruto: ${formatCurrency(payslip.gross, currency)}`, 130, finalY);
  doc.text(`Deducciones: ${formatCurrency(payslip.deductions, currency)}`, 130, finalY + 6);
  doc.setFontSize(13);
  doc.setTextColor(0, 106, 91);
  doc.text(`NETO: ${formatCurrency(payslip.net, currency)}`, 130, finalY + 14);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado el ${new Date().toLocaleString()} · ID ${payslip.id} · HASH ${resolvedHash ?? "pendiente"}`, 14, 285);

  doc.save(`recibo-${empName.replace(/\s+/g, "_")}-${(resolvedHash ?? payslip.id).slice(0, 12)}.pdf`);
}

export function generateSimpleReport(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  auditHash?: string | null,
) {
  const doc = new jsPDF();
  doc.setFillColor(0, 106, 91);
  doc.rect(0, 0, 210, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("GEPETROL RRHH", 14, 12);
  doc.setFontSize(11);
  doc.text(title, 14, 19);
  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: rows,
    headStyles: { fillColor: [0, 106, 91] },
    theme: "striped",
  });
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado el ${new Date().toLocaleString()} · HASH ${auditHash ?? "pendiente"}`, 14, 285);
  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}-${(auditHash ?? "sin-hash").slice(0, 12)}.pdf`);
}
