"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
  AppReactSelect,
  AppDatePicker,
  Dropdown,
} from "@/components/ui";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiDollarSign,
  FiFilter,
  FiDownload,
  FiPrinter,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { EXPENSE_STATUS, PAYMENT_METHOD, DEPARTMENT, COA_ACCOUNTS } from "@/constants";
import { AlertTriangle } from "lucide-react";

type SavedView = {
  id: string;
  name: string;
  status: string;
  category: string;
  dateFrom: string;
  dateTo: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const STATUS_OPTIONS = Object.entries(EXPENSE_STATUS).map(([_, v]) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}));

const STATUS_BADGE_VARIANT: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const CATEGORY_OPTIONS = [
  "Utilities",
  "Supplies",
  "Maintenance",
  "Staff",
  "Marketing",
  "Equipment",
  "Food & Beverage",
  "Cleaning",
  "Other",
];

/** Expense account options for Chart of Accounts by department. */
function getCoaExpenseOptions(dept: string) {
  return COA_ACCOUNTS.filter(
    (a) => a.type === "expense" && (a.department === dept || a.department === DEPARTMENT.GENERAL)
  ).map((a) => ({ value: a.code, label: a.label }));
}

const QUICK_TEMPLATES = [
  {
    id: "supplier-invoice",
    label: "Supplier invoice",
    category: "Supplies",
    description: "Supplier invoice",
  },
  {
    id: "staff-meal",
    label: "Staff meal allowance",
    category: "Staff",
    description: "Staff meal allowance",
  },
  {
    id: "utilities",
    label: "Monthly utilities",
    category: "Utilities",
    description: "Utilities bill",
  },
  {
    id: "maintenance",
    label: "Maintenance work",
    category: "Maintenance",
    description: "Maintenance and repairs",
  },
] as const;

