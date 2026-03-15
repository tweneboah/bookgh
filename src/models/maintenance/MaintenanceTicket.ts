import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  MAINTENANCE_CATEGORY,
  MAINTENANCE_STATUS,
  PRIORITY,
  type MaintenanceCategory,
  type MaintenanceStatus,
  type Priority,
} from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IMaintenanceNote {
  text: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
}

export interface IMaintenanceTicket extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  roomId?: Schema.Types.ObjectId;
  assetId?: Schema.Types.ObjectId;
  title: string;
  description?: string;
  category: MaintenanceCategory;
  priority: Priority;
  status: MaintenanceStatus;
  assignedTo?: Schema.Types.ObjectId;
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: Date;
  completedAt?: Date;
  isPreventive: boolean;
  images: string[];
  notes: IMaintenanceNote[];
  reportedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceTicketSchema = new Schema<IMaintenanceTicket>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    assetId: { type: Schema.Types.ObjectId, ref: "Asset" },
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: enumValues(MAINTENANCE_CATEGORY),
      required: true,
    },
    priority: {
      type: String,
      enum: enumValues(PRIORITY),
      default: PRIORITY.NORMAL,
    },
    status: {
      type: String,
      enum: enumValues(MAINTENANCE_STATUS),
      default: MAINTENANCE_STATUS.OPEN,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    estimatedCost: { type: Number },
    actualCost: { type: Number },
    scheduledDate: { type: Date },
    completedAt: { type: Date },
    isPreventive: { type: Boolean, default: false },
    images: [{ type: String }],
    notes: [
      {
        text: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    reportedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

maintenanceTicketSchema.plugin(tenantPlugin);
maintenanceTicketSchema.plugin(branchPlugin);

maintenanceTicketSchema.index({ tenantId: 1, branchId: 1 });
maintenanceTicketSchema.index({ tenantId: 1, branchId: 1, status: 1 });
maintenanceTicketSchema.index({ tenantId: 1, branchId: 1, priority: 1 });

const MaintenanceTicket: Model<IMaintenanceTicket> =
  mongoose.models.MaintenanceTicket ||
  mongoose.model<IMaintenanceTicket>(
    "MaintenanceTicket",
    maintenanceTicketSchema,
    "maintenance_tickets_accommodation"
  );

export default MaintenanceTicket;
