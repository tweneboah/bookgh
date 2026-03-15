"use client";

import { useState, useMemo } from "react";
import {
  useOrders,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useTables,
  useMenuItems,
  useRooms,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
  Dropdown,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import {
  FiPlus,
  FiTrash2,
  FiMoreVertical,
  FiPrinter,
  FiShoppingBag,
  FiHash,
  FiDollarSign,
  FiCheckCircle,
  FiFilter,
  FiMapPin,
  FiList,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  POS_ORDER_STATUS,
  POS_PAYMENT_STATUS,
  PAYMENT_METHOD,
} from "@/constants";
import { useSearchParams } from "next/navigation";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const ORDER_STATUS_OPTIONS = Object.entries(POS_ORDER_STATUS).map(([k, v]) => ({
  value: v,
  label: k
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
}));

const ORDER_STATUS_BADGE: Record<string, "warning" | "info" | "success" | "default" | "danger"> = {
  pending: "warning",
  preparing: "info",
  ready: "success",
  served: "success",
  completed: "default",
  cancelled: "danger",
};

const PAYMENT_OPTIONS = Object.entries(POS_PAYMENT_STATUS).map(([k, v]) => ({
  value: v,
  label: k
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
}));

const PAYMENT_BADGE: Record<string, "danger" | "success"> = {
  unpaid: "danger",
  paid: "success",
};

interface OrderItemRow {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([k, v]) => ({
  value: v,
  label: k
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
}));

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? undefined;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastCapturedReceipt, setLastCapturedReceipt] = useState<any>(null);

  const [form, setForm] = useState({
    tableId: "",
    addToRoomBill: false,
    roomId: "",
    items: [{ menuItemId: "", name: "", quantity: 0, unitPrice: 0, amount: 0 }] as OrderItemRow[],
  });
  const [paymentForm, setPaymentForm] = useState({
    method: PAYMENT_METHOD.CASH,
    amountTendered: "",
    reference: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (department) params.department = department;
  if (statusFilter) params.status = statusFilter;
  if (paymentFilter) params.paymentStatus = paymentFilter;

  const { data, isLoading } = useOrders(params);
  const { data: tablesData } = useTables({
    limit: "100",
    ...(department ? { department } : {}),
  });
  const { data: menuData } = useMenuItems({
    limit: "500",
    ...(department ? { department } : {}),
  });
  const { data: roomsData } = useRooms({ limit: "100" });
  const createMut = useCreateOrder();
  const updateMut = useUpdateOrder();
  const deleteMut = useDeleteOrder();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const tables = tablesData?.data ?? [];
  const menuItems = menuData?.data ?? [];
  const rooms = roomsData?.data ?? [];

  const tableMap = useMemo(
    () => Object.fromEntries(tables.map((t: any) => [String(t._id), t.tableNumber ?? t._id])),
    [tables]
  );
  const roomMap = useMemo(
    () => Object.fromEntries(rooms.map((r: any) => [String(r._id), r.roomNumber ?? r._id])),
    [rooms]
  );
  const menuMap = useMemo(
    () => Object.fromEntries(menuItems.map((m: any) => [String(m._id), m])),
    [menuItems]
  );

  const paymentPreview = useMemo(() => {
    if (!paymentOrder) {
      return {
        totalAmount: 0,
        paidSoFar: 0,
        dueBefore: 0,
        applyAmount: 0,
        changeDue: 0,
        balanceAfter: 0,
      };
    }
    const totalAmount = Number(paymentOrder.totalAmount ?? 0);
    const paidSoFar = Number(
      (paymentOrder.partialPayments ?? []).reduce(
        (sum: number, row: any) => sum + Number(row?.amount ?? 0),
        0
      )
    );
    const dueBefore = Math.max(0, Number((totalAmount - paidSoFar).toFixed(2)));
    const amountTendered = Number(paymentForm.amountTendered || 0);
    const isCash = paymentForm.method === PAYMENT_METHOD.CASH;
    const applyAmount = Math.max(0, Math.min(dueBefore, amountTendered));
    const changeDue = isCash ? Math.max(0, Number((amountTendered - applyAmount).toFixed(2))) : 0;
    const balanceAfter = Math.max(0, Number((dueBefore - applyAmount).toFixed(2)));
    return { totalAmount, paidSoFar, dueBefore, applyAmount, changeDue, balanceAfter };
  }, [paymentOrder, paymentForm.amountTendered, paymentForm.method]);

  const paymentHistoryRows = useMemo(() => {
    if (!paymentOrder) return [];
    const totalAmount = Number(paymentOrder.totalAmount ?? 0);
    let runningPaid = 0;
    return (paymentOrder.partialPayments ?? []).map((row: any, idx: number) => {
      const amount = Number(row.amount ?? 0);
      const paidBefore = runningPaid;
      runningPaid = Number((runningPaid + amount).toFixed(2));
      return {
        ...row,
        _idx: idx,
        amount,
        paidBefore,
        paidAfter: runningPaid,
        balanceAfter: Math.max(0, Number((totalAmount - runningPaid).toFixed(2))),
      };
    });
  }, [paymentOrder]);

  const menuOptions = menuItems.map((m: any) => ({
    value: m._id,
    label: `${m.name} - ${fmt(m.price ?? 0)}`,
  }));

  const resetForm = () => {
    setForm({
      tableId: "",
      addToRoomBill: false,
      roomId: "",
      items: [{ menuItemId: "", name: "", quantity: 0, unitPrice: 0, amount: 0 }],
    });
  };

  const openPaymentModal = (order: any) => {
    setPaymentOrder(order);
    setPaymentForm({
      method: PAYMENT_METHOD.CASH,
      amountTendered: "",
      reference: "",
    });
    setLastCapturedReceipt(null);
    setShowPaymentModal(true);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const addItemRow = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { menuItemId: "", name: "", quantity: 0, unitPrice: 0, amount: 0 }],
    }));
  };

  const removeItemRow = (idx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItemRow = (idx: number, field: keyof OrderItemRow, value: string | number) => {
    setForm((f) => {
      const next = [...f.items];
      const normalizedValue =
        field === "quantity" || field === "unitPrice" ? Number(value || 0) : value;
      const row = { ...next[idx], [field]: normalizedValue };
      if (field === "menuItemId") {
        const mi = menuMap[String(value)];
        if (mi) {
          row.name = mi.name ?? "";
          row.unitPrice = mi.price ?? 0;
        }
      }
      if (field === "quantity" || field === "unitPrice") {
        const q = field === "quantity" ? Number(normalizedValue) : Number(next[idx].quantity);
        const p = field === "unitPrice" ? Number(normalizedValue) : Number(next[idx].unitPrice);
        row.amount = q * p;
      }
      next[idx] = row;
      return { ...f, items: next };
    });
  };

  const { subtotal, totalAmount } = useMemo(() => {
    const sub = form.items.reduce((s, i) => s + (i.amount || 0), 0);
    return { subtotal: sub, totalAmount: sub };
  }, [form.items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = form.items.filter(
      (i) => i.menuItemId && i.name && i.quantity > 0 && i.unitPrice >= 0
    );
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    const orderItems = validItems.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      amount: Number((Number(i.quantity) * Number(i.unitPrice)).toFixed(2)),
    }));

    const sub = orderItems.reduce((s, i) => s + i.amount, 0);

    const payload: Record<string, unknown> = {
      tableId: form.tableId || undefined,
      roomId: form.addToRoomBill && form.roomId ? form.roomId : undefined,
      items: orderItems,
      subtotal: sub,
      tax: 0,
      totalAmount: sub,
      addToRoomBill: form.addToRoomBill,
    };

    try {
      await createMut.mutateAsync({ department, ...payload });
      toast.success("Order created");
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync({ id: showDelete, department });
      toast.success("Order deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleStatusChange = async (order: any, newStatus: string) => {
    try {
      await updateMut.mutateAsync({ id: order._id, department, status: newStatus });
      toast.success("Order status updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handlePaymentChange = async (order: any, newPayment: string) => {
    try {
      await updateMut.mutateAsync({
        id: order._id,
        department,
        paymentStatus: newPayment,
      });
      toast.success("Payment status updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOrder) return;
    const amountTendered = Number(paymentForm.amountTendered || 0);
    if (!Number.isFinite(amountTendered) || amountTendered <= 0) {
      toast.error("Enter a valid amount tendered");
      return;
    }
    if (paymentForm.method !== PAYMENT_METHOD.CASH && amountTendered > paymentPreview.dueBefore) {
      toast.error("Non-cash payment cannot exceed outstanding balance");
      return;
    }
    if (paymentPreview.applyAmount <= 0) {
      toast.error("No payable amount to apply");
      return;
    }
    const capturedAt = new Date().toISOString();
    const nextPartials = [
      ...(paymentOrder.partialPayments ?? []),
      {
        method: paymentForm.method,
        amount: paymentPreview.applyAmount,
        reference: paymentForm.reference || undefined,
        paidAt: capturedAt,
      },
    ];
    const totalPaid = Number(
      nextPartials.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0).toFixed(2)
    );
    const status =
      totalPaid >= Number(paymentOrder.totalAmount ?? 0)
        ? POS_PAYMENT_STATUS.PAID
        : POS_PAYMENT_STATUS.PARTIAL;
    try {
      await updateMut.mutateAsync({
        id: paymentOrder._id,
        department,
        paymentStatus: status,
        partialPayments: nextPartials,
      });
      const methodLabel =
        PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === paymentForm.method)?.label ??
        paymentForm.method;
      setLastCapturedReceipt({
        orderNumber: paymentOrder.orderNumber,
        totalAmount: Number(paymentOrder.totalAmount ?? 0),
        method: paymentForm.method,
        methodLabel,
        amountApplied: paymentPreview.applyAmount,
        reference: paymentForm.reference || "",
        paidAt: capturedAt,
        paidBefore: paymentPreview.paidSoFar,
        paidAfter: Number((paymentPreview.paidSoFar + paymentPreview.applyAmount).toFixed(2)),
        balanceAfter: paymentPreview.balanceAfter,
        changeDue: paymentPreview.changeDue,
      });
      setPaymentOrder((prev: any) =>
        prev
          ? {
              ...prev,
              partialPayments: nextPartials,
              paymentStatus: status,
            }
          : prev
      );
      setPaymentForm((prev) => ({
        ...prev,
        amountTendered: "",
        reference: "",
      }));
      toast.success(
        status === POS_PAYMENT_STATUS.PAID
          ? `Payment completed. Change due ${fmt(paymentPreview.changeDue)}`
          : `Partial payment recorded. Balance ${fmt(paymentPreview.balanceAfter)}`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to capture payment");
    }
  };

  const printReceipt = (payload: {
    orderNumber: string;
    totalAmount: number;
    methodLabel: string;
    amountApplied: number;
    reference?: string;
    paidAt: string;
    paidBefore: number;
    paidAfter: number;
    balanceAfter: number;
    changeDue: number;
  }) => {
    const html = `
      <html>
        <head>
          <title>Payment Receipt ${payload.orderNumber}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 24px; color:#0f172a;">
          <h2 style="margin:0 0 8px 0;">Restaurant Payment Receipt</h2>
          <p style="margin:0 0 4px 0;"><strong>Order #:</strong> ${payload.orderNumber}</p>
          <p style="margin:0 0 4px 0;"><strong>Paid At:</strong> ${new Date(payload.paidAt).toLocaleString()}</p>
          <p style="margin:0 0 12px 0;"><strong>Method:</strong> ${payload.methodLabel}</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
            <tbody>
              <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Order Total</td><td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${fmt(payload.totalAmount)}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Paid Before</td><td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${fmt(payload.paidBefore)}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Amount Applied</td><td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${fmt(payload.amountApplied)}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Paid After</td><td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${fmt(payload.paidAfter)}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Balance</td><td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${fmt(payload.balanceAfter)}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Change</td><td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${fmt(payload.changeDue)}</td></tr>
              <tr><td style="padding:8px;">Reference</td><td style="padding:8px; text-align:right;">${payload.reference || "-"}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Unable to open print window");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const columns = [
    {
      key: "orderNumber",
      header: "Order #",
      render: (row: any) => row.orderNumber ?? "-",
    },
    {
      key: "tableId",
      header: "Table",
      render: (row: any) => {
        const tid = row.tableId?._id ?? row.tableId;
        return tid ? (tableMap[String(tid)] ?? "-") : "-";
      },
    },
    {
      key: "itemsCount",
      header: "Items",
      render: (row: any) =>
        Array.isArray(row.items) ? row.items.reduce((s: number, i: any) => s + (i.quantity || 0), 0) : 0,
    },
    {
      key: "subtotal",
      header: "Subtotal",
      render: (row: any) => (row.subtotal != null ? fmt(row.subtotal) : "-"),
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (row: any) => (row.totalAmount != null ? fmt(row.totalAmount) : "-"),
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={ORDER_STATUS_BADGE[row.status] ?? "default"}>
          {ORDER_STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status ?? "-"}
        </Badge>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      render: (row: any) => (
        <Badge variant={PAYMENT_BADGE[row.paymentStatus] ?? "default"}>
          {PAYMENT_OPTIONS.find((o) => o.value === row.paymentStatus)?.label ?? row.paymentStatus ?? "-"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPaymentModal(row)}
            className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/50"
          >
            Take Payment
          </Button>
          <Dropdown
            trigger={
              <>
                <span className="sr-only">More actions</span>
                <FiMoreVertical className="h-4 w-4" />
              </>
            }
            items={[
              ...ORDER_STATUS_OPTIONS.map((opt) => ({
                id: `status-${opt.value}`,
                label: `Status: ${opt.label}`,
                onClick: () => handleStatusChange(row, opt.value),
              })),
              ...PAYMENT_OPTIONS.map((opt) => ({
                id: `pay-${opt.value}`,
                label: `Payment: ${opt.label}`,
                onClick: () => handlePaymentChange(row, opt.value),
              })),
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalRevenue = items.reduce((s: number, r: any) => s + (r.totalAmount ?? 0), 0);
  const paidCount = items.filter((r: any) => r.paymentStatus === "paid").length;

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Hero */}
      <div className="relative border-b border-slate-100 bg-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[min(80vw,380px)] h-[min(80vw,380px)] bg-gradient-to-br from-[#ff9100]/10 to-[#ff6d00]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <FiShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    POS Orders
                  </h1>
                  {department && (
                    <p className="text-sm font-medium text-[#5a189a] mt-0.5 capitalize">
                      {department}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-slate-500 text-sm sm:text-base max-w-xl">
                Create and manage orders, capture payments, and track table and room charges.
              </p>
            </div>
            <div className="shrink-0">
              <Button
                onClick={openCreate}
                className="h-12 px-6 rounded-xl font-semibold text-white border-0 shadow-lg shadow-[#ff6d00]/25 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-offset-2 focus:ring-[#ff6d00] transition-all hover:-translate-y-0.5"
              >
                <FiPlus className="h-5 w-5 mr-2" aria-hidden />
                New Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <FiHash className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Orders</p>
                <p className="text-xl font-bold text-slate-900">{pagination?.total ?? items.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6d00]/10 text-[#ff6d00]">
                <FiDollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total (this page)</p>
                <p className="text-xl font-bold text-slate-900">{fmt(totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FiCheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Paid</p>
                <p className="text-xl font-bold text-slate-900">{items.length ? paidCount : "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Table card */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
              <div className="flex items-center gap-2 text-slate-600">
                <FiFilter className="h-4 w-4 text-[#5a189a] shrink-0" aria-hidden />
                <span className="text-sm font-semibold">Filters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 sm:flex-1 max-w-2xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</label>
                  <AppReactSelect
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                    options={[
                      { value: "", label: "All Statuses" },
                      ...ORDER_STATUS_OPTIONS,
                    ]}
                    placeholder="All Statuses"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</label>
                  <AppReactSelect
                    value={paymentFilter}
                    onChange={(v) => {
                      setPaymentFilter(v);
                      setPage(1);
                    }}
                    options={[
                      { value: "", label: "All Payment" },
                      ...PAYMENT_OPTIONS,
                    ]}
                    placeholder="All Payment"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-0 sm:p-2 min-h-[380px]">
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
              emptyTitle="No orders"
              emptyDescription="Create your first order to get started."
            />
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Create Order"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Table & billing */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Table & billing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AppReactSelect
                label="Table"
                value={form.tableId}
                onChange={(v) => setForm((f) => ({ ...f, tableId: v }))}
                options={[
                  { value: "", label: "Select table..." },
                  ...tables.map((t: any) => ({
                    value: t._id,
                    label: `${t.tableNumber ?? t._id} (${t.capacity ?? "-"} seats)`,
                  })),
                ]}
                placeholder="Select table..."
                className="w-full"
              />
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.addToRoomBill}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, addToRoomBill: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                  />
                  <span className="text-sm font-medium text-slate-700">Add to room bill</span>
                </label>
                {form.addToRoomBill && (
                  <AppReactSelect
                    label="Room"
                    value={form.roomId}
                    onChange={(v) => setForm((f) => ({ ...f, roomId: v }))}
                    options={[
                      { value: "", label: "Select room..." },
                      ...rooms.map((r: any) => ({
                        value: r._id,
                        label: r.roomNumber ?? r._id,
                      })),
                    ]}
                    placeholder="Select room..."
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                Order items
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItemRow}
                className="rounded-lg border-[#5a189a]/40 text-[#5a189a] hover:bg-[#5a189a]/10 font-medium"
              >
                <FiPlus className="h-4 w-4 mr-1.5" />
                Add item
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Item</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600 w-20">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600 w-28">Unit price</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600 w-28">Amount</th>
                    <th className="w-20 py-3 px-2" aria-label="Action" />
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                      <td className="py-2 px-4 align-middle">
                        <AppReactSelect
                          placeholder="Select item..."
                          options={[{ value: "", label: "Select item..." }, ...menuOptions]}
                          value={item.menuItemId}
                          onChange={(v) => updateItemRow(idx, "menuItemId", v)}
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="py-2 px-4 text-right align-middle">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                          placeholder="0"
                          className="w-full max-w-[5rem] rounded-lg border-slate-200 text-right inline-block"
                        />
                      </td>
                      <td className="py-2 px-4 text-right align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItemRow(idx, "unitPrice", e.target.value)}
                          placeholder="0"
                          className="w-full max-w-[6rem] rounded-lg border-slate-200 text-right inline-block ml-auto"
                        />
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-slate-800 align-middle whitespace-nowrap">
                        {fmt(item.amount || 0)}
                      </td>
                      <td className="py-2 px-2 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemRow(idx)}
                          disabled={form.items.length <= 1}
                          className="text-red-600 hover:bg-red-50 rounded-lg"
                          aria-label="Remove row"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order total */}
          <div className="rounded-2xl border-2 border-[#5a189a]/20 bg-gradient-to-br from-[#5a189a]/05 to-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subtotal</p>
                <p className="text-lg font-semibold text-slate-800">{fmt(subtotal)}</p>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</p>
                <p className="text-2xl font-bold text-[#5a189a]">{fmt(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-slate-100">
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
              loading={createMut.isPending}
              className="rounded-xl font-semibold text-white border-0 shadow-lg shadow-[#ff6d00]/25 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
            >
              Create Order
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentOrder(null);
          setLastCapturedReceipt(null);
        }}
        title="Take Payment"
        size="lg"
      >
        <form onSubmit={submitPayment} className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
            <p className="font-semibold text-slate-800">
              Order: {paymentOrder?.orderNumber ?? "-"}
            </p>
            <p className="text-slate-600 mt-1">
              Total: {fmt(paymentPreview.totalAmount)} · Paid: {fmt(paymentPreview.paidSoFar)}
            </p>
            <p className="text-slate-700 mt-1">
              Outstanding: <span className="font-semibold text-[#5a189a]">{fmt(paymentPreview.dueBefore)}</span>
            </p>
          </div>

          <AppReactSelect
            label="Payment Method"
            value={paymentForm.method}
            onChange={(v) =>
              setPaymentForm((f) => ({ ...f, method: v }))
            }
            options={PAYMENT_METHOD_OPTIONS}
            placeholder="Select method..."
            className="w-full"
          />
          <Input
            label="Amount Tendered"
            type="number"
            min="0"
            step="0.01"
            value={paymentForm.amountTendered}
            onChange={(e) =>
              setPaymentForm((f) => ({ ...f, amountTendered: e.target.value }))
            }
            placeholder="0.00"
            required
          />
          <Input
            label="Reference"
            value={paymentForm.reference}
            onChange={(e) =>
              setPaymentForm((f) => ({ ...f, reference: e.target.value }))
            }
            placeholder="Optional transaction reference"
          />

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs font-medium">Apply</p>
              <p className="font-semibold text-slate-800">{fmt(paymentPreview.applyAmount)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium">Change</p>
              <p className="font-semibold text-emerald-600">{fmt(paymentPreview.changeDue)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium">Balance</p>
              <p className="font-semibold text-[#5a189a]">{fmt(paymentPreview.balanceAfter)}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Payment History</p>
              {lastCapturedReceipt ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => printReceipt(lastCapturedReceipt)}
                >
                  <FiPrinter className="h-4 w-4" />
                  Print Latest Receipt
                </Button>
              ) : null}
            </div>
            {paymentHistoryRows.length === 0 ? (
              <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                No installments yet. Capture the first payment to build history and print receipts.
              </div>
            ) : (
              <div className="max-h-44 overflow-auto rounded border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">Date</th>
                      <th className="px-2 py-2 text-left font-medium">Method</th>
                      <th className="px-2 py-2 text-right font-medium">Amount</th>
                      <th className="px-2 py-2 text-right font-medium">Balance</th>
                      <th className="px-2 py-2 text-right font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistoryRows.map((row: any) => {
                      const methodLabel =
                        PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === row.method)?.label ??
                        row.method;
                      return (
                        <tr key={`${row._idx}-${row.paidAt}`} className="border-t border-slate-100">
                          <td className="px-2 py-2">{new Date(row.paidAt).toLocaleString()}</td>
                          <td className="px-2 py-2">{methodLabel}</td>
                          <td className="px-2 py-2 text-right">{fmt(row.amount)}</td>
                          <td className="px-2 py-2 text-right">{fmt(row.balanceAfter)}</td>
                          <td className="px-2 py-2 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                printReceipt({
                                  orderNumber: paymentOrder.orderNumber,
                                  totalAmount: Number(paymentOrder.totalAmount ?? 0),
                                  methodLabel,
                                  amountApplied: Number(row.amount ?? 0),
                                  reference: row.reference,
                                  paidAt: row.paidAt,
                                  paidBefore: Number(row.paidBefore ?? 0),
                                  paidAfter: Number(row.paidAfter ?? 0),
                                  balanceAfter: Number(row.balanceAfter ?? 0),
                                  changeDue: 0,
                                })
                              }
                            >
                              Print
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentOrder(null);
              }}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
              loading={updateMut.isPending}
            >
              Capture Payment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Order"
      >
        <p className="text-slate-600 text-sm">
          Are you sure you want to delete this order? This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
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
