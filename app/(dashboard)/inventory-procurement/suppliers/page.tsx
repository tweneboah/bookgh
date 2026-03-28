"use client";

import { useState } from "react";
import {
  useSuppliers,
  useSupplierInsights,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "@/hooks/api";
import {
  Button,
  Card,
  CardContent,
  Modal,
  Input,
  Badge,
  Textarea,
  AppReactSelect,
} from "@/components/ui";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { StockImagePicker } from "@/components/ui/stock-image-picker";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiMail,
  FiPhone,
  FiUser,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiFileText,
  FiTrendingUp,
  FiInfo,
  FiCreditCard,
  FiShield,
  FiSettings,
  FiImage,
  FiCalendar,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { SUPPLIER_STATUS } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_OPTIONS = Object.entries(SUPPLIER_STATUS).map(([k, v]) => ({
  value: v,
  label: k
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
}));

const statusVariant = (
  status: string
): "success" | "warning" | "danger" | "default" => {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  if (status === "blacklisted") return "danger";
  return "default";
};

const formatCedi = (value: unknown) => {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `₵${safeAmount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function SuppliersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? "inventoryProcurement";
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentTermsFilter, setPaymentTermsFilter] = useState("");
  const [minRatingFilter, setMinRatingFilter] = useState("");
  const [minOnTimeFilter, setMinOnTimeFilter] = useState("");
  const [maxLeadTimeFilter, setMaxLeadTimeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [insightSupplier, setInsightSupplier] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    categories: "",
    leadTimeDays: "",
    averageFulfillmentDays: "",
    onTimeRate: "",
    rating: "",
    paymentTerms: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    swiftCode: "",
    bankBranchName: "",
    blacklistedReason: "",
    blockedUntil: "",
    status: SUPPLIER_STATUS.ACTIVE as string,
    notes: "",
    images: [] as UploadedImage[],
    documents: [] as UploadedImage[],
  });

  const params: Record<string, string> = { page: String(page), limit: "12" };
  if (query.trim()) params.q = query.trim();
  if (statusFilter) params.status = statusFilter;
  if (categoryFilter.trim()) params.category = categoryFilter.trim();
  if (paymentTermsFilter.trim()) params.paymentTerms = paymentTermsFilter.trim();
  if (minRatingFilter) params.minRating = minRatingFilter;
  if (minOnTimeFilter) params.minOnTimeRate = minOnTimeFilter;
  if (maxLeadTimeFilter) params.maxLeadTime = maxLeadTimeFilter;
  if (department) params.department = department;

  const { data, isLoading } = useSuppliers(params);
  const { data: insightsData, isLoading: insightsLoading } = useSupplierInsights(
    insightSupplier?._id,
    { department }
  );
  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();
  const deleteMut = useDeleteSupplier();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const resetForm = () => {
    setForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      categories: "",
      leadTimeDays: "",
      averageFulfillmentDays: "",
      onTimeRate: "",
      rating: "",
      paymentTerms: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
      swiftCode: "",
      bankBranchName: "",
      blacklistedReason: "",
      blockedUntil: "",
      status: SUPPLIER_STATUS.ACTIVE,
      notes: "",
      images: [],
      documents: [],
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    const images = Array.isArray(row.images)
      ? (row.images as { url: string; caption?: string }[]).map((img) => ({
          url: img.url,
          caption: img.caption,
        }))
      : [];
    const documents = Array.isArray(row.documents)
      ? (
          row.documents as {
            url: string;
            name?: string;
            documentType?: string;
            expiryDate?: string;
          }[]
        ).map((doc) => ({
          url: doc.url,
          caption: [doc.name, doc.documentType, doc.expiryDate].filter(Boolean).join(" | "),
        }))
      : [];
    setForm({
      name: row.name ?? "",
      contactPerson: row.contactPerson ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      categories: Array.isArray(row.categories) ? row.categories.join(", ") : "",
      leadTimeDays: row.leadTimeDays != null ? String(row.leadTimeDays) : "",
      averageFulfillmentDays:
        row.averageFulfillmentDays != null ? String(row.averageFulfillmentDays) : "",
      onTimeRate: row.onTimeRate != null ? String(row.onTimeRate) : "",
      rating: row.rating != null ? String(row.rating) : "",
      paymentTerms: row.paymentTerms ?? "",
      bankName: row.bankAccount?.bankName ?? "",
      accountName: row.bankAccount?.accountName ?? "",
      accountNumber: row.bankAccount?.accountNumber ?? "",
      swiftCode: row.bankAccount?.swiftCode ?? "",
      bankBranchName: row.bankAccount?.branchName ?? "",
      blacklistedReason: row.blacklistedReason ?? "",
      blockedUntil: row.blockedUntil
        ? new Date(row.blockedUntil).toISOString().slice(0, 16)
        : "",
      status: row.status ?? SUPPLIER_STATUS.ACTIVE,
      notes: row.notes ?? "",
      images,
      documents,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      categories: form.categories
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
      leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
      averageFulfillmentDays: form.averageFulfillmentDays
        ? Number(form.averageFulfillmentDays)
        : undefined,
      onTimeRate: form.onTimeRate ? Number(form.onTimeRate) : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      bankAccount:
        form.bankName.trim() && form.accountName.trim() && form.accountNumber.trim()
          ? {
              bankName: form.bankName.trim(),
              accountName: form.accountName.trim(),
              accountNumber: form.accountNumber.trim(),
              swiftCode: form.swiftCode.trim() || undefined,
              branchName: form.bankBranchName.trim() || undefined,
            }
          : undefined,
      blacklistedReason: form.blacklistedReason.trim() || undefined,
      blockedUntil: form.blockedUntil ? new Date(form.blockedUntil).toISOString() : undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
      images: form.images.length
        ? form.images.map((img) => ({
            url: img.url,
            caption: img.caption || undefined,
          }))
        : undefined,
      documents: form.documents.length
        ? form.documents.map((img) => {
            const [name = "Document", documentType, expiryDate] = (
              img.caption ?? ""
            ).split("|").map((part) => part.trim());
            return {
              url: img.url,
              name,
              documentType: documentType || undefined,
              expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
            };
          })
        : undefined,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: editItem._id,
          department,
          ...payload,
        });
        toast.success("Supplier updated");
      } else {
        await createMut.mutateAsync({ department, ...payload });
        toast.success("Supplier created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync({ id: showDelete, department });
      toast.success("Supplier deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const pageTitle =
    department === "restaurant" ? "Restaurant Suppliers" : "Suppliers";
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit) || 1
    : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;
  const totalSuppliers = pagination?.total ?? items.length;
  const activePartners = items.filter((s: any) => s.status === "active").length;
  const pendingSync = items.filter((s: any) => s.status === "pending").length;
  const monthlySpendTotal = items.reduce(
    (sum: number, s: any) => sum + Number(s.totalSpend ?? 0),
    0
  );
  const monthlySpendText =
    monthlySpendTotal >= 1000
      ? `₵${(monthlySpendTotal / 1000).toFixed(1)}k`
      : formatCedi(monthlySpendTotal);

  return (
    <div className="bg-[#fdfcfb] min-h-screen text-slate-900">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <main className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-10">
          <div className="flex flex-col max-w-[1200px] flex-1 gap-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-1 bg-[#ec5b13] rounded-full" />
                  <span className="text-[#ec5b13] font-bold tracking-widest text-xs uppercase">
                    Management Console
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                  {department === "restaurant" ? (
                    <>
                      Restaurant <span className="text-[#ec5b13]">Suppliers</span>
                    </>
                  ) : (
                    pageTitle
                  )}
                </h1>
                <p className="text-slate-500 text-lg max-w-xl font-medium">
                  Streamline your supply chain. Monitor performance, orders, and spending in real-time.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center justify-center gap-2 overflow-hidden rounded-2xl h-14 px-8 bg-[#ec5b13] hover:bg-[#ea580c] text-white text-base font-bold transition-all shadow-xl shadow-[#ec5b13]/25 hover:shadow-[#ec5b13]/40 active:scale-95"
              >
                <FiPlus className="h-5 w-5" />
                <span>Add Supplier</span>
              </button>
            </div>

            {/* Top Stats */}
            <div className="px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#ec5b13] text-white p-6 rounded-2xl shadow-lg shadow-[#ec5b13]/20">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                  Total Suppliers
                </p>
                <p className="text-3xl font-black">{totalSuppliers}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Active Partners
                </p>
                <p className="text-3xl font-black text-slate-900">{activePartners}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Monthly Spend
                </p>
                <p className="text-3xl font-black text-slate-900">{monthlySpendText}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Pending Sync
                </p>
                <p className="text-3xl font-black text-slate-900">{pendingSync}</p>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-end gap-6 mx-4">
              <label className="flex flex-col min-w-[240px] flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Search
                </span>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 h-12 pl-11 pr-4 text-sm font-semibold transition-all focus:ring-2 focus:ring-[#ec5b13]/20 focus:border-[#ec5b13] outline-none"
                    placeholder="Search suppliers..."
                  />
                </div>
              </label>

              <label className="flex flex-col min-w-[200px] flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 h-12 px-4 pr-10 text-sm font-semibold transition-all focus:ring-2 focus:ring-[#ec5b13]/20 focus:border-[#ec5b13] outline-none"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col min-w-[200px] flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Max Lead Time
                </span>
                <select
                  value={maxLeadTimeFilter}
                  onChange={(e) => {
                    setMaxLeadTimeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 h-12 px-4 pr-10 text-sm font-semibold transition-all focus:ring-2 focus:ring-[#ec5b13]/20 focus:border-[#ec5b13] outline-none"
                >
                  <option value="">Any Time</option>
                  <option value="1">Under 24h</option>
                  <option value="3">Under 3 days</option>
                  <option value="7">Under 1 week</option>
                  <option value="14">Under 2 weeks</option>
                </select>
              </label>

              <div className="flex-none">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("");
                    setCategoryFilter("");
                    setPaymentTermsFilter("");
                    setMinRatingFilter("");
                    setMinOnTimeFilter("");
                    setMaxLeadTimeFilter("");
                    setPage(1);
                  }}
                  className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-[#fff8f4] hover:text-[#ec5b13] transition-colors"
                  aria-label="Clear filters"
                >
                  <FiFileText className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Suppliers Grid/List */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 px-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm"
                  >
                    <div className="lg:w-72 h-48 bg-slate-100 animate-pulse" />
                    <div className="p-8">
                      <div className="h-6 w-1/3 bg-slate-100 animate-pulse rounded" />
                      <div className="mt-3 h-4 w-2/3 bg-slate-50 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isEmpty ? (
              <div className="px-4">
                <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center">
                  <FiInbox className="mx-auto h-12 w-12 text-slate-300" />
                  <h2 className="mt-4 text-xl font-extrabold">No suppliers yet</h2>
                  <p className="mt-2 text-slate-500">
                    Add your first supplier to start tracking performance and spending.
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-6 inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl h-12 px-8 bg-[#ec5b13] hover:bg-[#ea580c] text-white text-sm font-bold transition-all shadow-lg shadow-[#ec5b13]/20"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add Supplier
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 px-4">
                {items.map((row: any) => {
                  const imgs = Array.isArray(row.images) ? row.images : [];
                  const firstImg = imgs[0] as { url?: string; caption?: string } | undefined;
                  const categories = Array.isArray(row.categories) ? row.categories : [];
                  const classification = categories?.[0] ?? "—";
                  const rating = row.rating != null ? Number(row.rating) : null;
                  const statusLabel =
                    STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status;
                  const idTag = String(row._id ?? "").slice(-6) || "—";
                  const recent = Array.isArray(row.recentPurchaseOrders)
                    ? row.recentPurchaseOrders[0]
                    : null;

                  return (
                    <div
                      key={row._id}
                      className="supplier-card group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#ec5b13]/20 transition-all duration-300 flex flex-col lg:flex-row"
                    >
                      <div className="lg:w-72 h-48 lg:h-auto overflow-hidden bg-slate-100">
                        {firstImg?.url ? (
                          <img
                            alt={firstImg.caption || row.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            src={firstImg.url}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <FiPackage className="h-14 w-14" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                  row.status === "active"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : row.status === "inactive"
                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                    : row.status === "blacklisted"
                                    ? "bg-red-50 text-red-700 border-red-100"
                                    : "bg-slate-50 text-slate-600 border-slate-100"
                                }`}
                              >
                                {statusLabel}
                              </span>
                              <span className="text-slate-400 text-xs font-medium">
                                ID: {idTag}
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                                rating != null
                                  ? "bg-amber-50 border-amber-100"
                                  : "bg-slate-50 border-slate-100"
                              }`}
                            >
                              {rating != null ? (
                                <>
                                  <span className="text-amber-500 text-lg">★</span>
                                  <span className="font-bold text-amber-700 text-sm">
                                    {rating.toFixed(1)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
                                  No Rating
                                </span>
                              )}
                            </div>
                          </div>

                          <h2 className="text-2xl font-extrabold mb-4 group-hover:text-[#ec5b13] transition-colors">
                            {row.name}
                          </h2>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            <div className="space-y-2">
                              {row.email ? (
                                <div className="flex items-center gap-3 text-slate-500">
                                  <FiMail className="text-[#fdba74]" />
                                  <span className="text-sm">{row.email}</span>
                                </div>
                              ) : null}
                              {row.phone ? (
                                <div className="flex items-center gap-3 text-slate-500">
                                  <FiPhone className="text-[#fdba74]" />
                                  <span className="text-sm">{row.phone}</span>
                                </div>
                              ) : null}
                              {!row.email && !row.phone ? (
                                <p className="text-sm text-slate-400 italic">No contact info</p>
                              ) : null}
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Classification
                              </p>
                              <p className="text-sm font-semibold text-slate-700">
                                {classification}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Total Orders
                              </p>
                              <p className="text-sm font-semibold text-slate-700">
                                {Number(row.totalOrders ?? 0)} orders •{" "}
                                <span className="text-[#ec5b13] font-bold">
                                  {formatCedi(row.totalSpend)}
                                </span>
                              </p>
                              {recent ? (
                                <div className="mt-2 bg-[#fff8f4] p-3 rounded-xl border border-[#ffedd5]">
                                  <p className="text-[9px] font-black uppercase text-[#ea580c] mb-1">
                                    Recent PO
                                  </p>
                                  <p className="text-[11px] italic font-medium text-slate-600 leading-tight">
                                    {recent.poNumber} {String(recent.status ?? "").toLowerCase()}{" "}
                                    {formatCedi(recent.totalAmount)}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setInsightSupplier(row)}
                            className="flex items-center gap-2 text-[#ec5b13] hover:text-[#c2410c] font-bold text-sm transition-all"
                          >
                            <span>View Details</span>
                            <span className="text-lg">→</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-[#fff8f4] hover:text-[#ec5b13] transition-colors flex items-center justify-center"
                              aria-label="Edit supplier"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDelete(row._id)}
                              className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center"
                              aria-label="Delete supplier"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/inventory-procurement/purchase-orders?department=${encodeURIComponent(
                                    department
                                  )}&supplierId=${encodeURIComponent(row._id)}`
                                )
                              }
                              className="h-10 px-5 rounded-xl bg-[#fff8f4] text-[#ec5b13] hover:bg-[#ec5b13] hover:text-white text-xs font-bold transition-all"
                            >
                              View Orders
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.total > pagination.limit && (
              <div className="mx-4 mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
                <p className="text-sm text-slate-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!hasPrev || isLoading}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <span className="px-3 text-sm font-bold">{page}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext || isLoading}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                  >
                    Next
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Footer Stats */}
            {!isLoading ? (
              <div className="mt-12 mb-20 px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#ec5b13] text-white p-6 rounded-2xl shadow-lg shadow-[#ec5b13]/20">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                    Total Suppliers
                  </p>
                  <p className="text-3xl font-black">{pagination?.total ?? items.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Active Partners
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {items.filter((s: any) => s.status === "active").length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Monthly Spend
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {(() => {
                      const total = items.reduce(
                        (sum: number, s: any) => sum + Number(s.totalSpend ?? 0),
                        0
                      );
                      const k = total / 1000;
                      return k >= 1 ? `₵${k.toFixed(1)}k` : formatCedi(total);
                    })()}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Pending Sync
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {items.filter((s: any) => s.status === "inactive").length}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit supplier" : "Add supplier"}
        size="lg"
        className="rounded-2xl border-[#e5e7eb] bg-[#f8f6f6] shadow-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mini top header inside modal body (matches provided layout) */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ec5b13] text-white">
                <FiPackage className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {editItem ? "Edit Supplier" : "Add New Supplier"}
                </p>
                <p className="text-xs text-slate-500">Procurement &amp; Vendor Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <FiTrendingUp className="h-4 w-4" />
              </span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ec5b13]/20 text-[#ec5b13] font-bold border border-[#ec5b13]/30 text-xs">
                {String(form.name || "JS")
                  .trim()
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("") || "JS"}
              </span>
            </div>
          </div>

          {/* Section 1: Basic Info */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[#ec5b13]">
              <FiInfo className="h-5 w-5" />
              <h3 className="text-xl font-bold">Basic Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Supplier Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. Fresh Farms Wholesale"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Contact Person"
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                placeholder="Full name of account manager"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="orders@supplier.com"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Phone Number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+233 (0) 00 000 0000"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Physical Address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street, City, State, Zip Code"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Categories"
                value={form.categories}
                onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))}
                placeholder="Produce, Dairy, Seafood (comma-separated)"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
            </div>
          </section>

          {/* Section 2: Performance & Terms */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[#ec5b13]">
              <FiTrendingUp className="h-5 w-5" />
              <h3 className="text-xl font-bold">Performance &amp; Terms</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Lead Time (Days)"
                type="number"
                min={0}
                value={form.leadTimeDays}
                onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                placeholder="2"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Avg. Fulfillment (Days)"
                type="number"
                min={0}
                value={form.averageFulfillmentDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, averageFulfillmentDays: e.target.value }))
                }
                placeholder="1.5"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="On-time Rate (%)"
                type="number"
                min={0}
                max={100}
                value={form.onTimeRate}
                onChange={(e) => setForm((f) => ({ ...f, onTimeRate: e.target.value }))}
                placeholder="98"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Initial Rating (0-5)"
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                placeholder="4"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Payment Terms"
                value={form.paymentTerms}
                onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                placeholder="e.g. Net 30, Due on Receipt"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <div className="md:col-span-1">
                <AppReactSelect
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Bank Account Details */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[#ec5b13]">
              <FiCreditCard className="h-5 w-5" />
              <h3 className="text-xl font-bold">Bank Account Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Bank Name"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="Global Commerce Bank"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Account Name"
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="Fresh Farms LLC"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <Input
                label="Account Number"
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder="XXXX-XXXX-XXXX-1234"
                className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SWIFT/BIC"
                  value={form.swiftCode}
                  onChange={(e) => setForm((f) => ({ ...f, swiftCode: e.target.value }))}
                  placeholder="GCBANKUS"
                  className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                />
                <Input
                  label="Branch Name"
                  value={form.bankBranchName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bankBranchName: e.target.value }))
                  }
                  placeholder="Downtown"
                  className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Status & Notes */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[#ec5b13]">
              <FiSettings className="h-5 w-5" />
              <h3 className="text-xl font-bold">Status &amp; Notes</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">Active Status</span>
                    <span className="text-xs text-slate-500">
                      Enable or disable this supplier
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        status: f.status === SUPPLIER_STATUS.ACTIVE
                          ? SUPPLIER_STATUS.INACTIVE
                          : SUPPLIER_STATUS.ACTIVE,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.status === SUPPLIER_STATUS.ACTIVE ? "bg-[#ec5b13]" : "bg-slate-300"
                    }`}
                    aria-label="Toggle active status"
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        form.status === SUPPLIER_STATUS.ACTIVE ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {form.status === SUPPLIER_STATUS.BLACKLISTED && (
                  <Input
                    label="Blacklist reason"
                    value={form.blacklistedReason}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, blacklistedReason: e.target.value }))
                    }
                    placeholder="Reason for blacklisting"
                    className="rounded-xl border-slate-200 bg-slate-50 h-12 px-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                  />
                )}

                <div className="relative">
                  <FiCalendar className="pointer-events-none absolute left-4 top-[42px] h-4 w-4 text-slate-400" />
                  <Input
                    label="Blocked Until (Optional)"
                    type="datetime-local"
                    value={form.blockedUntil}
                    onChange={(e) => setForm((f) => ({ ...f, blockedUntil: e.target.value }))}
                    className="rounded-xl border-slate-200 bg-slate-50 h-12 pl-11 pr-4 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                  />
                </div>
              </div>

              <Textarea
                label="Internal Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Add any relevant internal information about this vendor..."
                rows={6}
                className="rounded-xl border-slate-200 bg-slate-50 px-4 py-3 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
              />
            </div>
          </section>

          {/* Section 5: Media & Compliance */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[#ec5b13]">
              <FiShield className="h-5 w-5" />
              <h3 className="text-xl font-bold">Media &amp; Compliance</h3>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-semibold text-slate-800">Supplier Images</h4>
                  <button
                    type="button"
                    onClick={() => setShowStockPicker(true)}
                    className="text-xs font-bold text-[#ec5b13] hover:underline flex items-center gap-1"
                  >
                    <FiImage className="h-4 w-4" />
                    Pick from stock photos
                  </button>
                </div>
                <ImageUpload
                  label="Supplier images"
                  value={form.images}
                  onChange={(images) => setForm((f) => ({ ...f, images }))}
                  folder={`suppliers/${department}`}
                  maxFiles={10}
                  showCaptions
                />
              </div>

              <div>
                <h4 className="text-md font-semibold text-slate-800 mb-3">
                  Compliance Documents
                </h4>
                <ImageUpload
                  label="Compliance documents"
                  value={form.documents}
                  onChange={(documents) => setForm((f) => ({ ...f, documents }))}
                  folder={`suppliers/${department}/documents`}
                  maxFiles={20}
                  showCaptions
                />
                <p className="mt-2 text-[11px] text-slate-400 italic">
                  For each document caption, use:{" "}
                  <span className="font-mono text-slate-500">
                    Name | Type | Expiry ISO date (optional)
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-2 pb-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-8 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="px-10 py-3 rounded-xl font-bold bg-[#ec5b13] text-white shadow-lg shadow-[#ec5b13]/20 hover:bg-[#ec5b13]/90 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {editItem ? "Update Supplier" : "Create Supplier"}
            </button>
          </div>
        </form>
      </Modal>

      <StockImagePicker
        open={showStockPicker}
        onClose={() => setShowStockPicker(false)}
        initialQuery={form.name}
        onPick={(img) =>
          setForm((f) => ({
            ...f,
            images: [...(f.images ?? []), { url: img.url, caption: img.caption }],
          }))
        }
      />

      <Modal
        open={!!insightSupplier}
        onClose={() => setInsightSupplier(null)}
        title={insightSupplier ? `${insightSupplier.name} details` : "Supplier details"}
        size="lg"
      >
        {insightsLoading ? (
          <p className="text-sm text-[#6b7280]">Loading insights...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#6b7280]">
                <p className="font-semibold text-[#1f2937]">Supplier profile</p>
                <p className="text-xs">
                  {insightSupplier?.contactPerson ? insightSupplier.contactPerson : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (insightSupplier) openEdit(insightSupplier);
                    setInsightSupplier(null);
                  }}
                  className="rounded-xl border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
                >
                  <FiEdit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (insightSupplier?._id) setShowDelete(insightSupplier._id);
                    setInsightSupplier(null);
                  }}
                  className="rounded-xl"
                >
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e7eb] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Email</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.email || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Phone</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.phone || "—"}
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Address</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.address || "—"}
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Categories</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {Array.isArray(insightSupplier?.categories) &&
                    insightSupplier.categories.length
                      ? insightSupplier.categories.join(", ")
                      : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Lead time</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.leadTimeDays ?? "—"} days
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">
                    Avg fulfillment
                  </p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.averageFulfillmentDays ?? "—"} days
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Payment terms</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.paymentTerms || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">On-time rate</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.onTimeRate ?? "—"}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Rating</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {insightSupplier?.rating ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Status</p>
                  <p className="text-sm font-medium text-[#1f2937]">
                    {STATUS_OPTIONS.find((o) => o.value === insightSupplier?.status)?.label ??
                      insightSupplier?.status ??
                      "—"}
                  </p>
                </div>
                {insightSupplier?.bankAccount ? (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Bank details</p>
                    <p className="text-sm font-medium text-[#1f2937]">
                      {insightSupplier.bankAccount.bankName || "—"} •{" "}
                      {insightSupplier.bankAccount.accountName || "—"} •{" "}
                      {insightSupplier.bankAccount.accountNumber
                        ? String(insightSupplier.bankAccount.accountNumber)
                        : "—"}
                    </p>
                  </div>
                ) : null}
                {insightSupplier?.notes ? (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Notes</p>
                    <p className="text-sm font-medium text-[#1f2937] whitespace-pre-wrap">
                      {insightSupplier.notes}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="rounded-xl border-[#e5e7eb]">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Total orders</p>
                  <p className="mt-1 text-xl font-semibold text-[#1f2937]">
                    {insightsData?.data?.summary?.totalOrders ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-[#e5e7eb]">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[#9ca3af]">Total spend</p>
                  <p className="mt-1 text-xl font-semibold text-[#1f2937]">
                    {formatCedi(insightsData?.data?.summary?.totalSpend)}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="rounded-xl border border-[#e5e7eb] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1f2937]">
                <FiFileText className="h-4 w-4 text-[#5a189a]" />
                Activity timeline
              </h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {(insightsData?.data?.timeline ?? []).length === 0 ? (
                  <p className="text-sm text-[#9ca3af]">No activity yet.</p>
                ) : (
                  (insightsData?.data?.timeline ?? []).map((entry: any) => (
                    <div
                      key={entry._id}
                      className="rounded-lg border border-[#f3f4f6] bg-[#fafafa] p-3"
                    >
                      <p className="text-sm font-medium text-[#1f2937]">
                        {entry.action} {entry.resource}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation Modal */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete supplier"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Are you sure you want to delete this supplier? This action cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="rounded-xl border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
          >
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
