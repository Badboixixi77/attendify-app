const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'attendance.db');
const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Data
const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (count.count === 0) {
    console.log('Seeding database with initial data...');
    const insertUser = db.prepare('INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)');
    const hash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('user123', 10);
    
    insertUser.run('Admin User', 'admin@example.com', hash, 'admin', 'Management');
    const u1 = insertUser.run('John Doe', 'john@example.com', userHash, 'student', 'Engineering');
    const u2 = insertUser.run('Jane Smith', 'jane@example.com', userHash, 'student', 'Design');
    const u3 = insertUser.run('Robert Johnson', 'robert@example.com', userHash, 'employee', 'HR');

    const insertAtt = db.prepare('INSERT INTO attendance (user_id, date, status, notes) VALUES (?, ?, ?, ?)');
    
    // Create some attendance records for the past few days
    const today = new Date();
    for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        insertAtt.run(u1.lastInsertRowid, dateStr, i % 2 === 0 ? 'present' : 'absent', '');
        insertAtt.run(u2.lastInsertRowid, dateStr, 'present', 'On time');
        insertAtt.run(u3.lastInsertRowid, dateStr, i === 1 ? 'late' : 'present', i === 1 ? 'Traffic' : '');
    }
    console.log('Seeding complete.');
}

module.exports = db;
