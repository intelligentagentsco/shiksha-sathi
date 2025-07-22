import {NextResponse} from "next/server";
import {getGoogleAgentAuthToken} from "../../lib/google-auth";

function extractSessionIdFromName(name: string): string | null {
  const match = name.match(/\/sessions\/(\d+)\//);
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  try {
    const {projectId, location, agentId, userId} = await req.json();

    const token = await getGoogleAgentAuthToken();

    const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/reasoningEngines/${agentId}/sessions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        userId, // ✅ camelCase
      }),
    });

    const data = await response.json();

    const sessionId = extractSessionIdFromName(data.name);

    if (!response.ok) {
      console.error("Vertex API error:", data);
      return NextResponse.json(
        {error: "Failed to create session", details: data},
        {status: response.status}
      );
    }


    return NextResponse.json({sessionId});
  } catch (error: any) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error instanceof Error ? error.message : String(error),
      },
      {status: 500}
    );
  }
}

export async function GET(req: Request) {
  try {
    const {searchParams} = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const location = searchParams.get("location");
    const agentId = searchParams.get("agentId");
    const userId = searchParams.get("userId");

    if (!projectId || !location || !agentId || !userId) {
      return NextResponse.json({error: "Missing parameters"}, {status: 400});
    }

    const token = await getGoogleAgentAuthToken();

    const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/reasoningEngines/${agentId}/sessions`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error fetching sessions:", data);
      return NextResponse.json(
        {error: "Failed to fetch sessions", details: data},
        {status: response.status}
      );
    }

    // Transform each session to extract sessionId and displayName
    const filteredSessions = (data.sessions || [])
      .filter((session: any) => session.userId === userId)
      .map((session: any) => {
        const parts = session.name.split("/");
        const sessionId = parts[parts.length - 1];
        return {
          sessionId,
          displayName: session.displayName ?? null,
          createTime: session.createTime,
          updateTime: session.updateTime,
        };
      });

    return NextResponse.json({sessions: filteredSessions});
  } catch (error: any) {
    console.error("Error getting sessions:", error);
    return NextResponse.json(
      {
        error: "Failed to get sessions",
        details: error instanceof Error ? error.message : String(error),
      },
      {status: 500}
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const {projectId, location, agentId, sessionId, newDisplayName} =
      await req.json();

    const token = await getGoogleAgentAuthToken();

    const sessionName = `projects/${projectId}/locations/${location}/reasoningEngines/${agentId}/sessions/${sessionId}`;

    const url = `https://${location}-aiplatform.googleapis.com/v1beta1/${sessionName}?updateMask=displayName`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: newDisplayName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error updating session:", data);
      return NextResponse.json(
        {error: "Failed to update session", details: data},
        {status: response.status}
      );
    }

    return NextResponse.json({updatedSession: data});
  } catch (error: any) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      {
        error: "Failed to update session",
        details: error instanceof Error ? error.message : String(error),
      },
      {status: 500}
    );
  }
}


