# AI Chat with PII Protection

A Next.js-based AI chat application with built-in PII (Personally Identifiable Information) detection and protection.

## Features

- 🤖 **AI Chat Interface** - Real-time streaming chat with OpenAI GPT-4o-mini
- 🔒 **PII Detection & Protection** - Automatic detection and masking of sensitive information
- 💾 **Conversation Management** - Save, load, and manage chat history
- 🎨 **Modern UI** - Beautiful interface with dark mode support
- 🔗 **Shareable Links** - Share specific conversations via URL
- 📊 **Token Usage Tracking** - Monitor API usage in real-time

## PII Protection

The application automatically detects and protects various types of PII:

- Names (full names, first names, last names)
- Email addresses
- Phone numbers
- Physical addresses
- Social Security Numbers
- Credit card numbers
- Passport numbers
- Driver's license numbers
- IP addresses

### How it works

1. **Detection**: LLM analyzes responses and identifies PII entities
2. **Marking**: PII is marked with type and position information
3. **Masking**: Sensitive data is hidden behind animated spoilers
4. **Storage**: Original content and PII markers are stored separately
5. **Reveal**: Users can click spoilers to temporarily reveal PII

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS, shadcn/ui
- **Database**: SQLite with better-sqlite3
- **AI**: OpenAI GPT-4o-mini
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
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

3. Create `.env.local` file:
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
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── chat/            # Chat streaming endpoint
│   │   ├── conversations-sqlite/  # Conversation CRUD
│   │   └── pii-detection-sqlite/  # PII detection storage
│   ├── globals.css          # Global styles & animations
│   └── page.tsx             # Main page
├── components/
│   └── Chat/                # Chat components
│       ├── Chat.tsx         # Main chat container
│       └── components/      # Sub-components
│           ├── ChatHeader.tsx
│           ├── ChatInput.tsx
│           ├── ChatMessage.tsx
│           ├── ChatMessages.tsx
│           ├── PIISpoiler.tsx  # PII masking component
│           └── ConversationSidebar.tsx
├── hooks/                   # Custom React hooks
│   ├── useChat.ts          # Chat logic & streaming
│   ├── useConversations.ts # Conversation management
│   ├── usePIIDetection.ts  # PII detection logic
│   └── useReveal.ts        # Spoiler reveal logic
├── lib/                     # Utility libraries
│   ├── piiDetection.ts     # PII detection & marking
│   ├── sqlite.ts           # Database initialization
│   └── utils.ts            # Helper functions
└── models/                  # TypeScript models
    ├── Conversation.ts
    └── PIIDetection.ts
```

## Database Schema

### Conversations
- `id` - Unique identifier
- `title` - Conversation title
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Messages
- `id` - Auto-increment ID
- `conversation_id` - Foreign key to conversations
- `role` - 'user' or 'assistant'
- `content` - Message content
- `message_index` - Position in conversation
- `created_at` - Creation timestamp

### PII Detections
- `id` - Auto-increment ID
- `conversation_id` - Foreign key to conversations
- `message_index` - Message position
- `role` - Message role
- `original_content` - Original text
- `processed_content` - Text with PII markers
- `detected_pii` - JSON array of detected PII
- `pii_markers` - JSON array of PII positions
- `user_id` - Optional user identifier
- `created_at` - Creation timestamp

## API Endpoints

### Chat
- `POST /api/chat` - Stream chat responses with PII detection

### Conversations
- `GET /api/conversations-sqlite` - List all conversations
- `POST /api/conversations-sqlite` - Create new conversation
- `GET /api/conversations-sqlite/[id]` - Get conversation by ID
- `PUT /api/conversations-sqlite/[id]` - Update conversation
- `DELETE /api/conversations-sqlite/[id]` - Delete conversation

### PII Detection
- `POST /api/pii-detection-sqlite` - Store PII detection result
- `GET /api/pii-detection-sqlite` - Get PII detections by conversation

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Features in Detail

### PII Spoiler Animation
- Animated gradient with flowing dots effect
- Smooth reveal/hide transitions
- Supports light and dark themes
- Click to reveal, persists until page reload

### Conversation Management
- Auto-save conversations
- Sidebar with conversation list
- Delete conversations
- URL-based conversation sharing

### Streaming Responses
- Real-time token-by-token streaming
- Token usage tracking
- Stop generation capability
- Error handling

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
