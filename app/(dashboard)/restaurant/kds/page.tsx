"use client";

import { useKdsBoard, useUpdateKdsOrderStatus } from "@/hooks/api";
import { POS_KOT_STATUS } from "@/constants";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import { FiClock, FiCheckCircle, FiTruck } from "react-icons/fi";

const lanes: Array<{
  key: keyof typeof POS_KOT_STATUS | "NOT_SENT";
  title: string;
  statuses: string[];
  gradient: string;
}> = [
  { key: "NOT_SENT", title: "Pending", statuses: ["notSent", "pending"], gradient: "from-slate-500 to-slate-600" },
  { key: "PREPARING", title: "Preparing", statuses: ["preparing"], gradient: "from-[#ff6d00] to-[#ff9e00]" },
  { key: "READY", title: "Ready", statuses: ["ready"], gradient: "from-[#5a189a] to-[#9d4edd]" },
  { key: "SERVED", title: "Served", statuses: ["served"], gradient: "from-emerald-500 to-emerald-600" },
];

const PREP_ROLES = new Set([
  "tenantAdmin", "branchManager", "restaurantManager", "headChef", "sousChef", "kitchenStaff", "supervisor",
]) as Set<string>;
const SERVE_ROLES = new Set([
  "tenantAdmin", "branchManager", "restaurantManager", "supervisor", "cashier", "waiter",
]) as Set<string>;

function minutesSince(dateLike?: string): number {
  if (!dateLike) return 0;
  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - dt.getTime()) / (1000 * 60)));
}

export default function KdsPage() {
  const { data, isLoading } = useKdsBoard();
  const updateMut = useUpdateKdsOrderStatus();
  const role = useAppSelector((s) => s.auth.user?.role ?? "");
  const slaMinutes = Number(data?.data?.config?.slaMinutes ?? 20);
  const rows = data?.data?.rows ?? [];

  const setStatus = async (id: string, kotStatus: string) => {
    try {
      await updateMut.mutateAsync({ id, kotStatus });
      toast.success("KDS status updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to update KDS status");
    }
  };

  const canMoveToPreparing = PREP_ROLES.has(role);
  const canMoveToReady = PREP_ROLES.has(role);
  const canMoveToServed = SERVE_ROLES.has(role);

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-1 h-1 w-16 rounded-full bg-gradient-to-r from-[#ff6d00] to-[#5a189a]" />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Kitchen Display System
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5a189a]/10 px-3 py-1 text-sm font-semibold text-[#5a189a]">
              <FiClock className="h-4 w-4" />
              SLA: {slaMinutes}m
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Live workflow: pending → preparing → ready → served.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lanes.map((lane) => {
              const laneRows = rows.filter((r: any) =>
                lane.statuses.includes(r.kotStatus ?? "notSent")
              );
              return (
                <div
                  key={lane.key}
                  className="flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
                >
                  <div
                    className={`flex items-center justify-between rounded-t-2xl bg-gradient-to-r ${lane.gradient} px-4 py-3 text-white`}
                  >
                    <h2 className="text-sm font-semibold">{lane.title}</h2>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                      {laneRows.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 overflow-auto p-4">
                    {laneRows.map((order: any) => (
                      <div
                        key={order._id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.items?.length ?? 0} items • {order.orderChannel ?? "dineIn"}
                        </p>
                        {(() => {
                          const prepStart = order.kotSentAt ?? order.createdAt;
                          const elapsed = minutesSince(prepStart);
                          const isOverdue =
                            (order.kotStatus ?? "notSent") === POS_KOT_STATUS.PREPARING &&
                            elapsed > slaMinutes;
                          return (
                            <p
                              className={`mt-1 text-xs ${isOverdue ? "font-medium text-red-600" : "text-slate-500"}`}
                            >
                              {elapsed}m elapsed
                              {isOverdue ? ` • Over SLA (${slaMinutes}m)` : ""}
                            </p>
                          );
                        })()}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(order.items ?? []).slice(0, 3).map((item: any, idx: number) => (
                            <span
                              key={idx}
                              className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm"
                            >
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {["notSent", "pending"].includes(order.kotStatus ?? "notSent") &&
                            canMoveToPreparing && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setStatus(order._id, POS_KOT_STATUS.PREPARING)
                                }
                                className="border-[#ff6d00] text-[#ff6d00] hover:bg-[#ff6d00]/10"
                              >
                                Preparing
                              </Button>
                            )}
                          {(order.kotStatus ?? "notSent") === POS_KOT_STATUS.PREPARING &&
                            canMoveToReady && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setStatus(order._id, POS_KOT_STATUS.READY)
                                }
                                className="border-[#5a189a] text-[#5a189a] hover:bg-[#5a189a]/10"
                              >
                                Ready
                              </Button>
                            )}
                          {(order.kotStatus ?? "notSent") === POS_KOT_STATUS.READY &&
                            canMoveToServed && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setStatus(order._id, POS_KOT_STATUS.SERVED)
                                }
                                className="bg-gradient-to-r from-[#5a189a] to-[#9d4edd] text-white hover:opacity-95"
                              >
                                <FiCheckCircle className="mr-1 h-3.5 w-3.5" />
                                Served
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                    {laneRows.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FiTruck className="h-10 w-10 text-slate-300" />
                        <p className="mt-2 text-xs text-slate-400">No orders</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
