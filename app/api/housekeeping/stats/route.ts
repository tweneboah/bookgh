import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import HousekeepingTask from "@/models/housekeeping/HousekeepingTask";
import { HOUSEKEEPING_STATUS } from "@/constants";

export const GET = withHandler(
  async (_req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const base = { tenantId, branchId } as Record<string, unknown>;

    const [total, pending, inProgress, completed, inspected, overdue] = await Promise.all([
      HousekeepingTask.countDocuments(base),
      HousekeepingTask.countDocuments({ ...base, status: HOUSEKEEPING_STATUS.PENDING }),
      HousekeepingTask.countDocuments({ ...base, status: HOUSEKEEPING_STATUS.IN_PROGRESS }),
      HousekeepingTask.countDocuments({ ...base, status: HOUSEKEEPING_STATUS.COMPLETED }),
      HousekeepingTask.countDocuments({ ...base, status: HOUSEKEEPING_STATUS.INSPECTED }),
      HousekeepingTask.countDocuments({
        ...base,
        status: { $in: [HOUSEKEEPING_STATUS.PENDING, HOUSEKEEPING_STATUS.IN_PROGRESS] },
        dueAt: { $lt: new Date() },
      }),
    ]);

    return successResponse({
      total,
      pending,
      inProgress,
      completed,
      inspected,
      overdue,
    });
  },
  { auth: true }
);
