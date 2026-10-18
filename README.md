# VoiceOfCustomer — Feedback Intelligence

VoiceOfCustomer is an AI-powered customer feedback analytics application that transforms customer reviews into actionable insights. Upload a CSV of customer reviews to explore sentiment, identify recurring themes, and generate AI-powered recommendations.

**Live Demo:** https://hima-stack.tech  
**GitHub Repository:** https://github.com/SoundaryaKoutharapu/VoiceOfCustomer

## Features

- **CSV Analysis:** Upload customer review datasets for analysis.
- **Sentiment Analysis:** Classify feedback as positive, neutral, or negative.
- **Theme Breakdown:** Identify recurring topics and explore example reviews.
- **AI Insights:** Generate executive summaries, key findings, recurring pain points, positive highlights, and recommended actions.
- **Interactive Dashboard:** Explore sentiment distribution and feedback patterns through visualizations.
- **Exports:** Download analyzed reviews and reports.
- **Privacy-conscious Processing:** Review text is sent to the configured AI service when AI insights are requested.

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **AI:** Google's Gemma model through the Gemini API
- **Data Visualization:** Recharts
- **Deployment:** Render and a custom `.tech` domain

## Getting Started

### Prerequisites

- Node.js and npm installed
- A Google AI API key with access to the configured model
- Git installed

### 1. Clone the repository

```bash
fork the repo; 
git clone https://github.com/your-forkname/VoiceOfCustomer.git
cd VoiceOfCustomer
```

### 2. Install dependencies

Run `npm install` in each project directory containing a `package.json`.

For example, if your frontend and backend are separate directories, install their dependencies separately.

```bash
cd frontend
npm install
```

Then install the backend dependencies from the backend directory:

```bash
cd ../backend
npm install
```

Adjust the directory names if your repository uses a different backend folder name.

### 3. Configure environment variables

Create a `.env` file in the backend directory and configure the required variables:

```env
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemma-4-26b-a4b-it
PORT=3001
```

Use a model identifier supported by your Google AI API account and the deployed backend configuration.

**Security:** Keep your API key private. Do not commit `.env` files or expose API keys in frontend code. Add `.env` to `.gitignore`.

### 4. Start the application

Start the backend using its configured npm script or server entry point.

Start the frontend using its configured npm script. For a Vite development setup, this is commonly:

```bash
npm run dev
```

Run commands from the appropriate project directories and check each `package.json` for the available scripts.

### 5. Analyze customer feedback

1. Open the local frontend URL provided by Vite.
2. Upload a supported CSV file containing customer reviews.
3. Explore sentiment distribution and recurring themes.
4. Request AI insights to generate summaries and recommendations.
5. Export the results when needed.

## CSV Format

Prepare a CSV file containing customer review text. Optional fields, such as ratings, can be included when supported by the application's column mapping.

For reliable results, use a header row and ensure that review text is populated consistently.

## Privacy and Limitations

AI-generated insights can be incomplete or inaccurate. Validate findings and recommendations against the original customer reviews.

Avoid uploading sensitive personal information. When AI insights are requested, feedback is sent to the configured AI service for processing.

## Future Improvements

- Improve theme classification accuracy.
- Add more advanced feedback trends and visualizations.
- Enhance deployment reliability and performance.
- Expand support for additional feedback sources and dataset formats.

---

**VoiceOfCustomer — Turning customer feedback into clearer decisions.**
