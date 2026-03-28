"use client";

import { useState, useMemo } from "react";
import {
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
  Textarea,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { StockImagePicker } from "@/components/ui/stock-image-picker";
import { FiPlus, FiEdit2, FiTrash2, FiGrid } from "react-icons/fi";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const MENU_CATEGORIES = [
  "Starters & Appetizers", "Soups", "Salads", "Main Course", "Grills & BBQ",
  "Seafood", "Poultry", "Vegetarian & Vegan", "Sides", "Rice & Grains",
  "Pasta & Noodles", "Bread & Bakery", "Desserts", "Cakes & Pastries",
  "Ice Cream & Frozen", "Breakfast", "Brunch", "Snacks & Light Bites",
  "Kids Menu", "Beverages", "Soft Drinks", "Juices & Smoothies", "Hot Drinks",
  "Coffee", "Tea", "Alcoholic Beverages", "Beer", "Wine", "Spirits & Cocktails",
  "Local & Craft", "Specials", "Combos & Bundles", "Other",
];

export default function MenuItemsPage() {
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? undefined;
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    image: [] as UploadedImage[],
    preparationTime: "",
    allergens: "",
    isAvailable: true,
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (department) params.department = department;
  if (categoryFilter) params.category = categoryFilter;

  const { data, isLoading } = useMenuItems(params);
  const { data: allData } = useMenuItems({
    limit: "500",
    ...(department ? { department } : {}),
  });
  const createMut = useCreateMenuItem();
  const updateMut = useUpdateMenuItem();
  const deleteMut = useDeleteMenuItem();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const allItems = allData?.data ?? [];

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>(MENU_CATEGORIES);
    allItems.forEach((item: any) => {
      if (item.category?.trim()) cats.add(item.category.trim());
    });
    return [
      { value: "", label: "All Categories" },
      ...Array.from(cats).sort().map((c) => ({ value: c, label: c })),
    ];
  }, [allItems]);

  const formCategoryOptions = useMemo(() => {
    const cats = new Set<string>(MENU_CATEGORIES);
    allItems.forEach((item: any) => {
      if (item.category?.trim()) cats.add(item.category.trim());
    });
    return [
      { value: "", label: "Select category..." },
      ...Array.from(cats).sort().map((c) => ({ value: c, label: c })),
    ];
  }, [allItems]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      category: "",
      price: "",
      image: [],
      preparationTime: "",
      allergens: "",
      isAvailable: true,
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
      name: item.name ?? "",
      description: item.description ?? "",
      category: item.category ?? "",
      price: item.price != null ? String(item.price) : "",
      image: item.image ? [{ url: item.image }] : [],
      preparationTime: item.preparationTime != null ? String(item.preparationTime) : "",
      allergens: Array.isArray(item.allergens) ? item.allergens.join(", ") : "",
      isAvailable: item.isAvailable ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(form.price);
    if (!form.name.trim() || !form.category.trim() || isNaN(priceNum) || priceNum < 0) {
      toast.error("Name, category, and valid price are required");
      return;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim(),
      price: priceNum,
      image: form.image[0]?.url || undefined,
      preparationTime: form.preparationTime ? parseInt(form.preparationTime, 10) : undefined,
      allergens: form.allergens.split(",").map((s) => s.trim()).filter(Boolean),
      isAvailable: form.isAvailable,
    };
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, department, ...payload });
        toast.success("Menu item updated");
      } else {
        await createMut.mutateAsync({ department, ...payload });
        toast.success("Menu item created");
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
      await deleteMut.mutateAsync({ id: showDelete, department });
      toast.success("Menu item deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const columns = [
    {
      key: "image",
      header: "",
      render: (row: any) =>
        row.image ? (
          <img src={row.image} alt={row.name} className="h-11 w-11 rounded-lg object-cover shadow-sm" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
            <FiGrid className="h-5 w-5 text-slate-400" />
          </div>
        ),
    },
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category" },
    {
      key: "price",
      header: "Price",
      render: (row: any) => (
        <span className="font-semibold text-[#5a189a]">{row.price != null ? fmt(row.price) : "-"}</span>
      ),
    },
    {
      key: "isAvailable",
      header: "Available",
      render: (row: any) => (
        <Badge variant={row.isAvailable ? "success" : "danger"}>
          {row.isAvailable ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "preparationTime",
      header: "Prep",
      render: (row: any) =>
        row.preparationTime != null ? `${row.preparationTime} min` : "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
            className="text-[#5a189a] hover:bg-[#5a189a]/10"
          >
            <FiEdit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50"
          >
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-1 h-1 w-16 rounded-full bg-gradient-to-r from-[#ff6d00] to-[#ff9e00]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Menu Items
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your restaurant menu and pricing.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <AppReactSelect
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              options={categoryOptions}
              placeholder="All categories"
              className="w-full sm:max-w-[220px]"
            />
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-lg shadow-[#ff6d00]/25 hover:opacity-95"
            >
              <FiPlus className="h-4 w-4" />
              Add Item
            </Button>
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
            emptyTitle="No menu items"
            emptyDescription="Add your first menu item to get started."
            className="[&_table]:rounded-b-2xl"
          />
        </div>

        <Modal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editItem ? "Edit Menu Item" : "Add Menu Item"}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Jollof Rice"
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AppReactSelect
                label="Category"
                value={form.category}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                options={formCategoryOptions}
              />
              <Input
                label="Price (GHS)"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Upload an image, or pick a free stock photo (Pixabay).
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowStockPicker(true)}
              >
                Pick from stock photos
              </Button>
            </div>
            <ImageUpload
              label="Image"
              value={form.image}
              onChange={(image) => setForm((f) => ({ ...f, image }))}
              folder="menu-items"
              single
            />
            <Input
              label="Preparation Time (minutes)"
              type="number"
              min="0"
              value={form.preparationTime}
              onChange={(e) => setForm((f) => ({ ...f, preparationTime: e.target.value }))}
              placeholder="Optional"
            />
            <Input
              label="Allergens (comma-separated)"
              value={form.allergens}
              onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))}
              placeholder="e.g. nuts, dairy"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
              />
              <span className="text-sm font-medium text-slate-700">Available</span>
            </label>
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
              <Button
                type="submit"
                loading={createMut.isPending || updateMut.isPending}
                className="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white"
              >
                {editItem ? "Update" : "Create"}
              </Button>
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
              image: [{ url: img.url, caption: img.caption }],
            }))
          }
        />

        <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Menu Item">
          <p className="text-slate-600">
            Are you sure you want to delete this menu item? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteMut.isPending}>
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
