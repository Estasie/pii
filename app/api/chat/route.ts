import OpenAI from "openai";
import { NextRequest } from "next/server";
import {
  detectDeterministicPII,
  detectAllPII,
  markPIIInText,
} from "@/lib/piiDetection";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    });

    const encoder = new TextEncoder();
    let fullContent = "";
    let chunkBuffer = "";
    const CHUNK_SIZE = 50; // Process regex PII detection every 50 characters

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            const usage = chunk.usage;

            fullContent += delta;
            chunkBuffer += delta;

            // Send the content immediately to UI
            const data = JSON.stringify({
              content: delta,
              usage: usage
                ? {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                  }
                : null,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Check for deterministic PII in chunks (regex-based)
            if (chunkBuffer.length >= CHUNK_SIZE || usage) {
              const deterministicPII = detectDeterministicPII(chunkBuffer);

              // Send deterministic PII markers immediately if found
              if (deterministicPII.length > 0) {
                const chunkStartIndex = fullContent.length - chunkBuffer.length;

                // Adjust indices to be relative to full content
                const adjustedMarkers = deterministicPII.map((pii) => ({
                  type: pii.type,
                  startIndex: chunkStartIndex + pii.startIndex,
                  endIndex: chunkStartIndex + pii.endIndex,
                  originalValue: pii.value,
                }));

                const piiChunkData = JSON.stringify({
                  piiChunk: {
                    markers: adjustedMarkers,
                    chunkStartIndex,
                    chunkEndIndex: fullContent.length,
                  },
                });
                controller.enqueue(encoder.encode(`data: ${piiChunkData}\n\n`));
              }

              chunkBuffer = "";
            }
          }

          // Process any remaining buffer for deterministic PII
          if (chunkBuffer.length > 0) {
            const deterministicPII = detectDeterministicPII(chunkBuffer);

            if (deterministicPII.length > 0) {
              const chunkStartIndex = fullContent.length - chunkBuffer.length;

              const adjustedMarkers = deterministicPII.map((pii) => ({
                type: pii.type,
                startIndex: chunkStartIndex + pii.startIndex,
                endIndex: chunkStartIndex + pii.endIndex,
                originalValue: pii.value,
              }));

              const piiChunkData = JSON.stringify({
                piiChunk: {
                  markers: adjustedMarkers,
                  chunkStartIndex,
                  chunkEndIndex: fullContent.length,
                },
              });
              controller.enqueue(encoder.encode(`data: ${piiChunkData}\n\n`));
            }
          }

          // After streaming completes, run full PII detection (deterministic + LLM)
          if (fullContent) {
            const allPII = await detectAllPII(fullContent);
            const markedContent = markPIIInText(fullContent, allPII);

            const piiData = JSON.stringify({
              piiDetection: {
                hasPII: allPII.length > 0,
                piiMarkers: markedContent.piiMarkers,
                processedContent: markedContent.text,
              },
            });

            controller.enqueue(encoder.encode(`data: ${piiData}\n\n`));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
