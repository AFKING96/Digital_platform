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

- **Zero-Error Stability**: Standardized Firebase imports and fixed all build-time TypeScript issues (missing icons, type mismatches).
- **Production-Grade Data Integrity**: 
  - **Cascading Deletions**: Implemented atomic `writeBatch` operations to ensure orphaned data (submissions, payment logs, notifications) is purged when parent entities (lessons, students, sessions) are deleted.
  - **Financial Consistency**: Integrated automatic balance reversal logic; deleting a payment log now correctly restores the student's outstanding balance.
- **Unified Metadata Resolution**: Developed the `useLessonMap` hook as the platform's reactive source of truth. All modules (Admin and Student) now resolve lesson titles and ordering dynamically, eliminating metadata desync and reducing redundant Firestore reads.
- **Assessment Engine Hardening**:
  - **Flexible Question Types**: Fully implemented `Essay` support across all assessment modules (Homework, Practice, Quizzes), including a dedicated text-area renderer and "Pending Review" status tracking.
  - **Type Standardization**: Normalized question types (`MCQ`, `TF`, `Essay`) across all solver interfaces for consistent data modeling.
- **Material Upload Security**: Integrated filename sanitization logic for all storage uploads, ensuring cross-platform compatibility and preventing storage path errors from special characters.
- **Full Real-time Synchronization**: Migrated core modules (Lessons, Quizzes, Homework, Student Dashboard, Materials, Calendar) to `onSnapshot` listeners, ensuring the UI across both Admin and Student panels reflects the database state instantly.
- **Administrative Communications**: Launched the `Notifications` management module, allowing admins to send targeted or system-wide alerts with automated cleanup on parent entity removal.
- **Robustness**: Fully validated end-to-end flows for lesson completion, payment tracking, and cascading cleanup with zero data inconsistencies.
- **Premium UX**: Implemented high-contrast, interactive solving components with Framer Motion, featuring real-time locking mechanisms and curriculum-aware progress tracking.

