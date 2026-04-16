"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Epilogue, Manrope } from "next/font/google";
import {
  usePricingRules,
  useCreatePricingRule,
  useUpdatePricingRule,
  useDeletePricingRule,
  useRoomCategories,
} from "@/hooks/api";
import { Button, Modal, EmptyState } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { cn } from "@/lib/cn";
import {
  Search,
  Tag,
  PlusCircle,
  Pencil,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  TrendingUp,
  ArrowRight,
  ChevronDown,
  LayoutGrid,
  Gauge,
  X,
  ChevronRight,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PRICING_RULE_TYPE, MODIFIER_TYPE } from "@/constants";

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

const TYPE_OPTIONS = Object.entries(PRICING_RULE_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const MODIFIER_OPTIONS = Object.entries(MODIFIER_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function toDateTimeLocal(dateStr: string | Date | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString();
}

function formatModifier(row: { modifierType?: string; modifierValue?: number }) {
  const isPct = row.modifierType === MODIFIER_TYPE.PERCENTAGE;
  if (row.modifierValue == null) return "—";
  return isPct
    ? `${row.modifierValue}%`
    : new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
        Number(row.modifierValue)
      );
}

const solarInputClass =
  "w-full rounded-xl border-0 bg-[#eff1f2] p-4 font-medium text-[#2c2f30] placeholder:text-[#757778] transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9b3f00]/15";

function RuleFormSectionTitle({
  accent,
  children,
}: {
  accent: "primary" | "amber" | "secondary";
  children: ReactNode;
}) {
  const bar = {
    primary: "bg-[#9b3f00]",
    amber: "bg-[#f7b21f]",
    secondary: "bg-[#515d64]",
  } as const;
  return (
    <h3
      className={cn(
        epilogue.className,
        "mb-8 flex items-center gap-2 text-xl font-bold text-[#2c2f30]"
      )}
    >
      <span className={cn("h-8 w-2 shrink-0 rounded-full", bar[accent])} aria-hidden />
      {children}
    </h3>
  );
}

export default function PricingRulesPageClient({
  variant = "default",
}: {
  variant?: "default" | "restaurant";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlDepartment =
    variant === "restaurant"
      ? "restaurant"
      : (searchParams.get("department") ?? "");
  const typeFilter = searchParams.get("type") ?? "";

  useEffect(() => {
    if (variant !== "default") return;
    if (searchParams.get("department") === "restaurant") {
      router.replace("/restaurant/pricing-rules");
    }
  }, [variant, searchParams, router]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type:
      (variant === "restaurant"
        ? PRICING_RULE_TYPE.SPECIAL
        : PRICING_RULE_TYPE.SEASONAL) as string,
    modifierType: MODIFIER_TYPE.PERCENTAGE as string,
    modifierValue: "",
    roomCategoryId: "",
    startDate: "",
    endDate: "",
    priority: "0",
    daysOfWeek: [] as number[],
    isActive: true,
  });

  const { data, isLoading } = usePricingRules({
    page: String(page),
    limit: "20",
    ...(urlDepartment ? { department: urlDepartment } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  });
  const { data: categoriesData } = useRoomCategories({ limit: "100" });
  const createMut = useCreatePricingRule();
  const updateMut = useUpdatePricingRule();
  const deleteMut = useDeletePricingRule();

  const items = useMemo(
    () => (data?.data ?? []) as Record<string, unknown>[],
    [data?.data]
  );
  const pagination = data?.meta?.pagination;
  const categories = categoriesData?.data ?? [];

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => String(row.name ?? "").toLowerCase().includes(q));
  }, [items, searchQuery]);

  const activeCount = useMemo(
    () => filteredItems.filter((r) => r.isActive !== false).length,
    [filteredItems]
  );

  const resetForm = () => {
    setForm({
      name: "",
      type:
        variant === "restaurant"
          ? PRICING_RULE_TYPE.SPECIAL
          : PRICING_RULE_TYPE.SEASONAL,
      modifierType: MODIFIER_TYPE.PERCENTAGE,
      modifierValue: "",
      roomCategoryId: "",
      startDate: "",
      endDate: "",
      priority: "0",
      daysOfWeek: [],
      isActive: true,
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setForm((f) => ({
      ...f,
      type:
        variant === "restaurant"
          ? typeFilter || PRICING_RULE_TYPE.SPECIAL
          : typeFilter || PRICING_RULE_TYPE.SEASONAL,
    }));
    setShowModal(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditItem(item);
    setForm({
      name: String(item.name ?? ""),
      type: String(item.type ?? PRICING_RULE_TYPE.SEASONAL),
      modifierType: String(item.modifierType ?? MODIFIER_TYPE.PERCENTAGE),
      modifierValue: String(item.modifierValue ?? ""),
      roomCategoryId: String(
        (item.roomCategoryId as { _id?: string } | undefined)?._id ?? item.roomCategoryId ?? ""
      ),
      startDate: toDateTimeLocal(item.startDate as string | Date | undefined),
      endDate: toDateTimeLocal(item.endDate as string | Date | undefined),
      priority: String(item.priority ?? 0),
      daysOfWeek: Array.isArray(item.daysOfWeek) ? (item.daysOfWeek as number[]) : [],
      isActive: item.isActive !== false,
    });
    setShowModal(true);
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      modifierType: form.modifierType,
      modifierValue: parseFloat(form.modifierValue) || 0,
      roomCategoryId: form.roomCategoryId || undefined,
      startDate: form.startDate ? toISO(form.startDate) : undefined,
      endDate: form.endDate ? toISO(form.endDate) : undefined,
      priority: parseInt(form.priority, 10) || 0,
      daysOfWeek: form.daysOfWeek.length ? form.daysOfWeek : undefined,
      isActive: form.isActive,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: String(editItem._id),
          ...payload,
          ...(urlDepartment ? { department: urlDepartment } : {}),
        });
        toast.success("Pricing rule updated");
      } else {
        await createMut.mutateAsync({
          ...payload,
          ...(urlDepartment ? { department: urlDepartment } : {}),
        });
        toast.success("Pricing rule created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync({
        id: showDelete,
        ...(urlDepartment ? { department: urlDepartment } : {}),
      });
      toast.success("Pricing rule deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg ?? "Something went wrong");
    }
  };

  const filterLabel =
    urlDepartment && typeFilter
      ? `${urlDepartment.charAt(0).toUpperCase() + urlDepartment.slice(1)} · ${TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter}`
      : urlDepartment
        ? `${urlDepartment.charAt(0).toUpperCase() + urlDepartment.slice(1)}`
        : typeFilter
          ? TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter
          : null;

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;
  const filteredEmpty = !isLoading && items.length > 0 && filteredItems.length === 0;

  const pushQuery = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const departmentLinkClass = (dept: string) =>
    cn(
      "inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-all",
      urlDepartment === dept
        ? "bg-[#9b3f00] text-[#fff0ea] shadow-md shadow-orange-900/15"
        : "bg-[#e0e3e4] text-[#2c2f30] hover:bg-[#dadddf]"
    );

  return (
    <div
      className={cn(
        manrope.className,
        "min-h-screen bg-[#f5f6f7] text-[#2c2f30] antialiased"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-10 md:py-12 lg:px-16">
        {/* Editorial header */}
        <header className="mb-10 md:mb-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="space-y-2">
              <span
                className={cn(
                  epilogue.className,
                  "text-xs font-bold uppercase tracking-[0.2em] text-[#9b3f00]"
                )}
              >
                {variant === "restaurant" ? "Restaurant POS" : "Pricing engine"}
                </span>
              <h1
                className={cn(
                  epilogue.className,
                  "text-4xl font-black leading-none tracking-tighter text-[#2c2f30] md:text-5xl lg:text-6xl"
                )}
              >
                {variant === "restaurant"
                  ? "Restaurant pricing rules"
                  : "Pricing Rules"}
              </h1>
              <p className="max-w-lg text-lg font-medium text-[#595c5d]">
                {variant === "restaurant"
                  ? "Configure discounts and promotions for restaurant POS orders. Active “special” rules apply to line totals when staff create orders."
                  : "Manage pricing rules and define seasonal adjustments for your accommodations."}
              </p>
              {filterLabel && (
                <p className="text-sm font-medium text-[#595c5d]">
                  Filter: <span className="font-bold text-[#9b3f00]">{filterLabel}</span>
                </p>
              )}
                </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-xl bg-[#eff1f2] p-2">
                <Search className="h-5 w-5 shrink-0 text-[#757778]" aria-hidden />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rules…"
                  className="w-full min-w-[12rem] border-0 bg-transparent text-sm font-medium text-[#2c2f30] placeholder:text-[#757778] focus:outline-none focus:ring-0 md:w-52"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Control bar */}
        <section className="mb-8 md:mb-10">
          <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {variant === "restaurant" ? (
                <span className="ml-1 text-sm font-semibold text-[#595c5d]">
                  Restaurant department · rules stored for this branch only
                </span>
              ) : (
                <>
                  <span className="ml-1 text-sm font-semibold text-[#595c5d]">Showing:</span>
                  <Link href="/pricing-rules?department=accommodation" className={departmentLinkClass("accommodation")}>
                    Accommodation
                    <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
                  </Link>
                  <Link href="/pricing-rules?department=bar&type=special" className={departmentLinkClass("bar")}>
                    Bar (special)
                  </Link>
                  <Link
                    href={urlDepartment ? `/pricing-rules?department=${urlDepartment}` : "/pricing-rules"}
                    className={cn(
                      "rounded-full px-5 py-2 text-sm font-bold transition-all",
                      !typeFilter
                        ? "bg-[#e0e3e4] text-[#2c2f30] ring-2 ring-[#9b3f00]/30"
                        : "bg-[#e0e3e4] text-[#2c2f30] hover:bg-[#dadddf]"
                    )}
                  >
                    All types
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      pushQuery({
                        type: typeFilter ? undefined : PRICING_RULE_TYPE.SEASONAL,
                      })
                    }
                    className={cn(
                      "rounded-full px-5 py-2 text-sm font-bold transition-all",
                      typeFilter
                        ? "bg-[#9b3f00]/15 text-[#9b3f00] ring-2 ring-[#9b3f00]/25"
                        : "bg-[#e0e3e4] text-[#2c2f30] hover:bg-[#dadddf]"
                    )}
                  >
                    {typeFilter
                      ? `Type: ${TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter}`
                      : "Rule groups (seasonal)"}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={openCreate}
              className={cn(
                epilogue.className,
                "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#ff7a2c] to-[#9b3f00] px-8 py-3 text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <PlusCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
              Add rule
            </button>
          </div>
        </section>

        {urlDepartment === "bar" && typeFilter === "special" && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-dashed border-[#abadae]/60 bg-white/80 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#9b3f00]" aria-hidden />
            <p className="text-sm leading-relaxed text-[#595c5d]">
              The first active Special rule that matches the current date and days of week is applied to
              BAR orders. You can see which rule was applied in the BAR Orders table and in Take Payment.
            </p>
        </div>
        )}

        {variant === "restaurant" && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-dashed border-[#abadae]/60 bg-white/80 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#9b3f00]" aria-hidden />
            <p className="text-sm leading-relaxed text-[#595c5d]">
              Use rule type <strong className="text-[#2c2f30]">Special</strong> for POS discounts. The
              highest-priority active Special rule that matches dates and days of week is applied to each
              order line total when creating restaurant POS orders.{" "}
              <Link
                href="/pos/orders?department=restaurant"
                className="font-semibold text-[#9b3f00] underline underline-offset-2"
              >
                Open POS orders
              </Link>
            </p>
          </div>
        )}

        {/* Rules list */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-3xl bg-[#e6e8ea]"
                  aria-hidden
                />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="rounded-3xl border border-dashed border-[#abadae]/40 bg-white p-10">
              <EmptyState
                icon={Tag}
                title="No pricing rules"
                description={
                  filterLabel
                    ? "No rules for this filter yet. Add a rule to get started."
                    : "Add your first pricing rule to get started."
                }
                action={{ label: "Add rule", onClick: openCreate }}
                actionClassName="bg-gradient-to-br from-[#ff7a2c] to-[#9b3f00] font-bold text-white shadow-lg shadow-orange-500/25 hover:opacity-95"
              />
            </div>
          ) : filteredEmpty ? (
            <div className="rounded-3xl border border-dashed border-[#abadae]/40 bg-white p-10 text-center">
              <p className={cn(epilogue.className, "text-lg font-bold text-[#2c2f30]")}>
                No rules match “{searchQuery}”
              </p>
              <p className="mt-2 text-sm text-[#595c5d]">Try another search or clear the filter.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-[#abadae] text-[#2c2f30]"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <>
              {filteredItems.map((row) => {
                const id = String(row._id ?? "");
                const shortId = id.slice(-6).toUpperCase();
                const typeLabel =
                  TYPE_OPTIONS.find((o) => o.value === row.type)?.label ?? String(row.type ?? "—");
                const cat = row.roomCategoryId as { name?: string } | undefined;
                const days = row.daysOfWeek as number[] | undefined;
                const daysLabel =
                  days?.length && days.length < 7
                    ? days.map((d) => DAYS_OF_WEEK.find((x) => x.value === d)?.label ?? d).join(", ")
                    : null;

                return (
                  <div key={id} className="group relative">
                    <div
                      className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 blur transition duration-500 group-hover:opacity-[0.12]"
                      aria-hidden
                    />
                    <div className="relative flex flex-col gap-8 rounded-3xl border border-[#abadae]/15 bg-white p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest",
                          row.isActive !== false
                                ? "bg-[#9b3f00]/10 text-[#9b3f00]"
                                : "bg-[#e6e8ea] text-[#595c5d]"
                            )}
                      >
                        {row.isActive !== false ? "Active" : "Inactive"}
                        </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#abadae]">
                            Rule ID · {shortId}
                        </span>
                      </div>
                        <h2
                          className={cn(
                            epilogue.className,
                            "mb-2 text-2xl font-bold text-[#2c2f30] sm:text-3xl"
                          )}
                        >
                          {String(row.name ?? "—")}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-[#595c5d]">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff1f2] px-3 py-1 text-sm font-bold">
                            <Layers className="h-4 w-4 text-[#9b3f00]" aria-hidden />
                            {typeLabel}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff1f2] px-3 py-1 text-sm font-bold">
                            <Gauge className="h-4 w-4 text-[#9b3f00]" aria-hidden />
                            Priority: {String(row.priority ?? 0)}
                          </span>
                          {cat?.name && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d7e4ec] px-3 py-1 text-sm font-bold text-[#515d64]">
                              <Tag className="h-4 w-4" aria-hidden />
                              {cat.name}
                            </span>
                          )}
                          {daysLabel && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0ea] px-3 py-1 text-sm font-bold text-[#4f1d00]">
                              <Clock className="h-4 w-4" aria-hidden />
                              {daysLabel}
                            </span>
                          )}
                      </div>
                        </div>

                      <div className="flex w-full flex-col gap-8 border-t border-[#abadae]/15 pt-6 sm:flex-row sm:items-center lg:w-auto lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#757778]">
                            Modifier
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span
                              className={cn(
                                epilogue.className,
                                "text-4xl font-black text-[#9b3f00]"
                              )}
                            >
                              {formatModifier(row as { modifierType?: string; modifierValue?: number })}
                            </span>
                            <span className="text-sm font-bold text-[#595c5d]">
                              ({String(row.modifierType ?? "—")})
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#757778]">
                            Date range
                          </p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 shrink-0 text-[#9b3f00]" aria-hidden />
                            <p className="text-sm font-bold text-[#2c2f30]">
                              {row.startDate
                                ? format(new Date(row.startDate as string), "MMM d, yyyy")
                                : "Any"}
                              {" – "}
                              {row.endDate
                                ? format(new Date(row.endDate as string), "MMM d, yyyy")
                                : "Any"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full justify-end gap-2 lg:w-auto lg:flex-col xl:flex-row">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-xl bg-[#e0e3e4] p-3 text-[#2c2f30] transition-colors hover:bg-[#dadddf]"
                          aria-label="Edit rule"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDelete(id)}
                          className="rounded-xl bg-[#b02500]/10 p-3 text-[#b02500] transition-colors hover:bg-[#b02500]/20"
                          aria-label="Delete rule"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
              </div>
                  </div>
                );
              })}

              {/* Bento row */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#abadae]/30 bg-[#eff1f2] p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <Sparkles className="h-6 w-6 text-[#757778]" aria-hidden />
                  </div>
                  <h3 className={cn(epilogue.className, "font-bold text-[#2c2f30]")}>Smart suggestions</h3>
                  <p className="mt-1 text-xs text-[#595c5d]">
                    Review occupancy and revenue reports to decide when to add premiums or discounts.
                  </p>
                </div>
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#abadae]/30 bg-[#eff1f2] p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <Clock className="h-6 w-6 text-[#757778]" aria-hidden />
                  </div>
                  <h3 className={cn(epilogue.className, "font-bold text-[#2c2f30]")}>Flash windows</h3>
                  <p className="mt-1 text-xs text-[#595c5d]">
                    Use tight date ranges and day-of-week filters for short promotions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-[#9b3f00]/20 bg-[#ff7a2c]/10 p-6 text-center transition hover:bg-[#ff7a2c]/15"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a2c] to-[#9b3f00] shadow-md">
                    <PlusCircle className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className={cn(epilogue.className, "font-bold text-[#9b3f00]")}>New rule</h3>
                  <p className="mt-1 text-xs text-[#9b3f00]/80">Create another pricing rule.</p>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Insights */}
        {!isEmpty && (
          <section className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:mt-16">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#2c2f30] p-8 text-[#f5f6f7] lg:col-span-4">
              <div
                className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#ff7a2c]/20 blur-2xl"
                aria-hidden
              />
              <div className="relative z-10">
                <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7a2c]">
                  Rule coverage
                </span>
                <h3 className={cn(epilogue.className, "mb-4 text-2xl font-bold leading-tight")}>
                  Active rules on this page
                </h3>
                <div className="mb-2 flex items-end gap-2">
                  <span className={cn(epilogue.className, "text-5xl font-black text-white md:text-6xl")}>
                    {activeCount}
                  </span>
                  <TrendingUp className="mb-2 h-8 w-8 text-[#ff7a2c]" aria-hidden />
                </div>
                <p className="text-sm font-medium text-[#dadddf]">
                  {filteredItems.length} rule{filteredItems.length !== 1 ? "s" : ""} shown
                  {searchQuery.trim() ? " (search filtered)" : ""}.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-10 rounded-[2.5rem] bg-[#e0e3e4] p-8 md:flex-row md:p-10 lg:col-span-8">
              <div className="flex-1">
                <h3 className={cn(epilogue.className, "mb-4 text-2xl font-bold text-[#2c2f30]")}>
                  Optimization tip
                </h3>
                <p className="mb-6 text-[#595c5d]">
                  {variant === "restaurant" ? (
                    <>
                      Stack rules with <span className="font-semibold text-[#2c2f30]">priority</span>: the
                      highest-priority active <span className="font-semibold text-[#2c2f30]">Special</span> rule
                      is used for POS line totals. Use percentage or fixed discounts; keep date ranges and
                      days of week explicit.
                    </>
                  ) : (
                    <>
                      Stack rules with <span className="font-semibold text-[#2c2f30]">priority</span>: higher
                      priority runs first. Use negative percentages for discounts and positive for premiums.
                      Keep date ranges explicit so staff see predictable rates at check-in.
                    </>
                  )}
                </p>
                <Link
                  href={
                    variant === "restaurant"
                      ? "/pos/orders?department=restaurant"
                      : "/bookings"
                  }
                  className="inline-flex items-center gap-2 font-bold text-[#9b3f00] transition group"
                >
                  <span>
                    {variant === "restaurant" ? "Open restaurant POS orders" : "Open bookings"}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="flex aspect-square w-full max-w-[16rem] flex-col justify-between rounded-3xl bg-white p-6 shadow-xl shadow-black/5">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-[#ff7a2c] p-2">
                    <LayoutGrid className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <span className="text-xs font-bold text-[#595c5d]">Snapshot</span>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#e0e3e4]">
                    <div
                      className="h-full rounded-full bg-[#9b3f00]"
                      style={{ width: `${Math.min(100, activeCount * 25)}%` }}
                    />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#e0e3e4]">
                    <div
                      className="h-full rounded-full bg-[#ff7a2c]"
                      style={{ width: `${Math.min(100, (pagination?.total ?? filteredItems.length) * 8)}%` }}
                    />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#e0e3e4]">
                    <div className="h-full w-[90%] rounded-full bg-[#f7b21f]" />
                  </div>
                </div>
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-[#757778]">
                  Rule activity
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Pagination */}
              {pagination && !isEmpty && pagination.total > pagination.limit && (
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#abadae]/15 bg-white px-4 py-4 sm:flex-row sm:px-6">
            <p className="text-sm text-[#595c5d]">
              Showing {(page - 1) * pagination.limit + 1}–
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev || isLoading}
                className="border-[#abadae] text-[#2c2f30] hover:bg-[#eff1f2]"
                    >
                      Previous
                    </Button>
              <span className="text-sm font-semibold text-[#595c5d]">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext || isLoading}
                className="border-[#abadae] text-[#2c2f30] hover:bg-[#eff1f2]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
          )}
        </div>

      {/* Add / Edit rule — Solar-style intelligence modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="6xl"
        className={cn(
          manrope.className,
          "flex max-h-[92vh] !w-[min(100vw-1.5rem,64rem)] !max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-[#abadae]/25 bg-[#f5f6f7] p-0 shadow-2xl"
        )}
        bodyClassName="min-h-0 flex-1 overflow-y-auto p-0"
      >
        <form onSubmit={handleSubmit} className="relative">
          {(() => {
            const rulesListParams = new URLSearchParams();
            if (variant !== "restaurant" && urlDepartment) {
              rulesListParams.set("department", urlDepartment);
            }
            if (typeFilter) rulesListParams.set("type", typeFilter);
            const rulesListHref =
              variant === "restaurant"
                ? rulesListParams.toString()
                  ? `/restaurant/pricing-rules?${rulesListParams.toString()}`
                  : "/restaurant/pricing-rules"
                : rulesListParams.toString()
                  ? `/pricing-rules?${rulesListParams.toString()}`
                  : "/pricing-rules";
            const closeRuleModal = () => {
              setShowModal(false);
              resetForm();
            };
            const modVal = Math.abs(parseFloat(form.modifierValue) || 0);
            const previewBarPct =
              form.modifierType === MODIFIER_TYPE.PERCENTAGE
                ? Math.min(100, modVal * 4)
                : Math.min(100, modVal / 2);
            const previewLabel =
              form.modifierType === MODIFIER_TYPE.PERCENTAGE
                ? `${form.modifierValue || "0"}%`
                : new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
                    modVal
                  );

            return (
              <>
                <button
                  type="button"
                  onClick={closeRuleModal}
                  className="absolute right-4 top-4 z-20 rounded-xl p-2 text-[#595c5d] transition-colors hover:bg-[#e6e8ea] hover:text-[#2c2f30]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="border-b border-[#abadae]/15 bg-[#f5f6f7]/95 px-6 pb-8 pt-14 backdrop-blur-md md:px-10">
                  <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[#757778]">
                    <Link href={rulesListHref} className="font-medium hover:text-[#9b3f00]">
                      Pricing Rules
                    </Link>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    <span className="font-semibold text-[#2c2f30]">
                      {editItem ? "Edit rule" : "New rule"}
                    </span>
                  </nav>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <h2
                      className={cn(
                        epilogue.className,
                        "text-4xl font-black tracking-tight text-[#2c2f30] md:text-5xl"
                      )}
                    >
                      {editItem ? "Edit pricing rule" : "Add pricing rule"}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={closeRuleModal}
                        className="rounded-xl bg-[#e0e3e4] px-6 py-3 text-sm font-bold text-[#2c2f30] transition-colors hover:bg-[#dadddf]"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        disabled={createMut.isPending || updateMut.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#ff7a2c] to-[#9b3f00] px-8 py-3 text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                      >
                        {editItem ? "Update rule" : "Create rule"}
                        <CheckCircle2 className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 px-6 py-10 md:px-10">
                  <div className="col-span-12 space-y-8 lg:col-span-8">
                    <section className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
                      <div
                        className="absolute -right-4 -top-4 h-32 w-32 rounded-bl-full bg-[#9b3f00]/5"
                        aria-hidden
                      />
                      <RuleFormSectionTitle accent="primary">Basic configuration</RuleFormSectionTitle>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label htmlFor="rule-name" className="ml-1 text-sm font-bold text-[#595c5d]">
                            Rule name
                          </label>
                          <input
                            id="rule-name"
                            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Summer weekend surcharge"
                            className={solarInputClass}
          />
                        </div>
                        <div
                          className={cn(
                            "grid grid-cols-1 gap-6",
                            variant === "restaurant" ? "" : "md:grid-cols-2"
                          )}
                        >
                          <div className="space-y-2">
                            <span className="ml-1 text-sm font-bold text-[#595c5d]">Type</span>
            <AppReactSelect
                              visualVariant="solar"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            />
                          </div>
                          {variant !== "restaurant" ? (
                            <div className="space-y-2">
                              <span className="ml-1 text-sm font-bold text-[#595c5d]">
                                Room category (optional)
                              </span>
                              <AppReactSelect
                                visualVariant="solar"
                                options={[
                                  { value: "", label: "All categories" },
                                  ...categories.map((c: { _id: string; name: string }) => ({
                                    value: c._id,
                                    label: c.name,
                                  })),
                                ]}
                                value={form.roomCategoryId}
                                onChange={(v) => setForm((f) => ({ ...f, roomCategoryId: v }))}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
                      <RuleFormSectionTitle accent="amber">Modifier &amp; value</RuleFormSectionTitle>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <span className="ml-1 text-sm font-bold text-[#595c5d]">Modifier type</span>
            <AppReactSelect
                            visualVariant="solar"
              options={MODIFIER_OPTIONS}
              value={form.modifierType}
              onChange={(v) => setForm((f) => ({ ...f, modifierType: v }))}
            />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="modifier-value" className="ml-1 text-sm font-bold text-[#595c5d]">
                            Modifier value
                          </label>
                          <div className="relative">
                            <input
                              id="modifier-value"
              type="number"
              step="0.01"
                              required
              value={form.modifierValue}
              onChange={(e) => setForm((f) => ({ ...f, modifierValue: e.target.value }))}
                              placeholder={form.modifierType === MODIFIER_TYPE.PERCENTAGE ? "15" : "50"}
                              className={cn(solarInputClass, "pr-12")}
            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-[#757778]">
                              {form.modifierType === MODIFIER_TYPE.PERCENTAGE ? "%" : "GHS"}
                            </span>
          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
                      <RuleFormSectionTitle accent="secondary">Duration &amp; schedule</RuleFormSectionTitle>
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="ml-1 text-sm font-bold text-[#595c5d]">
                              Start date &amp; time
                            </label>
              <ReactDatePicker
                selected={form.startDate ? new Date(form.startDate) : null}
                onChange={(date) =>
                  setForm((f) => ({
                    ...f,
                    startDate: date ? toDateTimeLocal(date) : "",
                  }))
                }
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                              className={cn(solarInputClass, "!flex min-h-[52px] items-center")}
                placeholderText="Select start"
              />
            </div>
                          <div className="space-y-2">
                            <label className="ml-1 text-sm font-bold text-[#595c5d]">
                              End date &amp; time
                            </label>
              <ReactDatePicker
                selected={form.endDate ? new Date(form.endDate) : null}
                onChange={(date) =>
                  setForm((f) => ({
                    ...f,
                    endDate: date ? toDateTimeLocal(date) : "",
                  }))
                }
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                              className={cn(solarInputClass, "!flex min-h-[52px] items-center")}
                placeholderText="Select end"
              />
            </div>
          </div>
                        <div className="space-y-4">
                          <span className="ml-1 text-sm font-bold text-[#595c5d]">
              Days of week (optional)
                          </span>
            <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map((d) => {
                              const on = form.daysOfWeek.includes(d.value);
                              return (
                                <button
                  key={d.value}
                                  type="button"
                                  onClick={() => toggleDay(d.value)}
                                  className={cn(
                                    "rounded-full px-5 py-2 text-sm font-bold transition-all",
                                    on
                                      ? "border-2 border-[#9b3f00] bg-[#9b3f00] text-white"
                                      : "bg-[#e0e3e4] text-[#595c5d] hover:bg-[#dadddf]"
                                  )}
                                >
                  {d.label}
                                </button>
                              );
                            })}
            </div>
          </div>
                      </div>
                    </section>
                  </div>

                  <div className="col-span-12 space-y-6 lg:col-span-4">
                    <div className="sticky top-4 rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
                      <h3
                        className={cn(
                          epilogue.className,
                          "mb-6 text-lg font-bold text-[#2c2f30]"
                        )}
                      >
                        Rule settings
                      </h3>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label htmlFor="rule-priority" className="ml-1 text-sm font-bold text-[#595c5d]">
                            Priority
                          </label>
                          <div className="flex flex-wrap items-center gap-4">
              <input
                              id="rule-priority"
                              type="number"
                              value={form.priority}
                              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                              placeholder="0"
                              className={cn(solarInputClass, "w-24 text-center")}
                            />
                            <span className="max-w-[14rem] text-xs leading-snug text-[#757778]">
                              {variant === "restaurant"
                                ? "Higher priority rules are considered first when several Special rules could apply."
                                : "Higher numbers run first when multiple rules apply to the same night."}
                            </span>
                          </div>
                        </div>
                        <hr className="border-[#abadae]/20" />
                        <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#9b3f00]/5 p-4">
                          <div>
                            <p className="text-sm font-bold text-[#2c2f30]">Active status</p>
                            <p className="text-xs text-[#757778]">Enable rule when saved</p>
                          </div>
                          <button
              type="button"
                            role="switch"
                            aria-checked={form.isActive}
                            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                            className={cn(
                              "relative h-6 w-12 shrink-0 rounded-full transition-colors",
                              form.isActive ? "bg-[#9b3f00]" : "bg-[#dadddf]"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                                form.isActive ? "left-7" : "left-1"
                              )}
                            />
                          </button>
                        </div>
                        <div className="space-y-4 rounded-2xl bg-[#eff1f2] p-6">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#757778]">
                            Modifier preview
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span
                              className={cn(epilogue.className, "text-3xl font-black text-[#9b3f00]")}
                            >
                              {previewLabel}
                            </span>
                            <span className="text-sm font-medium text-[#2c2f30]">
                              {form.modifierType === MODIFIER_TYPE.PERCENTAGE
                                ? "rate adjustment"
                                : "per night (fixed)"}
                            </span>
          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#dadddf]">
                            <div
                              className="h-full rounded-full bg-[#9b3f00] transition-all"
                              style={{ width: `${previewBarPct}%` }}
                            />
                          </div>
                          <p className="text-xs leading-relaxed text-[#595c5d]">
                            Positive values increase the category base; negative values discount it. Final
                            rates also depend on other rules and priority.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed border-[#abadae]/50 p-6 text-center">
                      <ImagePlus className="h-9 w-9 text-[#757778]" strokeWidth={1.5} aria-hidden />
                      <p className="text-sm font-bold text-[#757778]">Rule documentation</p>
                      <p className="text-xs text-[#757778]/80">
                        Attach internal notes in your SOP; file upload can be added later.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </form>
      </Modal>

      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete pricing rule">
        <p className="text-[#595c5d]">
          Are you sure you want to delete this pricing rule? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="border-[#abadae]">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={deleteMut.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
