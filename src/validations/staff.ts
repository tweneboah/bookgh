import { z } from "zod";
import {
  enumValues,
  SHIFT_TYPE,
  SHIFT_STATUS,
  ATTENDANCE_STATUS,
  PERFORMANCE_RATING,
} from "@/constants";

export const createShiftSchema = z.object({
  userId: z.string().min(1),
  shiftDate: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  shiftType: z.enum(enumValues(SHIFT_TYPE) as [string, ...string[]]),
  notes: z.string().optional(),
});

export const updateShiftSchema = z.object({
  status: z.enum(enumValues(SHIFT_STATUS) as [string, ...string[]]).optional(),
  swappedWith: z.string().optional(),
  notes: z.string().optional(),
});

export const createAttendanceSchema = z.object({
  userId: z.string().min(1),
  date: z.string().datetime(),
  clockIn: z.string().datetime().optional(),
  status: z.enum(enumValues(ATTENDANCE_STATUS) as [string, ...string[]]),
  notes: z.string().optional(),
});

export const updateAttendanceSchema = z.object({
  clockOut: z.string().datetime().optional(),
  hoursWorked: z.number().min(0).optional(),
  status: z.enum(enumValues(ATTENDANCE_STATUS) as [string, ...string[]]).optional(),
  notes: z.string().optional(),
});

export const createPerformanceSchema = z.object({
  userId: z.string().min(1),
  reviewDate: z.string().datetime(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  rating: z.enum(enumValues(PERFORMANCE_RATING) as [string, ...string[]]),
  score: z.number().min(1).max(100),
  goalsAchieved: z.string().optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  managerNotes: z.string().optional(),
});

export const updatePerformanceSchema = createPerformanceSchema.partial();