const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
}));

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const urlDepartment = searchParams.get("department") ?? "";
  const isDepartmentLocked = !!urlDepartment;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(urlDepartment);
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [inlineEdit, setInlineEdit] = useState<{
    id: string;
    field: "category" | "notes";
  } | null>(null);
  const [inlineValue, setInlineValue] = useState("");

  const [form, setForm] = useState({
    department: (urlDepartment || DEPARTMENT.GENERAL) as string,
    category: "",
    description: "",
    amount: "",
    date: "",
    paidTo: "",
    paymentMethod: "",
    receiptUrl: "",
    notes: "",
    accountCode: "",
  });

  const formDate = form.date ? new Date(form.date + "T00:00:00") : null;
  const filterDateFrom = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
  const filterDateTo = dateTo ? new Date(dateTo + "T00:00:00") : null;

  useEffect(() => {
    setDepartmentFilter(urlDepartment);
    setForm((prev) => ({
      ...prev,
      department: (urlDepartment || prev.department || DEPARTMENT.GENERAL) as string,
    }));
    setPage(1);
    setSelectedIds([]);
  }, [urlDepartment]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `expenses_views_${urlDepartment || "all"}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedView[];
      setSavedViews(parsed);
    } catch {
      // ignore
    }
  }, [urlDepartment]);

  const toISO = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr + "T00:00:00").toISOString();
  };

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter.toLowerCase();
  if (categoryFilter) params.category = categoryFilter;
  if (departmentFilter) params.department = departmentFilter;
  if (dateFrom) params.startDate = toISO(dateFrom);
  if (dateTo) params.endDate = toISO(dateTo);

  const { data, isLoading } = useExpenses(params);
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const deleteMut = useDeleteExpense();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const itemsById = new Map<string, any>(items.map((it: any) => [it._id, it]));
  const statusCounts = items.reduce(
    (acc: Record<string, number>, r: any) => {
      const s = r.status ?? "unknown";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const hasDateRange = !!dateFrom || !!dateTo;

  const categorySelectOptions = [
    { value: "", label: "All Categories" },
    ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c })),
  ];

  const categoryStats = useMemo(() => {
    const byCategory: Record<string, number[]> = {};
    for (const row of items as any[]) {
      if (!row || row.amount == null || !row.category) continue;
      const key = String(row.category);
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(Number(row.amount));
    }
    const stats: Record<
      string,
      { median: number; threshold: number }
    > = {};
    for (const [cat, arr] of Object.entries(byCategory)) {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      stats[cat] = {
        median,
        threshold: median * 2.5,
      };
    }
    return stats;
  }, [items]);

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const persistViews = (views: SavedView[]) => {
    setSavedViews(views);
    if (typeof window === "undefined") return;
    const key = `expenses_views_${urlDepartment || "all"}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(views));
    } catch {
      // ignore
    }
  };

  const handleSaveCurrentView = () => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Name this view (e.g. 'This month – Pending')");
    if (!name) return;
    const view: SavedView = {
      id: `${Date.now()}`,
      name: name.trim(),
      status: statusFilter,
      category: categoryFilter,
      dateFrom,
      dateTo,
    };
    persistViews([...savedViews, view]);
    toast.success("View saved");
  };

  const applyView = (view: SavedView) => {
    setStatusFilter(view.status);
    setCategoryFilter(view.category);
    setDateFrom(view.dateFrom);
    setDateTo(view.dateTo);
    setPage(1);
  };

  const handleBulkStatusChange = async (status: string) => {
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        const row = itemsById.get(id);
        if (!row) continue;
        await updateMut.mutateAsync({
          id,
          department:
            departmentFilter || urlDepartment || row.department || DEPARTMENT.GENERAL,
          status,
        });
      }
      toast.success(
        status === EXPENSE_STATUS.APPROVED
          ? "Selected expenses approved"
          : "Selected expenses rejected"
      );
      clearSelection();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleExportCsv = () => {
    if (!items.length) {
      toast.error("No expenses to export");
      return;
    }
    const headers = [
      "Date",
      "Department",
      "Category",
      "Account (COA)",
      "Description",
      "Amount",
      "Status",
      "Paid To",
      "Method",
    ];
    const rows = items.map((row: any) => {
      const dateStr = row.date ? format(new Date(row.date), "yyyy-MM-dd") : "";
      const deptLabel =
        DEPARTMENT_OPTIONS.find((o) => o.value === row.department)?.label ??
        row.department ??
        "General";
      const statusLabel =
        STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status ?? "";
      const coaOpts = getCoaExpenseOptions(row.department ?? DEPARTMENT.GENERAL);
      const accountLabel = row.accountCode
        ? (coaOpts.find((o) => o.value === row.accountCode)?.label ?? row.accountCode)
        : "";
      const fields = [
        dateStr,
        deptLabel,
        row.category ?? "",
        accountLabel,
        row.description ?? "",
        row.amount != null ? String(row.amount) : "",
        statusLabel,
        row.paidTo ?? "",
        row.paymentMethod ?? "",
      ];
      return fields.map((f) => `"${String(f).replace(/"/g, '""')}"`);
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (typeof window === "undefined" || !items.length) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rowsHtml = items
      .map((row: any) => {
        const dateStr = row.date ? format(new Date(row.date), "MMM d, yyyy") : "";
        const deptLabel =
          DEPARTMENT_OPTIONS.find((o) => o.value === row.department)?.label ??
          row.department ??
          "General";
        const statusLabel =
          STATUS_OPTIONS.find((o) => o.value === row.status)?.label ??
          row.status ??
          "";
        const coaOpts = getCoaExpenseOptions(row.department ?? DEPARTMENT.GENERAL);
        const accountLabel = row.accountCode
          ? (coaOpts.find((o) => o.value === row.accountCode)?.label ?? row.accountCode)
          : "";
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${dateStr}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${deptLabel}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${row.category ?? ""}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${accountLabel}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${row.description ?? ""}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0; text-align:right;">${
            row.amount != null ? fmt(row.amount) : ""
          }</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${statusLabel}</td>
        </tr>`;
      })
      .join("");
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>Expenses</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; padding:24px; color:#0f172a;">
          <h1 style="font-size:20px; margin-bottom:8px;">Expenses</h1>
          <p style="font-size:13px; color:#64748b; margin-bottom:16px;">
            ${urlDepartment || departmentFilter || "All departments"}
          </p>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 10px; text-align:left;">Date</th>
                <th style="padding:8px 10px; text-align:left;">Department</th>
                <th style="padding:8px 10px; text-align:left;">Category</th>
                <th style="padding:8px 10px; text-align:left;">Account (COA)</th>
                <th style="padding:8px 10px; text-align:left;">Description</th>
                <th style="padding:8px 10px; text-align:right;">Amount</th>
                <th style="padding:8px 10px; text-align:left;">Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const resetForm = () => {
    setForm({
      department: (urlDepartment || DEPARTMENT.GENERAL) as string,
      category: "",
      description: "",
      amount: "",
      date: "",
      paidTo: "",
      paymentMethod: "",
      receiptUrl: "",
      notes: "",
      accountCode: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setForm((f) => ({
      ...f,
      date: format(new Date(), "yyyy-MM-dd"),
    }));
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      department: item.department ?? DEPARTMENT.GENERAL,
      category: item.category ?? "",
      description: item.description ?? "",
      amount: item.amount != null ? String(item.amount) : "",
      date: item.date
        ? format(new Date(item.date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      paidTo: item.paidTo ?? "",
      paymentMethod: item.paymentMethod ?? "",
      receiptUrl: item.receiptUrl ?? "",
      notes: item.notes ?? "",
      accountCode: item.accountCode ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lockedDepartment = (urlDepartment || "").trim();
    const finalDepartment = lockedDepartment || form.department;
    const payload = {
      department: finalDepartment,
      category: form.category.trim(),
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      date: toISO(form.date),
      paidTo: form.paidTo.trim() || undefined,
      paymentMethod: form.paymentMethod || undefined,
      receiptUrl: form.receiptUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      accountCode: form.accountCode?.trim() || undefined,
    };

    if (!payload.category || !payload.description || payload.amount <= 0) {
      toast.error("Fill required fields");
      return;
    }

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: editItem._id,
          department: finalDepartment,
          ...payload,
        });
        toast.success("Expense updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Expense created");
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
      await deleteMut.mutateAsync({
        id: showDelete,
        department: departmentFilter || urlDepartment || DEPARTMENT.GENERAL,
      });
      toast.success("Expense deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleApprove = async (item: any) => {
    try {
      await updateMut.mutateAsync({
        id: item._id,
        department: departmentFilter || urlDepartment || item.department,
        status: EXPENSE_STATUS.APPROVED,
      });
      toast.success("Expense approved");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleReject = async (item: any) => {
    try {
      await updateMut.mutateAsync({
        id: item._id,
        department: departmentFilter || urlDepartment || item.department,
        status: EXPENSE_STATUS.REJECTED,
      });
      toast.success("Expense rejected");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const totalAmount = items.reduce((s: number, r: any) => s + (r.amount ?? 0), 0);

  const columns = [
    {
      key: "select",
      header: "",
      render: (row: any) => {
        const id = row._id;
        const checked = selectedIds.includes(id);
        return (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-[#ff6d00] focus:ring-[#ff6d00]"
            checked={checked}
            onChange={() => toggleRowSelection(id)}
            aria-label="Select expense"
          />
        );
      },
    },
    {
      key: "department",
      header: "Department",
      render: (row: any) => {
        const label =
          DEPARTMENT_OPTIONS.find((o) => o.value === row.department)?.label ??
          row.department ??
          "General";
        return <Badge variant="info">{label}</Badge>;
      },
    },
    {
      key: "category",
      header: "Category",
      render: (row: any) => {
        const id = row._id as string;
        const isEditing =
          inlineEdit?.id === id && inlineEdit.field === "category";
        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={inlineValue}
                onChange={(e) => setInlineValue(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-xs"
              />
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={async () => {
                  const value = inlineValue.trim();
                  try {
                    await updateMut.mutateAsync({
                      id,
                      department:
                        departmentFilter ||
                        urlDepartment ||
                        row.department ||
                        DEPARTMENT.GENERAL,
                      category: value || undefined,
                    });
                    setInlineEdit(null);
                    setInlineValue("");
                  } catch (err: any) {
                    toast.error(
                      err?.response?.data?.error?.message ??
                        "Unable to update category"
                    );
                  }
                }}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setInlineEdit(null);
                  setInlineValue("");
                }}
              >
                Cancel
              </Button>
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={() => {
              setInlineEdit({ id, field: "category" });
              setInlineValue(row.category ?? "");
            }}
            className="inline-flex max-w-[180px] items-center gap-1 truncate text-left text-slate-900 hover:text-[#5a189a]"
          >
            <span className="truncate">
              {row.category ?? <span className="text-slate-400">Add category</span>}
            </span>
          </button>
        );
      },
    },
    {
      key: "accountCode",
      header: "Account (COA)",
      render: (row: any) => {
        const code = row.accountCode;
        if (!code) return <span className="text-slate-400">—</span>;
        const coaOpts = getCoaExpenseOptions(row.department ?? DEPARTMENT.GENERAL);
        const label = coaOpts.find((o) => o.value === code)?.label ?? code;
        return <span className="text-slate-700">{label}</span>;
      },
    },
    {
      key: "description",
      header: "Description",
      render: (row: any) => (
        <button
          type="button"
          onClick={() => setPreviewItem(row)}
          className="max-w-xs truncate text-left text-slate-900 hover:text-[#5a189a] hover:underline"
        >
          {row.description ?? "-"}
        </button>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row: any) => {
        if (row.amount == null) return "-";
        const category = row.category ? String(row.category) : "";
        const stat = category && categoryStats[category];
        const isHigh =
          stat && typeof row.amount === "number" && row.amount > stat.threshold;
        return (
          <div className="flex items-center gap-1">
            <span
              className={
                "font-medium " + (isHigh ? "text-[#b91c1c]" : "text-slate-900")
              }
            >
              {fmt(row.amount)}
            </span>
            {isHigh && (
              <AlertTriangle
                className="h-3.5 w-3.5 text-[#b91c1c]"
                aria-label="Unusually high for this category"
                title="Unusually high for this category"
              />
            )}
          </div>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      render: (row: any) =>
        row.date ? format(new Date(row.date), "MMM d, yyyy") : "-",
    },
    {
      key: "paidTo",
      header: "Paid To",
      render: (row: any) => row.paidTo ?? "-",
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (row: any) => row.paymentMethod ?? "-",
    },
    {
      key: "notes",
      header: "Notes",
      render: (row: any) => {
        const id = row._id as string;
        const isEditing =
          inlineEdit?.id === id && inlineEdit.field === "notes";
        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={inlineValue}
                onChange={(e) => setInlineValue(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-xs"
              />
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={async () => {
                  try {
                    await updateMut.mutateAsync({
                      id,
                      department:
                        departmentFilter ||
                        urlDepartment ||
                        row.department ||
                        DEPARTMENT.GENERAL,
                      notes: inlineValue.trim() || undefined,
                    });
                    setInlineEdit(null);
                    setInlineValue("");
                  } catch (err: any) {
                    toast.error(
                      err?.response?.data?.error?.message ??
                        "Unable to update notes"
                    );
                  }
                }}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setInlineEdit(null);
                  setInlineValue("");
                }}
              >
                Cancel
              </Button>
            </div>
          );
        }
        const hasNotes = !!row.notes;
        return (
          <button
            type="button"
            onClick={() => {
              setInlineEdit({ id, field: "notes" });
              setInlineValue(row.notes ?? "");
            }}
            className="inline-flex max-w-[220px] items-center gap-1 truncate text-left text-slate-900 hover:text-[#5a189a]"
          >
            <span className="truncate">
              {hasNotes ? row.notes : <span className="text-slate-400">Add note</span>}
            </span>
          </button>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? "warning"}>
          {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.status === EXPENSE_STATUS.PENDING && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApprove(row)}
                aria-label="Approve"
                className="text-emerald-600 hover:bg-emerald-50 rounded-lg"
              >
                <FiCheck className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReject(row)}
                aria-label="Reject"
                className="text-red-600 hover:bg-red-50 rounded-lg"
              >
                <FiX className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
            className="rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <FiEdit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50 rounded-lg"
          >
            <FiTrash2 className="h-4 w-4" />
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
          <div className="absolute top-0 right-0 w-[min(80vw,400px)] h-[min(80vw,400px)] bg-gradient-to-br from-[#ff9100]/10 to-[#ff6d00]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <FiDollarSign className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Expenses
                  </h1>
                  {isDepartmentLocked && (
                    <p className="text-sm font-medium text-[#5a189a] mt-0.5">
                      {DEPARTMENT_OPTIONS.find((d) => d.value === urlDepartment)?.label ?? urlDepartment}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-500 max-w-xl">
                    Track and approve expenses by department and category.
                  </p>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <Dropdown
                align="right"
                trigger={<span className="text-xs font-medium text-slate-700">Quick add</span>}
                items={QUICK_TEMPLATES.map((tpl) => ({
                  id: tpl.id,
                  label: tpl.label,
                  onClick: () => {
                    const baseDept = (urlDepartment || DEPARTMENT.GENERAL) as string;
                    setForm({
                      department: baseDept,
                      category: tpl.category,
                      description: tpl.description,
                      amount: "",
                      date: format(new Date(), "yyyy-MM-dd"),
                      paidTo: "",
                      paymentMethod: "",
                      receiptUrl: "",
                      notes: "",
                    });
                    setEditItem(null);
                    setShowModal(true);
                  },
                }))}
                className="hidden sm:inline-block"
              />
              <Button
                onClick={openCreate}
                className="h-12 px-6 rounded-xl font-semibold text-white border-0 shadow-lg shadow-[#ff6d00]/25 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-offset-2 focus:ring-[#ff6d00] transition-all hover:-translate-y-0.5"
              >
                <FiPlus className="h-5 w-5 mr-2" aria-hidden />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <FiDollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {hasDateRange ? "Expenses (filtered range)" : "Expenses (this page)"}
                </p>
                <p className="text-xl font-bold text-slate-900">{fmt(totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FiFilter className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Records</p>
                <p className="text-xl font-bold text-slate-900">{pagination?.total ?? items.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Table */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="flex items-center gap-2 text-slate-600">
                <FiFilter className="h-4 w-4 text-[#5a189a] shrink-0" aria-hidden />
                <span className="text-sm font-semibold">Filters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 flex-1 max-w-5xl">
                <AppReactSelect
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setPage(1);
                  }}
                  options={
                    isDepartmentLocked
                      ? DEPARTMENT_OPTIONS.filter((o) => o.value === urlDepartment)
                      : [{ value: "", label: "All Departments" }, ...DEPARTMENT_OPTIONS]
                  }
                  placeholder="Department"
                  isClearable={!isDepartmentLocked}
                  className="w-full"
                />
                <AppReactSelect
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={[{ value: "", label: "All Statuses" }, ...STATUS_OPTIONS]}
                  placeholder="Status"
                  isClearable
                  className="w-full"
                />
                <AppReactSelect
                  value={categoryFilter}
                  onChange={(v) => {
                    setCategoryFilter(v);
                    setPage(1);
                  }}
                  options={categorySelectOptions}
                  placeholder="Category"
                  isClearable
                  className="w-full"
                />
                <AppDatePicker
                  selected={filterDateFrom}
                  onChange={(d) => {
                    setDateFrom(d ? format(d, "yyyy-MM-dd") : "");
                    setPage(1);
                  }}
                  placeholder="From date"
                  className="w-full"
                />
                <AppDatePicker
                  selected={filterDateTo}
                  onChange={(d) => {
                    setDateTo(d ? format(d, "yyyy-MM-dd") : "");
                    setPage(1);
                  }}
                  placeholder="To date"
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "", label: "All" },
                  ...STATUS_OPTIONS,
                ].map((opt) => {
                  const isActive =
                    (opt.value || "") === (statusFilter || "");
                  const count =
                    opt.value === ""
                      ? items.length
                      : statusCounts[opt.value] ?? 0;
                  return (
                    <button
                      key={opt.value || "all"}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setPage(1);
                      }}
                      className={
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition " +
                        (isActive
                          ? "border-[#ff6d00] bg-[#ff6d00]/10 text-[#ff6d00]"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100")
                      }
                    >
                      <span>{opt.label}</span>
                      <span className="ml-2 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Dropdown
                  align="left"
                  trigger={
                    <span className="text-xs font-medium text-slate-700">
                      Saved views
                    </span>
                  }
                  items={[
                    {
                      id: "save-current",
                      label: "Save current view…",
                      onClick: handleSaveCurrentView,
                    },
                    ...savedViews.map((view) => ({
                      id: view.id,
                      label: view.name,
                      onClick: () => applyView(view),
                    })),
                  ]}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportCsv}
                  className="h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <FiDownload className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  className="h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <FiPrinter className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>

          <div className="p-0 sm:p-2 min-h-[380px]">
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between px-4 pb-3 text-xs sm:text-sm text-slate-600">
                <span className="font-medium">
                  {selectedIds.length} selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleBulkStatusChange(EXPENSE_STATUS.APPROVED)}
                    className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    <FiCheck className="mr-1.5 h-3.5 w-3.5" />
                    Approve selected
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkStatusChange(EXPENSE_STATUS.REJECTED)}
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <FiX className="mr-1.5 h-3.5 w-3.5" />
                    Reject selected
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                    className="rounded-xl text-slate-500 hover:bg-slate-100"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
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
              emptyTitle="No expenses"
              emptyDescription="Add your first expense to get started."
            />
          </div>
        </div>
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setPreviewItem(null)}
          />
          <div className="relative h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Expense Preview
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 max-w-xs truncate">
                  {previewItem.description ?? "Untitled expense"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewItem(null)}
                className="rounded-full text-slate-500 hover:bg-slate-100"
              >
                <FiX className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-500">
                    Date
                  </p>
                  <p className="mt-0.5 text-sm text-slate-900">
                    {previewItem.date
                      ? format(new Date(previewItem.date), "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-500">
                    Amount
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {previewItem.amount != null ? fmt(previewItem.amount) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-500">
                    Department
                  </p>
                  <p className="mt-0.5 text-sm text-slate-900">
                    {DEPARTMENT_OPTIONS.find((o) => o.value === previewItem.department)
                      ?.label ?? previewItem.department ?? "General"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-500">
                    Category
                  </p>
                  <p className="mt-0.5 text-sm text-slate-900">
                    {previewItem.category ?? "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  Status
                </p>
                <div className="mt-1">
                  <Badge
                    variant={STATUS_BADGE_VARIANT[previewItem.status] ?? "warning"}
                  >
                    {STATUS_OPTIONS.find((o) => o.value === previewItem.status)?.label ??
                      previewItem.status ??
                      "Pending"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  Paid To
                </p>
                <p className="mt-0.5 text-sm text-slate-900">
                  {previewItem.paidTo ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  Payment Method
                </p>
                <p className="mt-0.5 text-sm text-slate-900">
                  {previewItem.paymentMethod ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  Notes
                </p>
                <p className="mt-0.5 text-sm text-slate-900 whitespace-pre-wrap">
                  {previewItem.notes || "—"}
                </p>
              </div>
              {previewItem.receiptUrl && (
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-500">
                    Receipt
                  </p>
                  <a
                    href={previewItem.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center text-sm font-medium text-[#5a189a] hover:text-[#7b2cbf]"
                  >
                    View receipt
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Expense" : "Add Expense"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isDepartmentLocked && (
            <AppReactSelect
              label="Department"
              value={form.department}
              onChange={(v) => setForm((f) => ({ ...f, department: v }))}
              options={DEPARTMENT_OPTIONS}
              placeholder="Select department..."
              className="w-full"
            />
          )}
          <AppReactSelect
            label="Category"
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={[{ value: "", label: "Select category..." }, ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))]}
            placeholder="Select category..."
            className="w-full"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            placeholder="What was this expense for?"
            className="rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
            className="rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
          />
          <AppDatePicker
            label="Date"
            selected={formDate}
            onChange={(d) =>
              setForm((f) => ({
                ...f,
                date: d ? format(d, "yyyy-MM-dd") : "",
              }))
            }
            placeholder="Select date"
            className="w-full"
          />
          <Input
            label="Paid To"
            value={form.paidTo}
            onChange={(e) => setForm((f) => ({ ...f, paidTo: e.target.value }))}
            placeholder="Optional"
            className="rounded-xl border-slate-200"
          />
          <AppReactSelect
            label="Payment Method"
            value={form.paymentMethod}
            onChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
            options={[{ value: "", label: "Select..." }, ...METHOD_OPTIONS]}
            placeholder="Select method..."
            className="w-full"
          />
          <Input
            label="Receipt URL"
            type="url"
            value={form.receiptUrl}
            onChange={(e) => setForm((f) => ({ ...f, receiptUrl: e.target.value }))}
            placeholder="Optional"
            className="rounded-xl border-slate-200"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
            className="rounded-xl border-slate-200"
          />
          {(form.department === DEPARTMENT.RESTAURANT || urlDepartment === DEPARTMENT.RESTAURANT) && (
            <AppReactSelect
              label="Account (COA)"
              value={form.accountCode}
              onChange={(v) => setForm((f) => ({ ...f, accountCode: v ?? "" }))}
              options={[{ value: "", label: "None" }, ...getCoaExpenseOptions(form.department)]}
              placeholder="Link to Chart of Accounts"
              className="w-full"
            />
          )}
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
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Expense"
      >
        <p className="text-slate-600 text-sm">
          Are you sure you want to delete this expense? This action cannot be undone.
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
