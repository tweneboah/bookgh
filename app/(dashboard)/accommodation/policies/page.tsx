"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useBranches,
  useAccommodationPolicies,
  useUpdateAccommodationPolicies,
} from "@/hooks/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { Shield, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { USER_ROLES } from "@/constants";

const BRANCH_CHOOSER_ROLES = [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER, USER_ROLES.SUPER_ADMIN];

const NO_SHOW_OPTIONS = [
  { value: "none", label: "No charge" },
  { value: "oneNight", label: "Charge one night" },
  { value: "fullStay", label: "Charge full stay" },
];

const CANCELLATION_CHARGE_OPTIONS = [
  { value: "none", label: "No charge" },
  { value: "oneNight", label: "One night" },
  { value: "percentage", label: "Percentage of total" },
  { value: "fullStay", label: "Full stay" },
];

const DEPOSIT_OPTIONS = [
  { value: "none", label: "No deposit" },
  { value: "percentage", label: "Percentage of total" },
  { value: "fixed", label: "Fixed amount" },
];

export default function AccommodationPoliciesPage() {
  const { user } = useAppSelector((s) => s.auth);
  const canChooseBranch = (user as { role?: string })?.role && BRANCH_CHOOSER_ROLES.includes((user as { role?: string }).role as string);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const { data: branchesData } = useBranches({ limit: "200" });
  const branches = branchesData?.data ?? [];
  const effectiveBranchId = canChooseBranch
    ? selectedBranchId
    : (user as { branchId?: string })?.branchId ?? "";

  useEffect(() => {
    if (canChooseBranch && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(branches[0]._id));
    }
  }, [canChooseBranch, branches, selectedBranchId]);

  const { data: policiesData, isLoading } = useAccommodationPolicies(effectiveBranchId);
  const updateMut = useUpdateAccommodationPolicies(effectiveBranchId);
  const policies = policiesData?.data ?? {};

  const [form, setForm] = useState({
    noShowChargeType: "none" as string,
    noShowMarkAfterHours: 24,
    cancellationFreeUntilHours: 24,
    cancellationChargeType: "none" as string,
    cancellationChargeValue: 0,
    depositType: "none" as string,
    depositValue: 0,
  });

  useEffect(() => {
    if (policies && typeof policies === "object") {
      const p = policies as Record<string, unknown>;
      setForm({
        noShowChargeType: (p.noShowChargeType as string) ?? "none",
        noShowMarkAfterHours: Number(p.noShowMarkAfterHours ?? 24),
        cancellationFreeUntilHours: Number(p.cancellationFreeUntilHours ?? 24),
        cancellationChargeType: (p.cancellationChargeType as string) ?? "none",
        cancellationChargeValue: Number(p.cancellationChargeValue ?? 0),
        depositType: (p.depositType as string) ?? "none",
        depositValue: Number(p.depositValue ?? 0),
      });
    }
  }, [policies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveBranchId) {
      toast.error("Select a branch");
      return;
    }
    try {
      await updateMut.mutateAsync({
        noShowChargeType: form.noShowChargeType,
        noShowMarkAfterHours: form.noShowMarkAfterHours,
        cancellationFreeUntilHours: form.cancellationFreeUntilHours,
        cancellationChargeType: form.cancellationChargeType,
        cancellationChargeValue: form.cancellationChargeType === "percentage" ? form.cancellationChargeValue : undefined,
        depositType: form.depositType,
        depositValue: form.depositType !== "none" ? form.depositValue : undefined,
      });
      toast.success("Policies saved");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to save");
    }
  };

  const branchOptions = branches.map((b: { _id: string; name?: string }) => ({
    value: String(b._id),
    label: b.name ?? String(b._id),
  }));

  if (!effectiveBranchId && !canChooseBranch) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Branch context required. Switch to a branch.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mb-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-orange-50/80 via-white to-purple-50/50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-white">
            <Shield className="h-6 w-6 text-[#5a189a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Accommodation Policies</h1>
            <p className="mt-1 text-sm text-slate-600">
              No-show, cancellation, and deposit rules for this branch
            </p>
          </div>
        </div>
      </div>

      <Card className="border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg">Branch</CardTitle>
        </CardHeader>
        <CardContent>
          {canChooseBranch ? (
            <AppReactSelect
              label="Branch"
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              options={branchOptions}
              placeholder="Select branch"
            />
          ) : (
            <p className="text-sm text-slate-600">
              {branches.find((b: { _id: string }) => String(b._id) === effectiveBranchId)?.name ?? "Current branch"}
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="mt-6 flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#5a189a]" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Card className="border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">No-show policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AppReactSelect
                label="Charge when guest is marked no-show"
                value={form.noShowChargeType}
                onChange={(v) => setForm((f) => ({ ...f, noShowChargeType: v }))}
                options={NO_SHOW_OPTIONS}
              />
              <Input
                label="Mark as no-show after (hours past check-in)"
                type="number"
                min={0}
                value={form.noShowMarkAfterHours}
                onChange={(e) => setForm((f) => ({ ...f, noShowMarkAfterHours: Number(e.target.value) || 0 }))}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Cancellation policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Free cancellation until (hours before check-in)"
                type="number"
                min={0}
                value={form.cancellationFreeUntilHours}
                onChange={(e) => setForm((f) => ({ ...f, cancellationFreeUntilHours: Number(e.target.value) || 0 }))}
              />
              <AppReactSelect
                label="Charge after free period"
                value={form.cancellationChargeType}
                onChange={(v) => setForm((f) => ({ ...f, cancellationChargeType: v }))}
                options={CANCELLATION_CHARGE_OPTIONS}
              />
              {form.cancellationChargeType === "percentage" && (
                <Input
                  label="Cancellation fee (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={form.cancellationChargeValue}
                  onChange={(e) => setForm((f) => ({ ...f, cancellationChargeValue: Number(e.target.value) || 0 }))}
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AppReactSelect
                label="Suggested deposit"
                value={form.depositType}
                onChange={(v) => setForm((f) => ({ ...f, depositType: v }))}
                options={DEPOSIT_OPTIONS}
              />
              {(form.depositType === "percentage" || form.depositType === "fixed") && (
                <Input
                  label={form.depositType === "percentage" ? "Deposit (%)" : "Deposit amount"}
                  type="number"
                  min={0}
                  value={form.depositValue}
                  onChange={(e) => setForm((f) => ({ ...f, depositValue: Number(e.target.value) || 0 }))}
                />
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="bg-[#ff6d00] text-white hover:bg-[#e56300]" loading={updateMut.isPending}>
            Save policies
          </Button>
        </form>
      )}
    </div>
  );
}
