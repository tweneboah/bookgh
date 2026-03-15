"use client";

import { useState, useMemo } from "react";
import {
  useRooms,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
  useRoomCategories,
  useFloorOverview,
} from "@/hooks/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Modal,
  Input,
  Badge,
  Dropdown,
  StatCard,
  AppReactSelect,
} from "@/components/ui";
import { Plus, Pencil, Trash2, MoreVertical, BedDouble, Layers, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ROOM_STATUS } from "@/constants";
import Link from "next/link";

const STATUS_OPTIONS = Object.entries(ROOM_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_BADGE_VARIANT: Record<string, "success" | "info" | "default" | "warning" | "danger" | "outline"> = {
  available: "success",
  reserved: "info",
  occupied: "default",
  cleaning: "warning",
  maintenance: "danger",
  outOfService: "outline",
};

export default function RoomsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    roomNumber: "",
    floor: "",
    roomCategoryId: "",
    notes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;
  if (categoryFilter) params.roomCategoryId = categoryFilter;

  const { data, isLoading } = useRooms(params);
  const { data: categoriesData } = useRoomCategories({ limit: "100" });
  const { data: floorsData } = useFloorOverview();
  const createMut = useCreateRoom();
  const updateMut = useUpdateRoom();
  const deleteMut = useDeleteRoom();

  const rawItems = data?.data ?? data;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const pagination = data?.meta?.pagination;
  const rawCategories = categoriesData?.data ?? categoriesData;
  const categories = Array.isArray(rawCategories) ? rawCategories : [];
  const rawFloors = floorsData?.data ?? floorsData;
  const floors = Array.isArray(rawFloors)
    ? (rawFloors as { _id: string; floorNumber: number | null; name?: string }[]).filter(
        (f) => f._id !== "unassigned" && f.floorNumber != null
      )
    : [];

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...categories.map((c: any) => ({ value: c._id, label: c.name })),
    ],
    [categories]
  );
  const statusOptions = useMemo(
    () => [{ value: "", label: "All Statuses" }, ...STATUS_OPTIONS],
    []
  );
  const floorOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...floors.map((f) => ({
        value: String(f.floorNumber),
        label: f.name ? `${f.name} (Floor ${f.floorNumber})` : `Floor ${f.floorNumber}`,
      })),
    ],
    [floors]
  );
  const formCategoryOptions = useMemo(
    () => [
      { value: "", label: "Select category..." },
      ...categories.map((c: any) => ({ value: c._id, label: c.name })),
    ],
    [categories]
  );

  const availableCount = useMemo(
    () => items.filter((r: any) => r.status === ROOM_STATUS.AVAILABLE).length,
    [items]
  );

  const resetForm = () => {
    setForm({
      roomNumber: "",
      floor: "",
      roomCategoryId: "",
      notes: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      roomNumber: item.roomNumber ?? "",
      floor: item.floor != null ? String(item.floor) : "",
      roomCategoryId: item.roomCategoryId?._id ?? item.roomCategoryId ?? "",
      notes: item.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomCategoryId) {
      toast.error("Please select a room category");
      return;
    }
    const payload = {
      roomNumber: form.roomNumber.trim(),
      floor: form.floor ? parseInt(form.floor, 10) : undefined,
      roomCategoryId: form.roomCategoryId || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Room updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Room created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Room deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleStatusChange = async (room: any, newStatus: string) => {
    try {
      await updateMut.mutateAsync({
        id: room._id,
        status: newStatus,
      });
      toast.success("Room status updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const columns = [
    {
      key: "image",
      header: "",
      render: (row: any) => {
        const cat = row.roomCategoryId;
        const img = cat?.images?.[0]?.url;
        return img ? (
          <img
            src={img}
            alt={`Room ${row.roomNumber}`}
            className="h-10 w-14 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-slate-100">
            <BedDouble className="h-5 w-5 text-slate-400" />
          </div>
        );
      },
    },
    {
      key: "roomNumber",
      header: "Room #",
      render: (row: any) => (
        <span className="font-semibold text-slate-900">{row.roomNumber ?? "-"}</span>
      ),
    },
    {
      key: "floor",
      header: "Floor",
      render: (row: any) => row.floor ?? "—",
    },
    {
      key: "roomCategoryId",
      header: "Category",
      render: (row: any) => {
        const cat = row.roomCategoryId;
        return cat?.name ?? (cat ? String(cat) : "—");
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? "default"}>
          {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Dropdown
            trigger={
              <>
                <span className="sr-only">Quick status</span>
                <MoreVertical className="h-4 w-4" />
              </>
            }
            items={STATUS_OPTIONS.map((opt) => ({
              id: opt.value,
              label: opt.label,
              onClick: () => handleStatusChange(row, opt.value),
            }))}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
            className="text-slate-600 hover:bg-[#f5f0ff] hover:text-[#5a189a]"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-0 bg-white font-sans">
      {/* Hero header */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 h-1 w-12 rounded-full bg-gradient-to-r from-[#ff6d00] to-[#ff9e00]" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Rooms
              </h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Manage inventory, update room status, and keep assignments clean.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="h-11 shrink-0 bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md transition hover:opacity-95 focus-visible:ring-[#ff8500]"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={BedDouble}
            title="Total rooms"
            value={pagination?.total ?? 0}
            description="All rooms"
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          />
          <StatCard
            icon={CheckCircle}
            title="Available"
            value={availableCount}
            description={`on this page`}
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          />
          <StatCard
            icon={Layers}
            title="Categories"
            value={categories.length}
            description="Room types"
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hidden sm:block"
          />
        </div>

        {!isLoading && categories.length === 0 && (
          <Card className="mb-6 rounded-xl border-amber-200/80 bg-amber-50/50">
            <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm text-amber-800">
              <strong>No room categories found.</strong>{" "}
              <span>Create room categories before adding rooms.</span>
              <Link
                href="/room-categories"
                className="font-medium text-[#5a189a] underline hover:text-[#7b2cbf]"
              >
                Room categories →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        <Card className="mb-6 rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <AppReactSelect
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                options={statusOptions}
                placeholder="All statuses"
                className="w-full sm:w-44"
              />
              <AppReactSelect
                value={categoryFilter}
                onChange={(v) => {
                  setCategoryFilter(v);
                  setPage(1);
                }}
                options={categoryOptions}
                placeholder="All categories"
                className="w-full sm:w-48"
              />
            </div>
            <Button
              onClick={openCreate}
              className="h-11 shrink-0 bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md hover:opacity-95 focus-visible:ring-[#ff8500]"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </CardContent>
        </Card>

        {/* Rooms table */}
        <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
              All rooms
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={items}
              getRowKey={(row) => row._id}
              loading={isLoading}
              pagination={
                pagination
                  ? {
                      page: pagination.page,
                      limit: pagination.limit,
                      total: pagination.total,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              emptyTitle="No rooms"
              emptyDescription="Add your first room to get started."
              className="[&_table]:min-w-full [&_thead]:bg-[#faf9fc] [&_th]:font-semibold [&_th]:text-slate-600"
            />
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Room modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Room" : "Add Room"}
        size="lg"
        className="max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-xl"
      >
        <form onSubmit={handleSubmit} className="overflow-hidden">
          <div className="relative -mx-6 -mt-4 mb-6 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#fff8f2] via-white to-[#f5f0ff] px-5 py-4">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#ff9e00]/20 blur-2xl" aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7b2cbf]/30 to-transparent" aria-hidden />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <BedDouble className="h-5 w-5 text-[#7b2cbf]" />
              </div>
              <p className="text-sm text-slate-600">
                {editItem ? "Update room number, floor, category and notes." : "Add a new room. Set number, floor and category."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Room Number"
                value={form.roomNumber}
                onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                required
                placeholder="e.g. 101"
                className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
              />
              <AppReactSelect
                label="Floor"
                value={form.floor}
                options={floorOptions}
                onChange={(v) => setForm((f) => ({ ...f, floor: v }))}
                placeholder="Unassigned"
                isClearable
              />
            </div>
            <AppReactSelect
              label="Category"
              value={form.roomCategoryId}
              options={formCategoryOptions}
              onChange={(v) => setForm((f) => ({ ...f, roomCategoryId: v }))}
              placeholder="Select category..."
            />
            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
              className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMut.isPending || updateMut.isPending}
                className="rounded-lg bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md hover:opacity-95 focus-visible:ring-[#ff8500]"
              >
                {editItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Room" className="rounded-2xl border-0 shadow-xl">
        <p className="text-slate-600">
          Are you sure you want to delete this room? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="rounded-lg border-slate-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
            className="rounded-lg"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
