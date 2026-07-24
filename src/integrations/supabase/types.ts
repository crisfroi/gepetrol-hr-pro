export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          location: Json | null
          notes: string | null
          source: Database["public"]["Enums"]["attendance_source"]
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          location?: Json | null
          notes?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          updated_at?: string
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          location?: Json | null
          notes?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      benefit_plans: {
        Row: {
          active: boolean
          category: string
          code: string
          coverage_details: Json
          created_at: string
          currency: string
          employee_contribution: number
          employer_contribution: number
          id: string
          name: string
          provider: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          coverage_details?: Json
          created_at?: string
          currency?: string
          employee_contribution?: number
          employer_contribution?: number
          id?: string
          name: string
          provider?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          coverage_details?: Json
          created_at?: string
          currency?: string
          employee_contribution?: number
          employer_contribution?: number
          id?: string
          name?: string
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      benefit_policies: {
        Row: {
          active: boolean | null
          benefit_type_id: string
          coverage_amount: number | null
          coverage_description: string | null
          created_at: string | null
          deductible: number | null
          effective_from: string | null
          effective_to: string | null
          employee_cost: number | null
          employer_cost: number | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          benefit_type_id: string
          coverage_amount?: number | null
          coverage_description?: string | null
          created_at?: string | null
          deductible?: number | null
          effective_from?: string | null
          effective_to?: string | null
          employee_cost?: number | null
          employer_cost?: number | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          benefit_type_id?: string
          coverage_amount?: number | null
          coverage_description?: string | null
          created_at?: string | null
          deductible?: number | null
          effective_from?: string | null
          effective_to?: string | null
          employee_cost?: number | null
          employer_cost?: number | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benefit_policies_benefit_type_id_fkey"
            columns: ["benefit_type_id"]
            isOneToOne: false
            referencedRelation: "benefit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_types: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          active: boolean
          code: string
          cost_center: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          cost_center?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          cost_center?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      development_seed_batches: {
        Row: {
          created_at: string
          employee_count: number
          id: string
          label: string
          requested_by: string | null
        }
        Insert: {
          created_at?: string
          employee_count?: number
          id?: string
          label: string
          requested_by?: string | null
        }
        Update: {
          created_at?: string
          employee_count?: number
          id?: string
          label?: string
          requested_by?: string | null
        }
        Relationships: []
      }
      development_seed_records: {
        Row: {
          batch_id: string
          created_at: string
          entity: string
          entity_id: string
          id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          entity: string
          entity_id: string
          id?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_seed_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "development_seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      document_audit_keys: {
        Row: {
          audit_hash: string
          created_at: string
          document_type: string
          entity_id: string | null
          entity_table: string | null
          generated_by: string | null
          id: string
          payload: Json
          payload_hash: string
        }
        Insert: {
          audit_hash: string
          created_at?: string
          document_type: string
          entity_id?: string | null
          entity_table?: string | null
          generated_by?: string | null
          id?: string
          payload?: Json
          payload_hash: string
        }
        Update: {
          audit_hash?: string
          created_at?: string
          document_type?: string
          entity_id?: string | null
          entity_table?: string | null
          generated_by?: string | null
          id?: string
          payload?: Json
          payload_hash?: string
        }
        Relationships: []
      }
      employee_benefits: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          enrolled_on: string
          id: string
          notes: string | null
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          enrolled_on?: string
          id?: string
          notes?: string | null
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          enrolled_on?: string
          id?: string
          notes?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "benefit_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          doc_type: string
          employee_id: string
          id: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          employee_id: string
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          employee_id?: string
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_payroll_config: {
        Row: {
          calculation_method_id: string
          created_at: string
          employee_id: string
          id: string
          overrides: Json
          updated_at: string
        }
        Insert: {
          calculation_method_id: string
          created_at?: string
          employee_id: string
          id?: string
          overrides?: Json
          updated_at?: string
        }
        Update: {
          calculation_method_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          overrides?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_payroll_config_calculation_method_id_fkey"
            columns: ["calculation_method_id"]
            isOneToOne: false
            referencedRelation: "payroll_calculation_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_payroll_config_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: Json | null
          bank_account: Json | null
          birth_date: string | null
          created_at: string
          department_id: string | null
          email: string | null
          emergency_contact: Json | null
          employee_code: string
          first_name: string
          gender: string | null
          hire_date: string
          id: string
          last_name: string
          manager_id: string | null
          national_id: string | null
          nationality: string | null
          phone: string | null
          photo_url: string | null
          position_id: string | null
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          bank_account?: Json | null
          birth_date?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_code: string
          first_name: string
          gender?: string | null
          hire_date: string
          id?: string
          last_name: string
          manager_id?: string | null
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          bank_account?: Json | null
          birth_date?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_code?: string
          first_name?: string
          gender?: string | null
          hire_date?: string
          id?: string
          last_name?: string
          manager_id?: string | null
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_contracts: {
        Row: {
          active: boolean
          base_salary: number
          calculation_method_id: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          currency: string
          document_url: string | null
          employee_id: string
          end_date: string | null
          id: string
          probation_end_date: string | null
          start_date: string
          updated_at: string
          weekly_hours: number | null
        }
        Insert: {
          active?: boolean
          base_salary: number
          calculation_method_id?: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          currency?: string
          document_url?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          probation_end_date?: string | null
          start_date: string
          updated_at?: string
          weekly_hours?: number | null
        }
        Update: {
          active?: boolean
          base_salary?: number
          calculation_method_id?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          currency?: string
          document_url?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          probation_end_date?: string | null
          start_date?: string
          updated_at?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_calc_method"
            columns: ["calculation_method_id"]
            isOneToOne: false
            referencedRelation: "payroll_calculation_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applicants: {
        Row: {
          applied_at: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          job_posting_id: string
          notes: string | null
          phone: string | null
          resume_url: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          job_posting_id: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          job_posting_id?: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applicants_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          created_at: string | null
          created_by: string
          department_id: string | null
          description: string | null
          experience_years: number | null
          id: string
          required_skills: Json | null
          salary_max: number | null
          salary_min: number | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          department_id?: string | null
          description?: string | null
          experience_years?: number | null
          id?: string
          required_skills?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          department_id?: string | null
          description?: string | null
          experience_years?: number | null
          id?: string
          required_skills?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_assignments: {
        Row: {
          assigned_end: string
          assigned_start: string
          created_at: string | null
          employee_id: string
          id: string
          manual_override: boolean | null
          optimization_score: number | null
          override_reason: string | null
          period_end: string
          period_start: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_end: string
          assigned_start: string
          created_at?: string | null
          employee_id: string
          id?: string
          manual_override?: boolean | null
          optimization_score?: number | null
          override_reason?: string | null
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_end?: string
          assigned_start?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          manual_override?: boolean | null
          optimization_score?: number | null
          override_reason?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          accrued_days: number
          carryover_days: number
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          pending_days: number
          period_year: number
          updated_at: string
          used_days: number
        }
        Insert: {
          accrued_days?: number
          carryover_days?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          pending_days?: number
          period_year: number
          updated_at?: string
          used_days?: number
        }
        Update: {
          accrued_days?: number
          carryover_days?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          pending_days?: number
          period_year?: number
          updated_at?: string
          used_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approver_id: string | null
          attachment_url: string | null
          created_at: string
          days_requested: number
          decided_at: string | null
          decision_notes: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_request_status"]
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          attachment_url?: string | null
          created_at?: string
          days_requested: number
          decided_at?: string | null
          decision_notes?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          attachment_url?: string | null
          created_at?: string
          days_requested?: number
          decided_at?: string | null
          decision_notes?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_scheduling_constraints: {
        Row: {
          blackout_end: string | null
          blackout_start: string | null
          created_at: string
          department_id: string | null
          id: string
          min_coverage_pct: number
          rules: Json
          seniority_priority: boolean
          updated_at: string
        }
        Insert: {
          blackout_end?: string | null
          blackout_start?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          min_coverage_pct?: number
          rules?: Json
          seniority_priority?: boolean
          updated_at?: string
        }
        Update: {
          blackout_end?: string | null
          blackout_start?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          min_coverage_pct?: number
          rules?: Json
          seniority_priority?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_scheduling_constraints_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_scheduling_proposals: {
        Row: {
          accepted: boolean | null
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          proposed_end: string
          proposed_start: string
          run_id: string
          score: number | null
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          proposed_end: string
          proposed_start: string
          run_id: string
          score?: number | null
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          proposed_end?: string
          proposed_start?: string
          run_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_scheduling_proposals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_scheduling_proposals_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_scheduling_proposals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "leave_scheduling_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_scheduling_runs: {
        Row: {
          algorithm: string
          created_at: string
          finished_at: string | null
          id: string
          parameters: Json
          period_end: string
          period_start: string
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["scheduling_run_status"]
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          parameters?: Json
          period_end: string
          period_start: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scheduling_run_status"]
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          parameters?: Json
          period_end?: string
          period_start?: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scheduling_run_status"]
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          accrual_days_per_year: number
          active: boolean
          code: string
          created_at: string
          id: string
          max_days_per_request: number | null
          metadata: Json
          name: string
          paid: boolean
          requires_attachment: boolean
          updated_at: string
        }
        Insert: {
          accrual_days_per_year?: number
          active?: boolean
          code: string
          created_at?: string
          id?: string
          max_days_per_request?: number | null
          metadata?: Json
          name: string
          paid?: boolean
          requires_attachment?: boolean
          updated_at?: string
        }
        Update: {
          accrual_days_per_year?: number
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          max_days_per_request?: number | null
          metadata?: Json
          name?: string
          paid?: boolean
          requires_attachment?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_alerts: {
        Row: {
          actual_amount: number | null
          created_at: string
          deviation_pct: number | null
          expected_amount: number | null
          id: string
          kind: Database["public"]["Enums"]["payment_alert_kind"]
          notes: string | null
          payslip_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["payment_alert_status"]
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          created_at?: string
          deviation_pct?: number | null
          expected_amount?: number | null
          id?: string
          kind: Database["public"]["Enums"]["payment_alert_kind"]
          notes?: string | null
          payslip_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["payment_alert_status"]
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          created_at?: string
          deviation_pct?: number | null
          expected_amount?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_alert_kind"]
          notes?: string | null
          payslip_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["payment_alert_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_alerts_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_approval_steps: {
        Row: {
          created_at: string
          id: string
          min_amount: number | null
          name: string
          required_role: Database["public"]["Enums"]["app_role"]
          step_order: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_amount?: number | null
          name: string
          required_role: Database["public"]["Enums"]["app_role"]
          step_order: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          min_amount?: number | null
          name?: string
          required_role?: Database["public"]["Enums"]["app_role"]
          step_order?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_approval_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "payment_approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_approval_workflows: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          target_entity: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          target_entity?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          target_entity?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_approvals: {
        Row: {
          approver_id: string
          comment: string | null
          created_at: string
          decided_at: string
          decision: Database["public"]["Enums"]["approval_decision"]
          id: string
          payroll_run_id: string | null
          step_id: string
          workflow_id: string
        }
        Insert: {
          approver_id: string
          comment?: string | null
          created_at?: string
          decided_at?: string
          decision: Database["public"]["Enums"]["approval_decision"]
          id?: string
          payroll_run_id?: string | null
          step_id: string
          workflow_id: string
        }
        Update: {
          approver_id?: string
          comment?: string | null
          created_at?: string
          decided_at?: string
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          payroll_run_id?: string | null
          step_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_approvals_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_approvals_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "payment_approval_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_approvals_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "payment_approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_calculation_methods: {
        Row: {
          active: boolean
          code: string
          created_at: string
          formula_hint: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          formula_hint?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          formula_hint?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_concepts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          display_order: number
          formula: string | null
          id: string
          kind: Database["public"]["Enums"]["payroll_concept_kind"]
          name: string
          taxable: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          display_order?: number
          formula?: string | null
          id?: string
          kind: Database["public"]["Enums"]["payroll_concept_kind"]
          name: string
          taxable?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          display_order?: number
          formula?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payroll_concept_kind"]
          name?: string
          taxable?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payroll_parameters: {
        Row: {
          created_at: string
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          key: string
          updated_at: string
          value: Json
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
          value_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
          value_type?: string
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          audit_hash: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          pay_date: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          audit_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          pay_date?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          audit_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          pay_date?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: []
      }
      payslip_calculation_log: {
        Row: {
          calculated_by: string | null
          calculation_date: string | null
          calculation_details: Json | null
          created_at: string | null
          deductions_amount: number | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          payslip_id: string
        }
        Insert: {
          calculated_by?: string | null
          calculation_date?: string | null
          calculation_details?: Json | null
          created_at?: string | null
          deductions_amount?: number | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          payslip_id: string
        }
        Update: {
          calculated_by?: string | null
          calculation_date?: string | null
          calculation_details?: Json | null
          created_at?: string | null
          deductions_amount?: number | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          payslip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_calculation_log_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_line_items: {
        Row: {
          amount: number
          base_amount: number | null
          concept_id: string
          created_at: string
          id: string
          meta: Json
          payslip_id: string
          quantity: number | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          concept_id: string
          created_at?: string
          id?: string
          meta?: Json
          payslip_id: string
          quantity?: number | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          concept_id?: string
          created_at?: string
          id?: string
          meta?: Json
          payslip_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslip_line_items_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "payroll_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_line_items_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          audit_hash: string | null
          created_at: string
          currency: string
          deductions: number
          employee_id: string
          gross: number
          id: string
          net: number
          pdf_url: string | null
          run_id: string
          updated_at: string
        }
        Insert: {
          audit_hash?: string | null
          created_at?: string
          currency?: string
          deductions?: number
          employee_id: string
          gross?: number
          id?: string
          net?: number
          pdf_url?: string | null
          run_id: string
          updated_at?: string
        }
        Update: {
          audit_hash?: string | null
          created_at?: string
          currency?: string
          deductions?: number
          employee_id?: string
          gross?: number
          id?: string
          net?: number
          pdf_url?: string | null
          run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_cycles: {
        Row: {
          created_at: string
          id: string
          name: string
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_goals: {
        Row: {
          created_at: string
          cycle_id: string | null
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          metric: string | null
          progress: number
          status: string
          target_value: number | null
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          metric?: string | null
          progress?: number
          status?: string
          target_value?: number | null
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          metric?: string | null
          progress?: number
          status?: string
          target_value?: number | null
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          created_at: string
          cycle_id: string | null
          employee_id: string
          id: string
          notes: string | null
          overall_score: number | null
          reviewer_id: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          department_id: string | null
          description: string | null
          grade: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruitment_candidates: {
        Row: {
          applied_at: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          requisition_id: string | null
          score: number | null
          source: string | null
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          requisition_id?: string | null
          score?: number | null
          source?: string | null
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          requisition_id?: string | null
          score?: number | null
          source?: string | null
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_candidates_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "recruitment_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_requisitions: {
        Row: {
          budgeted_salary_max: number | null
          budgeted_salary_min: number | null
          code: string
          created_at: string
          currency: string
          department_id: string | null
          description: string | null
          hiring_manager_id: string | null
          id: string
          openings: number
          position_id: string | null
          priority: string
          status: string
          target_start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          budgeted_salary_max?: number | null
          budgeted_salary_min?: number | null
          code: string
          created_at?: string
          currency?: string
          department_id?: string | null
          description?: string | null
          hiring_manager_id?: string | null
          id?: string
          openings?: number
          position_id?: string | null
          priority?: string
          status?: string
          target_start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          budgeted_salary_max?: number | null
          budgeted_salary_min?: number | null
          code?: string
          created_at?: string
          currency?: string
          department_id?: string | null
          description?: string | null
          hiring_manager_id?: string | null
          id?: string
          openings?: number
          position_id?: string | null
          priority?: string
          status?: string
          target_start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_requisitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_requisitions_hiring_manager_id_fkey"
            columns: ["hiring_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_requisitions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_stages: {
        Row: {
          applicant_id: string
          completed_at: string | null
          created_at: string | null
          feedback: string | null
          id: string
          job_posting_id: string
          stage_name: string
          stage_order: number | null
        }
        Insert: {
          applicant_id: string
          completed_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          job_posting_id: string
          stage_name: string
          stage_order?: number | null
        }
        Update: {
          applicant_id?: string
          completed_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          job_posting_id?: string
          stage_name?: string
          stage_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_stages_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "job_applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_stages_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          shift_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          shift_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          shift_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          created_at: string
          end_time: string
          id: string
          name: string
          schedule_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          end_time: string
          id?: string
          name: string
          schedule_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          schedule_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completion: {
        Row: {
          certificate_url: string | null
          completion_date: string
          created_at: string | null
          feedback: string | null
          id: string
          score: number | null
          training_enrollment_id: string
          verified_by: string | null
        }
        Insert: {
          certificate_url?: string | null
          completion_date: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          training_enrollment_id: string
          verified_by?: string | null
        }
        Update: {
          certificate_url?: string | null
          completion_date?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          training_enrollment_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_completion_training_enrollment_id_fkey"
            columns: ["training_enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          active: boolean
          category: string | null
          code: string
          cost: number
          created_at: string
          currency: string
          description: string | null
          duration_hours: number
          id: string
          provider: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          code: string
          cost?: number
          created_at?: string
          currency?: string
          description?: string | null
          duration_hours?: number
          id?: string
          provider?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          code?: string
          cost?: number
          created_at?: string
          currency?: string
          description?: string | null
          duration_hours?: number
          id?: string
          provider?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_enrollment: {
        Row: {
          attendance_hours: number | null
          completion_date: string | null
          created_at: string | null
          employee_id: string
          enrollment_date: string | null
          id: string
          score: number | null
          status: string | null
          training_program_id: string
          updated_at: string | null
        }
        Insert: {
          attendance_hours?: number | null
          completion_date?: string | null
          created_at?: string | null
          employee_id: string
          enrollment_date?: string | null
          id?: string
          score?: number | null
          status?: string | null
          training_program_id: string
          updated_at?: string | null
        }
        Update: {
          attendance_hours?: number | null
          completion_date?: string | null
          created_at?: string | null
          employee_id?: string
          enrollment_date?: string | null
          id?: string
          score?: number | null
          status?: string | null
          training_program_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollment_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollment_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          certification_expires_at: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          employee_id: string
          enrolled_at: string
          id: string
          notes: string | null
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          certification_expires_at?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          employee_id: string
          enrolled_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          certification_expires_at?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          employee_id?: string
          enrolled_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          instructor: string | null
          location: string | null
          max_participants: number | null
          name: string
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructor?: string | null
          location?: string | null
          max_participants?: number | null
          name: string
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructor?: string | null
          location?: string | null
          max_participants?: number | null
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          name: string
          timezone: string
          updated_at: string
          weekly_hours: number
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
          weekly_hours?: number
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
          weekly_hours?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_accrued_leave: {
        Args: { _employee_id: string; _leave_type_id: string; _year: number }
        Returns: number
      }
      calculate_payslip_amounts: {
        Args: { _payslip_id: string }
        Returns: Json
      }
      current_employee_department_id: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      delete_development_seed_data: { Args: never; Returns: Json }
      detect_payment_anomaly: {
        Args: { _payslip_id: string; _threshold_pct?: number }
        Returns: undefined
      }
      generate_development_seed_data: {
        Args: { _employee_count?: number }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      recalculate_leave_balances: { Args: { _year?: number }; Returns: Json }
      register_document_audit_key: {
        Args: {
          _document_type: string
          _entity_id?: string
          _entity_table?: string
          _payload?: Json
          _payload_hash?: string
        }
        Returns: {
          audit_hash: string
          created_at: string
          document_type: string
          entity_id: string | null
          entity_table: string | null
          generated_by: string | null
          id: string
          payload: Json
          payload_hash: string
        }
        SetofOptions: {
          from: "*"
          to: "document_audit_keys"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_leave_scheduling: {
        Args: {
          _algorithm?: string
          _period_end: string
          _period_start: string
        }
        Returns: Json
      }
      track_development_seed_record: {
        Args: { _batch_id: string; _entity: string; _entity_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "hr" | "finance" | "supervisor" | "employee"
      approval_decision: "approved" | "rejected" | "returned"
      attendance_source: "manual" | "web" | "mobile" | "biometric" | "import"
      contract_type:
        | "permanent"
        | "fixed_term"
        | "temporary"
        | "internship"
        | "contractor"
      employee_status: "active" | "on_leave" | "suspended" | "terminated"
      leave_request_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "cancelled"
      payment_alert_kind: "overpay" | "underpay" | "anomaly"
      payment_alert_status: "open" | "acknowledged" | "resolved" | "dismissed"
      payroll_concept_kind: "earning" | "deduction" | "bonus" | "employer_cost"
      payroll_run_status: "draft" | "review" | "approved" | "paid" | "cancelled"
      scheduling_run_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "applied"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hr", "finance", "supervisor", "employee"],
      approval_decision: ["approved", "rejected", "returned"],
      attendance_source: ["manual", "web", "mobile", "biometric", "import"],
      contract_type: [
        "permanent",
        "fixed_term",
        "temporary",
        "internship",
        "contractor",
      ],
      employee_status: ["active", "on_leave", "suspended", "terminated"],
      leave_request_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "cancelled",
      ],
      payment_alert_kind: ["overpay", "underpay", "anomaly"],
      payment_alert_status: ["open", "acknowledged", "resolved", "dismissed"],
      payroll_concept_kind: ["earning", "deduction", "bonus", "employer_cost"],
      payroll_run_status: ["draft", "review", "approved", "paid", "cancelled"],
      scheduling_run_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "applied",
      ],
    },
  },
} as const
