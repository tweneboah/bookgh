/**
 * Helpers to compute cancellation fee and no-show charge from branch accommodation policies.
 */
export type AccommodationPolicy = {
  noShowChargeType?: "none" | "oneNight" | "fullStay";
  noShowMarkAfterHours?: number;
  cancellationFreeUntilHours?: number;
  cancellationChargeType?: "none" | "oneNight" | "percentage" | "fullStay";
  cancellationChargeValue?: number;
  depositType?: "none" | "percentage" | "fixed";
  depositValue?: number;
} | undefined | null;

export function getCancellationFee(
  policy: AccommodationPolicy,
  booking: { checkInDate: Date; totalAmount: number; roomRate?: number; numberOfNights?: number },
  cancelledAt: Date
): { fee: number; refund: number; freeCancel: boolean } {
  const total = booking.totalAmount ?? 0;
  if (!policy?.cancellationChargeType || policy.cancellationChargeType === "none") {
    return { fee: 0, refund: total, freeCancel: true };
  }
  const checkIn = new Date(booking.checkInDate);
  const hoursUntilCheckIn = (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
  const freeUntil = policy.cancellationFreeUntilHours ?? 24;
  if (hoursUntilCheckIn >= freeUntil) {
    return { fee: 0, refund: total, freeCancel: true };
  }
  const roomRate = booking.roomRate ?? 0;
  const nights = booking.numberOfNights ?? 1;
  let fee = 0;
  switch (policy.cancellationChargeType) {
    case "oneNight":
      fee = roomRate > 0 ? roomRate : total / Math.max(1, nights);
      break;
    case "percentage":
      fee = (total * (policy.cancellationChargeValue ?? 0)) / 100;
      break;
    case "fullStay":
      fee = total;
      break;
    default:
      break;
  }
  const refund = Math.max(0, total - fee);
  return { fee, refund, freeCancel: false };
}

export function getNoShowCharge(
  policy: AccommodationPolicy,
  booking: { totalAmount: number; roomRate?: number; numberOfNights?: number }
): number {
  if (!policy?.noShowChargeType || policy.noShowChargeType === "none") return 0;
  const total = booking.totalAmount ?? 0;
  const roomRate = booking.roomRate ?? 0;
  const nights = booking.numberOfNights ?? 1;
  switch (policy.noShowChargeType) {
    case "oneNight":
      return roomRate > 0 ? roomRate : total / Math.max(1, nights);
    case "fullStay":
      return total;
    default:
      return 0;
  }
}

export function getSuggestedDeposit(
  policy: AccommodationPolicy,
  totalAmount: number
): number {
  if (!policy?.depositType || policy.depositType === "none") return 0;
  switch (policy.depositType) {
    case "percentage":
      return Math.round((totalAmount * (policy.depositValue ?? 0)) / 100 * 100) / 100;
    case "fixed":
      return Math.min(policy.depositValue ?? 0, totalAmount);
    default:
      return 0;
  }
}
