import apiClient, { extractData } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ListParams = Record<string, unknown>;

function qs(params?: ListParams): string {
  if (!params || Object.keys(params).length === 0) return "";
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

// =============================================================================
// AUTH
// =============================================================================

export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiClient.post("/auth/login", data).then((r) => r.data),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/auth/register", data).then((r) => r.data),
  });
}

// =============================================================================
// BRANCHES
// =============================================================================

export function useBranches(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["branches", params],
    queryFn: () =>
      apiClient
        .get(query ? `/branches?${query}` : "/branches")
        .then((r) => r.data),
  });
}

export function useBranch(id: string) {
  return useQuery({
    queryKey: ["branches", id],
    queryFn: () => apiClient.get(`/branches/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/branches", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/branches/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

// =============================================================================
// USERS
// =============================================================================

export function useUsers(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["users", params],
    queryFn: () =>
      apiClient.get(query ? `/users?${query}` : "/users").then((r) => r.data),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => apiClient.get(`/users/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/users", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      currentPassword,
      newPassword,
    }: {
      id: string;
      currentPassword: string;
      newPassword: string;
    }) =>
      apiClient
        .patch(`/users/${id}/change-password`, {
          currentPassword,
          newPassword,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// =============================================================================
// ROOM CATEGORIES
// =============================================================================

export function useRoomCategories(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["room-categories", params],
    queryFn: () =>
      apiClient
        .get(query ? `/room-categories?${query}` : "/room-categories")
        .then((r) => r.data),
  });
}

export function useRoomCategory(id: string) {
  return useQuery({
    queryKey: ["room-categories", id],
    queryFn: () =>
      apiClient.get(`/room-categories/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateRoomCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/room-categories", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-categories"] });
    },
  });
}

export function useUpdateRoomCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/room-categories/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-categories"] });
    },
  });
}

export function useDeleteRoomCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/room-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-categories"] });
    },
  });
}

// =============================================================================
// ROOMS
// =============================================================================

export function useRooms(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: () =>
      apiClient.get(query ? `/rooms?${query}` : "/rooms").then((r) => r.data),
  });
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: ["rooms", id],
    queryFn: () => apiClient.get(`/rooms/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/rooms", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/rooms/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// =============================================================================
// PRICING RULES
// =============================================================================

export function usePricingRules(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pricing-rules", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pricing-rules?${query}` : "/pricing-rules")
        .then((r) => r.data),
  });
}

export function usePricingRule(id: string) {
  return useQuery({
    queryKey: ["pricing-rules", id],
    queryFn: () =>
      apiClient.get(`/pricing-rules/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.post(`/pricing-rules${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    },
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.patch(`/pricing-rules/${id}${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    },
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
    }: {
      id: string;
      department?: string;
    }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/pricing-rules/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    },
  });
}

// =============================================================================
// GUESTS
// =============================================================================

export function useGuests(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["guests", params],
    queryFn: () =>
      apiClient.get(query ? `/guests?${query}` : "/guests").then((r) => r.data),
  });
}

export function useGuest(id: string) {
  return useQuery({
    queryKey: ["guests", id],
    queryFn: () => apiClient.get(`/guests/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/guests", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests"] });
    },
  });
}

export function useUpdateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/guests/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests"] });
    },
  });
}

export function useDeleteGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/guests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests"] });
    },
  });
}

export function useAddGuestNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      note,
    }: {
      id: string;
      note: { text: string; [key: string]: unknown };
    }) =>
      apiClient.post(`/guests/${id}/notes`, note).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["guests", id] });
      qc.invalidateQueries({ queryKey: ["guests"] });
    },
  });
}

// =============================================================================
// BOOKINGS
// =============================================================================

export function useBookings(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["bookings", params],
    queryFn: () =>
      apiClient
        .get(query ? `/bookings?${query}` : "/bookings")
        .then((r) => r.data),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: () => apiClient.get(`/bookings/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/bookings", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

/** Creates N linked bookings in one request: enforces category availability and rolls back on failure. */
export function useCreateGroupBookings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/bookings/group", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/bookings/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      roomId,
      depositPaid,
      paymentMethod,
      idType,
      idNumber,
      idDocument,
    }: {
      id: string;
      roomId: string;
      depositPaid?: number;
      paymentMethod?: string;
      idType?: string;
      idNumber?: string;
      idDocument?: string;
    }) =>
      apiClient
        .post(`/bookings/${id}/check-in`, {
          roomId,
          depositPaid,
          paymentMethod,
          idType,
          idNumber,
          idDocument,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["bookings", "transactions"] });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      damageCharges,
      lateCheckOutFee,
      paymentMethod,
    }: {
      id: string;
      damageCharges?: number;
      lateCheckOutFee?: number;
      paymentMethod?: string;
    }) =>
      apiClient
        .post(`/bookings/${id}/check-out`, {
          damageCharges,
          lateCheckOutFee,
          paymentMethod,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cancellationReason,
      refundAmount,
    }: {
      id: string;
      cancellationReason: string;
      refundAmount?: number;
    }) =>
      apiClient
        .post(`/bookings/${id}/cancel`, { cancellationReason, refundAmount })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useAvailability(params: {
  checkInDate: string;
  checkOutDate: string;
  [key: string]: string;
}) {
  const query = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["bookings", "availability", params],
    queryFn: () =>
      apiClient.get(`/bookings/availability?${query}`).then((r) => r.data),
    enabled: !!params.checkInDate && !!params.checkOutDate,
  });
}

export function useBookingQuote(params: {
  checkInDate: string;
  checkOutDate: string;
  roomCategoryId: string;
  corporateAccountId?: string;
}) {
  const query = new URLSearchParams(
    params as Record<string, string>
  ).toString();
  return useQuery({
    queryKey: ["bookings", "quote", params],
    queryFn: () =>
      apiClient.get(`/bookings/quote?${query}`).then((r) => r.data),
    enabled:
      !!params.checkInDate &&
      !!params.checkOutDate &&
      !!params.roomCategoryId,
  });
}

export function useCancellationPreview(bookingId: string) {
  return useQuery({
    queryKey: ["bookings", bookingId, "cancellation-preview"],
    queryFn: () =>
      apiClient
        .get(`/bookings/${bookingId}/cancellation-preview`)
        .then((r) => r.data),
    enabled: !!bookingId,
  });
}

export function useMarkBookingNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/bookings/${id}/no-show`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useAccommodationPolicies(branchId: string) {
  return useQuery({
    queryKey: ["branches", branchId, "accommodation-policies"],
    queryFn: () =>
      apiClient
        .get(`/branches/${branchId}/accommodation-policies`)
        .then((r) => r.data),
    enabled: !!branchId,
  });
}

export function useUpdateAccommodationPolicies(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient
        .patch(`/branches/${branchId}/accommodation-policies`, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["branches", branchId, "accommodation-policies"],
      });
    },
  });
}

