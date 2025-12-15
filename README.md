# Momento Backend

![Momento](https://img.shields.io/badge/Momento-Social%20Network-6366f1)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io)

**REST API and real-time server for the Momento social network.**

Momento Backend is the API server for the Momento social network. It exposes REST endpoints for auth, users, posts, saves, follows, reviews, notifications, conversations, Momento AI chat, and external content (Unsplash). It uses Express-session for auth, MongoDB/Mongoose for persistence, and Socket.io for real-time messaging and live updates (likes, follows, notifications).

---

## Features

### Authentication & Users

- **Auth** – Sign up, sign in (email or username), sign out. Session-based auth with secure cookies; bcrypt password hashing.
- **Roles** – USER and ADMIN. Role checks on admin routes.
- **Users** – Get/update profile, upload profile image (base64/multer), list users, delete account. Admin: list all users, delete any user (except self).

### Posts & Social Graph

- **Posts** – Create, update, delete posts with image upload. List by recency, user, filters (latest, oldest, most liked, most reviewed). Search by caption, location, tags. Personalized feed (followed users + own).
- **Likes & Saves** – Like/unlike posts, save/unsave, fetch saved posts and liked posts.
- **Follows** – Follow/unfollow users; followers/following lists; “messagable” users (mutual follow) for DMs.

### Reviews & Notifications

- **Reviews** – CRUD for post reviews and external (Unsplash) content reviews. Star ratings and comments.
- **Notifications** – Create notifications for likes, follows, reviews. Unread count, mark read, mark all read, delete.

### Real-Time & AI

- **Socket.io** – User rooms (`user-<userId>`). Events: `authenticate`, `send-message`, `typing`, `mark-read`, `new-message`, `message-sent`, `conversation-updated`, `user-typing`, `messages-read`. Used for DMs and live UI updates (e.g. notification badge).
- **Conversations** – REST: list partners, get messages with user, send message, mark read, unread count. Messages also sent/received via Socket.io.
- **Momento AI** – OpenRouter-based chat. Endpoints: `GET /api/momento-ai` (history), `POST /api/momento-ai/chat` (send message). Handles text and optional image-generation-style requests; chat history stored in DB.

### External & Admin

- **External** – Unsplash proxy: search and details for explore/details pages.
- **Admin** – List users, delete users (except self), delete any post.

### Infrastructure

- **CORS** – Configurable origin (`CLIENT_URL`), credentials allowed.
- **Compression** – Response compression.
- **Caching** – Optional cache middleware for selected reads.
- **Validation** – express-validator on routes. Centralized error handler and safe error responses.

---

## Tech Stack

| Layer | Tech |
| ----- | ----- |
| **Runtime** | Node.js 18+ (ES modules) |
| **Framework** | Express 5 |
| **Database** | MongoDB, Mongoose |
| **Auth** | express-session, bcryptjs |
| **Uploads** | Multer, Sharp (image processing) |
| **Real-time** | Socket.io |
| **External** | Axios (Unsplash, OpenRouter) |
| **Validation** | express-validator |

---

## Project Structure

```
momento-backend/
├── index.js                 # App bootstrap, Mongo connect, Express, Socket.io
├── users/                   # User accounts, auth, profile
│   ├── schema.js            # Mongoose schema
│   ├── model.js             # Model export
│   ├── dao.js               # DB operations
│   └── routes.js            # Express routes
├── posts/                   # Posts CRUD, like, feed, search
├── saves/                   # Saved posts
├── follows/                 # Follow graph, messagable users
├── reviews/                 # Post & external reviews
├── notifications/           # Notifications CRUD, read status
├── conversations/           # DMs, message history
├── momentoai/               # Momento AI chat (OpenRouter)
├── external/                # Unsplash proxy
├── middleware/
│   ├── auth.js              # requireAuth, requireRole
│   ├── uploadBase64.js      # Base64 image upload
│   ├── validation.js        # Validation helpers
│   ├── cache.js             # Cache middleware
│   └── errorHandler.js      # Global error handling
├── utils/
│   ├── responseFormatter.js # Success/error responses
│   ├── imageOptimizer.js    # Resize, base64 helpers
│   ├── cache.js             # Cache keys/helpers
│   └── idMapper.js          # ID normalization
├── constants/
│   └── errorMessages.js     # Error codes and messages
└── package.json
```

Each feature module uses:

- **`schema.js`** – Mongoose schema.
- **`model.js`** – Mongoose model export.
- **`dao.js`** – Data access (create, read, update, delete). Used by routes and Socket.io handlers.
- **`routes.js`** – Express routes; some receive `io` for real-time emits (e.g. posts, follows, reviews, notifications).

**`index.js`** wires Express, session, CORS, compression, JSON body parser, mounts all route modules, sets up Socket.io (CORS, auth, `send-message`, `typing`, `mark-read`, etc.), and registers error/404 handlers.

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Installation

1. **Clone and install**

   ```bash
   git clone https://github.com/nirajmehta960/momento-backend.git
   cd momento-backend
   npm install
   ```

2. **Environment**

   Create `.env` in the project root:

   ```env
   PORT=4000
   DATABASE_CONNECTION_STRING=mongodb://127.0.0.1:27017/momento
   SESSION_SECRET=your-secret-key-here
   CLIENT_URL=http://localhost:3000
   SERVER_URL=http://localhost:4000
   SERVER_ENV=development
   UNSPLASH_ACCESS_KEY=your-unsplash-access-key
   OPENROUTER_API_KEY=your-openrouter-api-key
   ```

   - Use a real MongoDB connection string (local or Atlas).
   - `CLIENT_URL` must match the frontend origin (CORS and cookies).
   - `OPENROUTER_API_KEY` required for Momento AI. Get keys from [Unsplash API](https://unsplash.com/developers) and [OpenRouter](https://openrouter.ai/).

3. **Run**

   ```bash
   npm run dev
   ```

   Server runs at [http://localhost:4000](http://localhost:4000). API base: `http://localhost:4000/api`.

---

## Environment Variables

| Variable | Description |
| -------- | ----------- |
| `PORT` | Server port (default `4000`) |
| `DATABASE_CONNECTION_STRING` | MongoDB connection string |
| `SESSION_SECRET` | Secret for express-session |
| `CLIENT_URL` | Frontend origin (CORS, cookies) |
| `SERVER_URL` | Base URL of this server (e.g. image URLs) |
| `SERVER_ENV` | `development` or `production` |
| `UNSPLASH_ACCESS_KEY` | Unsplash API key |
| `OPENROUTER_API_KEY` | OpenRouter API key (Momento AI) |

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start with nodemon |
| `npm start` | Start production server |

---

## API Overview

| Area | Examples |
| ---- | -------- |
| **Auth** | `POST /api/users/signup`, `POST /api/users/signin`, `POST /api/users/signout`, `POST /api/users/profile` |
| **Users** | `GET/PUT /api/users/:userId`, `POST /api/users/upload` |
| **Posts** | `GET/POST /api/posts`, `GET/PUT/DELETE /api/posts/:postId`, `PUT /api/posts/:postId/like`, `GET /api/posts/search`, `GET /api/posts/user/:userId` |
| **Saves** | `GET /api/saves/user/:userId`, `POST/DELETE /api/saves` |
| **Follows** | `POST/DELETE /api/follows`, `GET /api/follows/followers|following|messagable/:userId` |
| **Reviews** | `GET/POST /api/reviews`, `GET/PUT/DELETE /api/reviews/:reviewId`, `GET /api/reviews/post/:postId`, `GET /api/reviews/external/:id` |
| **Notifications** | `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all` |
| **Conversations** | `GET /api/conversations`, `GET /api/conversations/:userId`, `POST /api/conversations/send`, `PUT /api/conversations/:userId/read`, `GET /api/conversations/unread-count` |
| **Momento AI** | `GET /api/momento-ai`, `POST /api/momento-ai/chat` |
| **External** | `GET /api/external/search`, `GET /api/external/details/:id` |
| **Admin** | `GET /api/admin/users`, `DELETE /api/admin/posts/:postId`; user delete via `DELETE /api/users/:userId` |

All JSON responses use a consistent shape; errors go through the global error handler.

---

## Security & Error Handling

- Passwords hashed with bcryptjs.
- Session-based auth; admin routes use `requireRole('ADMIN')`.
- CORS restricted to `CLIENT_URL`; credentials enabled.
- File uploads validated (multer base64 middleware).
- Central error handler returns safe messages and appropriate HTTP status codes.

---

## Deployment

Run on any Node.js host (Railway, Render, Fly.io, etc.):

1. Set all env vars (especially `DATABASE_CONNECTION_STRING`, `SESSION_SECRET`, `CLIENT_URL`, `SERVER_URL`, `OPENROUTER_API_KEY`, `UNSPLASH_ACCESS_KEY`).
2. Use `SERVER_ENV=production`; ensure `CLIENT_URL` and `SERVER_URL` use production URLs.
3. Run `npm start` (or your process manager).

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m 'Add your feature'`).
4. Push and open a Pull Request (`git push origin feature/your-feature`).

Follow existing module structure (schema → model → dao → routes) and use the shared middleware and utils.

---

## License

This project is licensed under the **MIT License** – you can use, copy, modify, merge, publish, distribute, sublicense, and sell copies, under the terms of the [MIT license](LICENSE). See [LICENSE](LICENSE) for the full text.

---

## Authors

**Niraj Mehta** – [GitHub @nirajmehta960](https://github.com/nirajmehta960)

---

## Related

- **Frontend:** [momento-frontend](https://github.com/nirajmehta960/momento-frontend)
