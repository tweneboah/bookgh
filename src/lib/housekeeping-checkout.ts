import "@/models/booking/Booking";
import {
  HOUSEKEEPING_STATUS,
  HOUSEKEEPING_TASK_TYPE,
  PRIORITY,
} from "@/constants";
import HousekeepingTask from "@/models/housekeeping/HousekeepingTask";
import type { Types } from "mongoose";

const DEFAULT_DUE_HOURS = 4;

/**
 * After checkout, ensure a turnover task exists for the room. If an open task
 * already exists for that room, update it with the latest booking link and due time.
 */
export async function ensureHousekeepingTaskAfterCheckout(params: {
  tenantId: Types.ObjectId | string;
  branchId: Types.ObjectId | string;
  roomId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  createdBy: Types.ObjectId | string;
  dueHours?: number;
}): Promise<void> {
  const { tenantId, branchId, roomId, bookingId, createdBy } = params;
  const hours = params.dueHours ?? DEFAULT_DUE_HOURS;
  const dueAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const open = await HousekeepingTask.findOne({
    tenantId,
    branchId,
    roomId,
    status: { $in: [HOUSEKEEPING_STATUS.PENDING, HOUSEKEEPING_STATUS.IN_PROGRESS] },
  } as Record<string, unknown>).lean();

  if (open) {
    await HousekeepingTask.findByIdAndUpdate(open._id, {
      $set: {
        bookingId,
        dueAt,
        taskType: HOUSEKEEPING_TASK_TYPE.TURNOVER,
        priority: PRIORITY.HIGH,
      },
    });
    return;
  }

  await HousekeepingTask.create({
    tenantId,
    branchId,
    roomId,
    bookingId,
    taskType: HOUSEKEEPING_TASK_TYPE.TURNOVER,
    status: HOUSEKEEPING_STATUS.PENDING,
    priority: PRIORITY.HIGH,
    dueAt,
    createdBy,
  } as Record<string, unknown>);
}