// =============================================================================
// INVOICES
// =============================================================================

export function useInvoices(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () =>
      apiClient
        .get(query ? `/invoices?${query}` : "/invoices")
        .then((r) => r.data),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => apiClient.get(`/invoices/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/invoices", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/invoices/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// =============================================================================
// PAYMENTS
// =============================================================================

export function usePayments(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["payments", params],
    queryFn: () =>
      apiClient
        .get(query ? `/payments?${query}` : "/payments")
        .then((r) => r.data),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ["payments", id],
    queryFn: () => apiClient.get(`/payments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/payments", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

/** Room-booking payments: accommodation payments tied to invoices with a bookingId */
export function useBookingTransactions(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["bookings", "transactions", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/bookings/transactions?${query}`
            : "/bookings/transactions"
        )
        .then((r) => r.data),
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/payments/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

// =============================================================================
// EVENT HALLS
// =============================================================================

export function useEventHalls(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["event-halls", params],
    queryFn: () =>
      apiClient
        .get(query ? `/event-halls?${query}` : "/event-halls")
        .then((r) => r.data),
  });
}

export function useEventHall(id: string) {
  return useQuery({
    queryKey: ["event-halls", id],
    queryFn: () =>
      apiClient.get(`/event-halls/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateEventHall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/event-halls", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-halls"] });
    },
  });
}

export function useUpdateEventHall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/event-halls/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-halls"] });
    },
  });
}

export function useDeleteEventHall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/event-halls/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-halls"] });
    },
  });
}

// =============================================================================
// EVENT BOOKINGS
// =============================================================================

export function useEventBookings(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["event-bookings", params],
    queryFn: () =>
      apiClient
        .get(query ? `/event-bookings?${query}` : "/event-bookings")
        .then((r) => r.data),
  });
}

export function useEventBooking(id: string) {
  return useQuery({
    queryKey: ["event-bookings", id],
    queryFn: () =>
      apiClient.get(`/event-bookings/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useEventBookingBeo(id: string) {
  return useQuery({
    queryKey: ["event-bookings", id, "beo"],
    queryFn: () =>
      apiClient.get(`/event-bookings/${id}/beo`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useEventBookingCalendar(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["event-bookings", "calendar", params],
    queryFn: () =>
      apiClient
        .get(query ? `/event-bookings/calendar?${query}` : "/event-bookings/calendar")
        .then((r) => r.data),
  });
}

export function useCreateEventBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/event-bookings", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-bookings"] });
    },
  });
}

export function useUpdateEventBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/event-bookings/${id}`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["event-bookings"] });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: ["event-bookings", variables.id] });
      }
    },
  });
}

export function useDeleteEventBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/event-bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-bookings"] });
    },
  });
}

export function useEventBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: ["event-bookings", bookingId, "payments"],
    queryFn: () =>
      apiClient.get(`/event-bookings/${bookingId}/payments`).then((r) => r.data),
    enabled: !!bookingId,
  });
}

export function useCreateEventBookingPayment(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post(`/event-bookings/${bookingId}/payments`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-bookings"] });
      qc.invalidateQueries({ queryKey: ["event-bookings", bookingId] });
      qc.invalidateQueries({ queryKey: ["event-bookings", bookingId, "payments"] });
    },
  });
}

// =============================================================================
// POOL
// =============================================================================

export function usePoolAreas(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pool-areas", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pool/areas?${query}` : "/pool/areas")
        .then((r) => r.data),
  });
}

export function usePoolArea(id: string) {
  return useQuery({
    queryKey: ["pool-areas", id],
    queryFn: () => apiClient.get(`/pool/areas/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePoolArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/pool/areas", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-areas"] });
    },
  });
}

export function useUpdatePoolArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/pool/areas/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-areas"] });
    },
  });
}

export function useDeletePoolArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pool/areas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-areas"] });
    },
  });
}

export function usePoolBookings(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pool-bookings", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pool/bookings?${query}` : "/pool/bookings")
        .then((r) => r.data),
  });
}

export function usePoolBooking(id: string) {
  return useQuery({
    queryKey: ["pool-bookings", id],
    queryFn: () => apiClient.get(`/pool/bookings/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePoolBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/pool/bookings", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-bookings"] });
      qc.invalidateQueries({ queryKey: ["pool-areas"] });
    },
  });
}

export function useUpdatePoolBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/pool/bookings/${id}`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["pool-bookings"] });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: ["pool-bookings", variables.id] });
      }
    },
  });
}

export function useDeletePoolBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pool/bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-bookings"] });
    },
  });
}

export function usePoolMaintenanceList(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pool-maintenance", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pool/maintenance?${query}` : "/pool/maintenance")
        .then((r) => r.data),
  });
}

export function usePoolMaintenance(id: string) {
  return useQuery({
    queryKey: ["pool-maintenance", id],
    queryFn: () =>
      apiClient.get(`/pool/maintenance/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePoolMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/pool/maintenance", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-maintenance"] });
    },
  });
}

export function useUpdatePoolMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/pool/maintenance/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-maintenance"] });
    },
  });
}

export function useDeletePoolMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pool/maintenance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-maintenance"] });
    },
  });
}

// ─── Playground ──────────────────────────────────────────
export function usePlaygroundAreas(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["playground-areas", params],
    queryFn: () =>
      apiClient
        .get(query ? `/playground/areas?${query}` : "/playground/areas")
        .then((r) => r.data),
  });
}

export function usePlaygroundArea(id: string) {
  return useQuery({
    queryKey: ["playground-areas", id],
    queryFn: () =>
      apiClient.get(`/playground/areas/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePlaygroundArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/playground/areas", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-areas"] });
    },
  });
}

export function useUpdatePlaygroundArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/playground/areas/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-areas"] });
    },
  });
}

export function useDeletePlaygroundArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/playground/areas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-areas"] });
    },
  });
}

export function usePlaygroundEquipmentList(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["playground-equipment", params],
    queryFn: () =>
      apiClient
        .get(
          query ? `/playground/equipment?${query}` : "/playground/equipment"
        )
        .then((r) => r.data),
  });
}

export function usePlaygroundEquipment(id: string) {
  return useQuery({
    queryKey: ["playground-equipment", id],
    queryFn: () =>
      apiClient.get(`/playground/equipment/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePlaygroundEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/playground/equipment", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-equipment"] });
    },
  });
}

export function useUpdatePlaygroundEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/playground/equipment/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-equipment"] });
    },
  });
}

export function useDeletePlaygroundEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/playground/equipment/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-equipment"] });
    },
  });
}

export function usePlaygroundMaintenanceList(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["playground-maintenance", params],
    queryFn: () =>
      apiClient
        .get(
          query ? `/playground/maintenance?${query}` : "/playground/maintenance"
        )
        .then((r) => r.data),
  });
}

export function usePlaygroundMaintenance(id: string) {
  return useQuery({
    queryKey: ["playground-maintenance", id],
    queryFn: () =>
      apiClient.get(`/playground/maintenance/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePlaygroundMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/playground/maintenance", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-maintenance"] });
    },
  });
}

