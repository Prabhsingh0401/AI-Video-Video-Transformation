# 🚀 AI-Powered Video-to-Video Transformation App

An AI-powered video transformation web app that allows users to upload videos, apply advanced transformations via FAL AI, and store/view their personalized video history. Built with **Next.js**, **Express**, **TailwindCSS**, **MongoDB**, and **Clerk Auth** — seamlessly integrating **Uploadcare**, **Cloudinary**, and **FAL AI**.

---

## 📸 What It Does

- Users upload videos through an intuitive UI.
- Videos are:
  - Uploaded via **Uploadcare**
  - Stored temporarily on **Cloudinary**
  - Sent to **FAL AI** for transformation
  - Returned and re-uploaded to **Cloudinary**
- The transformation data is stored in **MongoDB**, mapped to the authenticated **Clerk user**.
- Users can view and manage their video history

---

## 🧠 Tech Stack

| Layer            | Technology                   |
|------------------|------------------------------|
| Frontend         | Next.js, TailwindCSS         |
| Backend          | Node.js, Express.js          |
| Database         | MongoDB (via native driver)  |
| Authentication   | Clerk                        |
| File Upload      | Uploadcare, Cloudinary       |
| AI API           | FAL AI                       |
| Hosting          | Vercel / Render              |

---

## ⚙️ Architecture Overview

```plaintext
Frontend (Next.js + Clerk)
        │
        ├── Upload Video (Uploadcare)
        │
        ▼
Cloudinary (Temporary Storage)
        │
        ▼
FAL AI (Video Transformation)
        │
        ▼
Cloudinary (Transformed Video)
        │
        ▼
Backend (Express API)
        │
        ▼
MongoDB (Store metadata linked to Clerk user)
````

---

## 🔐 Authentication

* Users sign up or log in via **Clerk**.
* The app ensures that only authenticated users can upload and view videos.
* Each video transformation is tied to a unique `userId` from Clerk.

---

## 📂 Features

* 🎥 Upload original videos
* 🤖 AI-powered transformation via FAL
* 📦 View transformation history
* 🔒 Secure and scoped user data
* ⚡ Fast and responsive UI (TailwindCSS + Next)

---

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Prabhsingh0401/AI-Video-Video-Transformation
cd ai-video-transform
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Create a `.env.local` file at the root with the following:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Clerk Auth
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_frontend_key

# Uploadcare
UPLOADCARE_PUBLIC_KEY=your_uploadcare_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# FAL AI
FAL_API_KEY=your_fal_ai_key

# Backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### 4. Start the App

#### Start Backend

```bash
cd backend
node server.js
```

#### Start Frontend

```bash
npm run dev
```

---

## 🧪 Sample Flow

1. **User logs in** → Clerk issues a token
2. **User uploads video** → Goes to Uploadcare → Then to Cloudinary
3. **Backend picks Cloudinary URL** → Sends to FAL AI for transformation
4. **Transformed video** → Saved again to Cloudinary
5. **MongoDB entry created** → Metadata + URLs saved under `userId`
6. **Frontend fetches video history** → Displays it in a styled dashboard at the home page

---

## 📁 Folder Structure

```
├── backend/
│   ├── lib/             # MongoDB config
│   ├── route/           # Express routes (video transformations)
│   └── server.js        # Express server entry
├── app/                 # Next.js 13+ app directory
│   └── components/      # Reusable UI components
├── public/              # Static assets
├── .env.local           # Environment config
├── tailwind.config.js   # Tailwind settings
└── next.config.js       # Next.js configuration
```
---
## 👤 Author

**Prableen Singh**
Frontend & Full Stack Developer
🌐 [LinkedIn](https://linkedin.com/in/prableen-singh) • ✉️ [Email](mailto:prableensingh0401@gmail.com)
