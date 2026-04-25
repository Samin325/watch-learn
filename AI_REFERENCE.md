# 🤖 ABST Coach AI Reference Guide

This project uses a unified Bedrock-powered AI system. All AI logic is abstracted into `lib/bedrock.ts` to make integration into Next.js components and API routes as simple as possible.

---

## 🛠️ Core Functions

Import these from `@/lib/bedrock`:

```typescript
import { generateText, generateJson, generateImage, chatCompletion } from "@/lib/bedrock";
```

### 1. Simple Text Generation
Use this for simple completions or chat responses.
```typescript
const response = await generateText(
  [{ role: "user", content: "What is trespass?" }], 
  "You are a helpful law tutor." // Optional System Prompt
);
```

### 2. Structured JSON Generation
**IMPORTANT**: Use this for Quizzes or Scenarios. It automatically handles markdown stripping and parsing.
```typescript
interface QuizResult {
  questions: Array<{ stem: string, options: string[], correctIndex: number }>;
}

const quiz = await generateJson<QuizResult>(
  [{ role: "user", content: "Generate 3 questions about legal authority." }],
  "Return JSON only. Use the QUIZ_GENERATE schema."
);
```

### 3. Image Generation (Stability AI)
Returns a base64 Data URL string that can be used directly in an `<img>` tag.
```typescript
const base64Image = await generateImage("A security guard at a night club entrance", {
  aspect_ratio: "16:9" // Optional: default is "1:1"
});

// Usage in React: <img src={base64Image} alt="Scenario" />
```

---

## 🧪 Demo Mode vs. Live Mode

The system behavior is controlled by the `DEMO_MODE` variable in `.env`:

| Mode | `.env` Value | Behavior |
| :--- | :--- | :--- |
| **Demo Mode** | `DEMO_MODE=true` | Returns **fast, free, canned data**. No AWS calls. Use this for UI/UX work and testing. |
| **Live Mode** | `DEMO_MODE=false` | Calls **AWS Bedrock (Opus 4.6 / Stability Ultra)**. Requires AWS credentials. |

> [!TIP]
> **How to add new Demo Data**: If you need a specific fake response for a new feature, add a new `if (sys.includes("KEYWORD"))` check inside the `demoText()` function in `lib/bedrock.ts`.

---

## ⚙️ Configuration (.env)

| Variable | Current Value | Description |
| :--- | :--- | :--- |
| `BEDROCK_TEXT_MODEL` | `us.anthropic.claude-opus-4-7` | The primary LLM for chat and logic. |
| `BEDROCK_IMAGE_MODEL` | `stability.stable-image-ultra-v1:1` | The model for scenario visuals. |
| `BEDROCK_EMBED_MODEL` | `amazon.titan-embed-text-v2:0` | Used for searching the ABST manual. |

---

## 🚀 Testing Utilities

You can run these from your terminal to verify connections:

*   **List Models**: `npx tsx scripts/list_models.ts`
*   **Test Chat**: `npx tsx scripts/test_bedrock.ts`
*   **Test Image**: `npx tsx scripts/test_image.ts`
