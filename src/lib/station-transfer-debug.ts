/**
 * Server logs for store ↔ kitchen station transfers.
 * Terminal: grep "[station-transfer]"
 *
 * Enable everywhere: DEBUG_STATION_TRANSFER=1 in .env.local
 * In development, logs also run when NODE_ENV=development.
 */
export function stationTransferDebug(...args: unknown[]) {
  if (
    process.env.DEBUG_STATION_TRANSFER === "1" ||
    process.env.NODE_ENV === "development"
  ) {
    console.log("[station-transfer]", ...args);
  }
}
