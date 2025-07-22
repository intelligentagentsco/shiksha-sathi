import os

from dotenv import load_dotenv
from google.adk.sessions import VertexAiSessionService
from vertexai import agent_engines
import asyncio

load_dotenv()

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
AGENT_ID = os.getenv("AGENT_ID")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
agent_engine = agent_engines.get(AGENT_ID)

session_service = VertexAiSessionService(project=PROJECT_ID, location=LOCATION)

session = asyncio.run(session_service.create_session(app_name=AGENT_ID, user_id="123"))

for event in agent_engine.stream_query(
        user_id="123",
        session_id=session.id,
        message="Recap",
):
    print(event)
