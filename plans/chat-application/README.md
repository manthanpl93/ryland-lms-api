# Feature: Chat Application

## Overview
Real-time chat application for Ryland LMS enabling instant communication between users with WebSocket-based messaging, user presence tracking, and comprehensive message status management.

## Outline
- **Socket Infrastructure + Database** - WebSocket server with JWT authentication, event handling, connection management, and MongoDB persistence for messages and conversations *(Phase 1)*
- **Messaging Contacts Service** - Role-based contact filtering service that provides appropriate contact lists for Students, Teachers, and Admins based on their permissions and class relationships *(Phase 2)*

## Phase 1: Socket Infrastructure + Database

Complete chat backend with WebSocket server (JWT auth, message/typing handlers, event system), MongoDB models (conversations, messages), Feathers services (REST APIs), and real-time socket integration. Includes message status tracking (delivered/read), conversation management, and persistent storage for 1-on-1 messaging.

## Phase 2: Messaging Contacts Service

Role-based contact filtering service that provides appropriate contact lists based on user role and relationships. Students see classmates and their teachers, Teachers see their class students and fellow teachers from the school, and Admins see all users (students, teachers, and classes) in the system. Includes online status, last message preview, and unread count for each contact.

