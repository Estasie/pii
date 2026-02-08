import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

// GET all conversations
export async function GET() {
  try {
    await connectDB();
    const conversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .select("_id title updatedAt createdAt");

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
    await connectDB();
    const { title } = await req.json();

    const conversation = await Conversation.create({
      title: title || "New Conversation",
      messages: [],
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
