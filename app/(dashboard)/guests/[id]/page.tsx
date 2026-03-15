"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useGuest,
  useUpdateGuest,
  useAddGuestNote,
} from "@/hooks/api";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Textarea,
} from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { VIP_TIER } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const VIP_BADGE_VARIANT: Record<string, "outline" | "default" | "warning" | "info"> = {
  none: "outline",
  silver: "default",
  gold: "warning",
  platinum: "info",
};

export default function GuestDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useGuest(id);
  const updateMut = useUpdateGuest();
  const addNoteMut = useAddGuestNote();
  const [noteText, setNoteText] = useState("");

  const guest = data?.data ?? data;

  const handleBlacklistToggle = async () => {
    if (!guest) return;
    const next = !guest.isBlacklisted;
    try {
      await updateMut.mutateAsync({
        id: guest._id,
        isBlacklisted: next,
        ...(next ? { blacklistReason: "Blacklisted from profile" } : { blacklistReason: undefined }),
      });
      toast.success(next ? "Guest blacklisted" : "Guest removed from blacklist");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text) return;
    try {
      await addNoteMut.mutateAsync({
        id: guest._id,
        note: { text },
      });
      toast.success("Note added");
      setNoteText("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  if (isLoading && !guest) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="space-y-6">
        <Link href="/guests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Guests
          </Button>
        </Link>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-slate-600">Guest not found.</p>
        </div>
      </div>
    );
  }

  const fullName = `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim() || "Guest";
  const notes = guest.notes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/guests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Guests
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{fullName}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={VIP_BADGE_VARIANT[guest.vipTier] ?? "outline"}>
                {guest.vipTier ?? "None"}
              </Badge>
              {guest.isBlacklisted && (
                <Badge variant="danger">Blacklisted</Badge>
              )}
            </div>
          </div>
          <Button
            variant={guest.isBlacklisted ? "outline" : "destructive"}
            size="sm"
            onClick={handleBlacklistToggle}
            loading={updateMut.isPending}
          >
            {guest.isBlacklisted ? "Remove from Blacklist" : "Blacklist Guest"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-sm font-medium text-slate-500">Email</span>
              <p className="text-slate-900">{guest.email ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-500">Phone</span>
              <p className="text-slate-900">{guest.phone ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-500">Nationality</span>
              <p className="text-slate-900">{guest.nationality ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-500">ID</span>
              <p className="text-slate-900">
                {guest.idType && guest.idNumber
                  ? `${guest.idType} - ${guest.idNumber}`
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-slate-500">Total Stays</span>
              <p className="text-lg font-semibold">{guest.totalStays ?? 0}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">Total Spend</span>
              <p className="text-lg font-semibold">
                {guest.totalSpend != null ? fmt(guest.totalSpend) : fmt(0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            {guest.preferences ? (
              <div className="space-y-2 text-sm">
                {guest.preferences.roomPreference && (
                  <p>
                    <span className="text-slate-500">Room:</span>{" "}
                    {guest.preferences.roomPreference}
                  </p>
                )}
                {guest.preferences.floorPreference && (
                  <p>
                    <span className="text-slate-500">Floor:</span>{" "}
                    {guest.preferences.floorPreference}
                  </p>
                )}
                {guest.preferences.dietaryRestrictions && (
                  <p>
                    <span className="text-slate-500">Dietary:</span>{" "}
                    {guest.preferences.dietaryRestrictions}
                  </p>
                )}
                {guest.preferences.specialNeeds && (
                  <p>
                    <span className="text-slate-500">Special needs:</span>{" "}
                    {guest.preferences.specialNeeds}
                  </p>
                )}
                {!Object.values(guest.preferences).some(Boolean) && (
                  <p className="text-slate-500">No preferences set</p>
                )}
              </div>
            ) : (
              <p className="text-slate-500">No preferences set</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              disabled={!noteText.trim()}
              loading={addNoteMut.isPending}
            >
              Add Note
            </Button>
          </form>
          <div className="mt-4 space-y-3">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet</p>
            ) : (
              notes.map((note: any, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <p className="text-slate-900">{note.text}</p>
                  {note.createdAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      {format(new Date(note.createdAt), "MMM d, yyyy HH:mm")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
