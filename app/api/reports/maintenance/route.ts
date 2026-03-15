import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES, MAINTENANCE_STATUS } from "@/constants";
import MaintenanceTicket from "@/models/maintenance/MaintenanceTicket";
import Asset from "@/models/maintenance/Asset";
import mongoose from "mongoose";

type FailureRow = {
  _id: mongoose.Types.ObjectId | null;
  failureCount: number;
};

type CostRow = {
  _id: mongoose.Types.ObjectId;
  estimatedCost: number;
  actualCost: number;
  count: number;
};

function hoursBetween(start?: Date | string | null, end?: Date | string | null): number {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return Math.round(((endMs - startMs) / (1000 * 60 * 60)) * 100) / 100;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.MAINTENANCE_MANAGER,
      USER_ROLES.TECHNICIAN,
      USER_ROLES.MAINTENANCE,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.HOTEL_OWNER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;
    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);
    const baseMatch = {
      tenantId: tenantOid,
      branchId: branchOid,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const [costByBranchRows, equipmentFailureRows, tickets] = await Promise.all([
      MaintenanceTicket.aggregate<CostRow>([
        { $match: baseMatch },
        {
          $group: {
            _id: "$branchId",
            estimatedCost: { $sum: { $ifNull: ["$estimatedCost", 0] } },
            actualCost: { $sum: { $ifNull: ["$actualCost", 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      MaintenanceTicket.aggregate<FailureRow>([
        {
          $match: {
            ...baseMatch,
            assetId: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$assetId",
            failureCount: { $sum: 1 },
          },
        },
        { $sort: { failureCount: -1 } },
        { $limit: 10 },
      ]),
      MaintenanceTicket.find(baseMatch as Record<string, unknown>)
        .select("status isPreventive scheduledDate completedAt createdAt title assetId")
        .lean(),
    ]);

    const assetIds = equipmentFailureRows
      .map((row) => row._id)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const assets = assetIds.length
      ? await Asset.find({
          _id: { $in: assetIds },
          tenantId: tenantOid,
        } as Record<string, unknown>)
          .select("name")
          .lean()
      : [];
    const assetMap = new Map(assets.map((asset) => [String(asset._id), asset.name ?? "Unknown Asset"]));

    const equipmentFailureFrequency = equipmentFailureRows.map((row) => ({
      assetId: row._id ? String(row._id) : "",
      assetName: row._id ? assetMap.get(String(row._id)) ?? "Unknown Asset" : "Unknown Asset",
      failureCount: row.failureCount ?? 0,
    }));

    const downtimeRows = tickets
      .filter((ticket) => ticket.status === MAINTENANCE_STATUS.COMPLETED || ticket.status === MAINTENANCE_STATUS.CLOSED)
      .map((ticket) => ({
        ticketId: String(ticket._id),
        title: ticket.title ?? "Maintenance Ticket",
        status: ticket.status,
        downtimeHours: hoursBetween(ticket.scheduledDate ?? ticket.createdAt, ticket.completedAt),
        isPreventive: ticket.isPreventive === true,
      }));

    const totalDowntimeHours = downtimeRows.reduce((sum, row) => sum + row.downtimeHours, 0);
    const avgDowntimeHours =
      downtimeRows.length > 0
        ? Math.round((totalDowntimeHours / downtimeRows.length) * 100) / 100
        : 0;

    const preventiveCount = tickets.filter((ticket) => ticket.isPreventive === true).length;
    const reactiveCount = tickets.length - preventiveCount;
    const openCount = tickets.filter(
      (ticket) =>
        ticket.status === MAINTENANCE_STATUS.OPEN ||
        ticket.status === MAINTENANCE_STATUS.ASSIGNED ||
        ticket.status === MAINTENANCE_STATUS.IN_PROGRESS
    ).length;

    const branchCost = costByBranchRows[0] ?? {
      _id: branchOid,
      estimatedCost: 0,
      actualCost: 0,
      count: 0,
    };

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      maintenanceCostPerBranch: {
        branchId: String(branchCost._id),
        ticketCount: branchCost.count ?? 0,
        estimatedCost: Math.round((branchCost.estimatedCost ?? 0) * 100) / 100,
        actualCost: Math.round((branchCost.actualCost ?? 0) * 100) / 100,
      },
      equipmentFailureFrequency,
      downtimeTracking: {
        totalDowntimeHours: Math.round(totalDowntimeHours * 100) / 100,
        averageDowntimeHours: avgDowntimeHours,
        records: downtimeRows,
      },
      ticketSummary: {
        total: tickets.length,
        open: openCount,
        preventive: preventiveCount,
        reactive: reactiveCount,
      },
    });
  },
  { auth: true }
);
