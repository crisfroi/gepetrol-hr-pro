import type { Database as GeneratedDatabase, Json } from "./types";

type AdditionalTables = {
  event_alerts: {
    Row: {
      id: string;
      alert_type: string;
      severity: "info" | "warning" | "critical";
      status: "pending" | "reviewed" | "dismissed" | "resolved";
      title: string;
      description: string | null;
      data: Json;
      assigned_to_role: GeneratedDatabase["public"]["Enums"]["app_role"] | null;
      reviewed_by: string | null;
      reviewed_at: string | null;
      reviewer_notes: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<AdditionalTables["event_alerts"]["Row"]> & Pick<AdditionalTables["event_alerts"]["Row"], "alert_type" | "severity" | "title">;
    Update: Partial<AdditionalTables["event_alerts"]["Row"]>;
    Relationships: [];
  };
  calendar_events: {
    Row: {
      id: string;
      title: string;
      description: string | null;
      event_type: string;
      start_time: string;
      end_time: string | null;
      location: string | null;
      department_id: string | null;
      created_by: string;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<AdditionalTables["calendar_events"]["Row"]> & Pick<AdditionalTables["calendar_events"]["Row"], "title" | "created_by" | "start_time">;
    Update: Partial<AdditionalTables["calendar_events"]["Row"]>;
    Relationships: [];
  };
  compliance_requirements: {
    Row: { id: string; code: string; name: string; description: string | null; validity_months: number | null; active: boolean; created_at: string; updated_at: string };
    Insert: Partial<AdditionalTables["compliance_requirements"]["Row"]> & Pick<AdditionalTables["compliance_requirements"]["Row"], "code" | "name">;
    Update: Partial<AdditionalTables["compliance_requirements"]["Row"]>;
    Relationships: [];
  };
  employee_certifications: {
    Row: { id: string; employee_id: string; requirement_id: string; certificate_number: string | null; issued_at: string | null; expires_at: string | null; evidence_url: string | null; verified_by: string | null; verified_at: string | null; state: "pending" | "valid" | "expired" | "rejected"; created_at: string; updated_at: string };
    Insert: Partial<AdditionalTables["employee_certifications"]["Row"]> & Pick<AdditionalTables["employee_certifications"]["Row"], "employee_id" | "requirement_id">;
    Update: Partial<AdditionalTables["employee_certifications"]["Row"]>;
    Relationships: [];
  };
};

type AdditionalFunctions = {
  get_employee_payslips: { Args: { _limit?: number; _offset?: number }; Returns: { payslip_id: string; period_start: string; period_end: string; pay_date: string; currency: string; gross: number; net: number; pdf_url: string | null }[] };
  get_employee_leave_balance: { Args: never; Returns: { balance: number; used: number; pending: number; expires_at: string | null }[] };
  record_payslip_download: { Args: { _payslip_id: string }; Returns: undefined };
  update_employee_personal_data: { Args: { _address: Json | null; _phone: string | null; _bank_account?: Json | null; _emergency_contact?: Json | null }; Returns: GeneratedDatabase["public"]["Tables"]["employees"]["Row"] };
  request_leave_from_portal: { Args: { _leave_type: string; _start_date: string; _end_date: string; _reason?: string | null }; Returns: GeneratedDatabase["public"]["Tables"]["leave_requests"]["Row"] };
  get_team_presence: { Args: { _department_id?: string | null }; Returns: { employee_id: string; first_name: string; last_name: string; presence_status: string; is_on_leave: boolean; leave_type: string | null; position: string | null; department: string | null; location: string | null }[] };
  get_milestones_this_month: { Args: never; Returns: { employee_id: string; first_name: string; last_name: string; event_type: string; date_of_event: string; days_until_event: number }[] };
  rebuild_work_entries: { Args: { _period_start: string; _period_end: string }; Returns: undefined };
};

type PublicSchema = GeneratedDatabase["public"];

/**
 * Transitional contract for the forward-only reconciliation migration.
 * Replace this file with `supabase gen types` after the migration is applied.
 */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Tables" | "Functions"> & {
    Tables: PublicSchema["Tables"] & AdditionalTables;
    Functions: PublicSchema["Functions"] & AdditionalFunctions;
  };
};
