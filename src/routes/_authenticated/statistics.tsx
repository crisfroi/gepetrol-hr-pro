import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { RoleGuard } from "@/components/app/RoleGuard";
import { LoadingState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/statistics")({
  head: () => ({
    meta: [
      { title: "Estadísticas · GEPETROL RRHH" },
      { name: "description", content: "Dashboard con KPIs, análisis de nómina, vacaciones y desempeño." },
    ],
  }),
  component: () => (
    <RoleGuard allow={["admin", "hr", "finance"]}>
      <Page />
    </RoleGuard>
  ),
});

function Page() {
  const emps = useSupabaseList<any>("employees", { select: "id, status, hire_date, department_id" });
  const depts = useSupabaseList<any>("departments", { select: "id, name" });
  const payslips = useSupabaseList<any>("payslips", { select: "id, gross_amount, net_amount, status" });
  const leaveReqs = useSupabaseList<any>("leave_requests", { select: "id, employee_id, status" });
  const reviews = useSupabaseList<any>("performance_reviews", { select: "id, overall_rating, status" });

  const stats = useMemo(() => {
    if (!emps.data || !depts.data) return null;

    // KPI: Total Employees
    const totalEmployees = emps.data.length;
    const activeEmployees = emps.data.filter((e: any) => e.status === "active").length;
    const inactiveEmployees = totalEmployees - activeEmployees;

    // Department breakdown
    const deptBreakdown = depts.data.map((d: any) => ({
      name: d.name,
      employees: emps.data.filter((e: any) => e.department_id === d.id).length,
    }));

    // Payroll stats
    const totalGross = payslips.data?.reduce((sum: number, p: any) => sum + (p.gross_amount || 0), 0) || 0;
    const totalNet = payslips.data?.reduce((sum: number, p: any) => sum + (p.net_amount || 0), 0) || 0;
    const avgPayslipGross = payslips.data?.length ? totalGross / payslips.data.length : 0;

    // Leave requests analysis
    const leaveApproved = leaveReqs.data?.filter((l: any) => l.status === "approved").length || 0;
    const leavePending = leaveReqs.data?.filter((l: any) => l.status === "pending").length || 0;
    const leaveRejected = leaveReqs.data?.filter((l: any) => l.status === "rejected").length || 0;

    // Performance ratings distribution
    const ratingDistribution = [0, 0, 0, 0, 0];
    if (reviews.data) {
      reviews.data.forEach((r: any) => {
        if (r.overall_rating && r.overall_rating > 0) {
          ratingDistribution[Math.min(Math.floor(r.overall_rating - 1), 4)]++;
        }
      });
    }

    // Tenure analysis
    const now = new Date();
    const tenureGroups = {
      lessThanYear: 0,
      oneToThree: 0,
      threeToFive: 0,
      moreThanFive: 0,
    };

    emps.data.forEach((e: any) => {
      if (!e.hire_date) return;
      const yearsService = (now.getTime() - new Date(e.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (yearsService < 1) tenureGroups.lessThanYear++;
      else if (yearsService < 3) tenureGroups.oneToThree++;
      else if (yearsService < 5) tenureGroups.threeToFive++;
      else tenureGroups.moreThanFive++;
    });

    const tenureData = [
      { name: "< 1 año", value: tenureGroups.lessThanYear },
      { name: "1-3 años", value: tenureGroups.oneToThree },
      { name: "3-5 años", value: tenureGroups.threeToFive },
      { name: "> 5 años", value: tenureGroups.moreThanFive },
    ];

    const leaveData = [
      { name: "Aprobadas", value: leaveApproved },
      { name: "Pendientes", value: leavePending },
      { name: "Rechazadas", value: leaveRejected },
    ];

    const ratingLabels = ["1 ⭐", "2 ⭐", "3 ⭐", "4 ⭐", "5 ⭐"];
    const ratingData = ratingLabels.map((label, i) => ({
      name: label,
      count: ratingDistribution[i],
    }));

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      deptBreakdown,
      totalGross,
      totalNet,
      avgPayslipGross,
      leaveApproved,
      leavePending,
      leaveRejected,
      tenureData,
      leaveData,
      ratingData,
      totalReviews: reviews.data?.length || 0,
      avgRating: reviews.data?.length
        ? (reviews.data.reduce((sum: number, r: any) => sum + (r.overall_rating || 0), 0) / reviews.data.length).toFixed(2)
        : "N/A",
    };
  }, [emps.data, depts.data, payslips.data, leaveReqs.data, reviews.data]);

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (emps.loading || depts.loading || payslips.loading || leaveReqs.loading || reviews.loading) {
    return <LoadingState />;
  }

  if (!stats) {
    return <div className="p-6">No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Estadísticas"
        description="Dashboard con KPIs, análisis de nómina, vacaciones y desempeño"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.activeEmployees} activos, {stats.inactiveEmployees} inactivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Nómina Total (Bruto)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalGross, "XAF")}</div>
            <p className="text-xs text-gray-500 mt-1">
              Promedio: {formatCurrency(stats.avgPayslipGross, "XAF")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Solicitudes de Vacaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.leaveApproved}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.leavePending} pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Calificación Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgRating}/5</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalReviews} evaluaciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employees by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Empleados por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.deptBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="employees" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tenure Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Antigüedad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.tenureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.tenureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leave Requests Status */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Solicitudes de Vacaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.leaveData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Ratings Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Calificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.ratingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Total Bruto</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalGross, "XAF")}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Total Descuentos</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalGross - stats.totalNet, "XAF")}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Total Neto</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalNet, "XAF")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
