import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PermitInput = {
  request: {
    id: string;
    start_date: string;
    end_date: string;
    days_requested: number | null;
    reason: string | null;
    status: string;
    decided_at?: string | null;
  };
  employee: { first_name?: string; last_name?: string; employee_code?: string | null; national_id?: string | null; department?: string | null } | null;
  leaveType: { name?: string } | null;
  decision: "approved" | "rejected";
  approver?: string | null;
  auditHash?: string | null;
};

function shortHash(v?: string | null) {
  return v ? `${v.slice(0, 12)}…${v.slice(-8)}` : "-";
}

export function generatePermitPDF({ request, employee, leaveType, decision, approver, auditHash }: PermitInput) {
  const doc = new jsPDF();
  const green: [number, number, number] = decision === "approved" ? [0, 106, 91] : [180, 60, 60];
  const title = decision === "approved" ? "AUTORIZACIÓN DE PERMISO" : "DENEGACIÓN DE PERMISO";

  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("GEPETROL", 14, 14);
  doc.setFontSize(10);
  doc.text("Dirección de Recursos Humanos", 14, 20);
  doc.setFontSize(13);
  doc.text(title, 196, 18, { align: "right" });

  const empName = employee ? `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() : "-";
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  let y = 42;
  doc.text(`Documento nº: ${request.id.slice(0, 8).toUpperCase()}`, 14, y);
  doc.text(`Fecha emisión: ${new Date().toLocaleDateString()}`, 130, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    body: [
      ["Empleado", empName],
      ["Código", employee?.employee_code ?? "-"],
      ["DNI", employee?.national_id ?? "-"],
      ["Departamento", employee?.department ?? "-"],
      ["Tipo de permiso", leaveType?.name ?? "-"],
      ["Fecha inicio", new Date(request.start_date).toLocaleDateString()],
      ["Fecha fin", new Date(request.end_date).toLocaleDateString()],
      ["Días", String(request.days_requested ?? "-")],
      ["Motivo", request.reason ?? "-"],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55, fillColor: [240, 240, 240] } },
  });

  const afterY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setTextColor(...green);
  const decisionText = decision === "approved"
    ? "Por la presente se AUTORIZA el permiso solicitado en las fechas indicadas."
    : "Por la presente se DENIEGA la solicitud de permiso en las fechas indicadas.";
  doc.text(decisionText, 14, afterY, { maxWidth: 180 });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.text(`Decidido el: ${request.decided_at ? new Date(request.decided_at).toLocaleString() : new Date().toLocaleString()}`, 14, afterY + 12);
  doc.text(`Aprobador / Firmante: ${approver ?? "RRHH"}`, 14, afterY + 18);

  // Firma / sello
  doc.setDrawColor(...green);
  doc.setLineWidth(0.5);
  doc.rect(130, afterY + 20, 60, 30);
  doc.setFontSize(8);
  doc.setTextColor(...green);
  doc.text("Sello digital RRHH", 160, afterY + 30, { align: "center" });
  doc.text("GEPETROL", 160, afterY + 36, { align: "center" });
  doc.setFontSize(6);
  doc.text(shortHash(auditHash), 160, afterY + 42, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Hash auditable: ${auditHash ?? "pendiente"}`, 14, 285);
  doc.text(`Documento firmado digitalmente · Verificable en el sistema RRHH GEPETROL`, 14, 289);

  doc.save(`permiso-${decision}-${empName.replace(/\s+/g, "_")}-${(auditHash ?? request.id).slice(0, 8)}.pdf`);
}
