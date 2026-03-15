"use client";

import { useState } from "react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/api";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, EmptyState } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";

type FilterTab = "all" | "unread" | "read";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (filter === "unread") params.isRead = "false";
  if (filter === "read") params.isRead = "true";

  const { data, isLoading } = useNotifications(params);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = (data?.data ?? data) as Array<{
    _id: string;
    type?: string;
    title?: string;
    message?: string;
    isRead?: boolean;
    createdAt?: string;
  }>;
  const pagination = (data?.meta as { pagination?: { page: number; limit: number; total: number } })?.pagination;
  const unreadIds = items?.filter((n) => !n.isRead).map((n) => n._id) ?? [];

  const handleMarkRead = async (id: string) => {
    try {
      await markRead.mutateAsync(id);
      toast.success("Marked as read");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    const ids = unreadIds;
    if (ids.length === 0) {
      toast.success("Nothing to mark");
      return;
    }
    try {
      await markAllRead.mutateAsync(ids);
      toast.success("All marked as read");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to mark all as read");
    }
  };

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
  ];

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <div className="flex items-center gap-2">
          {unreadIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              loading={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setFilter(tab.value); setPage(1); }}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              filter === tab.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
          ))}
        </div>
      ) : !items?.length ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            filter === "unread"
              ? "You have no unread notifications."
              : filter === "read"
                ? "No read notifications yet."
                : "You have no notifications yet."
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((n) => (
              <Card
                key={n._id}
                className={cn(
                  "transition-colors",
                  !n.isRead && "border-l-4 border-l-blue-500"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{n.title ?? "Notification"}</CardTitle>
                        {n.type && (
                          <Badge variant="default">{n.type}</Badge>
                        )}
                      </div>
                      {n.message && (
                        <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        {n.createdAt
                          ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(n._id)}
                        loading={markRead.isPending}
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                        Mark read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination && pagination.total > pagination.limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * pagination.limit + 1} - {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrev}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
