"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useTenantProfile, useUpdateTenantProfile } from "@/hooks/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import toast from "react-hot-toast";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Layout,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  BLOCK_TYPES,
  type BlockType,
  type WebsiteBlock,
  createDefaultProps,
  generateBlockId,
} from "@/types/website-builder";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

type BlockWithMeta = WebsiteBlock & { _index: number };

function getBlockIcon(type: BlockType): LucideIcon {
  return Layout;
}

function getBlockLabel(type: BlockType): string {
  return BLOCK_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function WebsiteBuilderPage() {
  const { user } = useAppSelector((s) => s.auth);
  const role = user?.role ?? "";
  const canEdit = role === "tenantAdmin";
  const { data: profileData } = useTenantProfile({ enabled: canEdit });
  const updateProfile = useUpdateTenantProfile();
  const tenant = profileData?.data as Record<string, unknown> | undefined;
  const existingConfig = tenant?.publicSiteConfig as { blocks?: WebsiteBlock[]; navbar?: unknown; footer?: unknown } | undefined;
  const existingBlocks = existingConfig?.blocks ?? [];

  const [blocks, setBlocks] = useState<WebsiteBlock[]>([]);
  const [saved, setSaved] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<BlockType>("hero");
  const [editBlock, setEditBlock] = useState<BlockWithMeta | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (existingBlocks.length > 0) {
      setBlocks(existingBlocks as WebsiteBlock[]);
    }
  }, [existingBlocks.length, JSON.stringify(existingBlocks)]);

  const move = (index: number, dir: "up" | "down") => {
    const next = [...blocks];
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
    setSaved(false);
  };

  const remove = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    setSaved(false);
  };

  const addBlock = () => {
    const id = generateBlockId();
    const props = createDefaultProps(addType);
    setBlocks([...blocks, { id, type: addType, props } as WebsiteBlock]);
    setAddOpen(false);
    setSaved(false);
  };

  const openEdit = (block: WebsiteBlock, index: number) => {
    setEditBlock({ ...block, _index: index });
    setEditForm({ ...(block.props ?? {}) });
  };

  const saveEdit = () => {
    if (editBlock == null) return;
    const next = [...blocks];
    next[editBlock._index] = { ...editBlock, props: { ...editForm } };
    setBlocks(next);
    setEditBlock(null);
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        publicSiteConfig: {
          ...existingConfig,
          blocks,
        },
      });
      setSaved(true);
      toast.success("Website layout saved");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? "Failed to save");
    }
  };

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center" style={FONT_INTER}>
        <p className="text-slate-600">Only tenant admins can customize the public website.</p>
      </div>
    );
  }

  const slug = (tenant?.slug as string) ?? "";
  const previewUrl = slug ? `/hotels/${slug}` : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6" style={FONT_INTER}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Website builder
          </h1>
          <p className="mt-1 text-slate-600">
            Add, reorder, and edit sections on your public hotel page. Changes appear at your hotel URL.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {previewUrl && (
            <Link href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview site
              </Button>
            </Link>
          )}
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending || saved}
            className="gap-2 font-semibold"
            style={{
              background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
              color: "white",
              border: "none",
            }}
          >
            {updateProfile.isPending ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white">
          <CardTitle className="text-lg font-semibold text-slate-900">Sections</CardTitle>
          <p className="text-sm text-slate-500">
            Drag order with up/down. Add sections below. When empty, the default hotel page layout is used.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layout className="h-14 w-14 text-slate-300" strokeWidth={1.25} />
              <p className="mt-4 font-medium text-slate-700">No sections yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add sections to build a custom layout. If you leave this empty, the default page is shown.
              </p>
              <Button
                className="mt-6 gap-2 font-semibold"
                style={{
                  background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)",
                  color: "white",
                  border: "none",
                }}
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add first section
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {blocks.map((block, index) => (
                <li
                  key={block.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-6 hover:bg-slate-50/80"
                >
                  <div className="flex shrink-0 items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      onClick={() => move(index, "up")}
                      disabled={index === 0}
                      className="rounded p-1.5 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, "down")}
                      disabled={index === blocks.length - 1}
                      className="rounded p-1.5 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{getBlockLabel(block.type as BlockType)}</p>
                    <p className="truncate text-sm text-slate-500">
                      {block.type === "hero" && (block.props?.headline as string) && `"${(block.props.headline as string).slice(0, 40)}…"`}
                      {block.type === "text" && (block.props?.heading as string) && `"${(block.props.heading as string).slice(0, 40)}…"`}
                      {block.type === "cta" && (block.props?.heading as string) && `"${block.props.heading}"`}
                      {!["hero", "text", "cta"].includes(block.type) && block.type}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(block, index)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {blocks.length > 0 && (
            <div className="border-t border-slate-100 p-4 sm:px-6">
              <Button
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add section
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add block modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add section" size="md">
        <div className="space-y-4">
          <Select
            label="Section type"
            value={addType}
            onChange={(e) => setAddType(e.target.value as BlockType)}
            options={BLOCK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <p className="text-sm text-slate-500">
            {BLOCK_TYPES.find((t) => t.value === addType)?.description}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addBlock}
              style={{
                background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)",
                color: "white",
                border: "none",
              }}
            >
              Add section
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit block modal */}
      <Modal
        open={!!editBlock}
        onClose={() => setEditBlock(null)}
        title={`Edit ${editBlock ? getBlockLabel(editBlock.type as BlockType) : ""}`}
        size="lg"
      >
        {editBlock && (
          <BlockEditForm
            type={editBlock.type as BlockType}
            form={editForm}
            setForm={setEditForm}
            onSave={saveEdit}
            onCancel={() => setEditBlock(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function BlockEditForm({
  type,
  form,
  setForm,
  onSave,
  onCancel,
}: {
  type: BlockType;
  form: Record<string, unknown>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      {type === "hero" && (
        <>
          <Select
            label="Hero style"
            value={(form.style as string) ?? "gallery"}
            onChange={(e) => update("style", e.target.value)}
            options={[
              { value: "gallery", label: "Gallery" },
              { value: "fullwidth", label: "Full width" },
              { value: "minimal", label: "Minimal" },
            ]}
          />
          <Input
            label="Headline"
            value={(form.headline as string) ?? ""}
            onChange={(e) => update("headline", e.target.value)}
            placeholder="Overrides hotel name"
          />
          <Input
            label="Subheadline"
            value={(form.subheadline as string) ?? ""}
            onChange={(e) => update("subheadline", e.target.value)}
            placeholder="Optional tagline"
          />
          <Input
            label="Hero image URL"
            type="url"
            value={(form.imageUrl as string) ?? ""}
            onChange={(e) => update("imageUrl", e.target.value)}
            placeholder="Single image (optional)"
          />
        </>
      )}
      {type === "text" && (
        <>
          <Input
            label="Heading"
            value={(form.heading as string) ?? ""}
            onChange={(e) => update("heading", e.target.value)}
          />
          <Textarea
            label="Body"
            value={(form.body as string) ?? ""}
            onChange={(e) => update("body", e.target.value)}
            rows={4}
            placeholder="Paragraph text"
          />
          <Select
            label="Alignment"
            value={(form.align as string) ?? "left"}
            onChange={(e) => update("align", e.target.value)}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </>
      )}
      {type === "image" && (
        <>
          <Input
            label="Image URL"
            type="url"
            value={(form.imageUrl as string) ?? ""}
            onChange={(e) => update("imageUrl", e.target.value)}
            required
          />
          <Input
            label="Caption"
            value={(form.caption as string) ?? ""}
            onChange={(e) => update("caption", e.target.value)}
          />
          <Input
            label="Alt text"
            value={(form.alt as string) ?? ""}
            onChange={(e) => update("alt", e.target.value)}
            placeholder="Accessibility"
          />
        </>
      )}
      {type === "cta" && (
        <>
          <Input
            label="Heading"
            value={(form.heading as string) ?? ""}
            onChange={(e) => update("heading", e.target.value)}
            placeholder="e.g. Ready to book?"
          />
          <Input
            label="Button text"
            value={(form.buttonText as string) ?? ""}
            onChange={(e) => update("buttonText", e.target.value)}
            placeholder="e.g. Book now"
          />
          <Select
            label="Action"
            value={(form.action as string) ?? "book"}
            onChange={(e) => update("action", e.target.value)}
            options={[
              { value: "book", label: "Open booking" },
              { value: "contact", label: "Scroll to contact" },
            ]}
          />
        </>
      )}
      {type === "footer" && (
        <>
          <Textarea
            label="Footer text"
            value={(form.text as string) ?? ""}
            onChange={(e) => update("text", e.target.value)}
            rows={3}
            placeholder="Copyright or short text"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="footerShowSocial"
              checked={!!form.showSocial}
              onChange={(e) => update("showSocial", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="footerShowSocial" className="text-sm font-medium text-slate-700">
              Show social links
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Footer links (label + URL) can be added in a future update. For now use footer text.
          </p>
        </>
      )}
      {["about", "amenities", "rooms", "event_halls", "contact", "nearby", "gallery"].includes(type) && (
        <p className="text-sm text-slate-500">
          This section uses your hotel data automatically. No extra settings.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          style={{
            background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
            color: "white",
            border: "none",
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
