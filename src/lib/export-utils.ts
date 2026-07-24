/**
 * Export utilities for generating Excel files from data
 * Uses a CSV-based approach compatible with Excel
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

/**
 * Export data as Excel file (CSV format)
 */
export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string
): void {
  if (data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  // Create CSV header
  const headers = columns.map((c) => `"${c.label}"`).join(",");

  // Create CSV rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value;
        // Escape quotes and wrap in quotes
        const escaped = String(formatted || "").replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",");
  });

  // Combine header and rows
  const csv = [headers, ...rows].join("\n");

  // Add BOM for proper UTF-8 encoding in Excel
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export payroll run details as Excel
 */
export function exportPayrollRunToExcel(
  runId: string,
  payslips: any[],
  filename?: string
): void {
  const columns: ExportColumn[] = [
    { key: "employee_code", label: "Código Empleado" },
    { key: "employee_name", label: "Nombre Empleado" },
    { key: "department", label: "Departamento" },
    { key: "position", label: "Puesto" },
    {
      key: "gross_amount",
      label: "Sueldo Bruto",
      format: (v) => formatNumber(v),
    },
    {
      key: "deductions_amount",
      label: "Descuentos",
      format: (v) => formatNumber(v),
    },
    {
      key: "net_amount",
      label: "Sueldo Neto",
      format: (v) => formatNumber(v),
    },
    { key: "status", label: "Estado" },
  ];

  exportToExcel(
    payslips,
    columns,
    filename || `nomina_${runId.slice(0, 8)}`
  );
}

/**
 * Export employee list as Excel
 */
export function exportEmployeesAsExcel(employees: any[]): void {
  const columns: ExportColumn[] = [
    { key: "employee_code", label: "Código" },
    { key: "first_name", label: "Nombre" },
    { key: "last_name", label: "Apellidos" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
    { key: "department", label: "Departamento" },
    { key: "position", label: "Puesto" },
    { key: "hire_date", label: "Fecha Ingreso" },
    { key: "status", label: "Estado" },
  ];

  exportToExcel(employees, columns, "empleados");
}

/**
 * Export leave requests as Excel
 */
export function exportLeaveRequestsAsExcel(requests: any[]): void {
  const columns: ExportColumn[] = [
    { key: "employee_name", label: "Empleado" },
    { key: "start_date", label: "Fecha Inicio" },
    { key: "end_date", label: "Fecha Fin" },
    {
      key: "duration",
      label: "Duración (días)",
      format: (v) => (v ? Math.floor(v) : 0),
    },
    { key: "leave_type", label: "Tipo Permiso" },
    { key: "status", label: "Estado" },
    { key: "approved_by", label: "Aprobado Por" },
  ];

  exportToExcel(requests, columns, "solicitudes_vacaciones");
}

/**
 * Export performance reviews as Excel
 */
export function exportPerformanceReviewsAsExcel(reviews: any[]): void {
  const columns: ExportColumn[] = [
    { key: "employee_name", label: "Empleado" },
    { key: "evaluator_name", label: "Evaluador" },
    { key: "period_start", label: "Período Inicio" },
    { key: "period_end", label: "Período Fin" },
    {
      key: "overall_rating",
      label: "Calificación",
      format: (v) => (v ? v.toFixed(2) : "N/A"),
    },
    { key: "status", label: "Estado" },
  ];

  exportToExcel(reviews, columns, "evaluaciones_desempenio");
}

/**
 * Format number as currency string
 */
function formatNumber(value: any): string {
  if (!value && value !== 0) return "";
  return Number(value).toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date for Excel export
 */
export function formatDateForExport(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO");
}