export function useUpdatePlaygroundMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/playground/maintenance/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-maintenance"] });
    },
  });
}

export function useDeletePlaygroundMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/playground/maintenance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-maintenance"] });
    },
  });
}

export function usePlaygroundBookings(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["playground-bookings", params],
    queryFn: () =>
      apiClient
        .get(query ? `/playground/bookings?${query}` : "/playground/bookings")
        .then((r) => r.data),
  });
}

export function usePlaygroundBooking(id: string) {
  return useQuery({
    queryKey: ["playground-bookings", id],
    queryFn: () =>
      apiClient.get(`/playground/bookings/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePlaygroundBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/playground/bookings", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-bookings"] });
      qc.invalidateQueries({ queryKey: ["playground-areas"] });
    },
  });
}

export function useUpdatePlaygroundBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/playground/bookings/${id}`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["playground-bookings"] });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: ["playground-bookings", variables.id] });
      }
    },
  });
}

export function useDeletePlaygroundBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/playground/bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-bookings"] });
    },
  });
}

export function usePlaygroundAvailability(params: {
  date: string;
  playgroundAreaId?: string;
  slotDurationMinutes?: number;
}) {
  const query = new URLSearchParams({
    date: params.date,
    ...(params.playgroundAreaId && {
      playgroundAreaId: params.playgroundAreaId,
    }),
    ...(params.slotDurationMinutes != null && {
      slotDurationMinutes: String(params.slotDurationMinutes),
    }),
  }).toString();
  return useQuery({
    queryKey: ["playground-availability", params],
    queryFn: () =>
      apiClient.get(`/playground/availability?${query}`).then((r) => r.data),
    enabled: !!params.date,
  });
}

export function usePlaygroundBookingCalendar(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["playground-bookings-calendar", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/playground/bookings/calendar?${query}`
            : "/playground/bookings/calendar"
        )
        .then((r) => r.data),
  });
}

export function usePlaygroundBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: ["playground-bookings", bookingId, "payments"],
    queryFn: () =>
      apiClient
        .get(`/playground/bookings/${bookingId}/payments`)
        .then((r) => r.data),
    enabled: !!bookingId,
  });
}

export function useCreatePlaygroundBookingPayment(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient
        .post(`/playground/bookings/${bookingId}/payments`, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-bookings"] });
      qc.invalidateQueries({ queryKey: ["playground-bookings", bookingId] });
      qc.invalidateQueries({
        queryKey: ["playground-bookings", bookingId, "payments"],
      });
    },
  });
}

export function usePlaygroundBookingCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .post(`/playground/bookings/${id}/check-in`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-bookings"] });
      qc.invalidateQueries({ queryKey: ["playground-bookings-calendar"] });
    },
  });
}

export function usePlaygroundBookingCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .post(`/playground/bookings/${id}/check-out`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playground-bookings"] });
      qc.invalidateQueries({ queryKey: ["playground-bookings-calendar"] });
    },
  });
}

export function usePoolReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "pool", params],
    queryFn: () =>
      apiClient
        .get(query ? `/reports/pool?${query}` : "/reports/pool")
        .then((r) => r.data),
  });
}

export function usePoolAvailability(params: {
  date: string;
  poolAreaId?: string;
  slotDurationMinutes?: number;
}) {
  const query = new URLSearchParams({
    date: params.date,
    ...(params.poolAreaId && { poolAreaId: params.poolAreaId }),
    ...(params.slotDurationMinutes != null && {
      slotDurationMinutes: String(params.slotDurationMinutes),
    }),
  }).toString();
  return useQuery({
    queryKey: ["pool-availability", params],
    queryFn: () => apiClient.get(`/pool/availability?${query}`).then((r) => r.data),
    enabled: !!params.date,
  });
}

export function usePoolBookingCalendar(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pool-bookings-calendar", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pool/bookings/calendar?${query}` : "/pool/bookings/calendar")
        .then((r) => r.data),
  });
}

export function usePoolBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: ["pool-bookings", bookingId, "payments"],
    queryFn: () =>
      apiClient.get(`/pool/bookings/${bookingId}/payments`).then((r) => r.data),
    enabled: !!bookingId,
  });
}

export function useCreatePoolBookingPayment(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post(`/pool/bookings/${bookingId}/payments`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-bookings"] });
      qc.invalidateQueries({ queryKey: ["pool-bookings", bookingId] });
      qc.invalidateQueries({ queryKey: ["pool-bookings", bookingId, "payments"] });
    },
  });
}

export function usePoolBookingCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/pool/bookings/${id}/check-in`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-bookings"] });
      qc.invalidateQueries({ queryKey: ["pool-bookings-calendar"] });
    },
  });
}

export function usePoolBookingCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/pool/bookings/${id}/check-out`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pool-bookings"] });
      qc.invalidateQueries({ queryKey: ["pool-bookings-calendar"] });
    },
  });
}

// =============================================================================
// EVENT RESOURCES
// =============================================================================

export function useEventResources(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["event-resources", params],
    queryFn: () =>
      apiClient
        .get(query ? `/event-resources?${query}` : "/event-resources")
        .then((r) => r.data),
  });
}

