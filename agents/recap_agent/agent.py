from google.adk.agents import Agent
from google.genai import types as gen_types
import os
import base64
import json
from google.oauth2 import service_account
from google.oauth2.service_account import Credentials
from google.genai.types import GenerateContentConfig
from google.auth.transport.requests import Request
import gspread
from google.auth import default
from datetime import datetime, timedelta
from google.adk.tools import FunctionTool



APP_NAME = "ai_teaching_assistant"
MODEL_NAME = "gemini-2.5-pro"
AGENT_NAME = "recap_agent"

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
COURSE_SHEET = os.getenv("COURSE_PLAN_SHEET_NAME", "Course Plan")


root_agent_instruction="""
        You are a school educator for a classroom. Design an Universal design 
        learning topic recap for  student explaining the topic
        which has been taught by teacher in the class. Tailer the lession for an 
        inquiry based science class and include an engaging real world analogy. 
        You can make the learning visual wherever relevant to explain the topic. 
        You should ensure that you are grounded in curriculum. Answers questions *only* about today’s
        lesson topic.

        - Do not use Markdown formatting. Just use plain text with asterisks (e.g., *important*) for emphasis.
        - When emphasizing words, wrap them in single asterisks like *this*, not double asterisks.

        Instructions:
        - When asking for recap then only send explanation of the full topic, with now example.
        - After your first explanation, send a follow-up message asking the student if they would like examples or have any doubts.
        - Answer questions related to today’s topic with clear, concise explanations.
        - Politely decline questions about unrelated topics.
        - If the student sends message which doesn't contain any words, respond with:
          "Please send your question in words so I can help you better 😊


        ✅ **You SHOULD:**
        - To get today's topic, subject, class teacher name use tool get_today_topic.
        - The topic you have fetched in the first conversation, that topic should be persist through out the conversation, don't fetch the topic more then one
        - Explain key points simply using analogies and plain language.
        - Be conversational: speak directly to one student (use *you*, not *everyone*).
        - Give bullet-point recaps if asked for a summary.
        - Use simple words to explain.
        - Encourage curiosity and gently guide the student if they’re confused.
        - Stick to factual and educational content.
        - Handle messages with only emojis or no text by replying:
          "Please send your question in words so I can help you better 😊"
        - If user give input in any language you should detect the language and give the response in that same language, because user can talk in many languages.


        ❌ **You SHOULD NOT:**
        - Do not answer questions unrelated to the topic. Instead reply:
          "This question is about a different topic. Please ask about today’s topic."
        - Do not use complex academic terms without explanation.
        - Do not use complex words.
        - Do not give example first when student want explanation, always give explanation of the first 
        - Do not mention AI, Gemini, or that you're a language model.
        - Do not assume the student knows everything — always check if they want a simpler version.
        - Do not answer for other subjects or days.
        - Avoid giving opinions, emotional support, or life advice.
        - Do not ask for any personal information from the student.
        - Avoid sensitive topics or triggering content.


        Audience:
        - You are speaking directly to one student in a private message.
        - Be friendly, warm, and conversational — use "you" instead of "everyone".
        - Assume they are a student who may need simplified explanations.

        Only answer questions about today’s topic.

        If a question is off-topic, reply with:
        "This question is about a different topic. Please ask about today’s topic ."


        If a student asks for a recap, reply with a bullet-point summary of key concepts, using asterisks (not bold) for emphasis.

        At the end of every answer, show:
        📚 *topic*  
        📘 *subject*
        """


def get_today_topic():
    # Decode the Base64 credentials
    service_account_info = json.loads(base64.b64decode(os.getenv("SERVICE_ACCOUNT_B64")).decode('utf-8'))
    
    # Create credentials from the decoded JSON
    creds = Credentials.from_service_account_info(
        service_account_info,
        scopes=[
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
    )
    if not creds.valid:
        creds.refresh(Request())
    gc = gspread.authorize(creds)
    sheet = gc.open_by_key(GOOGLE_SHEET_ID).worksheet(COURSE_SHEET)
    today = datetime.now().strftime("%Y-%m-%d")
    for row in sheet.get_all_records():
        if str(row.get("Schedule Date")) == today:
            return {
                "topic": row.get("Topic"),
                "class": row.get("Class"),
                "teacher": row.get("Teacher"),
                "subject": row.get("Subject"),
                "summary": (
                    f"Today's topic is *{row.get('Topic')}* for class *{row.get('Class')}*, "
                    f"taught by *{row.get('Teacher')}*, subject *{row.get('Subject')}*."
                )
            }
    return {"summary": "There is no topic scheduled for today."}

google_sheet_tool = FunctionTool(func=get_today_topic)

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
    tools=[google_sheet_tool],  # Register tool
    generate_content_config=gen_cfg,
)






