import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  PERFORMANCE_RATING,
  type PerformanceRating,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IStaffPerformance extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  reviewDate: Date;
  periodStart: Date;
  periodEnd: Date;
  rating: PerformanceRating;
  score: number;
  goalsAchieved?: string;
  strengths?: string;
  improvements?: string;
  managerNotes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffPerformanceSchema = new Schema<IStaffPerformance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewDate: { type: Date, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    rating: {
      type: String,
      enum: enumValues(PERFORMANCE_RATING),
      required: true,
    },
    score: { type: Number, required: true, min: 1, max: 100 },
    goalsAchieved: { type: String },
    strengths: { type: String },
    improvements: { type: String },
    managerNotes: { type: String },
  },
  { timestamps: true }
);

staffPerformanceSchema.plugin(tenantPlugin);
staffPerformanceSchema.plugin(branchPlugin);
staffPerformanceSchema.plugin(createdByPlugin);

staffPerformanceSchema.index({ tenantId: 1, branchId: 1, userId: 1 });
staffPerformanceSchema.index({ tenantId: 1, branchId: 1, reviewDate: -1 });

const StaffPerformance: Model<IStaffPerformance> =
  mongoose.models.StaffPerformance ||
  mongoose.model<IStaffPerformance>("StaffPerformance", staffPerformanceSchema);

export default StaffPerformance;
