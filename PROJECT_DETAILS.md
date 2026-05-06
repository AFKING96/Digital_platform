# Coursat Platform - Project Documentation

## 🚀 Overview
Coursat is a premium student learning and practice platform built with Next.js 15, React 19, and Tailwind CSS 4. It features a modern glassmorphic UI, robust security rules, and a seamless student/admin experience.

## 🛠 Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19, Framer Motion
- **Styling**: Tailwind CSS 4, Lucide React (Icons)
- **Backend**: Firebase Auth, Firestore
- **Deployment**: PWA Support (Manifest, Icons)

## 🎨 Design System
- **Theme**: Dark-first, premium aesthetics.
- **Visuals**: 
  - **Glassmorphism**: `.glass-card`, `.glass-panel` utilities with heavy backdrop blurs.
  - **Colors**: 
    - Background: `#0B1220` (Deep Space)
    - Primary: `#3B82F6` (Electric Blue)
    - Accent: `#6366F1` (Indigo)
  - **Typography**: 
    - Sans: `Manrope`
    - Heading: `Lexend`
  - **Animations**: Global page transitions (fade & slide-up) using Framer Motion.

## 🔒 Security Implementation
- **Authentication**: Firebase Auth with "Show/Hide" password and ID-agnostic login portal.
- **Route Protection**: 
  - `/setup`: Locked once an admin is created.
  - `(admin)`: Restricted to users with `role: "admin"`.
  - `(dashboard)`: Restricted to authenticated students.
- **Firestore Rules**: 
  - Least-privilege principle.
  - Students can only read/write their own submissions and profile.
  - Admins have full access to management collections.

## 📱 Features
- **PWA**: Installable on mobile, standalone mode support.
- **Student Dashboard**: 
  - Sequential module numbering (logic-driven, not DB-driven).
  - Lesson notes (locally persistent).
  - Gamification (Streaks, Points, Accuracy).
- **Admin Panel**:
  - Student monitoring (including "At-Risk" detection).
  - Lesson & Quiz management.
  - Homework assignment and tracking.
  - Finance and Material management.

## 🗺 Navigation & Pages
### Public
- `/`: Login portal.
- `/setup`: One-time administrative setup.

### Student Dashboard `(dashboard)`
- `/dashboard`: Overview of progress and current modules.
- `/lesson/[id]`: Detailed module content with student notes.
- `/solve/[id]`: Interactive quiz/practice interface.
- `/materials`: Course downloadable assets.
- `/homework`: Student-specific assigned tasks.
- `/results`: Performance history and analytics.

### Admin Dashboard `(admin)`
- `/admin`: High-level metrics and system status.
- `/admin/students`: Detailed student list and progress tracking.
- `/admin/lessons`: CRUD for curriculum modules.
- `/admin/quizzes`: Quiz builder and manager.
- `/admin/homework`: Homework distribution system.
- `/admin/submissions`: Review student work and provide feedback.
- `/admin/finance`: Payment tracking and status.

## 📡 Firebase Setup
- **Collections**:
  - `users`: `{ name, email, role, currentLesson, points, streak, accuracy, solvedQuestions, paid, remaining, lastActiveDate, performance: [] }`
  - `lessons`: `{ id, title, summary, content, order, fileUrl }`
  - `quizzes`: `{ lessonId, questions: [{ question, type, options, correctAnswer }] }`
  - `submissions`: `{ userId, lessonId, score, answers, status, feedback, submittedAt }`
  - `notifications`: `{ userId, title, message, type, read, createdAt }`
  - `groups`: `{ name, studentIds: [], schedule }`
  - `sessions`: `{ date, groupId, studentIds: [], payments: {} }`

## ✨ Recent Enhancements (Current Phase)
- **Zero-Error Stability**: Standardized Firebase imports (resolved `where` ReferenceErrors) and fixed all build-time TypeScript issues (missing icons, type mismatches).
- **UI Performance**: 100% coverage of skeleton screens for asynchronous data fetching.
- **Data Integrity**: Implemented a global `lessonMap` to ensure sequential module numbering regardless of database state.
- **Mobile Experience**: Responsive drawer-style navigation with blur effects and active route highlighting.
- **System Hardening**: Fully validated production build with zero compilation errors across all 26 routes.
