// ─────────────────────────────────────────────────────────────────────────────
// UI domain types (DTOs). Prisma rows are serialized into these shapes so the
// presentational components stay decoupled from the database layer.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "admin" | "employee";
export type TaskStatus = "not_started" | "in_progress" | "blocked" | "completed";
export type GoalStatus = "on_track" | "at_risk" | "behind" | "completed";
export type Priority = "low" | "medium" | "high";
export type ProofType = "image" | "document" | "screenshot" | "link" | "github" | "loom";
export type ReportStatus = "submitted" | "flagged";
export type Mood = "great" | "good" | "ok" | "rough";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  team: string;
  initials: string;
  hue: string;
  active: boolean;
  deleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ProofItem {
  id: string;
  type: ProofType;
  label: string;
  url: string;
  addedAt: string;
  reportId?: string;
}

export interface ProgressNote {
  id: string;
  text: string;
  at: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  goalId?: string;
  progressNotes: ProgressNote[];
}

export interface WeeklyGoal {
  id: string;
  userId: string;
  title: string;
  metricLabel: string;
  target: number;
  current: number;
  weekOf: string;
  deadline: string;
  status: GoalStatus;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completedToday: string;
  progressMade: string;
  plannedTomorrow: string;
  blockers: string;
  hasBlockers: boolean;
  hoursWorked: number;
  proof: ProofItem[];
  sopConfirmed: boolean;
  sopFollowed: boolean;
  flagged: boolean;
  flagReason?: string;
  status: ReportStatus;
  submittedAt?: string;
  mood?: Mood;
}

export type NotificationType =
  | "report_missing"
  | "goal_deadline"
  | "task_overdue"
  | "sop_violation"
  | "task_blocked"
  | "goal_at_risk"
  | "report_flagged"
  | "praise"
  | "nudge"
  | "account";

export type Severity = "info" | "warning" | "critical" | "success";

export interface Notification {
  id: string;
  recipientId: string;
  audience: "employee" | "admin";
  type: NotificationType;
  title: string;
  message: string;
  severity: Severity;
  read: boolean;
  createdAt: string;
  relatedUserId?: string;
}

export interface ScoreBreakdown {
  reportConsistency: number;
  taskCompletion: number;
  tasksDone: number;
  goalCompletion: number;
  quality: number;
  total: number;
}

export interface EmployeeMetrics {
  user: User;
  reportStreak: number;
  reportsThisCycle: number;
  reportsExpected: number;
  tasksCompleted: number;
  tasksTotal: number;
  tasksBlocked: number;
  weeklyCompletionRate: number;
  openBlockers: number;
  qualityScore: number;
  score: ScoreBreakdown;
  submittedToday: boolean;
  flaggedToday: boolean;
  trend: number[];
}

export interface AuditEntry {
  id: string;
  action: string;
  actorName: string | null;
  targetName: string | null;
  entity: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface Leave {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: LeaveStatus;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface Dataset {
  users: User[];
  tasks: Task[];
  goals: WeeklyGoal[];
  reports: DailyReport[];
  leaves: Leave[];
}
