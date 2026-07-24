/**
 * Utilidades de exportación: XLSX (via SheetJS) y PDF (via jspdf).
 */
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

function stringify(row: any, col: ExportColumn): string {
  const value = row[col.key];
  const formatted = col.format ? col.format(value) : value;
  if (formatted === null || formatted === undefined) return "";
  return String(formatted);
}

/** Exporta a XLSX real (Excel nativo, no CSV). */
export function exportToXlsx(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = "Datos",
): void {
  if (data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }
  const rows = data.map((r) => {
    const o: Record<string, any> = {};
    for (const c of columns) o[c.label] = stringify(r, c);
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto-ancho básico
  const cols = columns.map((c) => ({
    wch: Math.max(
      c.label.length + 2,
      ...data.map((r) => stringify(r, c).length + 1),
    ),
  }));
  (ws as any)["!cols"] = cols;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Exporta a PDF tabular con branding GEPETROL. */
export function exportToPdf(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  title: string,
): void {
  if (data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFillColor(0, 106, 91);
  doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("GEPETROL RRHH", 14, 11);
  doc.setFontSize(11);
  doc.text(title, 14, 18);
  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.label)],
    body: data.map((r) => columns.map((c) => stringify(r, c))),
    headStyles: { fillColor: [0, 106, 91] },
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2 },
  });
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generado el ${new Date().toLocaleString()} · ${data.length} registros`,
    14,
    200,
  );
  doc.save(`${filename}.pdf`);
}

/** Compat: mantiene firma antigua pero exporta XLSX real. */
export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string,
): void {
  exportToXlsx(data, columns, filename);
}

export function exportPayrollRunToExcel(
  runId: string,
  payslips: any[],
  filename?: string,
): void {
  exportToXlsx(
    payslips,
    PAYROLL_RUN_COLUMNS,
    filename || `nomina_${runId.slice(0, 8)}`,
  );
}

export function exportPayrollRunToPdf(
  payslips: any[],
  meta: { period: string; currency: string },
  filename: string,
): void {
  exportToPdf(
    payslips,
    PAYROLL_RUN_COLUMNS,
    filename,
    `Corrida de nómina ${meta.period}`,
  );
}

export const PAYROLL_RUN_COLUMNS: ExportColumn[] = [
  { key: "employee_code", label: "Cód. Empleado" },
  { key: "employee_name", label: "Empleado" },
  { key: "department", label: "Departamento" },
  { key: "gross", label: "Bruto", format: (v) => formatNumber(v) },
  { key: "deductions", label: "Descuentos", format: (v) => formatNumber(v) },
  { key: "net", label: "Neto", format: (v) => formatNumber(v) },
];

export function exportEmployeesAsExcel(employees: any[]): void {
  exportToXlsx(employees, EMPLOYEE_COLUMNS, "empleados");
}

export function exportEmployeesAsPdf(employees: any[]): void {
  exportToPdf(employees, EMPLOYEE_COLUMNS, "empleados", "Directorio de empleados");
}

const EMPLOYEE_COLUMNS: ExportColumn[] = [
  { key: "employee_code", label: "Código" },
  { key: "first_name", label: "Nombre" },
  { key: "last_name", label: "Apellidos" },
  { key: "email", label: "Email" },
  { key: "department_name", label: "Departamento" },
  { key: "position_title", label: "Puesto" },
  { key: "nationality", label: "Nacionalidad" },
  { key: "gender", label: "Género" },
  { key: "hire_date", label: "Fecha Ingreso", format: (v) => v ? new Date(v).toLocaleDateString() : "" },
  { key: "status", label: "Estado" },
];

export function exportLeaveRequestsAsExcel(requests: any[]): void {
  exportToXlsx(requests, LEAVE_COLUMNS, "solicitudes_vacaciones");
}

const LEAVE_COLUMNS: ExportColumn[] = [
  { key: "employee_name", label: "Empleado" },
  { key: "start_date", label: "Inicio" },
  { key: "end_date", label: "Fin" },
  { key: "days_requested", label: "Días" },
  { key: "leave_type", label: "Tipo" },
  { key: "status", label: "Estado" },
];

export function exportPerformanceReviewsAsExcel(reviews: any[]): void {
  exportToXlsx(reviews, PERFORMANCE_COLUMNS, "evaluaciones_desempeno");
}

const PERFORMANCE_COLUMNS: ExportColumn[] = [
  { key: "employee_name", label: "Empleado" },
  { key: "reviewer_name", label: "Evaluador" },
  { key: "overall_score", label: "Puntuación" },
  { key: "status", label: "Estado" },
];

function formatNumber(value: any): string {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDateForExport(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES");
}
