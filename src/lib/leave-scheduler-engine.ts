// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface SchedulingConstraint {
  maxPerWeek?: number;
  maxConcurrent?: number;
  blackoutDates?: { start: string; end: string }[];
  minimumGapBetweenRequests?: number;
}

interface ScheduleAssignment {
  employee_id: string;
  assigned_start: string;
  assigned_end: string;
  optimization_score: number;
  manual_override: boolean;
}

interface SchedulingResult {
  success: boolean;
  assignments: ScheduleAssignment[];
  optimizationScore: number;
  iterations: number;
  error?: string;
}

/**
 * Simulated Annealing algorithm for leave schedule optimization
 * Optimizes vacation assignments while respecting constraints
 */
export async function optimizeLeaveSchedule(
  employees: Employee[],
  periodStart: string,
  periodEnd: string,
  constraints?: SchedulingConstraint
): Promise<SchedulingResult> {
  try {
    // Fetch pending leave requests
    const { data: leaveRequests, error: requestError } = await supabase
      .from("leave_requests")
      .select("*")
      .gte("start_date", periodStart)
      .lte("end_date", periodEnd)
      .eq("status", "pending");

    if (requestError) throw requestError;

    // Initialize parameters
    const defaultConstraints: SchedulingConstraint = {
      maxPerWeek: 3,
      maxConcurrent: 5,
      minimumGapBetweenRequests: 7,
      ...constraints,
    };

    // Generate initial random solution
    const initialSolution = generateRandomSolution(
      employees,
      leaveRequests || [],
      periodStart,
      periodEnd
    );

    // Run simulated annealing
    const result = simulatedAnnealing(
      initialSolution,
      leaveRequests || [],
      defaultConstraints,
      employees
    );

    return result;
  } catch (err: any) {
    return {
      success: false,
      assignments: [],
      optimizationScore: 0,
      iterations: 0,
      error: err.message || "Scheduling optimization failed",
    };
  }
}

/**
 * Generate a random initial solution
 */
function generateRandomSolution(
  employees: Employee[],
  leaveRequests: LeaveRequest[],
  periodStart: string,
  periodEnd: string
): ScheduleAssignment[] {
  const assignments: ScheduleAssignment[] = [];
  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);

  for (const employee of employees) {
    const employeeRequests = leaveRequests.filter(
      (r) => r.employee_id === employee.id
    );

    if (employeeRequests.length === 0) continue;

    // For each request, assign a random date within the period
    for (const request of employeeRequests) {
      const requestDays = daysBetween(request.start_date, request.end_date);
      const maxStartOffset = daysBetween(
        periodStart,
        periodEnd
      ) - requestDays;

      if (maxStartOffset <= 0) {
        // Request spans entire period or longer
        assignments.push({
          employee_id: employee.id,
          assigned_start: periodStart,
          assigned_end: periodEnd,
          optimization_score: 0.5,
          manual_override: false,
        });
      } else {
        const randomOffset = Math.floor(Math.random() * maxStartOffset);
        const assignedStart = addDays(periodStartDate, randomOffset);
        const assignedEnd = addDays(assignedStart, requestDays);

        assignments.push({
          employee_id: employee.id,
          assigned_start: formatDate(assignedStart),
          assigned_end: formatDate(assignedEnd),
          optimization_score: 0.5,
          manual_override: false,
        });
      }
    }
  }

  return assignments;
}

/**
 * Simulated Annealing algorithm
 */
function simulatedAnnealing(
  initialSolution: ScheduleAssignment[],
  leaveRequests: LeaveRequest[],
  constraints: SchedulingConstraint,
  employees: Employee[]
): SchedulingResult {
  let currentSolution = [...initialSolution];
  let bestSolution = [...initialSolution];
  let currentScore = calculateScore(currentSolution, constraints);
  let bestScore = currentScore;

  const maxIterations = 1000;
  const initialTemperature = 100;
  const coolingRate = 0.995;
  let temperature = initialTemperature;
  let iteration = 0;

  for (iteration = 0; iteration < maxIterations; iteration++) {
    // Generate neighbor solution by perturbing current solution
    const neighbor = generateNeighbor(currentSolution);

    // Calculate neighbor score
    const neighborScore = calculateScore(neighbor, constraints);

    // Acceptance probability
    const delta = neighborScore - currentScore;
    const acceptanceProbability = delta > 0 ? 1 : Math.exp(delta / temperature);

    // Accept or reject neighbor
    if (Math.random() < acceptanceProbability) {
      currentSolution = neighbor;
      currentScore = neighborScore;

      // Update best solution if current is better
      if (currentScore > bestScore) {
        bestSolution = [...currentSolution];
        bestScore = currentScore;
      }
    }

    // Cool down
    temperature *= coolingRate;

    // Early stopping if temperature is too low
    if (temperature < 1e-8) break;
  }

  return {
    success: true,
    assignments: bestSolution,
    optimizationScore: bestScore,
    iterations: iteration,
  };
}

/**
 * Generate neighbor solution by randomly modifying one assignment
 */
