// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

interface PayslipCalculationRequest {
  payslipId: string;
  options?: {
    force?: boolean;
    includeDetails?: boolean;
  };
}

interface PayslipCalculationResult {
  success: boolean;
  payslipId?: string;
  gross_amount?: number;
  deductions_amount?: number;
  net_amount?: number;
  details?: Record<string, number>;
  error?: string;
}

/**
 * Calculate payslip amounts using the Supabase RPC function
 * Applies business rules including seniority bonuses, department adjustments,
 * contract status conditions, and overtime calculations
 */
export async function calculatePayslipAmounts(
  request: PayslipCalculationRequest
): Promise<PayslipCalculationResult> {
  try {
    const { data, error } = await (supabase as any).rpc(
      "calculate_payslip_amounts",
      {
        _payslip_id: request.payslipId,
      }
    );

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to calculate payslip",
      };
    }

    return {
      success: data.success,
      payslipId: data.payslip_id,
      gross_amount: data.gross_amount,
      deductions_amount: data.deductions_amount,
      net_amount: data.net_amount,
      details: data.details,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unknown error during calculation",
    };
  }
}

/**
 * Get calculation history for a payslip
 */
export async function getPayslipCalculationHistory(payslipId: string) {
  try {
    const { data, error } = await supabase
      .from("payslip_calculation_log")
      .select("*")
      .eq("payslip_id", payslipId)
      .order("calculation_date", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      history: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to fetch calculation history",
      history: [],
    };
  }
}

/**
 * Validate payslip is ready for calculation
 */
export async function validatePayslipForCalculation(payslipId: string) {
  try {
    const { data: payslip, error } = await supabase
      .from("payslips")
      .select("*")
      .eq("id", payslipId)
      .single();

    if (error) throw error;

    if (!payslip) {
      return { valid: false, reason: "Payslip not found" };
    }

    if (payslip.status !== "draft") {
      return { valid: false, reason: "Payslip must be in draft status" };
    }

    if (!payslip.employee_id) {
      return { valid: false, reason: "Payslip missing employee reference" };
    }

    if (!payslip.period_start || !payslip.period_end) {
      return { valid: false, reason: "Payslip missing pay period dates" };
    }

    return { valid: true, payslip };
  } catch (err: any) {
    return { valid: false, reason: err.message || "Validation error" };
  }
}

/**
 * Recalculate multiple payslips (batch operation)
 */
export async function batchCalculatePayslips(
  payslipIds: string[]
): Promise<{ success: boolean; results: PayslipCalculationResult[] }> {
  const results: PayslipCalculationResult[] = [];

  for (const id of payslipIds) {
    const result = await calculatePayslipAmounts({
      payslipId: id,
    });
    results.push(result);
  }

  return {
    success: results.every((r) => r.success),
    results,
  };
}

/**
 * Get payroll parameters for calculations
 */
export async function getPayrollParameters() {
  try {
    const { data, error } = await supabase
      .from("payroll_parameters")
      .select("*")
      .eq("active", true);

    if (error) throw error;

    return {
      success: true,
      parameters: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      parameters: [],
    };
  }
}

/**
 * Get payroll concepts for a payroll run
 */
export async function getPayrollConcepts(payrollRunId?: string) {
  try {
    let query = supabase
      .from("payroll_concepts")
      .select("*")
      .eq("active", true)
      .order("concept_order");

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      concepts: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      concepts: [],
    };
  }
}

/**
 * Simulate payslip calculation without saving
 * Useful for previewing amounts before actual calculation
 */
export async function simulatePayslipCalculation(
  payslipId: string
): Promise<{ success: boolean; preview?: PayslipCalculationResult; error?: string }> {
  try {
    // First validate the payslip
    const validation = await validatePayslipForCalculation(payslipId);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Get the payslip data
    const { data: payslip, error: payslipError } = await supabase
      .from("payslips")
      .select("*")
      .eq("id", payslipId)
      .single();

    if (payslipError) throw payslipError;

    // Get the employee data
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*, employment_contracts!inner(*)")
      .eq("id", payslip.employee_id)
      .single();

    if (employeeError) throw employeeError;

    // Get concepts and parameters
    const conceptsResult = await getPayrollConcepts();
    const parametersResult = await getPayrollParameters();

    // Calculate based on concepts
    let grossAmount = 0;
    let deductionsAmount = 0;
    const details: Record<string, number> = {};

    if (employee.employment_contracts && employee.employment_contracts.length > 0) {
      const contract = employee.employment_contracts[0];

      // Calculate base salary
      const baseSalary = contract.base_salary || 0;
      grossAmount += baseSalary;
      details["base_salary"] = baseSalary;

      // Calculate seniority bonus
      if (contract.contract_start_date) {
        const yearsOfService = Math.floor(
          (new Date().getTime() - new Date(contract.contract_start_date).getTime()) /
            (1000 * 60 * 60 * 24 * 365)
        );

        if (yearsOfService >= 5) {
          const seniorityBonus = baseSalary * ((yearsOfService / 5) * 0.05);
          grossAmount += seniorityBonus;
          details["seniority_bonus"] = seniorityBonus;
        }
      }

      // Apply deductions from parameters
      parametersResult.parameters.forEach((param: any) => {
        if (param.concept_id) {
          const deduction = param.parameter_value || 0;
          if (deduction > 0) {
            deductionsAmount += deduction;
            details[`deduction_${param.id}`] = deduction;
          }
        }
      });
    }

    const netAmount = grossAmount - deductionsAmount;

    return {
      success: true,
      preview: {
        success: true,
        payslipId,
        gross_amount: grossAmount,
        deductions_amount: deductionsAmount,
        net_amount: netAmount,
        details,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Simulation failed",
    };
  }
}

/**
 * Check if payslip has been calculated
 */
export async function isPayslipCalculated(payslipId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("payslips")
      .select("status")
      .eq("id", payslipId)
      .single();

    if (error) return false;

    return data?.status === "calculated";
  } catch {
    return false;
  }
}
