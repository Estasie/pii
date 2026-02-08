import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/sqlite";

// GET single conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDB();
    const conversation = db
      .prepare(
        `SELECT id as _id, title, created_at as createdAt, updated_at as updatedAt 
         FROM conversations 
         WHERE id = ?`,
      )
      .get(id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Get messages for this conversation
    const messages = db
      .prepare(
        `SELECT role, content 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY message_index ASC`,
      )
      .all(id);

    return NextResponse.json({
      ...conversation,
      messages,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 },
    );
  }
}

// PUT update conversation (add messages)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDB();
    const { messages, title } = await req.json();

    // Start transaction
    const updateConversation = db.transaction(() => {
      if (title) {
        db.prepare(
          `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`,
        ).run(title, Date.now(), id);
      }

      if (messages) {
        // Delete existing messages
        db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(id);

        // Insert new messages
        const insertMessage = db.prepare(
          `INSERT INTO messages (conversation_id, role, content, message_index, created_at) 
           VALUES (?, ?, ?, ?, ?)`,
        );

        messages.forEach((msg: any, index: number) => {
          insertMessage.run(id, msg.role, msg.content, index, Date.now());
        });

        // Update conversation timestamp
        db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(
          Date.now(),
          id,
        );
      }
    });

    updateConversation();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 },
    );
  }
}

// DELETE conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDB();
    const result = db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}
