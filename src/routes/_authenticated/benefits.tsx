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

export const Route = createFileRoute("/_authenticated/benefits")({
  head: () => ({
    meta: [
      { title: "Beneficios y Compensaciones · GEPETROL RRHH" },
      {
        name: "description",
        content:
          "Administración de beneficios, seguros y compensaciones variables.",
      },
    ],
  }),
  component: () => (
    <RoleGuard allow={["admin", "hr"]}>
      <Page />
    </RoleGuard>
  ),
});

interface BenefitType {
  id: string;
  name: string;
  category: "health" | "retirement" | "life_insurance" | "disability" | "other";
  description: string;
  active: boolean;
  created_at: string;
}

interface BenefitPolicy {
  id: string;
  benefit_type_id: string;
  name: string;
  employee_cost: number;
  employer_cost: number;
  coverage_description: string;
  coverage_amount: number;
  deductible: number;
  effective_from: string;
  effective_to: string;
  active: boolean;
  created_at: string;
}

interface EmployeeBenefit {
  id: string;
  employee_id: string;
  benefit_type_id: string;
  benefit_policy_id: string;
  effective_from: string;
  effective_to: string;
  status: "active" | "inactive" | "suspended";
  coverage_level: string;
  enrollment_date: string;
  created_at: string;
}

