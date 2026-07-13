const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-key-for-attendance-app';

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing token' });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
};

// --- ROUTES ---

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
});

// Get profile
app.get('/api/auth/me', authenticate, (req, res) => {
    const user = db.prepare('SELECT id, name, email, role, department FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// Users CRUD (Admin only for full list, users can see basic info)
app.get('/api/users', authenticate, (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, department, created_at FROM users').all();
    res.json(users);
});

app.post('/api/users', authenticate, requireAdmin, (req, res) => {
    const { name, email, password, role, department } = req.body;
    try {
        const hash = bcrypt.hashSync(password || 'user123', 10);
        const stmt = db.prepare('INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(name, email, hash, role || 'student', department);
        
        const newUser = db.prepare('SELECT id, name, email, role, department, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    const { name, email, role, department } = req.body;
    try {
        const stmt = db.prepare('UPDATE users SET name = ?, email = ?, role = ?, department = ? WHERE id = ?');
        stmt.run(name, email, role, department, req.params.id);
        const updated = db.prepare('SELECT id, name, email, role, department FROM users WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Attendance CRUD
app.get('/api/attendance', authenticate, (req, res) => {
    const { date, user_id } = req.query;
    let query = `
        SELECT a.id, a.date, a.status, a.notes, a.user_id, u.name as user_name, u.role as user_role, u.department
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (date) {
        query += ` AND a.date = ?`;
        params.push(date);
    }
    if (user_id) {
        query += ` AND a.user_id = ?`;
        params.push(user_id);
    } else if (req.user.role !== 'admin') {
        // Non-admins only see their own attendance
        query += ` AND a.user_id = ?`;
        params.push(req.user.id);
    }
    
    query += ` ORDER BY a.date DESC`;
    
    const records = db.prepare(query).all(...params);
    res.json(records);
});

app.post('/api/attendance', authenticate, (req, res) => {
    const { user_id, date, status, notes } = req.body;
    
    // Prevent non-admins from recording attendance for others
    if (req.user.role !== 'admin' && parseInt(user_id) !== req.user.id) {
        return res.status(403).json({ error: 'Cannot record attendance for another user' });
    }
    
    try {
        // Check if record exists for this date
        const existing = db.prepare('SELECT id FROM attendance WHERE user_id = ? AND date = ?').get(user_id, date);
        if (existing) {
            const stmt = db.prepare('UPDATE attendance SET status = ?, notes = ? WHERE id = ?');
            stmt.run(status, notes, existing.id);
            res.json({ id: existing.id, user_id, date, status, notes, updated: true });
        } else {
            const stmt = db.prepare('INSERT INTO attendance (user_id, date, status, notes) VALUES (?, ?, ?, ?)');
            const result = stmt.run(user_id, date, status, notes);
            res.status(201).json({ id: result.lastInsertRowid, user_id, date, status, notes });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/attendance/:id', authenticate, requireAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM attendance WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Dashboard Stats
app.get('/api/stats', authenticate, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        let stats = {};
        
        if (req.user.role === 'admin') {
            const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get().count;
            const todayPresent = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'present'").get(today).count;
            const todayAbsent = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'absent'").get(today).count;
            const todayLate = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'late'").get(today).count;
            
            stats = { totalUsers, todayPresent, todayAbsent, todayLate };
        } else {
            const userTotal = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE user_id = ?").get(req.user.id).count;
            const userPresent = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND status = 'present'").get(req.user.id).count;
            const userAbsent = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND status = 'absent'").get(req.user.id).count;
            
            stats = { 
                totalRecords: userTotal,
                present: userPresent,
                absent: userAbsent,
                attendanceRate: userTotal > 0 ? Math.round((userPresent / userTotal) * 100) : 0
            };
        }
        res.json(stats);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log("Backend server running on port " + PORT);
});
