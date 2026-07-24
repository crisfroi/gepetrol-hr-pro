// @ts-nocheck
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

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Evaluación de Desempeño · GEPETROL RRHH" },
      {
        name: "description",
        content: "Ciclos de evaluación, objetivos y feedback 360°.",
      },
    ],
  }),
  component: () => (
    <RoleGuard allow={["admin", "hr"]}>
      <Page />
    </RoleGuard>
  ),
});

interface PerformanceReview {
  id: string;
  employee_id: string;
  evaluator_id: string;
  period_start: string;
  period_end: string;
  overall_rating: number;
  comments: string;
  status: "draft" | "submitted" | "approved" | "archived";
  created_at: string;
  submitted_at: string;
  approved_at: string;
}

interface PerformanceCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: "technical" | "behavioral" | "productivity" | "compliance";
  active: boolean;
  created_at: string;
}

interface ReviewFeedback {
  id: string;
  review_id: string;
  criterion_id: string;
  rating: number;
  notes: string;
  created_at: string;
}

function Page() {
  const [activeTab, setActiveTab] = useState<"reviews" | "criteria">("reviews");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: reviews, refetch: refetchReviews } = useSupabaseList<
    PerformanceReview
  >("performance_reviews", {
    select: "*",
    orderBy: "created_at",
    descending: true,
  });

  const { data: criteria, refetch: refetchCriteria } = useSupabaseList<
    PerformanceCriteria
  >("performance_criteria", {
    select: "*",
    orderBy: "created_at",
    descending: true,
  });

  const handleCreate = async (formData: any) => {
    try {
      const table =
        activeTab === "reviews" ? "performance_reviews" : "performance_criteria";
      await insertRow(table, formData);

      if (activeTab === "reviews") refetchReviews();
      else refetchCriteria();

      setShowNewDialog(false);
    } catch (error) {
      console.error("Error creating:", error);
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    try {
      const table =
        activeTab === "reviews" ? "performance_reviews" : "performance_criteria";
      await updateRow(table, id, formData);

      if (activeTab === "reviews") refetchReviews();
      else refetchCriteria();

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
        activeTab === "reviews" ? "performance_reviews" : "performance_criteria";
      await deleteRow(table, id);

      if (activeTab === "reviews") refetchReviews();
      else refetchCriteria();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const filteredReviews = reviews?.filter((r) => {
    const matchesSearch =
      r.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.comments?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredCriteria = criteria?.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="performance-container space-y-6 p-6">
      <div className="performance-header">
        <h1 className="text-3xl font-bold">Evaluación de Desempeño</h1>
        <p className="text-gray-600">
          Gestiona evaluaciones, criterios y feedback 360°
        </p>
      </div>

      <div className="performance-tabs flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("reviews")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "reviews"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Evaluaciones
        </button>
        <button
          onClick={() => setActiveTab("criteria")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "criteria"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Criterios
        </button>
      </div>

      {activeTab === "reviews" && (
        <div className="reviews-section space-y-4">
          <div className="reviews-controls flex gap-4 items-center">
            <div className="search-box flex items-center gap-2 flex-1 bg-white border rounded-lg px-3 py-2">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar evaluación..."
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
              <option value="draft">Borrador</option>
              <option value="submitted">Enviada</option>
              <option value="approved">Aprobada</option>
              <option value="archived">Archivada</option>
            </select>
            <button
              onClick={() => setShowNewDialog(true)}
              className="new-btn flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Nueva Evaluación
            </button>
          </div>

          <div className="reviews-list space-y-3">
            {filteredReviews?.length === 0 ? (
              <div className="empty-state text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No hay evaluaciones</p>
              </div>
            ) : (
              filteredReviews?.map((review) => (
                <div
                  key={review.id}
                  className="review-card bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="review-header flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        Empleado: {review.employee_id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Evaluador: {review.evaluator_id}
                      </p>
                    </div>
                    <div className="status-badge">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          review.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : review.status === "submitted"
                            ? "bg-blue-100 text-blue-800"
                            : review.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {review.status === "approved"
                          ? "Aprobada"
                          : review.status === "submitted"
                          ? "Enviada"
                          : review.status === "draft"
                          ? "Borrador"
                          : "Archivada"}
                      </span>
                    </div>
                  </div>

                  <div className="review-rating mb-3 py-3 border-t border-b">
                    <span className="text-gray-600">Calificación General:</span>
                    <p className="font-bold text-2xl text-blue-600">
                      {review.overall_rating.toFixed(1)}/5
                    </p>
                  </div>

                  {review.comments && (
                    <div className="review-comments mb-4 p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Comentarios:</span>
                      <p className="text-sm mt-1">{review.comments}</p>
                    </div>
                  )}

                  <div className="review-period mb-3 text-sm text-gray-600">
                    <span className="font-medium">Período:</span>
                    <p>
                      {new Date(review.period_start).toLocaleDateString()} -{" "}
                      {new Date(review.period_end).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="review-actions flex gap-2">
                    <button
                      onClick={() => setEditingItem(review)}
                      className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
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

      {activeTab === "criteria" && (
        <div className="criteria-section space-y-4">
          <div className="criteria-controls flex gap-4 items-center">
            <div className="search-box flex items-center gap-2 flex-1 bg-white border rounded-lg px-3 py-2">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar criterio..."
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
              Nuevo Criterio
            </button>
          </div>

          <div className="criteria-list space-y-3">
            {filteredCriteria?.length === 0 ? (
              <div className="empty-state text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No hay criterios de evaluación</p>
              </div>
            ) : (
              filteredCriteria?.map((criterion) => (
                <div
                  key={criterion.id}
                  className="criterion-card bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="criterion-header flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{criterion.name}</h3>
                      <p className="text-sm text-gray-600">
                        {criterion.description}
                      </p>
                    </div>
                    <div className="status-badge">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          criterion.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {criterion.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  <div className="criterion-details grid grid-cols-2 gap-4 mb-4 py-3 border-t border-b text-sm">
                    <div>
                      <span className="text-gray-600">Categoría:</span>
                      <p className="font-medium">
                        {criterion.category.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Peso:</span>
                      <p className="font-medium">{criterion.weight}%</p>
                    </div>
                  </div>

                  <div className="criterion-actions flex gap-2">
                    <button
                      onClick={() => setEditingItem(criterion)}
                      className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(criterion.id)}
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
        <PerformanceDialog
          tab={activeTab}
          onClose={() => setShowNewDialog(false)}
          onSave={handleCreate}
        />
      )}

      {editingItem && (
        <PerformanceDialog
          tab={activeTab}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(data) => handleUpdate(editingItem.id, data)}
        />
      )}
    </div>
  );
}

function PerformanceDialog({
  tab,
  item,
  onClose,
  onSave,
}: {
  tab: string;
  item?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState<any>(
    item ||
      (tab === "reviews"
        ? {
            employee_id: "",
            evaluator_id: "",
            period_start: new Date().toISOString().split("T")[0],
            period_end: new Date().toISOString().split("T")[0],
            overall_rating: 3,
            comments: "",
            status: "draft",
          }
        : {
            name: "",
            description: "",
            weight: 50,
            category: "technical",
            active: true,
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
            {item ? "Editar" : "Nueva"}{" "}
            {tab === "reviews" ? "Evaluación" : "Criterio"}
          </h2>
          <button
            onClick={onClose}
            className="close-btn text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body p-4 space-y-4">
          {tab === "reviews" && (
            <>
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
                <label className="block text-sm font-medium mb-1">
                  ID Evaluador
                </label>
                <input
                  type="text"
                  value={formData.evaluator_id || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, evaluator_id: e.target.value })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="form-row grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={formData.period_start || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period_start: e.target.value,
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={formData.period_end || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, period_end: e.target.value })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Calificación (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.overall_rating || 3}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overall_rating: parseFloat(e.target.value),
                    })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Estado
                </label>
                <select
                  value={formData.status || "draft"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Borrador</option>
                  <option value="submitted">Enviada</option>
                  <option value="approved">Aprobada</option>
                  <option value="archived">Archivada</option>
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Comentarios
                </label>
                <textarea
                  value={formData.comments || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                  className="textarea-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </>
          )}

          {tab === "criteria" && (
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
                    <option value="behavioral">Comportamiento</option>
                    <option value="productivity">Productividad</option>
                    <option value="compliance">Cumplimiento</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Peso (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.weight || 50}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight: parseFloat(e.target.value),
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="form-group flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active || false}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="checkbox-field"
                />
                <label htmlFor="active" className="text-sm font-medium">
                  Activo
                </label>
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
