import { withHandler } from "@/lib/with-handler";
import { noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import RoomCharge from "@/models/booking/RoomCharge";
import { USER_ROLES, INVOICE_STATUS, DEPARTMENT } from "@/constants";
import mongoose from "mongoose";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";

export const DELETE = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.FRONT_DESK,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id, chargeId } = params;
    const InvoiceModel = getInvoiceModelForDepartment(DEPARTMENT.ACCOMMODATION);
    if (!mongoose.Types.ObjectId.isValid(chargeId))
      throw new NotFoundError("Room charge");

    const charge = await RoomCharge.findOneAndDelete({
      _id: chargeId,
      tenantId,
      branchId,
      bookingId: id,
    } as any);

    if (!charge) throw new NotFoundError("Room charge");

    const invoice = await InvoiceModel.findOne({
      tenantId,
      branchId,
      bookingId: id,
      status: INVOICE_STATUS.DRAFT,
      notes: "Auto-updated from room charges",
    } as any);

    if (invoice) {
      const categoryKey = `roomCharge:${chargeId}`;
      const items = (invoice.items ?? []).filter(
        (item: any) => item.category !== categoryKey
      );
      const subtotal = Number(
        items.reduce((sum: number, item: any) => sum + (item.amount ?? 0), 0).toFixed(2)
      );
      invoice.items = items as any;
      invoice.subtotal = subtotal;
      invoice.totalAmount = subtotal;
      await invoice.save();
    }

    return noContentResponse();
  },
  { auth: true }
);
