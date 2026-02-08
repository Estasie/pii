import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "chat.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // Create conversations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Create messages table
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      message_index INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Create PII detections table
  database.exec(`
    CREATE TABLE IF NOT EXISTS pii_detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      message_index INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      original_content TEXT NOT NULL,
      processed_content TEXT NOT NULL,
      detected_pii TEXT NOT NULL,
      pii_markers TEXT,
      user_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation 
    ON messages(conversation_id, message_index);
    
    CREATE INDEX IF NOT EXISTS idx_pii_conversation 
    ON pii_detections(conversation_id, message_index);
    
    CREATE INDEX IF NOT EXISTS idx_pii_user_created 
    ON pii_detections(user_id, created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_conversations_updated 
    ON conversations(updated_at DESC);
  `);
}

export function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}
