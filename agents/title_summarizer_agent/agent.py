from google.adk.agents import Agent
from google.genai import types as gen_types
import os
from google.oauth2 import service_account
from google.genai.types import GenerateContentConfig
from google.auth import default
from datetime import datetime, timedelta



APP_NAME = "ai_title_summarizer"
MODEL_NAME = "gemini-2.5-pro"
AGENT_NAME = "title_summarizer_agent"

root_agent_instruction="""
        You are a conversational AI assistant with editorial expertise.

        Your task is to generate a concise and descriptive session title by summarizing the first user–assistant message exchange in a conversation.

        You will receive input in JSON format with two messages: the user's first message and the assistant's first response.

        Analyze both messages and create a clear, brief, and meaningful title that reflects the topic or goal of the conversation.

        🔹 Audience: AI assistant users who need an easy way to recognize their chat sessions.
        🔹 Topic: Any domain — adapt the title to match the subject of the conversation.
        🔹 Format: Return a single-line title under 8 words, written in Title Case (like "Fix Python Script for File Upload").

        🎯 Focus on the user's intent and the assistant’s response when deciding what the session is about.
        """



# ───── Safety settings tell Gemini what to block outright ───────────
safety_settings = [
    gen_types.SafetySetting(
        category=gen_types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=gen_types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    gen_types.SafetySetting(
        category=gen_types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=gen_types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    gen_types.SafetySetting(
        category=gen_types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=gen_types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
]

gen_cfg = GenerateContentConfig(
    max_output_tokens=4096,
    temperature=0.7,
    top_p=0.9,
    safety_settings=safety_settings,
)

root_agent = Agent(
    model=MODEL_NAME,
    name=AGENT_NAME,
    instruction=root_agent_instruction,
    generate_content_config=gen_cfg,
)






