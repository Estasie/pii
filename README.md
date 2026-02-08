# PII Detection Chat Application

A Next.js chat application with advanced PII (Personally Identifiable Information) detection and masking capabilities.

## Features

- **Real-time Chat**: Stream responses from OpenAI's GPT-4o-mini
- **Advanced PII Detection**: Two-tier detection system
  - **Deterministic Detection (Regex-based)**: Instant detection of emails, phone numbers, credit cards, SSNs during streaming
  - **Unstructured Detection (LLM-based)**: Context-aware detection of names, addresses, and other PII after streaming completes
- **Interactive PII Masking**: Click-to-reveal spoilers for detected PII
- **Conversation Management**: Save and load chat conversations
- **SQLite Storage**: Persistent storage for conversations and PII detection results

## Architecture

### Chunked + Regex-Based Early Masking

The application implements a sophisticated two-phase PII detection system:

```
LLM Stream → Chunk Buffer (50 chars)
   ↓
   → Regex Scan Chunk → UI immediately shows spoilers for deterministic PII
   ↓
   → Full Text Buffer → LLM/ML PII Detector after streaming completes
   ↓
   → Final UI Update with all PII (deterministic + unstructured)
```

#### Phase 1: Streaming Detection (Deterministic)
- **When**: During LLM response streaming
- **Method**: Regex patterns
- **Detects**: 
  - Email addresses
  - Phone numbers (US format)
  - Credit card numbers (with Luhn validation)
  - Social Security Numbers
  - IP addresses
  - URLs
- **Result**: Immediate UI masking as content streams

#### Phase 2: Post-Stream Detection (Unstructured)
- **When**: After streaming completes
- **Method**: LLM analysis (GPT-4o-mini)
- **Detects**:
  - Personal names
  - Physical addresses
  - Dates of birth
  - Other contextual PII
- **Result**: Final comprehensive PII masking

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: SQLite
- **AI**: OpenAI GPT-4o-mini
- **UI**: React with Tailwind CSS
- **Styling**: shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd next-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
cp .env.example .env.local
```

4. Add your OpenAI API key to `.env.local`:
```
OPENAI_API_KEY=your_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
next-app/
├── app/
│   ├── api/
│   │   ├── chat/              # Streaming chat endpoint with PII detection
│   │   ├── conversations-sqlite/  # Conversation CRUD operations
│   │   └── pii-detection-sqlite/  # PII detection storage
│   ├── page.tsx               # Main chat page
│   └── layout.tsx
├── components/
│   ├── Chat/
│   │   ├── Chat.tsx           # Main chat component
│   │   └── components/
│   │       ├── ChatMessage.tsx    # Message rendering with PII spoilers
│   │       ├── PIISpoiler.tsx     # Interactive PII masking component
│   │       └── ...
│   └── ui/                    # shadcn/ui components
├── hooks/
│   ├── useChat.ts             # Chat logic with streaming PII detection
│   ├── usePIIDetection.ts     # PII detection state management
│   └── useReveal.ts           # PII reveal state management
├── lib/
│   ├── piiDetection.ts        # Core PII detection logic
│   └── sqlite.ts              # SQLite database utilities
└── models/
    ├── Conversation.ts        # Conversation data model
    └── PIIDetection.ts        # PII detection data model
```

## Key Components

### PII Detection Library (`lib/piiDetection.ts`)

- `detectDeterministicPII(text)`: Fast regex-based detection for structured PII
- `detectUnstructuredPII(text)`: LLM-based detection for contextual PII
- `detectAllPII(text)`: Combined detection with deduplication
- `markPIIInText(text, entities)`: Creates masked text with PII markers

### Chat API (`app/api/chat/route.ts`)

Implements the streaming architecture:
1. Streams LLM responses to client
2. Buffers chunks (50 characters)
3. Runs regex detection on chunks
4. Sends immediate PII markers to UI
5. After streaming, runs full LLM detection
6. Sends final comprehensive PII markers

### Chat Hook (`hooks/useChat.ts`)

Manages chat state and handles:
- Streaming message reception
- Real-time PII marker updates
- Conversation persistence
- Message history loading

## PII Detection Examples

### Deterministic (Regex-based)
```
Input: "Contact me at john@example.com or 555-123-4567"
Detected: 
  - email: john@example.com
  - phone: 555-123-4567
```

### Unstructured (LLM-based)
```
Input: "My name is Alice Smith and I live on Main Street"
Detected:
  - name: Alice Smith
  - address: Main Street
```

## Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  messages TEXT,  -- JSON array
  created_at INTEGER,
  updated_at INTEGER
)
```

### PII Detections Table
```sql
CREATE TABLE pii_detections (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  message_index INTEGER,
  role TEXT,
  original_content TEXT,
  processed_content TEXT,
  detected_pii TEXT,  -- JSON array
  pii_markers TEXT,   -- JSON array
  created_at INTEGER
)
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT

## Acknowledgments

- OpenAI for GPT-4o-mini API
- shadcn/ui for UI components
- Next.js team for the framework
