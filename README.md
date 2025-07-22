# Shiksha-Sathi: AI Recap Agent

## Executive Summary

**Shiksha-Sathi** is a pioneering AI-driven educational assistant aimed at closing the gap between modern AI advancements and **regional language learning**. Powered by Google’s **Gemini Pro** and **Learn LM**, it offers **voice-first support** in **Kannada**, enabling students to engage with AI tutors in a natural, intuitive way using their native tongue.

---

## Key Differentiators

- **Conversational AI tutor** designed for Kannada speakers
- Seamless integration with **Google’s multimodal AI models**
- **Instant voice understanding** within an educational context
- **Extensible arch~itecture** supporting multiple languages and subjects

---

## 📊 Projected Impact

- Improved **student participation and retention** over standard approaches
- Overcomes **language limitations** using culturally tailored voice content
- Strong early reception in **pilot programs**
- Comprehensive **feedback loop** planned after full rollout

---

## 1. The Problem Space

### 1.1 Addressing the Regional Language Divide

Mainstream ed-tech tools predominantly cater to **English-speaking users**, sidelining learners who rely on regional languages.

> India has over **120 million Kannada speakers**—yet very few AI tools are available in their native language.

#### Key Limitations

- Lack of robust AI tools for regional education
- Inaccurate speech-to-text performance in non-English languages
- Educational material often lacks cultural relevance
- Steep learning curve to adopt AI-enhanced platforms

---

### 1.2 Technical Pain Points

#### 🔉 Voice AI Challenges

- Need for advanced ASR (Automatic Speech Recognition) fine-tuned for Kannada
- Must operate on **low-latency infrastructure** for real-time learning
- Answers must reflect **curriculum-aligned educational intelligence**
- Handling **multi-modal interactions** (speech + text) adds architectural complexity

#### 📘 Content & Curriculum Needs

- Dynamically generate subject-wise, syllabus-aligned responses
- Use **age-suitable** vocabulary and teaching style
- Include **culturally relatable examples**
- Track and evaluate **learning comprehension** through dialogue

---

## 2. System Design

### 2.1 Platform Overview

The AI Recap Agent is deployed using a **cloud-native, microservices-based architecture** on **Google Cloud Platform**, combining various AI capabilities into one unified education assistant.

---

### 2.2 System Components

#### 2.2.1 Language Intelligence

- **Gemini 2.5 Pro** – The brain behind the agent, delivering deep NLU and context handling
- **Learn LM** – Fine-tuned specifically for **subject-grade matching** and **personalized tutoring**

---

#### 2.2.2 Prompt Logic & Agent Flow

- **PARTS Prompting Framework**: Ensures reliable, consistent, and pedagogically structured prompts

##### Orchestration Architecture

- **Main Agent**: Manages session flow, interprets student queries, and generates responses
- **Companion Agent**: Summarizes sessions and creates searchable, descriptive titles automatically

---

#### 2.2.3 Google Cloud Stack

- **Google ADK**: Enables the AI agent to work seamlessly with productivity tools like Sheets and Docs
- **OAuth 2.0**: Provides secure user access and resource permission control

---

#### 📂 2.2.4 Data Handling & Session Management

- **Vertex AI-Powered Session Engine**: Maintains conversational context and progress continuity
- **Google Sheets Backend**: Organizes and syncs academic data, including:
  - Subject Catalogs
  - Instructor Listings
  - Topic Indexes
  - Classroom Associations

---

#### 2.2.5 System Overview

![image](https://i.postimg.cc/4N6R86M0/recap-agent-arc-Page-1-drawio-1.png)

---

## UI Setup Guide

```
cd ui
```

### Install Dependencies

```
npm install
# or
yarn install
```

### Environment Variables

Create a `.env.local` file in the root directory and add the following keys:

```
# Google Cloud Services
GOOGLE_SERVICE_ACCOUNT_EMAIL=XXXXXXXXXXXXXXXXXXX
GOOGLE_PRIVATE_KEY=XXXXXXXXXXXXXXXXXXX
GOOGLE_CLOUD_PROJECT_ID=XXXXXXXXXXXXXXXXXXX

# Vertex AI Configuration
NEXT_PUBLIC_PROJECTID=XXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_LOCATION=XXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_AGENTID=XXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_TITLE_SUMMARIZER_AGENTID=XXXXXXXXXXXXXXXXXXX

# Speech Recognition
SPEECH_TO_TEXT=https://speech.googleapis.com/v1/speech:recognize
LANGUAGE_CODE=kn-IN  # Kannada language support
```

### Development Scripts

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `npm run dev`   | Start development server (with Turbopack) |
| `npm run build` | Build the production app                  |
| `npm run start` | Start the production ap                   |

## Voice Support

*  **Input Language** : Kannada (`kn-IN`)
* ✅ Supports: Class interaction, recap delivery, and daily Q&A
* ❌ Does **not** support keyboard input

## Note

* Ensure your Google service account has proper access to:

  * Vertex AI
  * Google Sheets API

---

# Agents setup

```
cd agents
```

## Environment Setup

### 1. Create `.env` file in root directory

```
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=<PROJECT>
GOOGLE_CLOUD_LOCATION=<LOCATION>
GOOGLE_CLOUD_STAGING_BUCKET=<BUCKET>
AGENT_ID=projects/<PROJECT_ID>/locations/<LOCATION>/reasoningEngines/<AGENT_ENGINE_ID>
GOOGLE_SHEET_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
COURSE_PLAN_SHEET_NAME='Course Plan'
SERVICE_ACCOUNT_B64=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

# Python Dependencies

Add the following to requirements.txt:

```
google-adk>=0.0.2
google-cloud-aiplatform[agent_engines]>=1.91.0,!=1.92.0
google-genai>=1.5.0,<2.0.0
dotenv>=0.9.9
gspread
```

Then install using:

```
pip install -r requirements.txt
```

# Test agent in local

To test the agents in local
run

```
adk web
```

# Deploy / Update Agent on Vertex AI Engine

File: deployment/deploy.py

- create() – Creates a new agent engine on Vertex AI
- get_engine(agent_id) – Fetches an existing agent by ID
- update(agent_id) – Updates the agent logic if it exists, else creates new
- main() – Entry point (decides to update or create based on AGENT_ID)
- By default, this creates a new agent engine unless you provide AGENT_ID in .env.

🔧 To Deploy:
Activate virtual environment (if needed):

```
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows
```

Run deployment script:

```
python deployment/deploy.py
```

or

```
poetry run python deployment/deploy.py
```

Notes

- SERVICE_ACCOUNT_B64: should be a base64-encoded string of your service account JSON file
- GOOGLE_SHEET_ID: must refer to a sheet with columns like: Schedule Date, Topic, Teacher, Class, Subject. [Google sheet template](https://docs.google.com/spreadsheets/d/1V65GAje9c9NdXXXUH-mkcepZYmqyf_QgeedewRQw_W0/edit?gid=1103212698#gid=1103212698)
- Gemini will persist the topic fetched at the start and will not re-fetch it during the session

Success Checklist

- .env file configured with all required variables
- Python dependencies installed
- Agent deployed successfully on Vertex AI Engine
- Google Sheet connected and today's topic available
- Voice UI (Next.js frontend) connected and able to talk to the deployed agent
