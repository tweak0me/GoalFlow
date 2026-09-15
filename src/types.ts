export type GoalCategory = 'career' | 'business' | 'health' | 'education' | 'finance' | 'personal';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetDate: string; // YYYY-MM-DD
  weight: number; // 1 to 10: strategic priority/importance
  color: string;
  progress: number; // 0 to 100%
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

export type EnergyLevel = 'high' | 'medium' | 'low';
export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';
export type TaskStatus = 'todo' | 'in_progress' | 'scheduled' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  goalId?: string | null;
  durationMinutes: number; // e.g. 30, 45, 60, 90, 120
  deadline?: string | null; // YYYY-MM-DD or ISO
  energyLevel: EnergyLevel; // cognitive load required
  status: TaskStatus;
  priority: TaskPriority;
  significanceScore: number; // 0 to 100 calculated by AI
  eisenhowerQuadrant: EisenhowerQuadrant;
  goalAlignmentPercent: number; // 0 to 100%
  aiReasoning?: string;
  scheduledStart?: string | null; // ISO string
  scheduledEnd?: string | null; // ISO string
  tags?: string[];
  createdAt: string;
}

export type AIModelType =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite'
  | 'deepseek-reasoner'
  | 'deepseek-chat'
  | 'gemini-3.1-pro-preview';

export interface PrioritizationResult {
  updatedTasks: Task[];
  summary: string;
  thinkingProcess?: string;
  strategicAdvice: string[];
  goalDistributionStats: {
    goalId: string;
    goalTitle: string;
    color: string;
    taskCount: number;
    totalMinutes: number;
    averageSignificance: number;
  }[];
  modelUsed: string;
  timestamp: string;
}

export interface UserScheduleConfig {
  workStartHour: number; // e.g. 9 for 09:00
  workEndHour: number; // e.g. 18 for 18:00
  focusPeakStart: number; // e.g. 10 (10:00 - 12:30 for high energy)
  focusPeakEnd: number;
  breakDurationMinutes: number; // 15
  lunchStartHour: number; // 13
  lunchDurationMinutes: number; // 60
  workingDays: number[]; // [1, 2, 3, 4, 5] (Mon-Fri)
}

export interface CalendarEvent {
  id: string;
  taskId: string;
  title: string;
  goalTitle: string;
  goalColor: string;
  start: string; // ISO
  end: string; // ISO
  durationMinutes: number;
  priority: TaskPriority;
  significanceScore: number;
  energyLevel: EnergyLevel;
  status: TaskStatus;
}

export interface ProposedTaskSchedule {
  taskId: string;
  taskTitle: string;
  currentDeadline: string | null;
  proposedDeadline: string; // YYYY-MM-DD
  proposedStart: string; // ISO string
  proposedEnd: string; // ISO string
  significanceScore: number;
  priority: TaskPriority;
  goalTitle?: string;
  goalColor?: string;
  reasoning: string;
  accepted?: boolean;
}

export interface ScheduleProposal {
  id: string;
  timestamp: string;
  summary: string;
  strategyExplanation: string;
  modelUsed: string;
  proposals: ProposedTaskSchedule[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionResult?: {
    type: 'schedule_proposed' | 'task_created' | 'goal_created' | 'deadline_updated' | 'info';
    details?: string;
  };
}