export function useEventResource(id: string) {
  return useQuery({
    queryKey: ["event-resources", id],
    queryFn: () =>
      apiClient.get(`/event-resources/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateEventResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/event-resources", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-resources"] });
    },
  });
}

export function useUpdateEventResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/event-resources/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-resources"] });
    },
  });
}

export function useDeleteEventResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/event-resources/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-resources"] });
    },
  });
}

// ─── Restaurant Units (chef/store units) ──────────────────────
export function useRestaurantUnits(params?: ListParams) {
  return useQuery({
    queryKey: ["restaurantUnits", params],
    queryFn: () =>
      apiClient.get(`/restaurant/units${qs(params)}`).then((r) => r.data),
  });
}

export function useCreateRestaurantUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/restaurant/units", data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restaurantUnits"] }),
  });
}

export function useUpdateRestaurantUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/restaurant/units/${id}`, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restaurantUnits"] }),
  });
}

export function useDeleteRestaurantUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/restaurant/units/${id}`).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restaurantUnits"] }),
  });
}

// ─── Item Yields (e.g. 1 small bag → 20 plates) ──────────────
export function useItemYields(params?: ListParams) {
  return useQuery({
    queryKey: ["itemYields", params],
    queryFn: () =>
      apiClient.get(`/restaurant/item-yields${qs(params)}`).then((r) => r.data),
  });
}

export function useCreateItemYield() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/restaurant/item-yields", data).then(extractData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemYields"] });
      qc.invalidateQueries({ queryKey: ["inventoryItems"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useUpdateItemYield() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/restaurant/item-yields/${id}`, data).then(extractData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemYields"] });
      qc.invalidateQueries({ queryKey: ["inventoryItems"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useDeleteItemYield() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/restaurant/item-yields/${id}`).then(extractData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itemYields"] });
      qc.invalidateQueries({ queryKey: ["inventoryItems"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

// =============================================================================
// RESTAURANT RECIPES
// =============================================================================

export function useRestaurantRecipes(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "recipes", params],
    queryFn: () =>
      apiClient
        .get(query ? `/restaurant/recipes?${query}` : "/restaurant/recipes")
        .then((r) => r.data),
  });
}

export function useCreateRestaurantRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/restaurant/recipes", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "recipes"] });
    },
  });
}

export function useUpdateRestaurantRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/restaurant/recipes/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "recipes"] });
    },
  });
}

export function useDeleteRestaurantRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/restaurant/recipes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "recipes"] });
    },
  });
}

// =============================================================================
// BAR RECIPES (same pattern as restaurant: menu item + ingredients; no recipe = sell as bought)
// =============================================================================

export function useBarRecipes(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["bar", "recipes", params],
    queryFn: () =>
      apiClient
        .get(query ? `/bar/recipes?${query}` : "/bar/recipes")
        .then((r) => r.data),
  });
}

export function useCreateBarRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/bar/recipes", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "recipes"] });
    },
  });
}

export function useUpdateBarRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/bar/recipes/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "recipes"] });
    },
  });
}

export function useDeleteBarRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/bar/recipes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "recipes"] });
    },
  });
}

// =============================================================================
// RESTAURANT PRODUCTION BATCHES
// =============================================================================

export function useProductionBatches(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "production-batches", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/restaurant/production-batches?${query}`
            : "/restaurant/production-batches"
        )
        .then((r) => r.data),
  });
}

export function useCreateProductionBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient
        .post("/restaurant/production-batches", data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "production-batches"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useRestaurantInventoryMovements(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "inventory-movements", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/restaurant/inventory-movements?${query}`
            : "/restaurant/inventory-movements"
        )
        .then((r) => r.data),
  });
}

export function useCreateRestaurantInventoryMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/restaurant/inventory-movements", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useCreateRestaurantStockCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      countedAt?: string;
      notes?: string;
      lines: Array<{ inventoryItemId: string; physicalStock: number; note?: string }>;
    }) => apiClient.post("/restaurant/stock-count", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
      qc.invalidateQueries({ queryKey: ["reports", "restaurant"] });
    },
  });
}

export function useCreateBarStockCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      countedAt?: string;
      notes?: string;
      lines: Array<{ inventoryItemId: string; physicalStock: number; note?: string }>;
    }) => apiClient.post("/bar/stock-count", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
      qc.invalidateQueries({ queryKey: ["reports", "bar"] });
    },
  });
}

// =============================================================================
// RESTAURANT REPORTS
// =============================================================================

export function useRestaurantReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "restaurant", params],
    queryFn: () =>
      apiClient
        .get(query ? `/reports/restaurant?${query}` : "/reports/restaurant")
        .then((r) => r.data),
  });
}

export function useRestaurantConsolidatedReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "restaurant-consolidated", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/reports/restaurant/consolidated?${query}`
            : "/reports/restaurant/consolidated"
        )
        .then((r) => r.data),
  });
}

export function useKdsBoard(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "kds", params],
    queryFn: () =>
      apiClient
        .get(query ? `/restaurant/kds?${query}` : "/restaurant/kds")
        .then((r) => r.data),
    refetchInterval: 10000,
  });
}

export function useUpdateKdsOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      kotStatus,
    }: {
      id: string;
      kotStatus: string;
    }) =>
      apiClient
        .patch(`/restaurant/kds/${id}`, { kotStatus })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "kds"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["pos", "orders"] });
    },
  });
}

export function useKdsConfig(branchId?: string, enabled = true) {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return useQuery({
    queryKey: ["restaurant", "kds-config", branchId ?? "self"],
    queryFn: () =>
      apiClient.get(`/restaurant/kds/config${query}`).then((r) => r.data),
    enabled,
  });
}

export function useUpdateKdsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { branchId?: string; slaMinutes: number }) =>
      apiClient.put("/restaurant/kds/config", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "kds-config"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "kds"] });
    },
  });
}

export function useScanInventoryBySku(sku: string) {
  return useQuery({
    queryKey: ["restaurant", "inventory-scan", sku],
    queryFn: () =>
      apiClient
        .get(`/restaurant/inventory/scan?sku=${encodeURIComponent(sku)}`)
        .then((r) => r.data),
    enabled: !!sku,
  });
}

export function useAdjustInventoryBySku() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sku: string;
      quantity: number;
      mode?: "add" | "set";
      reason?: string;
    }) => apiClient.post("/restaurant/inventory/scan", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "inventory-scan"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// =============================================================================
// HOUSEKEEPING
// =============================================================================

export function useHousekeepingTasks(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["housekeeping", params],
    queryFn: () =>
      apiClient
        .get(query ? `/housekeeping?${query}` : "/housekeeping")
        .then((r) => r.data),
  });
}

export function useHousekeepingStats() {
  return useQuery({
    queryKey: ["housekeeping-stats"],
    queryFn: () => apiClient.get("/housekeeping/stats").then((r) => r.data),
  });
}

export function useHousekeepingTask(id: string) {
  return useQuery({
    queryKey: ["housekeeping", id],
    queryFn: () =>
      apiClient.get(`/housekeeping/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateHousekeepingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/housekeeping", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["housekeeping"] });
      qc.invalidateQueries({ queryKey: ["housekeeping-stats"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateHousekeepingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/housekeeping/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["housekeeping"] });
      qc.invalidateQueries({ queryKey: ["housekeeping-stats"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteHousekeepingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/housekeeping/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["housekeeping"] });
      qc.invalidateQueries({ queryKey: ["housekeeping-stats"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// =============================================================================
// LOST & FOUND
// =============================================================================

export function useLostAndFound(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["lost-and-found", params],
    queryFn: () =>
      apiClient
        .get(query ? `/lost-and-found?${query}` : "/lost-and-found")
        .then((r) => r.data),
  });
}

export function useLostAndFoundItem(id: string) {
  return useQuery({
    queryKey: ["lost-and-found", id],
    queryFn: () =>
      apiClient.get(`/lost-and-found/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateLostAndFound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/lost-and-found", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lost-and-found"] });
    },
  });
}

export function useUpdateLostAndFound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/lost-and-found/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lost-and-found"] });
    },
  });
}

export function useDeleteLostAndFound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/lost-and-found/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lost-and-found"] });
    },
  });
}

// =============================================================================
// MAINTENANCE
// =============================================================================

export function useMaintenanceTickets(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["maintenance", params],
    queryFn: () =>
      apiClient
        .get(query ? `/maintenance?${query}` : "/maintenance")
        .then((r) => r.data),
  });
}

