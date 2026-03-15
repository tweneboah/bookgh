import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  EVENT_TYPE,
  EVENT_BOOKING_STATUS,
  INSTALLMENT_STATUS,
  CHECKLIST_STATUS,
  type EventType,
  type EventBookingStatus,
  type InstallmentStatus,
  type ChecklistStatus,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IEventTimeline {
  milestone: string;
  date: Date;
  status: string;
  notes?: string;
}

export interface IEventCharges {
  hallRental?: number;
  catering?: number;
  equipment?: number;
  decoration?: number;
  staffing?: number;
  security?: number;
  addOns: { desc: string; amount: number }[];
}

export interface IEventBillingLineItem {
  label: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IEventExpenseLineItem {
  category: string;
  description?: string;
  amount: number;
  /** When true, this cost is billed to the customer (e.g. damage, extra cleaning). */
  chargeToCustomer?: boolean;
  /** Amount to charge the customer; defaults to amount if not set. */
  amountToCharge?: number;
}

export interface IEventInstallment {
  dueDate: Date;
  amount: number;
  status: InstallmentStatus;
  paidDate?: Date;
  paymentId?: Schema.Types.ObjectId;
}

export interface IEventSetupChecklist {
  task: string;
  assignedTo?: Schema.Types.ObjectId;
  status: ChecklistStatus;
  completedAt?: Date;
}

export interface IEventCateringDetails {
  menuType?: string;
  headCount?: number;
  dietaryRequirements?: string;
  notes?: string;
}

export interface IEventBooking extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  eventHallId: Schema.Types.ObjectId;
  bookingReference: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  guestId?: Schema.Types.ObjectId;
  eventType: EventType;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  expectedAttendees?: number;
  selectedLayoutName?: string;
  status: EventBookingStatus;
  quotedPrice?: number;
  agreedPrice?: number;
  depositRequired?: number;
  depositPaid?: number;
  finalSettlementPaid?: number;
  finalSettledAt?: Date;
  contractUrl?: string;
  proposalUrl?: string;
  quotationNotes?: string;
  pricingOverrideReason?: string;
  timeline: IEventTimeline[];
  charges?: IEventCharges;
  billingLineItems: IEventBillingLineItem[];
  expenseLineItems: IEventExpenseLineItem[];
  installments: IEventInstallment[];
  assignedStaff: Schema.Types.ObjectId[];
  assignedRooms: Schema.Types.ObjectId[];
  equipmentBooked: { resourceId: Schema.Types.ObjectId; quantity: number }[];
  cateringDetails?: IEventCateringDetails;
  setupChecklist: IEventSetupChecklist[];
  specialRequests?: string;
  cancellationReason?: string;
  projectedRevenue?: number;
  budgetedCost?: number;
  commissionRate?: number;
  commissionAmount?: number;
  salesAgentId?: Schema.Types.ObjectId;
  isRecurringContract: boolean;
  recurrencePattern?: string;
  totalRevenue?: number;
  totalExpenses?: number;
  /** Sum of expense line amounts where chargeToCustomer is true (amountToCharge or amount). */
  customerChargesTotal?: number;
  netProfit?: number;
  outstandingAmount?: number;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventBookingSchema = new Schema<IEventBooking>(
  {
    eventHallId: {
      type: Schema.Types.ObjectId,
      ref: "EventHall",
      required: true,
    },
    bookingReference: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String },
    clientPhone: { type: String },
    guestId: { type: Schema.Types.ObjectId, ref: "Guest" },
    eventType: {
      type: String,
      enum: enumValues(EVENT_TYPE),
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    expectedAttendees: { type: Number },
    selectedLayoutName: { type: String },
    status: {
      type: String,
      enum: enumValues(EVENT_BOOKING_STATUS),
      default: EVENT_BOOKING_STATUS.INQUIRY,
    },
    quotedPrice: { type: Number },
    agreedPrice: { type: Number },
    depositRequired: { type: Number },
    depositPaid: { type: Number },
    finalSettlementPaid: { type: Number, default: 0 },
    finalSettledAt: { type: Date },
    contractUrl: { type: String },
    proposalUrl: { type: String },
    quotationNotes: { type: String },
    pricingOverrideReason: { type: String },
    timeline: [
      {
        milestone: { type: String, required: true },
        date: { type: Date, required: true },
        status: { type: String, required: true },
        notes: { type: String },
      },
    ],
    charges: {
      hallRental: { type: Number },
      catering: { type: Number },
      equipment: { type: Number },
      decoration: { type: Number },
      staffing: { type: Number },
      security: { type: Number },
      addOns: [
        {
          desc: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
    },
    billingLineItems: [
      {
        label: { type: String, required: true },
        category: { type: String },
        quantity: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    expenseLineItems: [
      {
        category: { type: String, required: true },
        description: { type: String },
        amount: { type: Number, required: true, min: 0 },
        chargeToCustomer: { type: Boolean, default: false },
        amountToCharge: { type: Number, min: 0 },
      },
    ],
    installments: [
      {
        dueDate: { type: Date, required: true },
        amount: { type: Number, required: true },
        status: {
          type: String,
          enum: enumValues(INSTALLMENT_STATUS),
          default: INSTALLMENT_STATUS.PENDING,
        },
        paidDate: { type: Date },
        paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
      },
    ],
    assignedStaff: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignedRooms: [{ type: Schema.Types.ObjectId, ref: "Room" }],
    equipmentBooked: [
      {
        resourceId: {
          type: Schema.Types.ObjectId,
          ref: "EventResource",
          required: true,
        },
        quantity: { type: Number, required: true },
      },
    ],
    cateringDetails: {
      menuType: { type: String },
      headCount: { type: Number },
      dietaryRequirements: { type: String },
      notes: { type: String },
    },
    setupChecklist: [
      {
        task: { type: String, required: true },
        assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: enumValues(CHECKLIST_STATUS),
          default: CHECKLIST_STATUS.PENDING,
        },
        completedAt: { type: Date },
      },
    ],
    specialRequests: { type: String },
    cancellationReason: { type: String },
    projectedRevenue: { type: Number, min: 0 },
    budgetedCost: { type: Number, min: 0 },
    commissionRate: { type: Number, min: 0, max: 100 },
    commissionAmount: { type: Number, min: 0 },
    salesAgentId: { type: Schema.Types.ObjectId, ref: "User" },
    isRecurringContract: { type: Boolean, default: false },
    recurrencePattern: { type: String },
    totalRevenue: { type: Number, min: 0 },
    totalExpenses: { type: Number, min: 0 },
    customerChargesTotal: { type: Number, min: 0 },
    netProfit: { type: Number },
    outstandingAmount: { type: Number },
  },
  { timestamps: true }
);

eventBookingSchema.plugin(tenantPlugin);
eventBookingSchema.plugin(branchPlugin);
eventBookingSchema.plugin(createdByPlugin);

eventBookingSchema.index({ tenantId: 1, branchId: 1 });
eventBookingSchema.index({ bookingReference: 1 }, { unique: true });
eventBookingSchema.index({
  tenantId: 1,
  branchId: 1,
  eventHallId: 1,
  startDate: 1,
  endDate: 1,
});
eventBookingSchema.index({ tenantId: 1, branchId: 1, status: 1 });
eventBookingSchema.index({ tenantId: 1, branchId: 1, eventType: 1 });

const EventBooking: Model<IEventBooking> =
  mongoose.models.EventBooking ||
  mongoose.model<IEventBooking>("EventBooking", eventBookingSchema);

export default EventBooking;
