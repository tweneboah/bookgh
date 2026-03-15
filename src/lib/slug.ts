import Branch from "@/models/branch/Branch";

function toBaseSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Generates a globally unique slug for a branch from the tenant name + branch name.
 * Appends a numeric suffix if collisions exist (e.g., "marriott-accra-2").
 */
export async function generateBranchSlug(
  tenantName: string,
  branchName: string,
  excludeBranchId?: string
): Promise<string> {
  const base = toBaseSlug(`${tenantName} ${branchName}`);

  let slug = base;
  let counter = 1;

  while (true) {
    const filter: Record<string, unknown> = { slug };
    if (excludeBranchId) {
      filter._id = { $ne: excludeBranchId };
    }

    const exists = await Branch.findOne(filter).select("_id").lean();
    if (!exists) return slug;

    counter++;
    slug = `${base}-${counter}`;
  }
}
