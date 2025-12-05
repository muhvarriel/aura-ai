# 🌟 Aura AI - Personalized Learning Roadmap Generator

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

> **Transform any topic into a personalized, AI-powered learning journey.** Aura AI generates comprehensive learning roadmaps with interactive visualizations, quizzes, and curated content tailored to your pace.

---

## ✨ Features

### 🎯 **AI-Powered Roadmap Generation**

- Generate complete learning paths for any topic in seconds
- Structured modules with estimated completion times
- Progressive difficulty levels (Beginner → Intermediate → Advanced)

### 📊 **Interactive Graph Visualization**

- Beautiful, interactive node-based roadmap display
- Visual progress tracking
- Intuitive navigation through learning modules

### 📚 **Rich Content Delivery**

- AI-generated module content with markdown support
- Interactive quizzes for knowledge validation
- Code syntax highlighting
- Resource recommendations

### 🎨 **Modern, Elegant UI**

- Smooth animations with Framer Motion
- Responsive design for all devices
- Dark/light theme support (coming soon)
- Magnetic button interactions

### 💾 **Progress Persistence**

- Local state management with Zustand
- Track completed modules
- Resume learning anytime

---

## 🏗️ Architecture

Aura AI follows **Clean Architecture** principles for maintainability and scalability:

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── roadmap/       # Roadmap generation & content
│   ├── roadmap/[id]/      # Dynamic roadmap pages
│   └── page.tsx           # Landing page
├── core/                   # Domain Layer (Business Logic)
│   ├── constants/         # AI config, prompts
│   └── entities/          # Domain models
├── infrastructure/         # External Services
│   ├── ai/               # LangChain integration
│   └── store/            # State management
├── presentation/           # UI Layer
│   ├── components/       # Reusable UI components
│   ├── features/         # Feature-specific components
│   └── hooks/            # Custom React hooks
└── lib/                    # Shared Utilities
    ├── graph-layout.ts   # Graph calculation
    └── utils.ts          # Helper functions
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- **Groq API Key** (for AI generation)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/muhvarriel/aura-ai.git
   cd aura-ai
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Groq AI Configuration
   GROQ_API_KEY=your_groq_api_key_here

   # Optional: Model Configuration
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

   **Get your Groq API Key:**
   - Visit [https://console.groq.com](https://console.groq.com)
   - Sign up for a free account
   - Navigate to API Keys section
   - Generate a new API key

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

---

## 📖 Usage

### Generating Your First Roadmap

1. **Enter a Topic:** Type any subject you want to learn (e.g., "Machine Learning", "Web3 Development")
2. **Generate:** Click the arrow button or press Enter
3. **Explore:** Navigate through the interactive roadmap graph
4. **Learn:** Click nodes to view detailed content and quizzes
5. **Track Progress:** Mark modules as complete to track your journey

### Suggested Topics

- 🤖 Artificial Intelligence
- 🌐 Web3 Development
- 📊 Data Science
- 🔐 Cybersecurity
- 🎨 UI/UX Design
- 📱 Mobile App Development

---

## 🛠️ Tech Stack

### Frontend Framework

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript

### Styling & Animation

- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide Icons** - Beautiful icon set

### AI & Data

- **LangChain** - LLM application framework
- **Groq** - Ultra-fast AI inference
- **Zod** - Schema validation

### Visualization

- **React Flow (@xyflow/react)** - Interactive node graphs

### State Management

- **Zustand** - Lightweight state management

### Content Rendering

- **react-markdown** - Markdown renderer

---

## 🧪 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Format code
npm run format
```

### Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety

---

## 📁 Project Structure Details

### API Routes

#### `POST /api/roadmap/generate`

Generates a complete learning roadmap for a given topic.

**Request Body:**

```json
{
  "topic": "Machine Learning"
}
```

**Response:**

```json
{
  "data": {
    "courseTitle": "Complete Machine Learning Guide",
    "overview": "Comprehensive path to master ML",
    "modules": [...]
  }
}
```

#### `POST /api/roadmap/content`

Fetches detailed content for a specific roadmap node.

**Request Body:**

```json
{
  "topic": "Neural Networks",
  "moduleTitle": "Introduction to Neural Networks"
}
```

---

## 🔐 Environment Variables

| Variable       | Description                 | Required | Default                   |
| -------------- | --------------------------- | -------- | ------------------------- |
| `GROQ_API_KEY` | Groq API authentication key | ✅ Yes   | -                         |
| `GROQ_MODEL`   | AI model to use             | ❌ No    | `llama-3.3-70b-versatile` |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🔒 Security

Security is a top priority. Please see our [Security Policy](SECURITY.md) for reporting vulnerabilities.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Groq](https://groq.com/) - Lightning-fast AI inference
- [LangChain](https://langchain.com/) - LLM application framework
- [React Flow](https://reactflow.dev/) - Node-based graph library
- [Framer Motion](https://www.framer.com/motion/) - Animation library

---

## 📞 Contact & Support

- **Author:** Varriel Nizar
- **GitHub:** [@muhvarriel](https://github.com/muhvarriel)
- **Website:** [varrielnizar.expo.app](http://varrielnizar.expo.app)

### Report Issues

Found a bug or have a feature request? [Open an issue](https://github.com/muhvarriel/aura-ai/issues/new/choose)

---

## 🗺️ Roadmap

### Current Version (v0.1.0)

- ✅ AI-powered roadmap generation
- ✅ Interactive graph visualization
- ✅ Progress tracking
- ✅ Quiz system

### Upcoming Features

- 🔄 User authentication
- 🔄 Cloud roadmap storage
- 🔄 Collaborative learning
- 🔄 Export roadmaps (PDF, PNG)
- 🔄 Multiple AI model support
- 🔄 Custom roadmap templates
- 🔄 Learning analytics dashboard

---

## ⭐ Star History

If you find Aura AI helpful, please consider giving it a star! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=muhvarriel/aura-ai&type=Date)](https://star-history.com/#muhvarriel/aura-ai&Date)

---

<div align="center">

**Built with ❤️ by [Varriel](https://github.com/muhvarriel)**

[Report Bug](https://github.com/muhvarriel/aura-ai/issues) · [Request Feature](https://github.com/muhvarriel/aura-ai/issues) · [Documentation](https://github.com/muhvarriel/aura-ai/wiki)

</div>
