import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSupabaseList, insertRow, updateRow, deleteRow } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/training")({
  head: () => ({
    meta: [
      { title: "Capacitación y Desarrollo · GEPETROL RRHH" },
      {
        name: "description",
        content: "Administración de programas de capacitación, cursos y certificaciones.",
      },
    ],
  }),
  component: () => (
    <RoleGuard allow={["admin", "hr"]}>
      <Page />
    </RoleGuard>
  ),
});

interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  category: "technical" | "soft_skills" | "compliance" | "development" | "other";
  instructor: string;
  start_date: string;
  end_date: string;
  cost: number;
  max_participants: number;
  status: "planned" | "active" | "completed" | "cancelled";
  location: string;
  created_at: string;
  created_by: string;
}

interface TrainingEnrollment {
  id: string;
  training_program_id: string;
  employee_id: string;
  enrollment_date: string;
  status: "enrolled" | "attended" | "no_show" | "dropped";
  attendance_hours: number;
  completion_date: string;
  score: number;
  created_at: string;
}

function Page() {
  const [activeTab, setActiveTab] = useState<"programs" | "enrollments">(
    "programs"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: programs, refetch: refetchPrograms } = useSupabaseList<
    TrainingProgram
  >("training_programs", {
    select: "*",
    orderBy: "start_date",
    descending: true,
  });

  const { data: enrollments, refetch: refetchEnrollments } = useSupabaseList<
    TrainingEnrollment
  >("training_enrollment", {
    select: "*",
    orderBy: "enrollment_date",
    descending: true,
  });

  const handleCreate = async (formData: any) => {
    try {
      const table =
        activeTab === "programs" ? "training_programs" : "training_enrollment";
      await insertRow(table, formData);

      if (activeTab === "programs") refetchPrograms();
      else refetchEnrollments();

      setShowNewDialog(false);
    } catch (error) {
      console.error("Error creating:", error);
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    try {
      const table =
        activeTab === "programs" ? "training_programs" : "training_enrollment";
      await updateRow(table, id, formData);

      if (activeTab === "programs") refetchPrograms();
      else refetchEnrollments();

      setEditingItem(null);
    } catch (error) {
      console.error("Error updating:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este registro?")) {
      return;
    }
    try {
      const table =
        activeTab === "programs" ? "training_programs" : "training_enrollment";
      await deleteRow(table, id);

      if (activeTab === "programs") refetchPrograms();
      else refetchEnrollments();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const filteredPrograms = programs?.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredEnrollments = enrollments?.filter((e) => {
    return e.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="training-container space-y-6 p-6">
      <div className="training-header">
        <h1 className="text-3xl font-bold">Capacitación y Desarrollo</h1>
        <p className="text-gray-600">
          Gestiona programas de capacitación y matriculación de empleados
        </p>
      </div>

      <div className="training-tabs flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("programs")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "programs"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Programas de Capacitación
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "enrollments"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Matriculaciones
        </button>
      </div>

      {activeTab === "programs" && (
        <div className="programs-section space-y-4">
          <div className="programs-controls flex gap-4 items-center">
            <div className="search-box flex items-center gap-2 flex-1 bg-white border rounded-lg px-3 py-2">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar programa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="planned">Planeado</option>
              <option value="active">Activo</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <button
              onClick={() => setShowNewDialog(true)}
              className="new-btn flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Nuevo Programa
            </button>
          </div>

          <div className="programs-list space-y-3">
            {filteredPrograms?.length === 0 ? (
              <div className="empty-state text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No hay programas de capacitación</p>
              </div>
            ) : (
              filteredPrograms?.map((program) => (
                <div
                  key={program.id}
                  className="program-card bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="program-header flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{program.name}</h3>
                      <p className="text-sm text-gray-600">
                        {program.description}
                      </p>
                    </div>
                    <div className="status-badge">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          program.status === "active"
                            ? "bg-blue-100 text-blue-800"
                            : program.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : program.status === "planned"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {program.status === "active"
                          ? "Activo"
                          : program.status === "completed"
                          ? "Completado"
                          : program.status === "planned"
                          ? "Planeado"
                          : "Cancelado"}
                      </span>
                    </div>
                  </div>

                  <div className="program-details grid grid-cols-3 gap-4 mb-4 py-3 border-t border-b text-sm">
                    <div>
                      <span className="text-gray-600">Categoría:</span>
                      <p className="font-medium">
                        {program.category.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Instructor:</span>
                      <p className="font-medium">{program.instructor}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Costo:</span>
                      <p className="font-medium">${program.cost}</p>
                    </div>
                  </div>

                  <div className="program-dates mb-4 text-sm text-gray-600">
                    <span className="font-medium">Fechas:</span>
                    <p>
                      {new Date(program.start_date).toLocaleDateString()} -{" "}
                      {program.end_date
                        ? new Date(program.end_date).toLocaleDateString()
                        : "Sin fecha final"}
                    </p>
                  </div>

                  <div className="program-actions flex gap-2">
                    <button
                      onClick={() => setEditingItem(program)}
                      className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="delete-btn flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition text-sm"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "enrollments" && (
        <div className="enrollments-section space-y-4">
          <div className="enrollments-controls flex gap-4 items-center">
            <div className="search-box flex items-center gap-2 flex-1 bg-white border rounded-lg px-3 py-2">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar matriculación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none"
              />
            </div>
            <button
              onClick={() => setShowNewDialog(true)}
              className="new-btn flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Nueva Matriculación
            </button>
          </div>

          <div className="enrollments-list space-y-3">
            {filteredEnrollments?.length === 0 ? (
              <div className="empty-state text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No hay matriculaciones</p>
              </div>
            ) : (
              filteredEnrollments?.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="enrollment-card bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="enrollment-header flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        Empleado: {enrollment.employee_id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Programa: {enrollment.training_program_id}
                      </p>
                    </div>
                    <div className="status-badge">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          enrollment.status === "attended"
                            ? "bg-green-100 text-green-800"
                            : enrollment.status === "enrolled"
                            ? "bg-blue-100 text-blue-800"
                            : enrollment.status === "no_show"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {enrollment.status === "attended"
                          ? "Asistió"
                          : enrollment.status === "enrolled"
                          ? "Matriculado"
                          : enrollment.status === "no_show"
                          ? "No asistió"
                          : "Abandonó"}
                      </span>
                    </div>
                  </div>

                  <div className="enrollment-details grid grid-cols-3 gap-4 mb-4 py-3 border-t border-b text-sm">
                    <div>
                      <span className="text-gray-600">Horas:</span>
                      <p className="font-medium">{enrollment.attendance_hours}h</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Calificación:</span>
                      <p className="font-medium">
                        {enrollment.score ? enrollment.score + "/5" : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Inscripción:</span>
                      <p className="font-medium">
                        {new Date(enrollment.enrollment_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="enrollment-actions flex gap-2">
                    <button
                      onClick={() => setEditingItem(enrollment)}
                      className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(enrollment.id)}
                      className="delete-btn flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition text-sm"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showNewDialog && (
        <TrainingDialog
          tab={activeTab}
          programs={programs}
          onClose={() => setShowNewDialog(false)}
          onSave={handleCreate}
        />
      )}

      {editingItem && (
        <TrainingDialog
          tab={activeTab}
          item={editingItem}
          programs={programs}
          onClose={() => setEditingItem(null)}
          onSave={(data) => handleUpdate(editingItem.id, data)}
        />
      )}
    </div>
  );
}

function TrainingDialog({
  tab,
  item,
  programs,
  onClose,
  onSave,
}: {
  tab: string;
  item?: any;
  programs?: TrainingProgram[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState<any>(
    item ||
      (tab === "programs"
        ? {
            name: "",
            description: "",
            category: "technical",
            instructor: "",
            start_date: new Date().toISOString().split("T")[0],
            cost: 0,
            max_participants: 0,
            status: "planned",
            location: "",
          }
        : {
            training_program_id: programs?.[0]?.id || "",
            employee_id: "",
            status: "enrolled",
            attendance_hours: 0,
            score: 0,
          })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="dialog-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="dialog-content bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="dialog-header sticky top-0 flex justify-between items-center p-4 border-b bg-white">
          <h2 className="text-lg font-semibold">
            {item ? "Editar" : "Nuevo"}{" "}
            {tab === "programs" ? "Programa" : "Matriculación"}
          </h2>
          <button
            onClick={onClose}
            className="close-btn text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body p-4 space-y-4">
          {tab === "programs" && (
            <>
              <div className="form-group">
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="textarea-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="form-row grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category || "technical"}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="technical">Técnica</option>
                    <option value="soft_skills">Soft Skills</option>
                    <option value="compliance">Cumplimiento</option>
                    <option value="development">Desarrollo</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.status || "planned"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="planned">Planeado</option>
                    <option value="active">Activo</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Instructor
                </label>
                <input
                  type="text"
                  value={formData.instructor || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, instructor: e.target.value })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="form-row grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="form-row grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Costo
                  </label>
                  <input
                    type="number"
                    value={formData.cost || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost: parseFloat(e.target.value),
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Máx. Participantes
                  </label>
                  <input
                    type="number"
                    value={formData.max_participants || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_participants: parseInt(e.target.value),
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {tab === "enrollments" && (
            <>
              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Programa
                </label>
                <select
                  value={formData.training_program_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      training_program_id: e.target.value,
                    })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {programs?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  ID Empleado
                </label>
                <input
                  type="text"
                  value={formData.employee_id || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, employee_id: e.target.value })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={formData.status || "enrolled"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="enrolled">Matriculado</option>
                  <option value="attended">Asistió</option>
                  <option value="no_show">No asistió</option>
                  <option value="dropped">Abandonó</option>
                </select>
              </div>

              <div className="form-row grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Horas Asistidas
                  </label>
                  <input
                    type="number"
                    value={formData.attendance_hours || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attendance_hours: parseFloat(e.target.value),
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Calificación
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.score || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        score: parseFloat(e.target.value),
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div className="dialog-actions flex gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {item ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