export function useMaintenanceTicket(id: string) {
  return useQuery({
    queryKey: ["maintenance", id],
    queryFn: () =>
      apiClient.get(`/maintenance/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMaintenanceTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/maintenance", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });
}

export function useUpdateMaintenanceTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/maintenance/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });
}

export function useDeleteMaintenanceTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/maintenance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });
}

// =============================================================================
// ASSETS
// =============================================================================

export function useAssets(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["assets", params],
    queryFn: () =>
      apiClient.get(query ? `/assets?${query}` : "/assets").then((r) => r.data),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["assets", id],
    queryFn: () => apiClient.get(`/assets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/assets", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/assets/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// =============================================================================
// POS MENU ITEMS
// =============================================================================

export function useMenuItems(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pos", "menu-items", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pos/menu-items?${query}` : "/pos/menu-items")
        .then((r) => r.data),
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: ["pos", "menu-items", id],
    queryFn: () =>
      apiClient.get(`/pos/menu-items/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.post(`/pos/menu-items${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "menu-items"] });
    },
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.patch(`/pos/menu-items/${id}${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "menu-items"] });
    },
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/pos/menu-items/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "menu-items"] });
    },
  });
}

// =============================================================================
// POS TABLES
// =============================================================================

export function useTables(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pos", "tables", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pos/tables?${query}` : "/pos/tables")
        .then((r) => r.data),
  });
}

export function useTable(id: string) {
  return useQuery({
    queryKey: ["pos", "tables", id],
    queryFn: () =>
      apiClient.get(`/pos/tables/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.post(`/pos/tables${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "tables"] });
    },
  });
}

export function useUpdateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.patch(`/pos/tables/${id}${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "tables"] });
    },
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/pos/tables/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "tables"] });
    },
  });
}

// =============================================================================
// POS ORDERS
// =============================================================================

export function useOrders(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pos", "orders", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pos/orders?${query}` : "/pos/orders")
        .then((r) => r.data),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["pos", "orders", id],
    queryFn: () =>
      apiClient.get(`/pos/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useBarOrderPricingPreview(params: {
  items: Array<{ menuItemId: string; name: string; quantity: number; unitPrice: number; amount: number }>;
  department?: string;
}) {
  const { items, department = "bar" } = params;
  const query = new URLSearchParams({ department }).toString();
  return useQuery({
    queryKey: ["pos", "orders", "preview", department, items],
    queryFn: () =>
      apiClient
        .post(`/pos/orders/preview?${query}`, { items })
        .then((r) => r.data?.data ?? r.data),
    enabled: items.length > 0 && items.every((i) => i.quantity > 0 && i.unitPrice >= 0),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.post(`/pos/orders${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "orders"] });
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.patch(`/pos/orders/${id}${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "orders"] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/pos/orders/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "orders"] });
    },
  });
}

// =============================================================================
// INVENTORY (POS)
// =============================================================================

export function useInventoryItems(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["pos", "inventory", params],
    queryFn: () =>
      apiClient
        .get(query ? `/pos/inventory?${query}` : "/pos/inventory")
        .then((r) => r.data),
  });
}

export function useInventoryItem(
  id: string | undefined,
  params?: { department?: string }
) {
  const query =
    params?.department != null
      ? `?department=${encodeURIComponent(params.department)}`
      : "";
  return useQuery({
    queryKey: ["pos", "inventory", id, params],
    queryFn: () =>
      apiClient
        .get(`/pos/inventory/${id}${query}`)
        .then((r) => r.data?.data ?? r.data),
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: { department?: string } & Record<string, unknown>) =>
      apiClient
        .post(
          department
            ? `/pos/inventory?department=${encodeURIComponent(department)}`
            : "/pos/inventory",
          data
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) =>
      apiClient
        .patch(
          department
            ? `/pos/inventory/${id}?department=${encodeURIComponent(department)}`
            : `/pos/inventory/${id}`,
          data
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) =>
      apiClient.delete(
        department
          ? `/pos/inventory/${id}?department=${encodeURIComponent(department)}`
          : `/pos/inventory/${id}`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

// =============================================================================
// STAFF SHIFTS
// =============================================================================

export function useShifts(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["staff", "shifts", params],
    queryFn: () =>
      apiClient
        .get(query ? `/staff/shifts?${query}` : "/staff/shifts")
        .then((r) => r.data),
  });
}

export function useShift(id: string) {
  return useQuery({
    queryKey: ["staff", "shifts", id],
    queryFn: () =>
      apiClient.get(`/staff/shifts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/staff/shifts", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "shifts"] });
    },
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/staff/shifts/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "shifts"] });
    },
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/staff/shifts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "shifts"] });
    },
  });
}

// =============================================================================
// ATTENDANCE
// =============================================================================

export function useAttendance(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["staff", "attendance", params],
    queryFn: () =>
      apiClient
        .get(query ? `/staff/attendance?${query}` : "/staff/attendance")
        .then((r) => r.data),
  });
}

export function useAttendanceRecord(id: string) {
  return useQuery({
    queryKey: ["staff", "attendance", id],
    queryFn: () =>
      apiClient.get(`/staff/attendance/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/staff/attendance", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "attendance"] });
    },
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/staff/attendance/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "attendance"] });
    },
  });
}

export function useDeleteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/staff/attendance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "attendance"] });
    },
  });
}

// =============================================================================
// PROCUREMENT — SUPPLIERS
// =============================================================================

export function useSuppliers(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["procurement", "suppliers", params],
    queryFn: () =>
      apiClient
        .get(query ? `/procurement/suppliers?${query}` : "/procurement/suppliers")
        .then((r) => r.data),
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.post(`/procurement/suppliers${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient
        .patch(`/procurement/suppliers/${id}${query}`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "suppliers"] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/procurement/suppliers/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "suppliers"] });
    },
  });
}

export function useSupplierInsights(
  id?: string,
  params?: Record<string, string>
) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["procurement", "suppliers", "insights", id, params],
    enabled: Boolean(id),
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/procurement/suppliers/${id}/insights?${query}`
            : `/procurement/suppliers/${id}/insights`
        )
        .then((r) => r.data),
  });
}

// =============================================================================
// PROCUREMENT — PURCHASE ORDERS
// =============================================================================

export function usePurchaseOrders(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["procurement", "purchase-orders", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/procurement/purchase-orders?${query}`
            : "/procurement/purchase-orders"
        )
        .then((r) => r.data),
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient
        .post(`/procurement/purchase-orders${query}`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient
        .patch(`/procurement/purchase-orders/${id}${query}`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/procurement/purchase-orders/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "purchase-orders"] });
    },
  });
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      department?: string;
      receiveToDepartment?: string;
      lines: Array<{ lineIndex: number; quantity: number; inventoryItemId?: string }>;
      receivedDate?: string;
      deliveryNoteNumber?: string;
      notes?: string;
    }) => {
      const query = data.department
        ? `?${new URLSearchParams({ department: String(data.department) }).toString()}`
        : "";
      const { department, ...body } = data;
      return apiClient
        .post(`/procurement/purchase-orders/${id}/receive${query}`, body)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
      qc.invalidateQueries({ queryKey: ["reports", "restaurant"] });
    },
  });
}

