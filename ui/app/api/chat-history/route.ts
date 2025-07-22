import {NextResponse} from "next/server";
import {getGoogleAgentAuthToken} from "../../lib/google-auth";

export async function POST(req: Request) {
  try {
    const {projectId, location, agentId, sessionId} = await req.json();

    const token = await getGoogleAgentAuthToken(); // This should return a valid Bearer token

    const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/reasoningEngines/${agentId}/sessions/${sessionId}/events`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error fetching events:", data);
      return NextResponse.json(
        {error: "Failed to fetch session events", details: data},
        {status: response.status}
      );
    }

    // Extract events (optional transformation)
    const events =
      data.sessionEvents?.map((event: any) => ({
        role: event.content.role,
        content: event.content.parts[0].text,
        timestamp: event.timestamp,
      })) || [];


    return NextResponse.json({events});
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Something went wrong",
        details: error instanceof Error ? error.message : String(error),
      },
      {status: 500}
    );
  }
}
