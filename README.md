# 🚀 Code Ignite

**Turn your ideas into apps code, instantly.**

Code Ignite is an AI-powered code generation platform that allows users to describe an application idea in plain English and instantly receive a fully functional, interactive web application. It features a modern, 3D-enhanced UI, real-time code streaming, and live preview capabilities.

## ✨ Features

- **AI-Powered Generation**: Uses advanced LLMs (Llama 4 Scout, Groq Cloud) to generate high-quality React/Next.js code.
- **Instant Preview**: See your app come to life in real-time as the code is generated.
- **Interactive Chat**: Refine your app through a conversational interface.
- **3D Visuals**: Stunning background effects powered by Three.js.
- **High Performance**: Built on Next.js 15 with server-side streaming and edge-ready architecture.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + Shadcn UI
- **Database**: PostgreSQL (Neon Serverless) + Prisma ORM
- **AI Provider**: Groq Cloud (Llama 4, etc.)
- **Graphics**: Three.js / React Three Fiber
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm
- A Groq Cloud API Key
- A PostgreSQL Database (e.g., Neon)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/yashchandnani07/Code-Ignite.git
    cd Code-Ignite
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**

    Create a `.env` file in the root directory:

    ```env
    DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
    GROQ_API_KEY="gsk_..."
    ```

4.  **Initialize Database:**

    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run Development Server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📦 Deployment

The easiest way to deploy is using [Vercel](https://vercel.com):

1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add your Environment Variables (`GROQ_API_KEY`, `DATABASE_URL`) in the Vercel Dashboard.
4.  Deploy!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

