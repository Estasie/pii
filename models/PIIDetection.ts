import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPIIDetection extends Document {
  conversationId: string;
  messageIndex: number;
  role: "user" | "assistant";
  originalContent: string;
  detectedPII: {
    type: string;
    value: string;
    startIndex: number;
    endIndex: number;
  }[];
  processedContent: string;
  userId?: string;
  createdAt: Date;
}

const PIIDetectionSchema = new Schema<IPIIDetection>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    messageIndex: {
      type: Number,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    originalContent: {
      type: String,
      required: true,
    },
    detectedPII: [
      {
        type: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
        startIndex: {
          type: Number,
          required: true,
        },
        endIndex: {
          type: Number,
          required: true,
        },
      },
    ],
    processedContent: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  },
);

// Compound index for efficient queries
PIIDetectionSchema.index({ conversationId: 1, messageIndex: 1 });
PIIDetectionSchema.index({ userId: 1, createdAt: -1 });

const PIIDetection: Model<IPIIDetection> =
  mongoose.models.PIIDetection ||
  mongoose.model<IPIIDetection>("PIIDetection", PIIDetectionSchema);

export default PIIDetection;
