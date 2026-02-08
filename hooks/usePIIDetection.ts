import { IPIIDetection } from "@/models/PIIDetection";
import { useState, useEffect } from "react";
import { PIIMarker } from "@/lib/piiDetection";

export interface PIIDetectionResult {
  conversationId: string;
  messageIndex: number;
  processedContent: string;
  hasPII: boolean;
  piiMarkers?: PIIMarker[];
}

export function usePIIDetection(conversationId: string | null) {
  const [piiResults, setPIIResults] = useState<Map<number, PIIDetectionResult>>(
    new Map(),
  );

  useEffect(() => {
    if (!conversationId) {
      //   setPIIResults(new Map());
      return;
    }

    // Fetch PII detection results for this conversation
    fetch(`/api/pii-detection-sqlite?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        const resultsMap = new Map<number, PIIDetectionResult>();
        //TODO: types
        data.forEach((result: IPIIDetection & { piiMarkers?: PIIMarker[] }) => {
          resultsMap.set(result.messageIndex, {
            conversationId: result.conversationId,
            messageIndex: result.messageIndex,
            processedContent: result.processedContent,
            hasPII: result.detectedPII.length > 0,
            piiMarkers: result.piiMarkers || [],
          });
        });
        setPIIResults(resultsMap);
      })
      .catch((err) => console.error("Failed to fetch PII results:", err));
  }, [conversationId]);

  const getProcessedContent = (
    messageIndex: number,
    originalContent: string,
  ): string => {
    const result = piiResults.get(messageIndex);
    return result?.processedContent || originalContent;
  };

  return {
    piiResults,
    getProcessedContent,
  };
}
