# Attendify - Attendance Management System

Welcome to Attendify! A full-stack, responsive Attendance Management System built with Node.js, Express, SQLite, React, Vite, and Tailwind CSS.

## Features
- **Authentication**: JWT-based login system with role separation (`admin` vs `student`/`employee`).
- **Clean Dashboard**: Responsive sidebar navigation, stat cards, and recent records view.
- **Role-based Access**: Admins can manage users and record everyone's attendance. Users see their own history.
- **Full CRUD Flows**: Complete management for users and attendance records, with optimistic UI updates.
- **Persistent Data**: Powered by a local SQLite database (`attendance.db`).

## Demo Accounts
- **Admin**: `admin@example.com` | Password: `admin123`
- **User/Student**: `john@example.com` | Password: `user123`

## How to use

The application is already running in the background on **Port 3001**.
You can view it by clicking the **Port 3001** link in your workspace tools panel.

If the server stops, you can start it manually by running:
```bash
/home/user/attendance-app/start.sh
```
