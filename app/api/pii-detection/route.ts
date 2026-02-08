import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PIIDetection from "@/models/PIIDetection";
import { detectPII, maskPII } from "@/lib/piiDetection";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { conversationId, messageIndex, role, content, userId } =
      await req.json();

    // Detect PII asynchronously
    const piiEntities = await detectPII(content);

    // Mask PII in content
    const processedContent = maskPII(content, piiEntities);

    // Save PII detection result
    const piiDetection = await PIIDetection.create({
      conversationId,
      messageIndex,
      role,
      originalContent: content,
      detectedPII: piiEntities,
      processedContent,
      userId,
    });

    return NextResponse.json({
      success: true,
      hasPII: piiEntities.length > 0,
      processedContent,
      piiCount: piiEntities.length,
    });
  } catch (error) {
    console.error("Error in PII detection:", error);
    return NextResponse.json(
      { error: "Failed to detect PII" },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve PII detection results
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const userId = searchParams.get("userId");

    const query: { conversationId?: string; userId?: string } = {};
    if (conversationId) query.conversationId = conversationId;
    if (userId) query.userId = userId;

    const piiDetections = await PIIDetection.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(piiDetections);
  } catch (error) {
    console.error("Error fetching PII detections:", error);
    return NextResponse.json(
      { error: "Failed to fetch PII detections" },
      { status: 500 },
    );
  }
}
