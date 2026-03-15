"use client";

import { useState } from "react";
import {
  useInvoices,
  useCreateInvoice,
  useBookings,
  useEventBookings,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
  Select,
} from "@/components/ui";
import { Plus, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { INVOICE_STATUS, DEPARTMENT } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: INVOICE_STATUS.DRAFT, label: "Draft" },
  { value: INVOICE_STATUS.ISSUED, label: "Issued" },
  { value: INVOICE_STATUS.PARTIALLY_PAID, label: "Partially Paid" },
  { value: INVOICE_STATUS.PAID, label: "Paid" },
  { value: INVOICE_STATUS.REFUNDED, label: "Refunded" },
  { value: INVOICE_STATUS.VOID, label: "Void" },
];

const STATUS_BADGE_VARIANT: Record<string, "outline" | "info" | "warning" | "success" | "danger" | "default"> = {
  draft: "outline",
  issued: "info",
  partiallyPaid: "warning",
  paid: "success",
  refunded: "danger",
  void: "default",
};
const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
}));

interface InvoiceItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  /** Optional: enter total for this line to auto-fill unit price (total ÷ quantity) */
  totalAmountEntered?: string;
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [searchBooking, setSearchBooking] = useState("");
  const [searchEvent, setSearchEvent] = useState("");

  const [form, setForm] = useState({
    department: DEPARTMENT.ACCOMMODATION as string,
    bookingId: "",
    eventBookingId: "",
    items: [{ id: "1", description: "", quantity: "1", unitPrice: "0" }] as InvoiceItemRow[],
    notes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;
  if (departmentFilter) params.department = departmentFilter;

  const { data, isLoading } = useInvoices(params);
  const { data: bookingsData } = useBookings(
    searchBooking ? { limit: "20", status: "confirmed" } : undefined
  );
  const { data: eventBookingsData } = useEventBookings(
    searchEvent ? { limit: "20" } : undefined
  );
  const createMut = useCreateInvoice();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const bookings = bookingsData?.data ?? [];
  const eventBookings = eventBookingsData?.data ?? [];

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          id: String(Date.now()),
          description: "",
          quantity: "1",
          unitPrice: "0",
          totalAmountEntered: "",
        },
      ],
    }));
  };

  const removeItem = (id: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((i) => i.id !== id),
    }));
  };

  const updateItem = (id: string, field: keyof InvoiceItemRow, value: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, [field]: value } as InvoiceItemRow;
        const qty = parseFloat(field === "quantity" ? value : i.quantity) || 0;
        const totalEntered = field === "totalAmountEntered" ? parseFloat(value) || 0 : parseFloat(i.totalAmountEntered ?? "") || 0;
        if (field === "quantity" && totalEntered > 0 && qty > 0) {
          next.unitPrice = String(Math.round((totalEntered / qty) * 100) / 100);
        } else if (field === "totalAmountEntered") {
          const q = parseFloat(i.quantity) || 0;
          if (parseFloat(value) > 0 && q > 0)
            next.unitPrice = String(Math.round((parseFloat(value) / q) * 100) / 100);
        } else if (field === "unitPrice") {
          next.totalAmountEntered = "";
        }
        return next;
      }),
    }));
  };

  const subtotal = form.items.reduce(
    (sum, i) =>
      sum +
      (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
    0
  );

  const resetForm = () => {
    setForm({
      department: DEPARTMENT.ACCOMMODATION,
      bookingId: "",
      eventBookingId: "",
      items: [{ id: "1", description: "", quantity: "1", unitPrice: "0", totalAmountEntered: "" }],
      notes: "",
    });
    setSearchBooking("");
    setSearchEvent("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceItems = form.items
      .filter((i) => i.description.trim())
      .map((i) => ({
        description: i.description.trim(),
        quantity: parseFloat(i.quantity) || 1,
        unitPrice: parseFloat(i.unitPrice) || 0,
        amount: (parseFloat(i.quantity) || 1) * (parseFloat(i.unitPrice) || 0),
      }));

    if (invoiceItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    if (!form.bookingId && !form.eventBookingId) {
      toast.error("Select a booking or event booking");
      return;
    }

    const payload: Record<string, unknown> = {
      department: form.department,
      items: invoiceItems,
      notes: form.notes.trim() || undefined,
    };
    if (form.bookingId) payload.bookingId = form.bookingId;
    if (form.eventBookingId) payload.eventBookingId = form.eventBookingId;

    try {
      await createMut.mutateAsync(payload);
      toast.success("Invoice created");
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const getRefLabel = (inv: any) => {
    if (inv.bookingId) return `Booking`;
    if (inv.eventBookingId) return `Event`;
    if (inv.guestId) return `Guest`;
    return "-";
  };

  const columns = [
    {
      key: "department",
      header: "Department",
      render: (row: any) =>
        DEPARTMENT_OPTIONS.find((opt) => opt.value === row.department)?.label ??
        row.department ??
        "-",
    },
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (row: any) => (
        <span className="font-medium">{row.invoiceNumber ?? "-"}</span>
      ),
    },
    {
      key: "ref",
      header: "Guest/Booking Ref",
      render: (row: any) => getRefLabel(row),
    },
    {
      key: "itemsCount",
      header: "Items Count",
      render: (row: any) => (row.items?.length ?? 0),
    },
    {
      key: "subtotal",
      header: "Subtotal",
      render: (row: any) =>
        row.subtotal != null ? fmt(row.subtotal) : "-",
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (row: any) =>
        row.totalAmount != null ? fmt(row.totalAmount) : "-",
    },
    {
      key: "paidAmount",
      header: "Paid",
      render: (row: any) =>
        row.paidAmount != null ? fmt(row.paidAmount) : fmt(0),
    },
    {
      key: "balanceDue",
      header: "Balance",
      render: (row: any) => {
        const total = row.totalAmount ?? 0;
        const paid = row.paidAmount ?? 0;
        return fmt(Math.max(0, total - paid));
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? "default"}>
          {STATUS_TABS.find((t) => t.value === row.status)?.label ?? row.status}
        </Badge>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row: any) =>
        row.createdAt
          ? format(new Date(row.createdAt), "MMM d, yyyy")
          : "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <Button variant="ghost" size="sm" aria-label="View">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
        <div className="flex items-center gap-2">
          <Select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Departments" },
              ...DEPARTMENT_OPTIONS,
            ]}
            className="w-48"
          />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
        emptyTitle="No invoices"
        emptyDescription="Create your first invoice to get started."
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Create Invoice"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Department"
            options={DEPARTMENT_OPTIONS}
            value={form.department}
            onChange={(e) =>
              setForm((f) => ({ ...f, department: e.target.value }))
            }
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Room Booking
              </label>
              <Input
                placeholder="Search bookings..."
                value={searchBooking}
                onChange={(e) => setSearchBooking(e.target.value)}
                className="mb-2"
              />
              <select
                value={form.bookingId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    bookingId: e.target.value,
                    eventBookingId: "",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select booking (optional)</option>
                {bookings.map((b: any) => (
                  <option key={b._id} value={b._id}>
                    {b.bookingReference} - {b.guestId?.firstName} {b.guestId?.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Event Booking
              </label>
              <Input
                placeholder="Search events..."
                value={searchEvent}
                onChange={(e) => setSearchEvent(e.target.value)}
                className="mb-2"
              />
              <select
                value={form.eventBookingId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    eventBookingId: e.target.value,
                    bookingId: "",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select event (optional)</option>
                {eventBookings.map((eb: any) => (
                  <option key={eb._id} value={eb._id}>
                    {eb.eventHallId?.name ?? "Event"} - {eb.eventDate ? format(new Date(eb.eventDate), "MMM d, yyyy") : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Items
            </label>
            <p className="mb-2 text-xs text-slate-500">
              Enter quantity and unit price, or use “Total (optional)” to auto-fill unit price from the line total.
            </p>
            <div className="space-y-3">
              {form.items.map((item) => {
                const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      className="min-w-[200px] flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", e.target.value)
                      }
                      className="w-20"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(item.id, "unitPrice", e.target.value)
                      }
                      className="w-28"
                    />
                    <div className="flex flex-col gap-0.5">
                      <label className="text-xs text-slate-500">Total (optional)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 1000"
                        value={item.totalAmountEntered ?? ""}
                        onChange={(e) =>
                          updateItem(item.id, "totalAmountEntered", e.target.value)
                        }
                        className="w-28"
                      />
                    </div>
                    <div className="flex min-w-[100px] flex-col gap-0.5">
                      <span className="text-xs text-slate-500">Line total</span>
                      <span className="text-sm font-medium text-slate-900">
                        {fmt(lineTotal)}
                      </span>
                    </div>
                    {form.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="mt-2"
            >
              Add Row
            </Button>
          </div>

          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{fmt(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-slate-600">Total</span>
              <span className="font-medium">{fmt(subtotal)}</span>
            </div>
          </div>

          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            placeholder="Optional"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
