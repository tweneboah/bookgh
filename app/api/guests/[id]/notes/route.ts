import { withHandler } from "@/lib/with-handler";
import { createdResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import Guest from "@/models/booking/Guest";
import { addGuestNoteSchema } from "@/validations/guest";

export const POST = withHandler(
  async (req, { auth, params }) => {
    const tenantId = requireTenant(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Guest");
    }

    const body = await req.json();
    const data = addGuestNoteSchema.parse(body);

    const existingForNote = await Guest.findById(id).select("tenantId").lean();
    if (!existingForNote || String(existingForNote.tenantId) !== tenantId) {
      throw new NotFoundError("Guest");
    }

    const guest = await Guest.findByIdAndUpdate(
      id,
      {
        $push: {
          notes: {
            text: data.text,
            createdBy: auth.userId,
            createdAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!guest) {
      throw new NotFoundError("Guest");
    }

    const addedNote = guest.notes[guest.notes.length - 1];
    return createdResponse(addedNote);
  },
  { auth: true }
);
