import OpenAI from "openai";
import { NextRequest } from "next/server";
import { detectPII, markPIIInText } from "@/lib/piiDetection";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    //TODO: rewrite with new api
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
    const CHUNK_SIZE = 50; // Process PII detection every 50 characters

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            const usage = chunk.usage;

            fullContent += delta;
            chunkBuffer += delta;

            // Check for PII in chunks
            if (chunkBuffer.length >= CHUNK_SIZE || usage) {
              const piiEntities = await detectPII(chunkBuffer);
              const markedContent = markPIIInText(chunkBuffer, piiEntities);

              // Send content with PII markers if any found
              if (piiEntities.length > 0) {
                const data = JSON.stringify({
                  content: delta,
                  piiChunk: {
                    originalChunk: chunkBuffer,
                    processedChunk: markedContent.text,
                    piiMarkers: markedContent.piiMarkers,
                    chunkStartIndex: fullContent.length - chunkBuffer.length,
                  },
                  usage: usage
                    ? {
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                        totalTokens: usage.total_tokens,
                      }
                    : null,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                chunkBuffer = "";
              } else {
                // No PII in this chunk, send normally
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
                chunkBuffer = "";
              }
            } else {
              // Buffer not full yet, send content normally
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
            }
          }

          // Process any remaining buffer
          if (chunkBuffer.length > 0) {
            const piiEntities = await detectPII(chunkBuffer);
            const markedContent = markPIIInText(chunkBuffer, piiEntities);

            if (piiEntities.length > 0) {
              const data = JSON.stringify({
                piiChunk: {
                  originalChunk: chunkBuffer,
                  processedChunk: markedContent.text,
                  piiMarkers: markedContent.piiMarkers,
                  chunkStartIndex: fullContent.length - chunkBuffer.length,
                },
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Send final PII detection for the complete message
          if (fullContent) {
            const piiEntities = await detectPII(fullContent);
            const markedContent = markPIIInText(fullContent, piiEntities);

            const piiData = JSON.stringify({
              piiDetection: {
                hasPII: piiEntities.length > 0,
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
