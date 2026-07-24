import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  X,
  AlertCircle,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseList, insertRow, updateRow, deleteRow } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/recruitment")({
  head: () => ({
    meta: [
      { title: "Reclutamiento y selección · GEPETROL RRHH" },
      {
        name: "description",
        content: "Gestión de vacantes, candidatos y pipeline de contratación.",
      },
    ],
  }),
  component: () => (
    <RoleGuard allow={["admin", "hr"]}>
      <Page />
    </RoleGuard>
  ),
});

interface JobPosting {
  id: string;
  title: string;
  description: string;
  department_id: string;
  status: "open" | "closed" | "cancelled";
  salary_min: number;
  salary_max: number;
  experience_years: number;
  required_skills: string[];
  created_at: string;
  created_by: string;
}

interface JobApplicant {
  id: string;
  job_posting_id: string;
  full_name: string;
  email: string;
  phone: string;
  status: "applied" | "shortlisted" | "interviewed" | "rejected" | "hired";
  applied_at: string;
  resume_url: string;
  notes: string;
}

function Page() {
  const [activeTab, setActiveTab] = useState<"postings" | "applicants">(
    "postings"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewPostingDialog, setShowNewPostingDialog] = useState(false);
  const [showNewApplicantDialog, setShowNewApplicantDialog] = useState(false);
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);
  const [editingApplicant, setEditingApplicant] = useState<JobApplicant | null>(
    null
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: postings, refetch: refetchPostings } = useSupabaseList<
    JobPosting
  >("job_postings", {
    select: "*",
    orderBy: "created_at",
    descending: true,
  });

  const { data: applicants, refetch: refetchApplicants } = useSupabaseList<
    JobApplicant
  >("job_applicants", {
    select: "*",
    orderBy: "applied_at",
    descending: true,
  });

  const handleCreatePosting = async (formData: Partial<JobPosting>) => {
    try {
      await insertRow("job_postings", formData);
      refetchPostings();
      setShowNewPostingDialog(false);
    } catch (error) {
      console.error("Error creating posting:", error);
    }
  };

  const handleUpdatePosting = async (id: string, formData: Partial<JobPosting>) => {
    try {
      await updateRow("job_postings", id, formData);
      refetchPostings();
      setEditingPosting(null);
    } catch (error) {
      console.error("Error updating posting:", error);
    }
  };

  const handleDeletePosting = async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar esta vacante?")) {
      return;
    }
    try {
      await deleteRow("job_postings", id);
      refetchPostings();
    } catch (error) {
      console.error("Error deleting posting:", error);
    }
  };

  const handleCreateApplicant = async (formData: Partial<JobApplicant>) => {
    try {
      await insertRow("job_applicants", formData);
      refetchApplicants();
      setShowNewApplicantDialog(false);
    } catch (error) {
      console.error("Error creating applicant:", error);
    }
  };

  const handleUpdateApplicant = async (
    id: string,
    formData: Partial<JobApplicant>
  ) => {
    try {
      await updateRow("job_applicants", id, formData);
      refetchApplicants();
      setEditingApplicant(null);
    } catch (error) {
      console.error("Error updating applicant:", error);
    }
  };

  const handleDeleteApplicant = async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este candidato?")) {
      return;
    }
    try {
      await deleteRow("job_applicants", id);
      refetchApplicants();
    } catch (error) {
      console.error("Error deleting applicant:", error);
    }
  };

  const filteredPostings = postings?.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredApplicants = applicants?.filter((a) => {
    const matchesSearch =
      a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="recruitment-container space-y-6 p-6">
      <div className="recruitment-header flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reclutamiento y Selección</h1>
          <p className="text-gray-600">
            Gestiona vacantes, candidatos y pipeline de contratación
          </p>
        </div>
      </div>

      <div className="recruitment-tabs flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("postings")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "postings"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Vacantes Publicadas
        </button>
        <button
          onClick={() => setActiveTab("applicants")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "applicants"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Candidatos
        </button>
      </div>

      {activeTab === "postings" && (
        <div className="postings-section space-y-4">
          <div className="postings-controls flex gap-4 items-center">
            <div className="search-box flex items-center gap-2 flex-1 bg-white border rounded-lg px-3 py-2">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar vacante por título..."
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
              <option value="open">Abierta</option>
              <option value="closed">Cerrada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <button
              onClick={() => setShowNewPostingDialog(true)}
              className="new-posting-btn flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Nueva Vacante
            </button>
          </div>

          <div className="postings-list space-y-3">
            {filteredPostings?.length === 0 ? (
              <div className="empty-state text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No hay vacantes disponibles</p>
              </div>
            ) : (
              filteredPostings?.map((posting) => (
                <div
                  key={posting.id}
                  className="posting-card bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="posting-header flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{posting.title}</h3>
                      <p className="text-sm text-gray-600">
                        {posting.description}
                      </p>
                    </div>
                    <div className="status-badge ml-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          posting.status === "open"
                            ? "bg-green-100 text-green-800"
                            : posting.status === "closed"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {posting.status === "open"
                          ? "Abierta"
                          : posting.status === "closed"
                          ? "Cerrada"
                          : "Cancelada"}
                      </span>
                    </div>
                  </div>

                  <div className="posting-details grid grid-cols-3 gap-4 mb-4 py-3 border-t border-b text-sm">
                    <div>
                      <span className="text-gray-600">Experiencia:</span>
                      <p className="font-medium">
                        {posting.experience_years} años
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Salario:</span>
                      <p className="font-medium">
                        ${posting.salary_min} - ${posting.salary_max}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Habilidades:</span>
                      <p className="font-medium">
                        {Array.isArray(posting.required_skills)
                          ? posting.required_skills.length
                          : 0}{" "}
                        requeridas
                      </p>
                    </div>
                  </div>

                  <div className="posting-actions flex gap-2">
                    <button
                      onClick={() => setEditingPosting(posting)}
                      className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePosting(posting.id)}
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

      {activeTab === "applicants" && (
        <div className="applicants-section space-y-4">
          <div className="applicants-controls flex gap-4 items-center">
            <div className="search-box flex items-center gap-2 flex-1 bg-white border rounded-lg px-3 py-2">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar candidato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none"
              />
            </div>
            <button
              onClick={() => setShowNewApplicantDialog(true)}
              className="new-applicant-btn flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Nuevo Candidato
            </button>
          </div>

          <div className="applicants-list space-y-3">
            {filteredApplicants?.length === 0 ? (
              <div className="empty-state text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No hay candidatos disponibles</p>
              </div>
            ) : (
              filteredApplicants?.map((applicant) => (
                <div
                  key={applicant.id}
                  className="applicant-card bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="applicant-header flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {applicant.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">{applicant.email}</p>
                    </div>
                    <div className="status-badge">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          applicant.status === "hired"
                            ? "bg-green-100 text-green-800"
                            : applicant.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : applicant.status === "interviewed"
                            ? "bg-blue-100 text-blue-800"
                            : applicant.status === "shortlisted"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {applicant.status === "hired"
                          ? "Contratado"
                          : applicant.status === "rejected"
                          ? "Rechazado"
                          : applicant.status === "interviewed"
                          ? "Entrevistado"
                          : applicant.status === "shortlisted"
                          ? "Preseleccionado"
                          : "Aplicado"}
                      </span>
                    </div>
                  </div>

                  <div className="applicant-details grid grid-cols-2 gap-4 mb-4 py-3 border-t border-b text-sm">
                    <div>
                      <span className="text-gray-600">Teléfono:</span>
                      <p className="font-medium">{applicant.phone}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Aplicación:</span>
                      <p className="font-medium">
                        {new Date(applicant.applied_at).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                  </div>

                  {applicant.notes && (
                    <div className="applicant-notes mb-3 p-2 bg-gray-50 rounded text-sm">
                      <span className="text-gray-600">Notas:</span>
                      <p>{applicant.notes}</p>
                    </div>
                  )}

                  <div className="applicant-actions flex gap-2">
                    <button
                      onClick={() => setEditingApplicant(applicant)}
                      className="edit-btn flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition text-sm"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteApplicant(applicant.id)}
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

      {showNewPostingDialog && (
        <PostingDialog
          onClose={() => setShowNewPostingDialog(false)}
          onSave={handleCreatePosting}
        />
      )}

      {editingPosting && (
        <PostingDialog
          posting={editingPosting}
          onClose={() => setEditingPosting(null)}
          onSave={(data) => handleUpdatePosting(editingPosting.id, data)}
        />
      )}

      {showNewApplicantDialog && (
        <ApplicantDialog
          postings={postings}
          onClose={() => setShowNewApplicantDialog(false)}
          onSave={handleCreateApplicant}
        />
      )}

      {editingApplicant && (
        <ApplicantDialog
          applicant={editingApplicant}
          postings={postings}
          onClose={() => setEditingApplicant(null)}
          onSave={(data) => handleUpdateApplicant(editingApplicant.id, data)}
        />
      )}
    </div>
  );
}

function PostingDialog({
  posting,
  onClose,
  onSave,
}: {
  posting?: JobPosting;
  onClose: () => void;
  onSave: (data: Partial<JobPosting>) => void;
}) {
  const [formData, setFormData] = useState<Partial<JobPosting>>(
    posting || {
      title: "",
      description: "",
      status: "open",
      salary_min: 0,
      salary_max: 0,
      experience_years: 0,
      required_skills: [],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="dialog-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="dialog-content bg-white rounded-lg max-w-md w-full mx-4">
        <div className="dialog-header flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {posting ? "Editar Vacante" : "Nueva Vacante"}
          </h2>
          <button
            onClick={onClose}
            className="close-btn text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body p-4 space-y-4">
          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="textarea-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="form-row grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">
                Años de Experiencia
              </label>
              <input
                type="number"
                value={formData.experience_years || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    experience_years: parseInt(e.target.value),
                  })
                }
                className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                value={formData.status || "open"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as JobPosting["status"],
                  })
                }
                className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Abierta</option>
                <option value="closed">Cerrada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="form-row grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">
                Salario Mín. ($)
              </label>
              <input
                type="number"
                value={formData.salary_min || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_min: parseFloat(e.target.value),
                  })
                }
                className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-1">
                Salario Máx. ($)
              </label>
              <input
                type="number"
                value={formData.salary_max || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_max: parseFloat(e.target.value),
                  })
                }
                className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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
              {posting ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplicantDialog({
  applicant,
  postings,
  onClose,
  onSave,
}: {
  applicant?: JobApplicant;
  postings?: JobPosting[];
  onClose: () => void;
  onSave: (data: Partial<JobApplicant>) => void;
}) {
  const [formData, setFormData] = useState<Partial<JobApplicant>>(
    applicant || {
      full_name: "",
      email: "",
      phone: "",
      status: "applied",
      job_posting_id: postings?.[0]?.id || "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="dialog-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="dialog-content bg-white rounded-lg max-w-md w-full mx-4">
        <div className="dialog-header flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {applicant ? "Editar Candidato" : "Nuevo Candidato"}
          </h2>
          <button
            onClick={onClose}
            className="close-btn text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body p-4 space-y-4">
          <div className="form-group">
            <label className="block text-sm font-medium mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.full_name || ""}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              value={formData.phone || ""}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Vacante</label>
            <select
              value={formData.job_posting_id || ""}
              onChange={(e) =>
                setFormData({ ...formData, job_posting_id: e.target.value })
              }
              className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar vacante...</option>
              {postings?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={formData.status || "applied"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as JobApplicant["status"],
                })
              }
              className="select-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="applied">Aplicado</option>
              <option value="shortlisted">Preseleccionado</option>
              <option value="interviewed">Entrevistado</option>
              <option value="rejected">Rechazado</option>
              <option value="hired">Contratado</option>
            </select>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="textarea-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

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
              {applicant ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
