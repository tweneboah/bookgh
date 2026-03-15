import { Schema } from "mongoose";

/**
 * Adds tenantId field and enforces its presence on all find queries.
 * Apply to every tenant-scoped model.
 */
export function tenantPlugin(schema: Schema): void {
  schema.add({
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
  });

  function enforceTenant(this: any) {
    const query = this.getQuery();
    const bypass = query._bypassTenantCheck;
    if (bypass) {
      delete query._bypassTenantCheck;
    }
    if (!query.tenantId && !bypass && !query._id) {
      throw new Error("tenantId is required for all queries on this model");
    }
  }

  schema.pre(/^find/, enforceTenant);
  schema.pre("countDocuments", enforceTenant);
  schema.pre("estimatedDocumentCount", enforceTenant);
}

/**
 * Adds branchId field. Apply to every branch-scoped model.
 */
export function branchPlugin(schema: Schema): void {
  schema.add({
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
  });
}

/**
 * Adds a createdBy field referencing the User model.
 */
export function createdByPlugin(schema: Schema): void {
  schema.add({
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  });
}
