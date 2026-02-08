import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/sqlite";
import { randomUUID } from "crypto";

// GET all conversations
export async function GET() {
  try {
    const db = getDB();
    const conversations = db
      .prepare(
        `SELECT id as _id, title, updated_at as updatedAt, created_at as createdAt 
         FROM conversations 
         ORDER BY updated_at DESC`,
      )
      .all();

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

// POST create new conversation
export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const { title } = await req.json();
    const id = randomUUID();
    const now = Date.now();

    db.prepare(
      `INSERT INTO conversations (id, title, created_at, updated_at) 
       VALUES (?, ?, ?, ?)`,
    ).run(id, title || "New Conversation", now, now);

    return NextResponse.json(
      {
        _id: id,
        title: title || "New Conversation",
        createdAt: now,
        updatedAt: now,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