// =============================================================================
// PROCUREMENT — STOCK TRANSFERS
// =============================================================================

export function useStockTransfers(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["procurement", "transfers", params],
    queryFn: () =>
      apiClient
        .get(query ? `/procurement/transfers?${query}` : "/procurement/transfers")
        .then((r) => r.data),
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.post(`/procurement/transfers${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "transfers"] });
    },
  });
}

export function useUpdateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.patch(`/procurement/transfers/${id}${query}`, data).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "transfers"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useDeleteStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/procurement/transfers/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "transfers"] });
    },
  });
}

// =============================================================================
// RESTAURANT — MOVEMENT FLOW (Main Store → Kitchen → Front House)
// =============================================================================

export function useStationTransfers(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "station-transfers", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/restaurant/station-transfers?${query}`
            : "/restaurant/station-transfers"
        )
        .then((r) => r.data),
  });
}

export function useCreateStationTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient
        .post(`/restaurant/station-transfers${query}`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "station-transfers"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "location-stock"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "movement-ledger"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useUpdateStationTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department?: string } & Record<string, unknown>) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient
        .patch(`/restaurant/station-transfers/${id}${query}`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "station-transfers"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "location-stock"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "movement-ledger"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

export function useDeleteStationTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient.delete(`/restaurant/station-transfers/${id}${query}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "station-transfers"] });
    },
  });
}

export function useLocationStock(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "location-stock", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/restaurant/location-stock?${query}`
            : "/restaurant/location-stock"
        )
        .then((r) => r.data),
  });
}

export function useMovementLedger(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "movement-ledger", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/restaurant/movement-ledger?${query}`
            : "/restaurant/movement-ledger"
        )
        .then((r) => r.data),
  });
}

export function useKitchenUsage(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["restaurant", "kitchen-usage", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/restaurant/kitchen-usage?${query}`
            : "/restaurant/kitchen-usage"
        )
        .then((r) => r.data),
  });
}

export function useCreateKitchenUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      department,
      ...data
    }: Record<string, unknown> & { department?: string }) => {
      const query = department
        ? `?${new URLSearchParams({ department }).toString()}`
        : "";
      return apiClient
        .post(`/restaurant/kitchen-usage${query}`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", "kitchen-usage"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "location-stock"] });
      qc.invalidateQueries({ queryKey: ["restaurant", "movement-ledger"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

// =============================================================================
// STAFF PERFORMANCE
// =============================================================================

export function useStaffPerformance(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["staff", "performance", params],
    queryFn: () =>
      apiClient
        .get(query ? `/staff/performance?${query}` : "/staff/performance")
        .then((r) => r.data),
  });
}

export function useCreateStaffPerformance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/staff/performance", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "performance"] });
      qc.invalidateQueries({ queryKey: ["reports", "staff"] });
    },
  });
}

export function useUpdateStaffPerformance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/staff/performance/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "performance"] });
      qc.invalidateQueries({ queryKey: ["reports", "staff"] });
    },
  });
}

export function useDeleteStaffPerformance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/staff/performance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "performance"] });
      qc.invalidateQueries({ queryKey: ["reports", "staff"] });
    },
  });
}

// =============================================================================
// ACTIVITY LOGS (READ ONLY)
// =============================================================================

export function useActivityLogs(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["activity-logs", params],
    queryFn: () =>
      apiClient
        .get(query ? `/activity-logs?${query}` : "/activity-logs")
        .then((r) => r.data),
  });
}

// =============================================================================
// EXPENSES
// =============================================================================

export function useExpenses(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () =>
      apiClient
        .get(query ? `/expenses?${query}` : "/expenses")
        .then((r) => r.data),
  });
}

export function useExpense(id: string, params?: { department: string }) {
  const query =
    params?.department != null
      ? `?department=${encodeURIComponent(params.department)}`
      : "";
  return useQuery({
    queryKey: ["expenses", id, params],
    queryFn: () => apiClient.get(`/expenses/${id}${query}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient
        .post(
          `/expenses?department=${encodeURIComponent(String(data.department ?? ""))}`,
          data
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      ...data
    }: { id: string; department: string } & Record<string, unknown>) =>
      apiClient
        .patch(
          `/expenses/${id}?department=${encodeURIComponent(department)}`,
          data
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, department }: { id: string; department: string }) =>
      apiClient.delete(
        `/expenses/${id}?department=${encodeURIComponent(department)}`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

// =============================================================================
// EMPLOYEE PAYROLL
// =============================================================================

export function useEmployeePayrollList(params?: { userId?: string }) {
  const query = params?.userId
    ? `?userId=${encodeURIComponent(params.userId)}`
    : "";
  return useQuery({
    queryKey: ["employee-payroll", params],
    queryFn: () =>
      apiClient
        .get(`/employee-payroll${query}`)
        .then((r) => r.data),
  });
}

export function useEmployeePayroll(userId: string) {
  return useQuery({
    queryKey: ["employee-payroll", userId],
    queryFn: () =>
      apiClient.get(`/employee-payroll/${encodeURIComponent(userId)}`).then((r) => r.data),
    enabled: !!userId,
  });
}

export function useUpsertEmployeePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/employee-payroll", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-payroll"] });
    },
  });
}

export function usePutEmployeePayroll(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.put(`/employee-payroll/${encodeURIComponent(userId)}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-payroll"] });
      qc.invalidateQueries({ queryKey: ["employee-payroll", userId] });
    },
  });
}

// =============================================================================
// SALARY STRUCTURES
// =============================================================================

export function useSalaryStructures(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["salary-structures", params],
    queryFn: () =>
      apiClient
        .get(query ? `/salary-structures?${query}` : "/salary-structures")
        .then((r) => r.data),
  });
}

