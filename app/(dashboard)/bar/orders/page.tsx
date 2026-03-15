"use client";

import { useMemo, useState } from "react";
import {
  useBarOrderPricingPreview,
  useBookings,
  useCreateOrder,
  useMenuItems,
  useOrders,
  useUpdateOrder,
} from "@/hooks/api";
import {
  AppDatePicker,
  AppReactSelect,
  Badge,
  Button,
  DataTable,
  Dropdown,
  Input,
  Modal,
} from "@/components/ui";
import { POS_ORDER_STATUS, POS_PAYMENT_STATUS, PAYMENT_METHOD } from "@/constants";
import toast from "react-hot-toast";
import { FiPlus, FiInfo, FiMoreVertical, FiPrinter, FiDollarSign, FiCreditCard, FiFileText } from "react-icons/fi";
import Link from "next/link";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const PAYMENT_METHOD_OPTIONS = [
  { value: PAYMENT_METHOD.CASH, label: "Cash" },
  { value: PAYMENT_METHOD.CARD, label: "Card" },
  { value: PAYMENT_METHOD.MOBILE_MONEY, label: "Mobile Money" },
  { value: PAYMENT_METHOD.BANK_TRANSFER, label: "Bank Transfer" },
];

const PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All payment" },
  { value: POS_PAYMENT_STATUS.UNPAID, label: "Unpaid" },
  { value: POS_PAYMENT_STATUS.PAID, label: "Paid" },
  { value: POS_PAYMENT_STATUS.PARTIAL, label: "Partial" },
];

const PAYMENT_BADGE: Record<string, "danger" | "success" | "warning"> = {
  unpaid: "danger",
  paid: "success",
  partial: "warning",
};

