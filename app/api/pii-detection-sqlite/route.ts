import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/sqlite";
import { detectPII, markPIIInText } from "@/lib/piiDetection";

export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const { conversationId, messageIndex, role, content, userId } =
      await req.json();

    // Detect PII asynchronously
    const piiEntities = await detectPII(content);

    // Mark PII in content
    const markedContent = markPIIInText(content, piiEntities);

    // Save PII detection result
    db.prepare(
      `INSERT INTO pii_detections 
       (conversation_id, message_index, role, original_content, processed_content, detected_pii, pii_markers, user_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      conversationId,
      messageIndex,
      role,
      content,
      markedContent.text,
      JSON.stringify(piiEntities),
      JSON.stringify(markedContent.piiMarkers),
      userId || null,
      Date.now(),
    );

    return NextResponse.json({
      success: true,
      hasPII: piiEntities.length > 0,
      processedContent: markedContent.text,
      piiMarkers: markedContent.piiMarkers,
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
    const db = getDB();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const userId = searchParams.get("userId");

    let query = `SELECT * FROM pii_detections WHERE 1=1`;
    const params: string[] = [];

    if (conversationId) {
      query += ` AND conversation_id = ?`;
      params.push(conversationId);
    }

    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const piiDetections = db.prepare(query).all(...params) as Record<
      string,
      unknown
    >[];

    // Parse detected_pii and pii_markers JSON
    const results = piiDetections.map((row) => ({
      ...row,
      detectedPII: JSON.parse(row.detected_pii as string),
      piiMarkers: row.pii_markers ? JSON.parse(row.pii_markers as string) : [],
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching PII detections:", error);
    return NextResponse.json(
      { error: "Failed to fetch PII detections" },
      { status: 500 },
    );
  }
}
