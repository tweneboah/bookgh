"use client";

import { useMemo, useState } from "react";
import { Epilogue, Manrope } from "next/font/google";
import {
  useFloorOverview,
  useCreateFloor,
  useUpdateFloor,
  useDeleteFloor,
} from "@/hooks/api";
import { cn } from "@/lib/cn";
import { Button, Modal, Input, Textarea } from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreVertical,
  Hotel,
  Star,
  BriefcaseBusiness,
} from "lucide-react";
import toast from "react-hot-toast";

interface FloorRoom {
  _id: string;
  roomNumber: string;
  status: string;
}

interface FloorOverviewItem {
  _id: string;
  floorNumber: number | null;
  name?: string;
  description?: string;
  isActive: boolean;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  rooms: FloorRoom[];
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

function getErrorMessage(error: unknown): string {
  const maybeError = error as ApiErrorShape;
  return maybeError.response?.data?.error?.message ?? "Something went wrong";
}

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ORANGE_GRADIENT = "linear-gradient(135deg, #ff7a2c 0%, #9b3f00 100%)";
const EDITORIAL_SHADOW = "0px 20px 40px rgba(44, 47, 48, 0.06)";

export default function FloorManagementPage() {
  const [editItem, setEditItem] = useState<FloorOverviewItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    floorNumber: "",
    name: "",
    description: "",
    isActive: true,
  });

  const { data, isLoading } = useFloorOverview();
  const createMut = useCreateFloor();
  const updateMut = useUpdateFloor();
  const deleteMut = useDeleteFloor();
  const floors = useMemo<FloorOverviewItem[]>(() => {
    if (!Array.isArray(data?.data)) return [];
    return data.data as FloorOverviewItem[];
  }, [data]);
  const managedFloors = useMemo(
    () => floors.filter((f) => f._id !== "unassigned"),
    [floors]
  );

  const resetForm = () => {
    setForm({
      floorNumber: "",
      name: "",
      description: "",
      isActive: true,
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: FloorOverviewItem) => {
    setEditItem(item);
    setForm({
      floorNumber: item.floorNumber != null ? String(item.floorNumber) : "",
      name: item.name ?? "",
      description: item.description ?? "",
      isActive: item.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      floorNumber: parseInt(form.floorNumber, 10),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      ...(editItem ? { isActive: form.isActive } : {}),
    };

    if (Number.isNaN(payload.floorNumber)) {
      toast.error("Floor number is required");
      return;
    }

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Floor updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Floor created");
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Floor deleted");
      setShowDelete(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const totals = useMemo(
    () =>
      floors.reduce(
        (acc, floor) => ({
          totalRooms: acc.totalRooms + (floor.totalRooms ?? 0),
          available: acc.available + (floor.availableRooms ?? 0),
          occupied: acc.occupied + (floor.occupiedRooms ?? 0),
          cleaning: acc.cleaning + (floor.cleaningRooms ?? 0),
          maintenance: acc.maintenance + (floor.maintenanceRooms ?? 0),
        }),
        { totalRooms: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0 }
      ),
    [floors]
  );

  const floorIconByIndex = [Hotel, Star, BriefcaseBusiness] as const;

  return (
    <div className={cn(manrope.className, "min-h-screen bg-[#f5f6f7] text-[#2c2f30] antialiased")}>
      <main className="mx-auto max-w-[1440px] space-y-16 px-4 py-10 md:px-8 md:py-12">
        <section className="space-y-10">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className={cn(epilogue.className, "text-4xl font-black tracking-tight text-[#2c2f30] md:text-5xl")}>
                Floor Management
              </h1>
              <p className="text-lg text-[#595c5d]">Live room status overview by floor</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className={cn(
                epilogue.className,
                "inline-flex items-center gap-2 rounded-xl px-8 py-4 font-bold text-[#fff0ea] shadow-lg transition-opacity hover:opacity-90"
              )}
              style={{ background: ORANGE_GRADIENT }}
            >
              <Plus className="h-5 w-5" />
              Add Floor
            </button>
          </header>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="group relative overflow-hidden rounded-xl bg-white p-8" style={{ boxShadow: EDITORIAL_SHADOW }}>
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-[#9b3f00]/5 transition-all group-hover:scale-110" />
              <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#595c5d]">Total Rooms</p>
              <div className={cn(epilogue.className, "text-6xl font-bold text-[#ff7a2c]")}>{totals.totalRooms}</div>
            </div>
            {[
              { label: "Available", value: totals.available, dot: "bg-emerald-500" },
              { label: "Occupied", value: totals.occupied, dot: "bg-orange-500" },
              { label: "Cleaning", value: totals.cleaning, dot: "bg-sky-500/30" },
              { label: "Maintenance", value: totals.maintenance, dot: "bg-rose-500/30" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-white p-8" style={{ boxShadow: EDITORIAL_SHADOW }}>
                <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#595c5d]">{kpi.label}</p>
                <div className="flex items-center gap-4">
                  <div className={cn(epilogue.className, "text-5xl font-bold text-[#2c2f30]")}>{kpi.value}</div>
                  <div className={cn("h-2 w-2 rounded-full", kpi.dot)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-l-4 border-[#ff7a2c] py-2 pl-6">
            <h2 className={cn(epilogue.className, "text-3xl font-bold text-[#2c2f30]")}>Floors</h2>
            <p className="text-[#595c5d]">Manage floor numbers, names, and room counts.</p>
          </div>
          <div className="overflow-hidden rounded-xl bg-white" style={{ boxShadow: EDITORIAL_SHADOW }}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#eff1f2]">
                  {["Floor #", "Name", "Description", "Rooms", "Status", "Actions"].map((head, i) => (
                    <th
                      key={head}
                      className={cn(
                        epilogue.className,
                        "px-8 py-5 text-sm font-bold uppercase tracking-wider text-[#2c2f30]",
                        i === 5 ? "text-right" : ""
                      )}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e8ea]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-10 text-center text-sm text-[#595c5d]">
                      Loading floors...
                    </td>
                  </tr>
                ) : managedFloors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-10 text-center text-sm text-[#595c5d]">
                      No floors yet. Add your first floor.
                    </td>
                  </tr>
                ) : (
                  managedFloors.map((row) => (
                    <tr key={row._id} className="group transition-colors hover:bg-[#9b3f00]/5">
                      <td className={cn(epilogue.className, "px-8 py-6 text-2xl font-bold text-[#9b3f00]")}>
                        {row.floorNumber ?? "-"}
                      </td>
                      <td className="px-8 py-6 font-bold text-[#2c2f30]">
                        {row.name ?? `Floor ${row.floorNumber ?? "-"}`}
                      </td>
                      <td className="max-w-xs truncate px-8 py-6 text-[#595c5d]">
                        {row.description || "—"}
                      </td>
                      <td className="px-8 py-6">
                        <span className="rounded-full bg-[#e0e3e4] px-3 py-1 text-sm font-bold">
                          {row.totalRooms} Room{row.totalRooms === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn("flex items-center gap-1 text-sm font-bold", row.isActive !== false ? "text-emerald-600" : "text-[#757778]")}>
                          <CheckCircle2 className="h-4 w-4" />
                          {row.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded-lg p-2 text-[#595c5d] transition-colors hover:bg-white hover:text-[#9b3f00]"
                            aria-label="Edit floor"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDelete(row._id)}
                            className="rounded-lg p-2 text-[#595c5d] transition-colors hover:bg-white hover:text-[#b02500]"
                            aria-label="Delete floor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[#595c5d] transition-colors hover:bg-white hover:text-[#9b3f00]"
                            aria-label="More actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-1">
            <h2 className={cn(epilogue.className, "text-3xl font-bold text-[#2c2f30]")}>Floor Breakdown</h2>
            <p className="text-[#595c5d]">Room status by floor.</p>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-white" />
              ))}
            </div>
          ) : floors.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center text-sm text-[#595c5d]" style={{ boxShadow: EDITORIAL_SHADOW }}>
              No floor data available.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {floors.map((floor, idx) => {
                const Icon = floorIconByIndex[idx % floorIconByIndex.length];
                const title =
                  floor.floorNumber == null
                    ? "Unassigned"
                    : floor.name || `Floor ${floor.floorNumber}`;
                return (
                  <article
                    key={`breakdown-${floor._id}`}
                    className="space-y-6 rounded-xl border-t-4 border-[#9b3f00] bg-white p-8"
                    style={{ boxShadow: EDITORIAL_SHADOW }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={cn(epilogue.className, "text-xl font-bold text-[#2c2f30]")}>{title}</h3>
                        <p className="text-sm font-bold text-[#595c5d]">{floor.totalRooms} Room Total</p>
                      </div>
                      <Icon className="h-5 w-5 text-[#ff7a2c]" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(floor.rooms ?? []).map((room) => (
                        <span
                          key={room._id}
                          className={cn(
                            "rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-tight",
                            room.status === "available"
                              ? "bg-emerald-50 text-emerald-700"
                              : room.status === "occupied"
                                ? "bg-orange-50 text-orange-700"
                                : room.status === "cleaning"
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {room.roomNumber} — {room.status}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2 border-t border-[#e6e8ea] pt-4 text-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#595c5d]">Avail</p>
                        <p className={cn(epilogue.className, "text-lg font-bold", floor.availableRooms > 0 ? "text-emerald-600" : "text-[#2c2f30]")}>
                          {floor.availableRooms}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#595c5d]">Occ</p>
                        <p className={cn(epilogue.className, "text-lg font-bold", floor.occupiedRooms > 0 ? "text-[#9b3f00]" : "text-[#2c2f30]")}>
                          {floor.occupiedRooms}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#595c5d]">Clean</p>
                        <p className={cn(epilogue.className, "text-lg font-bold text-[#2c2f30]")}>{floor.cleaningRooms}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#595c5d]">Maint</p>
                        <p className={cn(epilogue.className, "text-lg font-bold text-[#2c2f30]")}>{floor.maintenanceRooms}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Floor" : "Add Floor"}
        className="border-[#abadae]/25"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Floor Number"
            type="number"
            min="0"
            value={form.floorNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, floorNumber: e.target.value }))
            }
            required
            placeholder="e.g. 1"
          />
          <Input
            label="Floor Name"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            required
            placeholder="e.g. First Floor"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            placeholder="Optional notes about this floor"
          />
          {editItem && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl font-semibold text-white bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] border-0"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Floor"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this floor? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="rounded-xl border-slate-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
            className="rounded-xl"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