function generateNeighbor(solution: ScheduleAssignment[]): ScheduleAssignment[] {
  const neighbor = [...solution];

  // Pick random assignment to modify
  if (neighbor.length === 0) return neighbor;

  const randomIndex = Math.floor(Math.random() * neighbor.length);
  const assignment = { ...neighbor[randomIndex] };

  // Randomly shift dates by 1-7 days
  const shiftDays = Math.floor(Math.random() * 7) - 3; // -3 to +3 days
  const newStart = addDays(new Date(assignment.assigned_start), shiftDays);
  const newEnd = addDays(new Date(assignment.assigned_end), shiftDays);

  assignment.assigned_start = formatDate(newStart);
  assignment.assigned_end = formatDate(newEnd);

  neighbor[randomIndex] = assignment;
  return neighbor;
}

/**
 * Calculate optimization score based on constraints satisfaction
 * Higher score = better solution (0-1 range)
 */
function calculateScore(
  assignments: ScheduleAssignment[],
  constraints: SchedulingConstraint
): number {
  let score = 0;
  let maxScore = 0;

  // Check max per week constraint
  if (constraints.maxPerWeek) {
    const weeklyCount = countByWeek(assignments);
    const weeklyViolations = weeklyCount.filter(
      (c) => c > constraints.maxPerWeek!
    ).length;
    const weeklyScore = 1 - weeklyViolations / Math.max(weeklyCount.length, 1);
    score += weeklyScore * 0.3;
    maxScore += 0.3;
  }

  // Check max concurrent constraint
  if (constraints.maxConcurrent) {
    const concurrentViolations = countConcurrentViolations(
      assignments,
      constraints.maxConcurrent
    );
    const concurrentScore =
      1 - concurrentViolations / Math.max(assignments.length, 1);
    score += concurrentScore * 0.3;
    maxScore += 0.3;
  }

  // Check gap between requests
  if (constraints.minimumGapBetweenRequests) {
    const gapViolations = countGapViolations(
      assignments,
      constraints.minimumGapBetweenRequests
    );
    const gapScore = 1 - gapViolations / Math.max(assignments.length, 1);
    score += gapScore * 0.2;
    maxScore += 0.2;
  }

  // Fairness score (everyone gets similar allocation)
  const fairnessScore = calculateFairnessScore(assignments);
  score += fairnessScore * 0.2;
  maxScore += 0.2;

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Count assignments per week
 */
function countByWeek(assignments: ScheduleAssignment[]): number[] {
  const weekMap: Record<number, number> = {};

  for (const assignment of assignments) {
    const week = getWeekNumber(new Date(assignment.assigned_start));
    weekMap[week] = (weekMap[week] || 0) + 1;
  }

  return Object.values(weekMap);
}

/**
 * Count concurrent assignment violations
 */
function countConcurrentViolations(
  assignments: ScheduleAssignment[],
  maxConcurrent: number
): number {
  let violations = 0;

  // Group by date and count
  const dateMap: Record<string, number> = {};

  for (const assignment of assignments) {
    const start = new Date(assignment.assigned_start);
    const end = new Date(assignment.assigned_end);
    const current = new Date(start);

    while (current <= end) {
      const dateKey = formatDate(current);
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;

      if (dateMap[dateKey] > maxConcurrent) {
        violations++;
      }

      current.setDate(current.getDate() + 1);
    }
  }

  return violations;
}

/**
 * Count gap violations between requests for same employee
 */
function countGapViolations(
  assignments: ScheduleAssignment[],
  minimumGap: number
): number {
  let violations = 0;
  const employeeAssignments: Record<string, ScheduleAssignment[]> = {};

  // Group by employee
  for (const assignment of assignments) {
    if (!employeeAssignments[assignment.employee_id]) {
      employeeAssignments[assignment.employee_id] = [];
    }
    employeeAssignments[assignment.employee_id].push(assignment);
  }

  // Check gaps
  for (const empAssignments of Object.values(employeeAssignments)) {
    for (let i = 0; i < empAssignments.length - 1; i++) {
      const gap = daysBetween(
        empAssignments[i].assigned_end,
        empAssignments[i + 1].assigned_start
      );

      if (gap < minimumGap) {
        violations++;
      }
    }
  }

  return violations;
}

/**
 * Calculate fairness score (standard deviation of allocation per employee)
 */
function calculateFairnessScore(assignments: ScheduleAssignment[]): number {
  const employeeDays: Record<string, number> = {};

  for (const assignment of assignments) {
    const days = daysBetween(assignment.assigned_start, assignment.assigned_end);
    employeeDays[assignment.employee_id] =
      (employeeDays[assignment.employee_id] || 0) + days;
  }

  const days = Object.values(employeeDays);
  if (days.length === 0) return 0;

  const mean = days.reduce((a, b) => a + b, 0) / days.length;
  const variance =
    days.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / days.length;
  const stdDev = Math.sqrt(variance);

  // Score is inversely proportional to standard deviation
  // Perfect fairness (stdDev=0) gives score=1, higher variance gives lower score
  return Math.max(0, 1 - stdDev / (mean || 1));
}

/**
 * Get week number from date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Calculate days between two dates
 */
function daysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Save optimized assignments to database
 */
export async function saveLeaveAssignments(
  assignments: ScheduleAssignment[],
  periodStart: string,
  periodEnd: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const recordsToInsert = assignments.map((a) => ({
      employee_id: a.employee_id,
      period_start: periodStart,
      period_end: periodEnd,
      assigned_start: a.assigned_start,
      assigned_end: a.assigned_end,
      optimization_score: a.optimization_score,
      manual_override: a.manual_override,
      status: "assigned",
    }));

    const { error } = await supabase
      .from("leave_assignments")
      .insert(recordsToInsert);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to save assignments",
    };
  }
}