export default function BarOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceDate, setServiceDate] = useState<Date | null>(new Date());
  const [openCreate, setOpenCreate] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHOD.CASH);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastCapturedReceipt, setLastCapturedReceipt] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState<{
    method: string;
    amountTendered: string;
    reference: string;
  }>({
    method: PAYMENT_METHOD.CASH,
    amountTendered: "",
    reference: "",
  });
  const [paymentFilter, setPaymentFilter] = useState("");

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;
  if (paymentFilter) params.paymentStatus = paymentFilter;
  const { data, isLoading } = useOrders({ ...params, department: "bar" });
  const { data: menuData } = useMenuItems({ limit: "500", department: "bar" });
  const { data: bookingsData } = useBookings({ status: "checkedIn", limit: "200" });
  const createMut = useCreateOrder();
  const updateMut = useUpdateOrder();

  const menuItems = (menuData?.data ?? []).filter((item: any) => item.isBarItem);
  const bookings = bookingsData?.data ?? [];
  const barMenuIds = new Set(menuItems.map((item: any) => String(item._id)));
  const rows = (data?.data ?? []).filter((row: any) =>
    (row.items ?? []).some((item: any) => barMenuIds.has(String(item.menuItemId)))
  );
  const pagination = data?.meta?.pagination;

  const menuMap = useMemo(
    () => Object.fromEntries(menuItems.map((item: any) => [String(item._id), item])),
    [menuItems]
  );

  const orderPreview = useMemo(() => {
    const menu = menuItemId ? menuMap[menuItemId] : null;
    if (!menu) return null;
    const qty = Math.max(1, Number(quantity || 1));
    const unitPrice = Number(menu.price ?? 0);
    const amount = Number((unitPrice * qty).toFixed(2));
    const subtotal = amount;
    const tax = 0;
    const total = Number(subtotal.toFixed(2));
    return { subtotal, tax, total, unitPrice, amount, qty };
  }, [menuItemId, menuMap, quantity]);

  const previewItems = useMemo(
    () =>
      orderPreview
        ? [
            {
              menuItemId,
              name: menuMap[menuItemId]?.name ?? "",
              quantity: orderPreview.qty,
              unitPrice: orderPreview.unitPrice,
              amount: orderPreview.amount,
            },
          ]
        : [],
    [orderPreview, menuItemId, menuMap]
  );

  const { data: pricingPreview, isLoading: pricingPreviewLoading } =
    useBarOrderPricingPreview({
      items: previewItems,
      department: "bar",
    });
  const resolvedPricing = pricingPreview?.data ?? pricingPreview;

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const menu = menuMap[menuItemId];
    if (!menu) {
      toast.error("Select a menu item");
      return;
    }
    const itemQuantity = Math.max(1, Number(quantity || 1));
    const unitPrice = Number(menu.price ?? 0);
    const amount = Number((unitPrice * itemQuantity).toFixed(2));

    const subtotal = amount;
    const tax = 0;
    const totalAmount = amount;
    const payload: Record<string, unknown> = {
      department: "bar",
      bookingId: bookingId || undefined,
      guestId: bookingId
        ? bookings.find((b: any) => String(b._id) === bookingId)?.guestId
        : undefined,
      items: [
        {
          menuItemId,
          name: menu.name,
          quantity: itemQuantity,
          unitPrice,
          amount,
          notes: notes || undefined,
        },
      ],
      subtotal,
      tax,
      totalAmount,
      addToRoomBill: !!bookingId,
    };
    if (markAsPaid) {
      payload.paymentStatus = POS_PAYMENT_STATUS.PAID;
      payload.partialPayments = [{ method: paymentMethod, amount: totalAmount }];
    }
    try {
      await createMut.mutateAsync(payload);
      toast.success("BAR order created");
      setOpenCreate(false);
      setMenuItemId("");
      setBookingId("");
      setQuantity(1);
      setNotes("");
      setMarkAsPaid(false);
      setPaymentMethod(PAYMENT_METHOD.CASH);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to create order");
    }
  };

  const handleSetStatus = async (row: any, status: string) => {
    try {
      await updateMut.mutateAsync({
        id: row._id,
        department: "bar",
        status,
        voidReason: status === "cancelled" ? "Cancelled by cashier" : undefined,
      });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to update status");
    }
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
        department: "bar",
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
          <h2 style="margin:0 0 8px 0;">BAR Payment Receipt</h2>
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
      header: "Order",
      render: (row: any) => (
        <span className="font-medium text-slate-900">{row.orderNumber}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row: any) => (
        <span className="text-slate-600">{new Date(row.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (row: any) => {
        const text = (row.items ?? []).map((item: any) => `${item.name} ×${item.quantity}`).join(", ");
        return (
          <span className="block max-w-[220px] truncate text-slate-700" title={text || "—"}>
            {text || "—"}
          </span>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      render: (row: any) => (
        <span className="font-semibold text-slate-900">{fmt(Number(row.totalAmount ?? 0))}</span>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment · Status",
      render: (row: any) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={PAYMENT_BADGE[row.paymentStatus] ?? "outline"} className="text-xs">
            {row.paymentStatus === "paid" ? "Paid" : row.paymentStatus === "partial" ? "Partial" : "Unpaid"}
          </Badge>
          <Badge variant={row.status === "cancelled" ? "danger" : "info"} className="text-xs">
            {row.status}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.paymentStatus !== "paid" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPaymentModal(row)}
              className="shrink-0 rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10"
            >
              Take Payment
            </Button>
          )}
          <Dropdown
            align="right"
            trigger={<><FiMoreVertical className="h-4 w-4" aria-hidden /> More</>}
            items={[
              { id: "served", label: "Mark Served", onClick: () => handleSetStatus(row, POS_ORDER_STATUS.SERVED) },
              { id: "complete", label: "Complete", onClick: () => handleSetStatus(row, POS_ORDER_STATUS.COMPLETED) },
              { id: "cancel", label: "Cancel order", onClick: () => handleSetStatus(row, POS_ORDER_STATUS.CANCELLED) },
            ]}
            className="shrink-0"
          />
        </div>
      ),
    },
  ];

  const unpaidCount = rows.filter((r: any) => r.paymentStatus !== "paid").length;

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/98 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">BAR Orders</h1>
              <p className="mt-1 text-sm text-slate-500">Create and process drink orders with room billing support.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setOpenCreate(true)}
                className="order-first w-full rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,109,0,0.4)] sm:order-last sm:w-auto"
                style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
              >
                <FiPlus className="h-4 w-4 sm:mr-2" aria-hidden />
                New BAR Order
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                <Link href="/bar/menu-items">Manage Menu</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full bg-linear-to-r from-[#ff8500]/40 via-[#5a189a]/40 to-[#ff8500]/40" />
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-5">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <AppReactSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "", label: "All statuses" },
                ...Object.values(POS_ORDER_STATUS).map((value) => ({ value, label: value })),
              ]}
              className="min-w-[140px] flex-1 sm:flex-initial"
            />
            <AppReactSelect
              value={paymentFilter}
              onChange={setPaymentFilter}
              options={PAYMENT_STATUS_FILTER_OPTIONS}
              placeholder="Payment"
              className="min-w-[120px] flex-1 sm:flex-initial"
            />
            <AppDatePicker selected={serviceDate} onChange={setServiceDate} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_8px_24px_rgba(90,24,154,0.12)]">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-[#5a189a]/10 transition-transform group-hover:scale-110" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-[#5a189a]/20 to-[#9d4edd]/15 text-[#5a189a] shadow-sm">
                  <FiPrinter className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orders on this page</p>
                  <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">{rows.length}</p>
                </div>
              </div>
              <span className="rounded-lg bg-[#5a189a]/10 px-2 py-1 text-xs font-medium text-[#5a189a]">Visible</span>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_8px_24px_rgba(255,109,0,0.15)]">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-[#ff8500]/10 transition-transform group-hover:scale-110" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-[#ff8500]/20 to-[#ff9e00]/15 text-[#c2410c] shadow-sm">
                  <FiDollarSign className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unpaid / partial</p>
                  <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">{unpaidCount}</p>
                </div>
              </div>
              <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-700">Needs payment</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 border-l-4 border-l-[#5a189a] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <FiPrinter className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">All orders</h2>
                <p className="text-xs text-slate-500">Take payment or update status from the actions column.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto min-w-0">
            <div className="min-w-[860px]">
              <DataTable
                columns={columns}
                data={rows}
                loading={isLoading}
                getRowKey={(row) => row._id}
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
                emptyTitle="No BAR orders"
                emptyDescription="Create your first order to start tracking sales."
              />
            </div>
          </div>
        </div>
      </main>

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Create BAR Order"
        size="lg"
        className="max-w-lg rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
      >
        <form onSubmit={handleCreate} className="space-y-6" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff8500]/15 text-[#c2410c]">
                <FiPlus className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Order details</h3>
            </div>
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Menu item</label>
                <AppReactSelect
                  value={menuItemId}
                  onChange={setMenuItemId}
                  options={menuItems.map((item: any) => ({
                    value: String(item._id),
                    label: `${item.name} (${fmt(Number(item.price ?? 0))})`,
                  }))}
                  placeholder="Select item"
                />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Quantity</label>
                  <Input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={(e) => setQuantity(Number(e.target.value || 1))}
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Post to room bill (optional)</label>
                  <AppReactSelect
                    value={bookingId}
                    onChange={setBookingId}
                    options={[
                      { value: "", label: "No — walk-in" },
                      ...bookings.map((booking: any) => ({
                        value: String(booking._id),
                        label: `${booking.bookingNumber ?? booking._id} — ${booking.guestName ?? "Guest"}`,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {orderPreview && (
            <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-[#5a189a]/5 to-[#9d4edd]/5 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="mb-4 text-sm font-semibold text-slate-800">Order summary</p>
              {pricingPreviewLoading ? (
                <p className="text-sm text-slate-500">Calculating price…</p>
              ) : resolvedPricing ? (
                <>
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Original ({orderPreview.unitPrice} × {orderPreview.qty})</span>
                      <span>{fmt(resolvedPricing.originalSubtotal ?? orderPreview.subtotal)}</span>
                    </div>
                    {resolvedPricing.appliedRule?.name && (() => {
                      const original = resolvedPricing.originalSubtotal ?? orderPreview.subtotal;
                      const discountAmount = Number((original - resolvedPricing.subtotal).toFixed(2));
                      return discountAmount > 0 ? (
                        <div className="flex justify-between font-medium text-[#5a189a]">
                          <span>Discount ({resolvedPricing.appliedRule.name})</span>
                          <span>−{fmt(discountAmount)}</span>
                        </div>
                      ) : null;
                    })()}
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span>Subtotal</span>
                      <span>{fmt(resolvedPricing.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{fmt(resolvedPricing.tax)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                      <span>Amount to pay</span>
                      <span>{fmt(resolvedPricing.totalAmount)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal ({orderPreview.unitPrice} × {orderPreview.qty})</span>
                      <span>{fmt(orderPreview.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{fmt(orderPreview.tax)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                      <span>Amount to pay</span>
                      <span>{fmt(orderPreview.total)}</span>
                    </div>
                  </div>
                </>
              )}
              <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5a189a]" aria-hidden />
                <span>
                  {resolvedPricing?.appliedRule
                    ? "The amount above is the final total after the pricing rule."
                    : "Pricing rules are applied when the order is created."}{" "}
                  <Link href="/bar/pricing-rules" className="font-medium text-[#5a189a] underline hover:text-[#7b2cbf]">
                    Manage pricing rules
                  </Link>
                </span>
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="mb-4 text-sm font-semibold text-slate-800">Payment</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="min-w-0 flex-1 space-y-2">
                <label className="text-sm font-medium text-slate-700">Method</label>
                <AppReactSelect
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod(v ?? PAYMENT_METHOD.CASH)}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 sm:shrink-0">
                <input
                  type="checkbox"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/20"
                />
                <span className="text-sm font-medium text-slate-700">Mark as paid on create</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions or notes"
              className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending}
              className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,109,0,0.4)]"
              style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
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
        className="max-w-xl rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
      >
        <form onSubmit={submitPayment} className="flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="flex-1 space-y-6 overflow-y-auto px-0.5">
            {/* Order summary — prominent strip */}
            <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-[#5a189a]/8 via-white to-[#9d4edd]/5 p-5 shadow-[0_4px_12px_rgba(90,24,154,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5a189a]/15 text-[#5a189a]">
                    <FiDollarSign className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Order</p>
                    <p className="text-lg font-bold text-slate-900">{paymentOrder?.orderNumber ?? "—"}</p>
                    {paymentOrder?.appliedRule?.name && (
                      <p className="mt-0.5 text-xs font-medium text-[#5a189a]">{paymentOrder.appliedRule.name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Outstanding</p>
                  <p className="text-xl font-bold text-slate-900">{fmt(paymentPreview.dueBefore)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total</p>
                  <p className="text-sm font-semibold text-slate-700">{fmt(paymentPreview.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Paid so far</p>
                  <p className="text-sm font-semibold text-slate-700">{fmt(paymentPreview.paidSoFar)}</p>
                </div>
              </div>
            </div>

            {/* Capture payment — form card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff8500]/15 text-[#c2410c]">
                  <FiCreditCard className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Capture payment</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Payment method</label>
                  <AppReactSelect
                    value={paymentForm.method}
                    onChange={(value) => setPaymentForm((f) => ({ ...f, method: value }))}
                    options={PAYMENT_METHOD_OPTIONS}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Amount tendered</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentForm.amountTendered}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, amountTendered: e.target.value }))}
                    placeholder="0.00"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Reference (optional)</label>
                  <Input
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="Transaction or receipt reference"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
              </div>
              {/* Apply / Change / Balance — three stat pills */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 py-3 px-3 text-center">
                  <p className="text-xs font-medium text-slate-500">Apply</p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">{fmt(paymentPreview.applyAmount)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 py-3 px-3 text-center">
                  <p className="text-xs font-medium text-slate-500">Change</p>
                  <p className="mt-0.5 text-base font-bold text-emerald-700">{fmt(paymentPreview.changeDue)}</p>
                </div>
                <div className="rounded-xl border border-[#5a189a]/20 bg-[#5a189a]/5 py-3 px-3 text-center">
                  <p className="text-xs font-medium text-slate-500">Balance after</p>
                  <p className="mt-0.5 text-base font-bold text-[#5a189a]">{fmt(paymentPreview.balanceAfter)}</p>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FiFileText className="h-4 w-4" aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Payment history</h3>
                </div>
                {lastCapturedReceipt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => printReceipt(lastCapturedReceipt)}
                    className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10"
                  >
                    <FiPrinter className="h-4 w-4 sm:mr-1.5" aria-hidden />
                    Print latest
                  </Button>
                ) : null}
              </div>
              {paymentHistoryRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
                  <FiFileText className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
                  <p className="mt-2 text-sm text-slate-500">No payments yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">Capture a payment to see history and print receipts.</p>
                </div>
              ) : (
                <div className="max-h-40 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Date</th>
                        <th className="px-3 py-2.5 text-left">Method</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                        <th className="px-3 py-2.5 text-right">Balance</th>
                        <th className="px-3 py-2.5 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentHistoryRows.map((row: any) => {
                        const methodLabel =
                          PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === row.method)?.label ?? row.method;
                        return (
                          <tr key={`${row._idx}-${row.paidAt}`}>
                            <td className="px-3 py-2.5 text-slate-600">{new Date(row.paidAt).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-slate-600">{methodLabel}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-800">{fmt(row.amount)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600">{fmt(row.balanceAfter)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  printReceipt({
                                    orderNumber: paymentOrder?.orderNumber ?? "",
                                    totalAmount: Number(paymentOrder?.totalAmount ?? 0),
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
                                className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                <FiPrinter className="h-3.5 w-3.5 sm:mr-1" aria-hidden />
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
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentOrder(null);
              }}
              className="rounded-xl border-slate-200 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateMut.isPending}
              className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,109,0,0.4)]"
              style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
            >
              Capture Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