function Page() {
  const [activeTab, setActiveTab] = useState<"types" | "policies" | "assignments">(
    "types"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: benefitTypes, refetch: refetchTypes } = useSupabaseList<
    BenefitType
  >("benefit_types", {
    select: "*",
    orderBy: "created_at",
    descending: true,
  });

  const { data: policies, refetch: refetchPolicies } = useSupabaseList<
    BenefitPolicy
  >("benefit_policies", {
    select: "*",
    orderBy: "created_at",
    descending: true,
  });

  const { data: assignments, refetch: refetchAssignments } = useSupabaseList<
    EmployeeBenefit
  >("employee_benefits", {
    select: "*",
    orderBy: "created_at",
    descending: true,
  });

  const handleCreate = async (formData: any) => {
    try {
      const table =
        activeTab === "types"
          ? "benefit_types"
          : activeTab === "policies"
          ? "benefit_policies"
          : "employee_benefits";
      await insertRow(table, formData);
      
      if (activeTab === "types") refetchTypes();
      else if (activeTab === "policies") refetchPolicies();
      else refetchAssignments();
      
      setShowNewDialog(false);
    } catch (error) {
      console.error("Error creating:", error);
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    try {
      const table =
        activeTab === "types"
          ? "benefit_types"
          : activeTab === "policies"
          ? "benefit_policies"
          : "employee_benefits";
      await updateRow(table, id, formData);
      
      if (activeTab === "types") refetchTypes();
      else if (activeTab === "policies") refetchPolicies();
      else refetchAssignments();
      
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
        activeTab === "types"
          ? "benefit_types"
          : activeTab === "policies"
          ? "benefit_policies"
          : "employee_benefits";
      await deleteRow(table, id);
      
      if (activeTab === "types") refetchTypes();
      else if (activeTab === "policies") refetchPolicies();
      else refetchAssignments();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const filteredData = (
    activeTab === "types"
      ? benefitTypes
      : activeTab === "policies"
      ? policies
      : assignments
  )?.filter((item: any) => {
    const searchable = [item.name, item.description, item.category].join(" ");
    return searchable.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="benefits-container space-y-6 p-6">
      <div className="benefits-header">
        <h1 className="text-3xl font-bold">Beneficios y Compensaciones</h1>
        <p className="text-gray-600">
          Administra beneficios, pólizas y asignaciones
        </p>
      </div>

      <div className="benefits-tabs flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("types")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "types"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Tipos de Beneficio
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "policies"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Pólizas
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "assignments"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Asignaciones
        </button>
      </div>

      <div className="benefits-controls space-y-4">
        <div className="controls-row flex gap-4 items-center">
          <div className="search-box flex items-center gap-2 flex-1 bg-white border rounded-lg px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
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
            Nuevo
          </button>
        </div>
      </div>

      {activeTab === "types" && (
        <div className="types-list space-y-3">
          {filteredData?.length === 0 ? (
            <div className="empty-state text-center py-8 text-gray-500">
              <AlertCircle className="mx-auto mb-2" size={32} />
              <p>No hay tipos de beneficio</p>
            </div>
          ) : (
            filteredData?.map((type: BenefitType) => (
              <div
                key={type.id}
                className="list-item bg-white border rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="item-header flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{type.name}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                  <span
                    className={`badge px-3 py-1 rounded-full text-sm font-medium ${
                      type.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {type.active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="item-category mb-3 text-sm text-gray-600">
                  <span className="font-medium">Categoría:</span> {type.category.replace(/_/g, " ")}
                </div>

                <div className="item-actions flex gap-2">
                  <button
                    onClick={() => setEditingItem(type)}
                    className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
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
      )}

      {activeTab === "policies" && (
        <div className="policies-list space-y-3">
          {filteredData?.length === 0 ? (
            <div className="empty-state text-center py-8 text-gray-500">
              <AlertCircle className="mx-auto mb-2" size={32} />
              <p>No hay pólizas de beneficio</p>
            </div>
          ) : (
            filteredData?.map((policy: BenefitPolicy) => (
              <div
                key={policy.id}
                className="list-item bg-white border rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="item-header flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{policy.name}</h3>
                    <p className="text-sm text-gray-600">
                      {policy.coverage_description}
                    </p>
                  </div>
                  <span
                    className={`badge px-3 py-1 rounded-full text-sm font-medium ${
                      policy.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {policy.active ? "Activa" : "Inactiva"}
                  </span>
                </div>

                <div className="item-costs grid grid-cols-3 gap-4 mb-3 py-3 border-t border-b text-sm">
                  <div>
                    <span className="text-gray-600">Costo Empleado:</span>
                    <p className="font-medium">${policy.employee_cost}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Costo Empresa:</span>
                    <p className="font-medium">${policy.employer_cost}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Cobertura:</span>
                    <p className="font-medium">${policy.coverage_amount}</p>
                  </div>
                </div>

                <div className="item-actions flex gap-2">
                  <button
                    onClick={() => setEditingItem(policy)}
                    className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(policy.id)}
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
      )}

      {activeTab === "assignments" && (
        <div className="assignments-list space-y-3">
          {filteredData?.length === 0 ? (
            <div className="empty-state text-center py-8 text-gray-500">
              <AlertCircle className="mx-auto mb-2" size={32} />
              <p>No hay asignaciones de beneficio</p>
            </div>
          ) : (
            filteredData?.map((assignment: EmployeeBenefit) => (
              <div
                key={assignment.id}
                className="list-item bg-white border rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="item-header flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      Asignación {assignment.employee_id}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Nivel: {assignment.coverage_level}
                    </p>
                  </div>
                  <span
                    className={`badge px-3 py-1 rounded-full text-sm font-medium ${
                      assignment.status === "active"
                        ? "bg-green-100 text-green-800"
                        : assignment.status === "suspended"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {assignment.status === "active"
                      ? "Activa"
                      : assignment.status === "suspended"
                      ? "Suspendida"
                      : "Inactiva"}
                  </span>
                </div>

                <div className="item-dates mb-3 py-3 border-t border-b text-sm">
                  <span className="text-gray-600">Vigencia:</span>
                  <p className="font-medium">
                    {new Date(assignment.effective_from).toLocaleDateString()} -{" "}
                    {assignment.effective_to
                      ? new Date(assignment.effective_to).toLocaleDateString()
                      : "Sin fecha final"}
                  </p>
                </div>

                <div className="item-actions flex gap-2">
                  <button
                    onClick={() => setEditingItem(assignment)}
                    className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(assignment.id)}
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
      )}

      {showNewDialog && (
        <BenefitDialog
          tab={activeTab}
          onClose={() => setShowNewDialog(false)}
          onSave={handleCreate}
          benefitTypes={benefitTypes}
          policies={policies}
        />
      )}

      {editingItem && (
        <BenefitDialog
          tab={activeTab}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(data) => handleUpdate(editingItem.id, data)}
          benefitTypes={benefitTypes}
          policies={policies}
        />
      )}
    </div>
  );
}

function BenefitDialog({
  tab,
  item,
  onClose,
  onSave,
  benefitTypes,
  policies,
}: {
  tab: string;
  item?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  benefitTypes?: BenefitType[];
  policies?: BenefitPolicy[];
}) {
  const [formData, setFormData] = useState<any>(
    item ||
      (tab === "types"
        ? { name: "", category: "health", description: "", active: true }
        : tab === "policies"
        ? {
            benefit_type_id: "",
            name: "",
            employee_cost: 0,
            employer_cost: 0,
            coverage_description: "",
            coverage_amount: 0,
            deductible: 0,
            active: true,
          }
        : {
            employee_id: "",
            benefit_type_id: "",
            benefit_policy_id: "",
            effective_from: new Date().toISOString().split("T")[0],
            status: "active",
            coverage_level: "standard",
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
            {tab === "types"
              ? "Tipo de Beneficio"
              : tab === "policies"
              ? "Póliza"
              : "Asignación"}
          </h2>
          <button
            onClick={onClose}
            className="close-btn text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body p-4 space-y-4">
          {tab === "types" && (
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
                  Categoría
                </label>
                <select
                  value={formData.category || "health"}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="health">Salud</option>
                  <option value="retirement">Jubilación</option>
                  <option value="life_insurance">Seguro de Vida</option>
                  <option value="disability">Incapacidad</option>
                  <option value="other">Otro</option>
                </select>
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

          {tab === "policies" && (
            <>
              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Tipo de Beneficio
                </label>
                <select
                  value={formData.benefit_type_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benefit_type_id: e.target.value,
                    })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {benefitTypes?.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="form-row grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Costo Empleado
                  </label>
                  <input
                    type="number"
                    value={formData.employee_cost || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employee_cost: parseFloat(e.target.value),
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">
                    Costo Empresa
                  </label>
                  <input
                    type="number"
                    value={formData.employer_cost || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employer_cost: parseFloat(e.target.value),
                      })
                    }
                    className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Cobertura
                </label>
                <input
                  type="number"
                  value={formData.coverage_amount || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coverage_amount: parseFloat(e.target.value),
                    })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.coverage_description || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coverage_description: e.target.value,
                    })
                  }
                  className="textarea-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </>
          )}

          {tab === "assignments" && (
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
                  Tipo de Beneficio
                </label>
                <select
                  value={formData.benefit_type_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benefit_type_id: e.target.value,
                    })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {benefitTypes?.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Póliza
                </label>
                <select
                  value={formData.benefit_policy_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benefit_policy_id: e.target.value,
                    })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {policies?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">
                  Vigencia Desde
                </label>
                <input
                  type="date"
                  value={formData.effective_from || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, effective_from: e.target.value })
                  }
                  className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={formData.status || "active"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                  <option value="suspended">Suspendida</option>
                </select>
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
