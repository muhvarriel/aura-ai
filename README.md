# Aura AI: Intelligent Learning Path Generation Systems

Aura AI is an advanced, industrial-grade learning trajectory generation engine designed to transform arbitrary technical or academic subjects into structured, visually represented, and interactive educational roadmaps. By leveraging Large Language Models (LLMs) and graph theory, the system provides a comprehensive pedagogical framework tailored to individual learning progression.

## Architecture

The system implements Clean Architecture principles to ensure high maintainability, testability, and separation of concerns. The codebase is organized into three primary layers:

1.  **Core (Domain Layer):** Contains the essential business logic, entities (Roadmap, Node, Quiz), and domain-specific constants (AI prompts, configurations). This layer is independent of external frameworks.
2.  **Infrastructure (External Services):** Handles integrations with external providers, including the LangChain-based AI inference engine (Groq) and the Zustand-based state persistence layer.
3.  **Presentation (UI Layer):** Powered by Next.js and React Flow, this layer manages the interactive graph visualization, content rendering, and user interaction flows.

### Data Flow

1.  **Ingestion:** User provides a learning objective (Topic).
2.  **Synthesis:** The Infrastructure layer executes a structured LangChain sequence to generate a valid Syllabus JSON.
3.  **Transformation:** The Core layer transforms the JSON into a directed acyclic graph (DAG) structure.
4.  **Layout:** The system calculates optimal node positioning via the Presentation layer's layout engine.
5.  **Delivery:** Users interact with the visualized nodes to unlock gated educational content and validate knowledge through generated assessments.

## Prerequisites

The following system requirements must be met before deploying the application:

- **Operating System:** Linux, macOS, or Windows (WSL recommended).
- **Runtime Environment:** Node.js v18.17.0 or higher.
- **Package Manager:** Identifiable npm, yarn, or pnpm installation.
- **API Access:** Valid Groq API credentials.

## Installation

Follow these steps to initialize the local development environment:

1.  **Clone Repository:**

    ```bash
    git clone https://github.com/muhvarriel/aura-ai.git
    cd aura-ai
    ```

2.  **Dependency Installation:**

    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Initialize the local configuration file.
    ```bash
    cp .env.example .env.local
    ```

## Configuration

The application requires specific environment variables to function correctly. These must be defined in the `.env.local` file.

| Variable       | Requirement | Description                                                   |
| :------------- | :---------- | :------------------------------------------------------------ |
| `GROQ_API_KEY` | Required    | Authentication token for Groq AI inference services.          |
| `GROQ_MODEL`   | Optional    | Specifies the LLM model (Default: `llama-3.3-70b-versatile`). |

## Usage

### Development Mode

Execute the following command to start the development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build

To generate an optimized production bundle:

```bash
npm run build
npm run start
```

### Protocol for Generating Roadmaps

1.  Navigate to the primary interface.
2.  Submit a technical subject (min. 3 characters).
3.  The system will synthesize a Roadmap entity and persist it to local storage.
4.  Interact with the graph nodes to access gated learning materials.

## Testing

Quality assurance is maintained through strict linting and type-checking protocols:

- **Linting:**
  ```bash
  npm run lint
  ```
- **Static Type Analysis:**
  ```bash
  npm run typecheck
  ```
- **Formatting Verification:**
  ```bash
  npm run format
  ```

## Project Structure

```text
src/
├── app/                    # Routing layer and API controller definitions
│   ├── api/               # Serverless function endpoints for AI processing
│   └── roadmap/           # View layer for roadmap interaction
├── core/                   # Pure business logic and domain entities
│   ├── constants/         # System-wide configuration and prompts
│   └── entities/          # Type definitions and interface contracts
├── infrastructure/         # External service adaptations
│   ├── ai/               # LLM chain implementation (LangChain)
│   └── store/            # Client-side state persistence (Zustand)
├── presentation/           # React component architecture
│   ├── components/       # Atomic UI elements
│   └── features/         # Complex, domain-coupled components
└── lib/                    # Shared utility functions and layout logic
```

## Contributing

Contributions must adhere to the following standards:

1.  Fork the repository and create a feature-specific branch.
2.  Ensure code compliance with existing ESLint and Prettier configurations.
3.  Implement comprehensive TypeScript interfaces for all new features.
4.  Submit a Pull Request with a technical summary of the implementation details.

## License

This project is licensed under the MIT License. Refer to the `LICENSE` file for full legal terminology.
