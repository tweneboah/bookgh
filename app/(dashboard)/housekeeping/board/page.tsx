"use client";

import { useMemo } from "react";
import { useRooms, useHousekeepingTasks } from "@/hooks/api";
import { ROOM_STATUS } from "@/constants";
import { cn } from "@/lib/cn";
import { LayoutGrid, DoorOpen } from "lucide-react";

const ROOM_STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  outOfService: "Out of service",
};

export default function HousekeepingBoardPage() {
  const { data: roomsEnvelope, isLoading: roomsLoading } = useRooms({ limit: "500" });
  const { data: tasksEnvelope, isLoading: tasksLoading } = useHousekeepingTasks({
    limit: "500",
  });

  const rooms = (roomsEnvelope?.data as Record<string, unknown>[]) ?? [];
  const tasks = (tasksEnvelope?.data as Record<string, unknown>[]) ?? [];

  const taskByRoomId = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const t of tasks) {
      const rid = t.roomId as { _id?: string } | string | undefined;
      const id =
        typeof rid === "object" && rid && "_id" in rid
          ? String((rid as { _id: string })._id)
          : typeof rid === "string"
            ? rid
            : "";
      if (id) m.set(id, t);
    }
    return m;
  }, [tasks]);

  const byFloor = useMemo(() => {
    const map = new Map<number, typeof rooms>();
    for (const r of rooms) {
      const f = Number((r as { floor?: number }).floor ?? 0);
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(r);
    }
    for (const [, list] of map) {
      list.sort((a, b) =>
        String((a as { roomNumber?: string }).roomNumber ?? "").localeCompare(
          String((b as { roomNumber?: string }).roomNumber ?? ""),
          undefined,
          { numeric: true }
        )
      );
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [rooms]);

  const loading = roomsLoading || tasksLoading;

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-[#5a189a]">
          <LayoutGrid className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Room board</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Housekeeping & room status</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Physical room status (maintenance, cleaning, etc.) with the latest open housekeeping task
          when present.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {byFloor.map(([floor, list]) => (
            <section key={floor}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {floor === 0 ? "Ground / unassigned floor" : `Floor ${floor}`}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((room) => {
                  const id = String((room as { _id?: string })._id ?? "");
                  const task = taskByRoomId.get(id);
                  const status = String((room as { status?: string }).status ?? "");
                  const cat = (room as { roomCategoryId?: { name?: string } }).roomCategoryId;
                  const catName =
                    typeof cat === "object" && cat && "name" in cat
                      ? String((cat as { name?: string }).name ?? "")
                      : "";

                  return (
                    <div
                      key={id}
                      className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold text-slate-900">
                            {(room as { roomNumber?: string }).roomNumber}
                          </p>
                          {catName && (
                            <p className="text-xs text-slate-500">{catName}</p>
                          )}
                        </div>
                        <DoorOpen className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        Room:{" "}
                        <span
                          className={cn(
                            status === ROOM_STATUS.CLEANING && "text-amber-700",
                            status === ROOM_STATUS.AVAILABLE && "text-emerald-700",
                            status === ROOM_STATUS.OCCUPIED && "text-slate-800"
                          )}
                        >
                          {ROOM_STATUS_LABEL[status] ?? status}
                        </span>
                      </p>
                      {task ? (
                        <div className="mt-2 rounded-lg bg-[#5a189a]/5 px-2 py-1.5 text-xs text-slate-700">
                          <span className="font-medium">HK:</span>{" "}
                          {String(task.taskType ?? "").replace(/([A-Z])/g, " $1")} ·{" "}
                          {String(task.status ?? "")}
                          {task.dueAt && (
                            <span className="block text-slate-500">
                              Due {new Date(String(task.dueAt)).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No open HK task</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
