import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, ATTENDANCE_STATUS, type AttendanceStatus } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IAttendance extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  hoursWorked?: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date },
    clockOut: { type: Date },
    hoursWorked: { type: Number },
    status: {
      type: String,
      enum: enumValues(ATTENDANCE_STATUS),
      required: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

attendanceSchema.plugin(tenantPlugin);
attendanceSchema.plugin(branchPlugin);

attendanceSchema.index({ tenantId: 1, branchId: 1, userId: 1 });
attendanceSchema.index({ tenantId: 1, branchId: 1, date: 1 });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", attendanceSchema);

export default Attendance;
