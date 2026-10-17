# VoiceOfCustomer — Feedback Intelligence

VoiceOfCustomer is a web application that transforms customer feedback into actionable insights. Upload a CSV of customer reviews to explore sentiment, identify recurring themes, and generate AI-powered recommendations.

## Features

- **CSV Analysis:** Upload and analyze customer reviews directly in the browser.
- **Sentiment Analysis:** Classify feedback as positive, neutral, or negative.
- **Theme Breakdown:** Identify common topics and explore example reviews.
- **AI Insights:** Generate executive summaries, key findings, recurring pain points, positive highlights, and recommended actions.
- **Dashboard:** Explore feedback patterns and sentiment distribution.
- **Exports:** Download analyzed reviews and reports.
- **Privacy-conscious:** Review text is sent to the configured AI service only when AI insights are requested.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- AI: Google Gemini API
- Data Visualization: Recharts

## Getting Started

1. Clone the repository:

   ```bash
   git clone <your-repository-url>
   cd <project-folder>
   ```

2. Install frontend and backend dependencies:

   ```bash
   npm install
   ```

   Run this inside each project folder containing a `package.json`.

3. Configure the backend environment variables in `.env`:

   ```env
   GEMINI_API_KEY=your_api_key
   GEMINI_MODEL=your_supported_model
   PORT=3001
   ```

4. Start the backend and frontend using their configured npm scripts.

5. Open the local frontend URL shown by Vite, upload a CSV, and explore the dashboard or generate AI insights.

## CSV Format

Prepare a CSV containing customer review text. Optional columns may include ratings, depending on the dataset and supported column names.

## Future Improvements

- Improve theme classification accuracy.
- Add more advanced feedback trends and visualizations.
- Enhance deployment and performance.

---

**VoiceOfCustomer** — Turning customer feedback into clearer decisions.

*Note: AI-generated insights may be imperfect. Validate recommendations against original customer reviews. Never upload sensitive personal information.*
