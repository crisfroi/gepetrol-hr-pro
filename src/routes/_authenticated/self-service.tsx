import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Download,
  Edit2,
  Save,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseList, updateRow } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/self-service")({
  head: () => ({
    meta: [
      { title: "Portal del Empleado · GEPETROL RRHH" },
      {
        name: "description",
        content:
          "Autoservicio para consultar recibos, solicitar permisos y actualizar datos.",
      },
    ],
  }),
  component: Page,
});

interface PayslipRecord {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  deductions_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

interface EmployeeData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  personal_email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  city: string;
  country: string;
}

function Page() {
  const [activeTab, setActiveTab] = useState<"profile" | "payslips" | "requests">(
    "profile"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [editedData, setEditedData] = useState<Partial<EmployeeData>>({});

  // Fetch payslips
  const { data: payslips, refetch: refetchPayslips } = useSupabaseList<
    PayslipRecord
  >("payslips", {
    select: "*",
    orderBy: "period_end",
    descending: true,
  });

  // Get current user and load employee data
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Fetch employee data for current user
        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (employee) {
          setEmployeeData(employee);
          setEditedData(employee);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleSaveProfile = async () => {
    try {
      if (employeeData) {
        await updateRow("employees", employeeData.id, editedData);
        setEmployeeData({ ...employeeData, ...editedData });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleDownloadPayslip = (payslip: PayslipRecord) => {
    // In a real implementation, this would generate a PDF
    // For now, just show a message
    alert(`Descargando recibo de ${payslip.period_start} a ${payslip.period_end}`);
  };

  return (
    <div className="self-service-container space-y-6 p-6">
      <div className="portal-header">
        <h1 className="text-3xl font-bold">Portal del Empleado</h1>
        <p className="text-gray-600">
          Accede a tus datos, recibos de nómina y solicitudes
        </p>
      </div>

      <div className="portal-tabs flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("profile")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "profile"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Mi Perfil
        </button>
        <button
          onClick={() => setActiveTab("payslips")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "payslips"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Recibos de Nómina
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`tab-button px-4 py-2 font-medium transition-colors ${
            activeTab === "requests"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Mis Solicitudes
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="profile-section space-y-6">
          <div className="profile-card bg-white border rounded-lg p-6">
            <div className="profile-header flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Información Personal</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-btn flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit2 size={18} />
                  Editar Datos
                </button>
              )}
            </div>

            {employeeData ? (
              <div className="profile-content space-y-4">
                <div className="profile-section-header grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Nombre
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.first_name || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            first_name: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {employeeData.first_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Apellido
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.last_name || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            last_name: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {employeeData.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="contact-section grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Email Laboral
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedData.email || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            email: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">{employeeData.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Email Personal
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedData.personal_email || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            personal_email: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {employeeData.personal_email || "No registrado"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="phone-section grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Teléfono
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedData.phone || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            phone: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {employeeData.phone || "No registrado"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Dirección
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.address || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            address: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {employeeData.address || "No registrada"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="emergency-section grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Contacto de Emergencia
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.emergency_contact_name || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            emergency_contact_name: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {employeeData.emergency_contact_name || "No registrado"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Teléfono Emergencia
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedData.emergency_contact_phone || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            emergency_contact_phone: e.target.value,
                          })
                        }
                        className="input-field w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {employeeData.emergency_contact_phone ||
                          "No registrado"}
                      </p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="edit-actions flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedData(employeeData);
                      }}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <X size={18} />
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Save size={18} />
                      Guardar Cambios
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>No se encontró información de empleado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "payslips" && (
        <div className="payslips-section space-y-4">
          <div className="payslips-header mb-6">
            <h2 className="text-2xl font-semibold">Mis Recibos de Nómina</h2>
            <p className="text-gray-600 text-sm mt-1">
              Descarga tus recibos de pago en PDF
            </p>
          </div>

          <div className="payslips-list space-y-3">
            {payslips && payslips.length === 0 ? (
              <div className="empty-state text-center py-8 text-gray-500">
                <FileText className="mx-auto mb-2" size={32} />
                <p>No hay recibos de nómina disponibles</p>
              </div>
            ) : (
              payslips?.map((payslip) => (
                <div
                  key={payslip.id}
                  className="payslip-card bg-white border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="payslip-header flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        Período:{" "}
                        {new Date(payslip.period_start).toLocaleDateString()} -{" "}
                        {new Date(payslip.period_end).toLocaleDateString()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Procesado:{" "}
                        {new Date(payslip.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadPayslip(payslip)}
                      className="download-btn flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      <Download size={18} />
                      Descargar
                    </button>
                  </div>

                  <div className="payslip-details grid grid-cols-3 gap-4 py-4 border-t border-b text-sm">
                    <div>
                      <span className="text-gray-600">Sueldo Bruto:</span>
                      <p className="font-bold text-lg">
                        ${payslip.gross_amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Descuentos:</span>
                      <p className="font-bold text-lg text-red-600">
                        -${payslip.deductions_amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Sueldo Neto:</span>
                      <p className="font-bold text-lg text-green-600">
                        ${payslip.net_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="payslip-status mt-3">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <span
                      className={`inline-block ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                        payslip.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {payslip.status === "paid" ? "Pagado" : "Procesado"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "requests" && (
        <div className="requests-section space-y-4">
          <div className="requests-header mb-6">
            <h2 className="text-2xl font-semibold">Mis Solicitudes</h2>
            <p className="text-gray-600 text-sm mt-1">
              Visualiza el estado de tus solicitudes de vacaciones, permisos y
              otros
            </p>
          </div>

          <div className="requests-info bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              📋 Las solicitudes se pueden tramitar desde el módulo de "Gestión
              de Solicitudes" en el menú principal.
            </p>
          </div>

          <div className="empty-state text-center py-8 text-gray-500">
            <AlertCircle className="mx-auto mb-2" size={32} />
            <p>No hay solicitudes registradas</p>
          </div>
        </div>
      )}
    </div>
  );
}
