import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, USER_ROLES, type UserRole } from "@/constants";

export interface IUser extends Document {
  tenantId?: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String },
    role: { type: String, enum: enumValues(USER_ROLES), required: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, branchId: 1 });
userSchema.index({ tenantId: 1, role: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