export function useSalaryStructure(id: string) {
  return useQuery({
    queryKey: ["salary-structures", id],
    queryFn: () =>
      apiClient.get(`/salary-structures/${encodeURIComponent(id)}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/salary-structures", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary-structures"] }),
  });
}

export function useUpdateSalaryStructure(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/salary-structures/${encodeURIComponent(id)}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-structures"] });
      qc.invalidateQueries({ queryKey: ["salary-structures", id] });
    },
  });
}

export function useDeleteSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/salary-structures/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary-structures"] }),
  });
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export function useNotifications(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () =>
      apiClient
        .get(query ? `/notifications?${query}` : "/notifications")
        .then((r) => r.data),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient.patch(`/notifications/${id}/read`))
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// =============================================================================
// PLATFORM TENANTS
// =============================================================================

export function useTenants(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["platform", "tenants", params],
    queryFn: () =>
      apiClient
        .get(query ? `/platform/tenants?${query}` : "/platform/tenants")
        .then((r) => r.data),
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ["platform", "tenants", id],
    queryFn: () =>
      apiClient.get(`/platform/tenants/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/platform/tenants", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/platform/tenants/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
  });
}

// =============================================================================
// SUBSCRIPTION PLANS
// =============================================================================

export function useSubscriptionPlans(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["platform", "subscription-plans", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/platform/subscription-plans?${query}`
            : "/platform/subscription-plans"
        )
        .then((r) => r.data),
  });
}

export function useSubscriptionPlan(id: string) {
  return useQuery({
    queryKey: ["platform", "subscription-plans", id],
    queryFn: () =>
      apiClient
        .get(`/platform/subscription-plans/${id}`)
        .then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateSubscriptionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient
        .post("/platform/subscription-plans", data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "subscription-plans"],
      });
    },
  });
}

export function useUpdateSubscriptionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient
        .patch(`/platform/subscription-plans/${id}`, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "subscription-plans"],
      });
    },
  });
}

export function useDeleteSubscriptionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/platform/subscription-plans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "subscription-plans"],
      });
    },
  });
}

// =============================================================================
// TENANT PROFILE
// =============================================================================

export function useTenantProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["tenants", "profile"],
    queryFn: () =>
      apiClient.get("/tenants/profile").then((r) => r.data),
    enabled: options?.enabled !== false,
  });
}

export function useUpdateTenantProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch("/tenants/profile", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants", "profile"] });
    },
  });
}

// =============================================================================
// TENANT SUBSCRIPTION
// =============================================================================

export function useTenantSubscription() {
  return useQuery({
    queryKey: ["tenants", "subscription"],
    queryFn: () =>
      apiClient.get("/tenants/subscription").then((r) => r.data),
  });
}

// =============================================================================
// DISCOVERY (PUBLIC)
// =============================================================================

export function useDiscovery(params?: Record<string, string>) {
  const queryString = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["discovery", queryString],
    queryFn: () =>
      apiClient
        .get(queryString ? `/discovery?${queryString}` : "/discovery")
        .then((r) => r.data),
    enabled: params !== undefined,
  });
}

export function useHotelDetail(id: string) {
  return useQuery({
    queryKey: ["discovery", id],
    queryFn: () => apiClient.get(`/discovery/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchOnMount: "always",
    staleTime: 60_000,
  });
}

export function useHotelAvailability(
  hotelId: string,
  params: { checkIn: string; checkOut: string; roomCategoryId?: string }
) {
  const enabled = !!hotelId && !!params.checkIn && !!params.checkOut;
  const query = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["availability", hotelId, params],
    queryFn: () =>
      apiClient.get(`/discovery/${hotelId}/availability?${query}`).then((r) => r.data),
    enabled,
  });
}

export function usePublicBooking() {
  return useMutation({
    mutationFn: ({ hotelId, ...data }: { hotelId: string } & Record<string, unknown>) =>
      apiClient.post(`/discovery/${hotelId}/book`, data).then((r) => r.data),
  });
}

export function useInitializePayment() {
  return useMutation({
    mutationFn: ({
      hotelId,
      ...data
    }: {
      hotelId: string;
      bookingReference: string;
      email: string;
      callbackUrl?: string;
    }) =>
      apiClient
        .post(`/discovery/${hotelId}/pay`, data)
        .then((r) => r.data),
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: ({
      hotelId,
      reference,
    }: {
      hotelId: string;
      reference: string;
    }) =>
      apiClient
        .post(`/discovery/${hotelId}/verify-payment`, { reference })
        .then((r) => r.data),
  });
}

export function useDiscoveryPoolAvailability(
  hotelId: string,
  params: { date: string; poolAreaId?: string }
) {
  const enabled = !!hotelId && !!params.date;
  const query = new URLSearchParams(
    params.poolAreaId ? { ...params } : { date: params.date }
  ).toString();
  return useQuery({
    queryKey: ["discovery-pool-availability", hotelId, params],
    queryFn: () =>
      apiClient
        .get(`/discovery/${hotelId}/pool-availability?${query}`)
        .then((r) => r.data),
    enabled,
  });
}

export function usePublicPoolBooking() {
  return useMutation({
    mutationFn: ({
      hotelId,
      ...data
    }: { hotelId: string } & Record<string, unknown>) =>
      apiClient.post(`/discovery/${hotelId}/pool-book`, data).then((r) => r.data),
  });
}

export function useBranchPaystackConfig(branchId: string) {
  return useQuery({
    queryKey: ["branch-paystack-config", branchId],
    queryFn: () =>
      apiClient
        .get(`/branches/${branchId}/paystack-config`)
        .then((r) => r.data),
    enabled: !!branchId,
  });
}

export function useSavePaystackConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      ...data
    }: {
      branchId: string;
      publicKey: string;
      secretKey: string;
      webhookSecret?: string;
    }) =>
      apiClient
        .put(`/branches/${branchId}/paystack-config`, data)
        .then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["branch-paystack-config", vars.branchId],
      });
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

// =============================================================================
// CUSTOMER — MY BOOKINGS
// =============================================================================

export function useMyBookings(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["my-bookings", params],
    queryFn: () =>
      apiClient
        .get(query ? `/my-bookings?${query}` : "/my-bookings")
        .then((r) => r.data),
  });
}

export function useVerifyMyBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/my-bookings/${bookingId}/verify`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });
}

// =============================================================================
// FRONT DESK BOARD
// =============================================================================

export function useFrontDeskOverview() {
  return useQuery({
    queryKey: ["front-desk-overview"],
    queryFn: () => apiClient.get("/front-desk").then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useAdminVerifyBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/front-desk/${bookingId}/verify`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["front-desk-overview"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

// =============================================================================
// FILE UPLOADS
// =============================================================================

export function useUploadFiles() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient
        .post("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),
  });
}

export function useDeleteUpload() {
  return useMutation({
    mutationFn: (publicId: string) =>
      apiClient.post("/uploads/delete", { publicId }).then((r) => r.data),
  });
}

// =============================================================================
// CORPORATE ACCOUNTS
// =============================================================================

export function useCorporateAccounts(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["corporate-accounts", params],
    queryFn: () =>
      apiClient
        .get(query ? `/corporate-accounts?${query}` : "/corporate-accounts")
        .then((r) => r.data),
  });
}

