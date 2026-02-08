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

// ============================================
// REGEX-BASED DETERMINISTIC PII DETECTION
// ============================================

const PII_REGEX_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone:
    /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  url: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g,
};

/**
 * Detects deterministic PII using regex patterns
 * This is fast and can be run on streaming chunks
 */
export function detectDeterministicPII(text: string): PIIEntityWithIndices[] {
  const entities: PIIEntityWithIndices[] = [];

  // Email detection
  const emailMatches = text.matchAll(PII_REGEX_PATTERNS.email);
  for (const match of emailMatches) {
    if (match.index !== undefined) {
      entities.push({
        type: "email",
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Phone detection
  const phoneMatches = text.matchAll(PII_REGEX_PATTERNS.phone);
  for (const match of phoneMatches) {
    if (match.index !== undefined) {
      entities.push({
        type: "phone",
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Credit card detection
  const cardMatches = text.matchAll(PII_REGEX_PATTERNS.creditCard);
  for (const match of cardMatches) {
    if (match.index !== undefined) {
      // Basic Luhn algorithm check to reduce false positives
      const cardNumber = match[0].replace(/[-\s]/g, "");
      if (isValidLuhn(cardNumber)) {
        entities.push({
          type: "credit_card",
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // SSN detection
  const ssnMatches = text.matchAll(PII_REGEX_PATTERNS.ssn);
  for (const match of ssnMatches) {
    if (match.index !== undefined) {
      entities.push({
        type: "ssn",
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Sort by startIndex to maintain order
  return entities.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Luhn algorithm for credit card validation
 */
function isValidLuhn(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// ============================================
// LLM-BASED UNSTRUCTURED PII DETECTION
// ============================================

/**
 * Detects unstructured PII (names, addresses, etc.) using LLM
 * This is slower and should be run on complete text after streaming
 */
export async function detectUnstructuredPII(
  text: string,
): Promise<PIIEntityWithIndices[]> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Detect unstructured personally identifiable information (PII) such as names, addresses, and other context-dependent PII within the provided input. DO NOT detect emails, phone numbers, credit cards, or SSNs as these are handled separately.

Return ONLY a JSON array of detected PII entities, using the exact format: [{"type": "name", "value": "John Doe"}, {"type": "address", "value": "123 Main St"}]. If no PII is found, return an empty array: []

- Focus on detecting: names (first, last, full), physical addresses, dates of birth, and other contextual PII
- DO NOT detect: emails, phone numbers, credit card numbers, SSNs, IP addresses, URLs
- For each PII entity detected, include:
    - "type": a lowercase string indicating the kind of PII (e.g., "name", "address", "date_of_birth", etc.)
    - "value": the exact value as it appears in the input
- Only output the JSON array as specified, with no additional text or explanations
- Use an empty array [] if no PII is detected
- Maintain the order of entities according to their appearance in the input

# Output Format

- ONLY output the JSON array
- Do not include any explanation, extra whitespace, or markdown/code formatting

# Examples

Example 1  
Input: "Contact Alice Smith at her office on Main Street."  
Output:  
[{"type": "name", "value": "Alice Smith"}, {"type": "address", "value": "Main Street"}]

Example 2  
Input: "The weather is nice today."  
Output:  
[]

**IMPORTANT: Your task is to detect unstructured PII in input text and return ONLY a JSON array of detected entities, strictly following the format, with no extra text or formatting.**`,
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

    return findPIIIndices(text, piiEntities);
  } catch (error) {
    console.error("Error detecting unstructured PII:", error);
    return [];
  }
}

// ============================================
// COMBINED PII DETECTION
// ============================================

/**
 * Legacy function - detects all PII using LLM
 * Kept for backward compatibility
 */
export async function detectPII(text: string): Promise<PIIEntityWithIndices[]> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Detect all instances of personally identifiable information (PII) within the provided input, identifying the type of each detected entity (such as "name", "email", "phone", etc.) and its value as found in the text. 

Return ONLY a JSON array of detected PII entities, using the exact format: [{"type": "name", "value": "John Doe"}, {"type": "email", "value": "john@example.com"}]. If no PII is found, return an empty array: []

- Carefully examine the input to identify potential PII, considering both common types (like names, emails, phone numbers, addresses, credit card numbers) and less common forms.
- For each PII entity detected, include a JSON object with two fields: 
    - "type": a lowercase string indicating the kind of PII (e.g., "email", "phone", "address", "ssn", "name", etc.)
    - "value": the exact value as it appears in the input.
- Only output the JSON array as specified, with no additional text or explanations.
- Use an empty array [] if no PII is detected.
- Maintain the order of entities according to their appearance in the input.

# Reasoning and Conclusion Order

- Reasoning Step: Internally, first analyze the text to identify possible PII entities, determine their types, and extract their values.  
- Conclusion Step (Output): Only after completing your analysis, output the JSON array in the required format.

# Output Format

- ONLY output the JSON array. 
- Do not include any explanation, extra whitespace, or markdown/code formatting.

# Examples

Example 1  
Input: "Contact Alice Smith at alice.smith@email.com or 555-123-4567."  
Output:  
[{"type": "name", "value": "Alice Smith"}, {"type": "email", "value": "alice.smith@email.com"}, {"type": "phone", "value": "555-123-4567"}]

Example 2  
Input: "My favorite color is blue."  
Output:  
[]

Example 3  
Input: "Robert's credit card number is 4111 1111 1111 1111, and his SSN is 123-45-6789."  
Output:  
[{"type": "name", "value": "Robert"}, {"type": "credit card", "value": "4111 1111 1111 1111"}, {"type": "ssn", "value": "123-45-6789"}]

(Real examples should be as long as the actual input provided; the above demonstrate structure and content. Include every type of PII present in the original order.)

---

**IMPORTANT: Your task is to detect PII in input text and return ONLY a JSON array of detected entities as specified, strictly following the format, with no extra text or formatting.**`,
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

    return findPIIIndices(text, piiEntities);
  } catch (error) {
    console.error("Error detecting PII:", error);
    return [];
  }
}

/**
 * Combines deterministic and unstructured PII detection
 * Returns merged results without duplicates
 */
export async function detectAllPII(
  text: string,
): Promise<PIIEntityWithIndices[]> {
  // Run both detections in parallel
  const [deterministicPII, unstructuredPII] = await Promise.all([
    Promise.resolve(detectDeterministicPII(text)),
    detectUnstructuredPII(text),
  ]);

  // Merge results and remove duplicates
  const allPII = [...deterministicPII, ...unstructuredPII];
  const uniquePII = removeDuplicatePII(allPII);

  return uniquePII.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Removes duplicate PII entities based on overlapping indices
 */
function removeDuplicatePII(
  entities: PIIEntityWithIndices[],
): PIIEntityWithIndices[] {
  if (entities.length === 0) return [];

  const sorted = [...entities].sort((a, b) => a.startIndex - b.startIndex);
  const result: PIIEntityWithIndices[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = result[result.length - 1];

    // Check if current overlaps with last
    if (current.startIndex >= last.endIndex) {
      // No overlap, add it
      result.push(current);
    } else if (current.endIndex > last.endIndex) {
      // Partial overlap, keep the longer one
      if (
        current.endIndex - current.startIndex >
        last.endIndex - last.startIndex
      ) {
        result[result.length - 1] = current;
      }
    }
    // If current is completely contained in last, skip it
  }

  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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
