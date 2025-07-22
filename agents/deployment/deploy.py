import os

from dotenv import load_dotenv
from vertexai import agent_engines, init

load_dotenv()

from recap_agent import root_agent

PROJECT_ID = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ["GOOGLE_CLOUD_LOCATION"]
STAGING_BUCKET = os.environ["GOOGLE_CLOUD_STAGING_BUCKET"]
AGENT_ID = os.environ.get("AGENT_ID", None)
DISPLAY_NAME = os.environ.get("AGENT_NAME", "Shiksha Sathi")
REQUIREMENTS = [
    "google-adk (>=0.0.2)",
    "google-cloud-aiplatform[agent_engines] (>=1.91.0,!=1.92.0)",
    "google-genai (>=1.5.0,<2.0.0)",
    "dotenv (>=0.9.9)"
]
init(
    project=PROJECT_ID,
    location=LOCATION,
    staging_bucket=STAGING_BUCKET,
)


def create():
    remote_app = agent_engines.create(
        display_name=DISPLAY_NAME,
        agent_engine=root_agent,
        requirements=REQUIREMENTS
    )
    print(f"New Agent engine created {remote_app.resource_name}")
    return remote_app


def get_engine(agent_id: str):
    try:
        return agent_engines.get(agent_id)
    except Exception as e:
        print("Failed to get the agent engine", e)
        return None


def update(agent_id: str):
    engine = get_engine(agent_id)
    if not engine:
        return create()
    return engine.update(
        display_name=DISPLAY_NAME,
        agent_engine=root_agent,
        requirements=REQUIREMENTS
    )


def main():
    if AGENT_ID:
        print(f"Updating the agent engine {AGENT_ID}")
        return update(AGENT_ID)
    return create()

if __name__ == "__main__":
    main()