export function useCorporateAccount(id: string) {
  return useQuery({
    queryKey: ["corporate-accounts", id],
    queryFn: () =>
      apiClient.get(`/corporate-accounts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCorporateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/corporate-accounts", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corporate-accounts"] });
    },
  });
}

export function useUpdateCorporateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/corporate-accounts/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corporate-accounts"] });
    },
  });
}

export function useDeleteCorporateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/corporate-accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corporate-accounts"] });
    },
  });
}

// =============================================================================
// ROOM CHARGES (FOLIO)
// =============================================================================

export function useRoomCharges(bookingId: string) {
  return useQuery({
    queryKey: ["room-charges", bookingId],
    queryFn: () =>
      apiClient.get(`/bookings/${bookingId}/charges`).then((r) => r.data),
    enabled: !!bookingId,
  });
}

export function useAddRoomCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      ...data
    }: { bookingId: string } & Record<string, unknown>) =>
      apiClient
        .post(`/bookings/${bookingId}/charges`, data)
        .then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["room-charges", vars.bookingId],
      });
      qc.invalidateQueries({ queryKey: ["booking-folio", vars.bookingId] });
    },
  });
}

export function useDeleteRoomCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      chargeId,
    }: {
      bookingId: string;
      chargeId: string;
    }) =>
      apiClient.delete(`/bookings/${bookingId}/charges/${chargeId}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["room-charges", vars.bookingId],
      });
      qc.invalidateQueries({ queryKey: ["booking-folio", vars.bookingId] });
    },
  });
}

// =============================================================================
// BOOKING FOLIO (RECONCILIATION)
// =============================================================================

export function useBookingFolio(bookingId: string) {
  return useQuery({
    queryKey: ["booking-folio", bookingId],
    queryFn: () =>
      apiClient.get(`/bookings/${bookingId}/folio`).then((r) => r.data),
    enabled: !!bookingId,
  });
}

// =============================================================================
// ACCOMMODATION REPORTS
// =============================================================================

export function useAccommodationReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "accommodation", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/reports/accommodation?${query}`
            : "/reports/accommodation"
        )
        .then((r) => r.data),
  });
}

// =============================================================================
// DEPARTMENT FINANCIAL REPORTS
// =============================================================================

export function useDepartmentReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "department", params],
    queryFn: () =>
      apiClient
        .get(query ? `/reports/department?${query}` : "/reports/department")
        .then((r) => r.data),
  });
}

export function useIncomeExpenseStatement(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "income-expense-statement", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/reports/income-expense-statement?${query}`
            : "/reports/income-expense-statement"
        )
        .then((r) => r.data),
  });
}

export function useCorporateReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "corporate", params],
    queryFn: () =>
      apiClient
        .get(query ? `/reports/corporate?${query}` : "/reports/corporate")
        .then((r) => r.data),
  });
}

export function useInventoryProcurementReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "inventory-procurement", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/reports/inventory-procurement?${query}`
            : "/reports/inventory-procurement"
        )
        .then((r) => r.data),
  });
}

export function useFinanceAccountingReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "finance-accounting", params],
    queryFn: () =>
      apiClient
        .get(
          query
            ? `/reports/finance-accounting?${query}`
            : "/reports/finance-accounting"
        )
        .then((r) => r.data),
  });
}

export function useMaintenanceReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "maintenance", params],
    queryFn: () =>
      apiClient
        .get(query ? `/reports/maintenance?${query}` : "/reports/maintenance")
        .then((r) => r.data),
  });
}

export function useConferenceReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "conference", params],
    queryFn: () =>
      apiClient
        .get(query ? `/reports/conference?${query}` : "/reports/conference")
        .then((r) => r.data),
  });
}

export function useBarReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "bar", params],
    queryFn: () =>
      apiClient.get(query ? `/reports/bar?${query}` : "/reports/bar").then((r) => r.data),
  });
}

export function useBarShifts(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["bar", "shifts", params],
    queryFn: () => apiClient.get(query ? `/bar/shifts?${query}` : "/bar/shifts").then((r) => r.data),
  });
}

export function useOpenBarShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post("/bar/shifts", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "shifts"] });
    },
  });
}

export function useCloseBarShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/bar/shifts/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "shifts"] });
    },
  });
}

export function useBarInventoryMovements(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["bar", "inventory-movements", params],
    queryFn: () =>
      apiClient
        .get(query ? `/bar/inventory-movements?${query}` : "/bar/inventory-movements")
        .then((r) => r.data),
  });
}

export function useCreateBarInventoryMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/bar/inventory-movements", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
    },
  });
}

// =============================================================================
// BAR — SUPPLIERS (bar-only collection, no cross-department)
// =============================================================================

export function useBarSuppliers(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["bar", "suppliers", params],
    queryFn: () =>
      apiClient
        .get(query ? `/bar/suppliers?${query}` : "/bar/suppliers")
        .then((r) => r.data),
  });
}

export function useCreateBarSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/bar/suppliers", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "suppliers"] });
    },
  });
}

export function useUpdateBarSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/bar/suppliers/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "suppliers"] });
    },
  });
}

export function useDeleteBarSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/bar/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "suppliers"] });
    },
  });
}

// =============================================================================
// BAR — PURCHASE ORDERS (bar-only collection, receive to bar inventory only)
// =============================================================================

export function useBarPurchaseOrders(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["bar", "purchase-orders", params],
    queryFn: () =>
      apiClient
        .get(query ? `/bar/purchase-orders?${query}` : "/bar/purchase-orders")
        .then((r) => r.data),
  });
}

export function useCreateBarPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/bar/purchase-orders", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
      qc.invalidateQueries({ queryKey: ["bar", "inventory-movements"] });
    },
  });
}

export function useUpdateBarPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/bar/purchase-orders/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
      qc.invalidateQueries({ queryKey: ["bar", "inventory-movements"] });
    },
  });
}

export function useDeleteBarPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/bar/purchase-orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "purchase-orders"] });
    },
  });
}

export function useReceiveBarPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      lines: Array<{ lineIndex: number; quantity: number; inventoryItemId?: string }>;
      receivedDate?: string;
      deliveryNoteNumber?: string;
      notes?: string;
    }) =>
      apiClient.post(`/bar/purchase-orders/${id}/receive`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bar", "purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["pos", "inventory"] });
      qc.invalidateQueries({ queryKey: ["bar", "inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["reports", "bar"] });
    },
  });
}

export function useStaffReports(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reports", "staff", params],
    queryFn: () =>
      apiClient
        .get(query ? `/reports/staff?${query}` : "/reports/staff")
        .then((r) => r.data),
  });
}

// =============================================================================
// BOOKING CALENDAR
// =============================================================================

export function useBookingCalendar(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["booking-calendar", params],
    queryFn: () =>
      apiClient
        .get(query ? `/bookings/calendar?${query}` : "/bookings/calendar")
        .then((r) => r.data),
  });
}

// =============================================================================
// FLOOR MANAGEMENT
// =============================================================================

export function useFloorOverview() {
  return useQuery({
    queryKey: ["floors"],
    queryFn: () => apiClient.get("/rooms/floors").then((r) => r.data),
  });
}

export function useCreateFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/rooms/floors", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floors"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/rooms/floors/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floors"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/floors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floors"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}
