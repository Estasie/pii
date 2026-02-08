import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PIIEntity {
  type: string;
  value: string;
}

export interface PIIEntityWithIndices extends PIIEntity {
  startIndex: number;
  endIndex: number;
}

export interface PIIMarkedContent {
  text: string;
  piiMarkers: PIIMarker[];
}

export interface PIIMarker {
  type: string;
  startIndex: number;
  endIndex: number;
  originalValue: string;
}

export async function detectPII(text: string): Promise<PIIEntityWithIndices[]> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a PII (Personally Identifiable Information) detection system. Analyze the text and identify any PII such as:
- Names (full names, first names, last names)
- Email addresses
- Phone numbers
- Physical addresses
- Social Security Numbers
- Credit card numbers
- Passport numbers
- Driver's license numbers
- IP addresses
- Any other personally identifiable information

Return ONLY a JSON array of detected PII entities with type and value in this exact format:
[{"type": "name", "value": "John Doe"}, {"type": "email", "value": "john@example.com"}]

If no PII is found, return an empty array: []`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const piiEntities: PIIEntity[] = JSON.parse(content);

    // Find indices for each PII entity in the original text
    return findPIIIndices(text, piiEntities);
  } catch (error) {
    console.error("Error detecting PII:", error);
    return [];
  }
}

function findPIIIndices(
  text: string,
  entities: PIIEntity[],
): PIIEntityWithIndices[] {
  const result: PIIEntityWithIndices[] = [];
  const usedIndices = new Set<number>();

  for (const entity of entities) {
    let searchStart = 0;
    let found = false;

    // Try to find the entity value in the text
    while (searchStart < text.length) {
      const index = text.indexOf(entity.value, searchStart);

      if (index === -1) {
        break;
      }

      // Check if this index hasn't been used yet
      if (!usedIndices.has(index)) {
        result.push({
          type: entity.type,
          value: entity.value,
          startIndex: index,
          endIndex: index + entity.value.length,
        });

        // Mark this index as used
        usedIndices.add(index);
        found = true;
        break;
      }

      searchStart = index + 1;
    }

    if (!found) {
      console.warn(`Could not find PII entity "${entity.value}" in text`);
    }
  }

  return result;
}

export function markPIIInText(
  text: string,
  piiEntities: PIIEntityWithIndices[],
): PIIMarkedContent {
  if (piiEntities.length === 0) {
    return {
      text,
      piiMarkers: [],
    };
  }

  // Sort entities by startIndex in descending order to replace from end to start
  const sortedEntities = [...piiEntities].sort(
    (a, b) => b.startIndex - a.startIndex,
  );

  let markedText = text;
  const markers: PIIMarker[] = [];

  // Process entities from end to start to maintain correct indices
  for (let i = sortedEntities.length - 1; i >= 0; i--) {
    const entity = sortedEntities[i];
    const before = markedText.substring(0, entity.startIndex);
    const after = markedText.substring(entity.endIndex);
    const placeholder = `[PII:${entity.type.toUpperCase()}]`;

    markedText = `${before}${placeholder}${after}`;

    // Store markers with original indices from the source text
    markers.push({
      type: entity.type,
      startIndex: entity.startIndex,
      endIndex: entity.endIndex,
      originalValue: entity.value,
    });
  }

  // Sort markers back by startIndex for proper order
  markers.sort((a, b) => a.startIndex - b.startIndex);

  return {
    text: markedText,
    piiMarkers: markers,
  };
}

// Keep the old function for backward compatibility if needed
export function maskPII(
  text: string,
  piiEntities: PIIEntityWithIndices[],
): string {
  return markPIIInText(text, piiEntities).text;
}
