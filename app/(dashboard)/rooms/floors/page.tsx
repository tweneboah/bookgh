"use client";

import { useMemo, useState } from "react";
import {
  useFloorOverview,
  useCreateFloor,
  useUpdateFloor,
  useDeleteFloor,
} from "@/hooks/api";
import type { DataTableColumn } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button, DataTable, Modal, Input, Textarea } from "@/components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Building2, BedDouble, Sparkles, Wrench, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<
  string,
  "success" | "warning" | "danger" | "info" | "default" | "outline"
> = {
  available: "success",
  occupied: "info",
  cleaning: "warning",
  maintenance: "danger",
  outOfService: "outline",
  reserved: "default",
};

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

  const columns: DataTableColumn<FloorOverviewItem>[] = [
    {
      key: "floorNumber",
      header: "Floor #",
      render: (row) => row.floorNumber ?? "-",
    },
    {
      key: "name",
      header: "Name",
      render: (row) => row.name ?? `Floor ${row.floorNumber ?? "-"}`,
    },
    {
      key: "description",
      header: "Description",
      render: (row) => row.description ?? "-",
    },
    {
      key: "rooms",
      header: "Rooms",
      render: (row) => row.totalRooms ?? 0,
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <Badge variant={row.isActive !== false ? "success" : "outline"}>
          {row.isActive !== false ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit floor"
            className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/50"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete floor"
            className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Hero */}
      <div className="relative border-b border-slate-100 bg-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[min(80vw,380px)] h-[min(80vw,380px)] bg-[#ff9100]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Floor Management
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Live room status overview by floor.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={openCreate}
              className="shrink-0 rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden />
              Add Floor
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Rooms</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <BedDouble className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalRooms}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Available</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{totals.available}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Occupied</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.occupied}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Cleaning</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{totals.cleaning}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Maintenance</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-700">{totals.maintenance}</p>
          </div>
        </div>

        {/* Floors table */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Floors</h2>
              <p className="text-sm text-slate-500 mt-0.5">Manage floor numbers, names, and room counts.</p>
            </div>
          </div>
          <div className="p-0">
            <DataTable
              columns={columns}
              data={managedFloors}
              getRowKey={(row) => row._id}
              loading={isLoading}
              emptyTitle="No floors"
              emptyDescription="Create your first floor to manage room placement."
            />
          </div>
        </div>

        {/* Floor breakdown */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#ff6d00] to-[#ff9e00] shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Floor Breakdown</h2>
              <p className="text-sm text-slate-500 mt-0.5">Room status by floor.</p>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : floors.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No floor data available.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {floors.map((floor) => (
                  <div
                    key={`floor-${floor._id}`}
                    className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">
                        {floor.floorNumber == null
                          ? "Unassigned"
                          : floor.name || `Floor ${floor.floorNumber}`}
                      </h3>
                      <Badge variant="default" className="rounded-md">{floor.totalRooms} rooms</Badge>
                    </div>
                    {floor.description && (
                      <p className="text-xs text-slate-500">{floor.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700 font-medium">
                        Available: {floor.availableRooms}
                      </div>
                      <div className="rounded-lg bg-[#5a189a]/10 px-2.5 py-1.5 text-[#5a189a] font-medium">
                        Occupied: {floor.occupiedRooms}
                      </div>
                      <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700 font-medium">
                        Cleaning: {floor.cleaningRooms}
                      </div>
                      <div className="rounded-lg bg-red-50 px-2.5 py-1.5 text-red-700 font-medium">
                        Maintenance: {floor.maintenanceRooms}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rooms</p>
                      <div className="flex flex-wrap gap-2">
                        {(floor.rooms ?? []).map((room) => (
                          <Badge
                            key={room._id}
                            variant={STATUS_BADGE[room.status] ?? "outline"}
                            className="text-[11px] rounded-md"
                          >
                            {room.roomNumber} — {room.status}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Floor" : "Add Floor"}
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
