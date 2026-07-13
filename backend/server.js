const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
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
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get profile
app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, department: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Users CRUD
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, department: true, createdAt: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
    const { name, email, password, role, department } = req.body;
    try {
        const hash = bcrypt.hashSync(password || 'user123', 10);
        const newUser = await prisma.user.create({
            data: { name, email, password: hash, role: role || 'student', department },
            select: { id: true, name: true, email: true, role: true, department: true, createdAt: true }
        });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ error: 'Email already exists or invalid data' });
    }
});

app.put('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
    const { name, email, role, department } = req.body;
    try {
        const updated = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { name, email, role, department },
            select: { id: true, name: true, email: true, role: true, department: true }
        });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- QR CODE ENDPOINTS ---

// Admin generates a daily QR Code
app.get('/api/attendance/qr', authenticate, requireAdmin, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const qrToken = jwt.sign({ date: today, type: 'daily_checkin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ qrToken, date: today });
});

// Student scans QR Code to Check In
app.post('/api/attendance/scan', authenticate, async (req, res) => {
    const { qrToken, lat, lng } = req.body;
    
    try {
        // Verify Token
        const decoded = jwt.verify(qrToken, JWT_SECRET);
        if (decoded.type !== 'daily_checkin') throw new Error('Invalid QR Code');
        
        const today = new Date().toISOString().split('T')[0];
        if (decoded.date !== today) throw new Error('QR Code is expired or invalid for today');

        // Note Geolocation
        let notes = `Checked in via QR.`;
        if (lat && lng) {
            notes += ` (Lat: ${parseFloat(lat).toFixed(4)}, Lng: ${parseFloat(lng).toFixed(4)})`;
        } else {
            notes += ` (Location blocked by user)`;
        }

        const existing = await prisma.attendance.findFirst({
            where: { userId: req.user.id, date: today }
        });

        if (existing) {
            return res.status(400).json({ error: 'You have already checked in today.' });
        }

        const created = await prisma.attendance.create({
            data: { userId: req.user.id, date: today, status: 'present', notes }
        });
        
        res.status(201).json({ success: true, record: created });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Attendance CRUD
app.get('/api/attendance', authenticate, async (req, res) => {
    const { date, user_id } = req.query;
    try {
        const whereClause = {};
        if (date) whereClause.date = date;
        
        if (user_id) {
            whereClause.userId = parseInt(user_id);
        } else if (req.user.role !== 'admin') {
            whereClause.userId = req.user.id;
        }

        const records = await prisma.attendance.findMany({
            where: whereClause,
            include: { user: true },
            orderBy: { date: 'desc' }
        });

        const formatted = records.map(a => ({
            id: a.id,
            date: a.date,
            status: a.status,
            notes: a.notes,
            user_id: a.userId,
            user_name: a.user.name,
            user_role: a.user.role,
            department: a.user.department
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/attendance', authenticate, async (req, res) => {
    const { user_id, date, status, notes } = req.body;
    const uid = parseInt(user_id);
    
    if (req.user.role !== 'admin' && uid !== req.user.id) {
        return res.status(403).json({ error: 'Cannot record attendance for another user' });
    }
    
    try {
        const existing = await prisma.attendance.findFirst({
            where: { userId: uid, date: date }
        });

        if (existing) {
            const updated = await prisma.attendance.update({
                where: { id: existing.id },
                data: { status, notes }
            });
            res.json({ id: updated.id, user_id: uid, date, status, notes, updated: true });
        } else {
            const created = await prisma.attendance.create({
                data: { userId: uid, date, status, notes: notes || '' }
            });
            res.status(201).json({ id: created.id, user_id: uid, date, status, notes: created.notes });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/attendance/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        await prisma.attendance.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Dashboard Stats
app.get('/api/stats', authenticate, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        let stats = {};
        
        if (req.user.role === 'admin') {
            const totalUsers = await prisma.user.count({ where: { role: { not: 'admin' } } });
            const todayPresent = await prisma.attendance.count({ where: { date: today, status: 'present' } });
            const todayAbsent = await prisma.attendance.count({ where: { date: today, status: 'absent' } });
            const todayLate = await prisma.attendance.count({ where: { date: today, status: 'late' } });
            
            stats = { totalUsers, todayPresent, todayAbsent, todayLate };
        } else {
            const userTotal = await prisma.attendance.count({ where: { userId: req.user.id } });
            const userPresent = await prisma.attendance.count({ where: { userId: req.user.id, status: 'present' } });
            const userAbsent = await prisma.attendance.count({ where: { userId: req.user.id, status: 'absent' } });
            
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
