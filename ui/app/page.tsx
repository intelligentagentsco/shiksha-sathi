"use client";

import React, {useState, useEffect, useRef} from "react";
import ReactMarkdown from "react-markdown";
import {FaMicrophone, FaPlus, FaStop, FaSpinner} from "react-icons/fa";
import {motion, AnimatePresence} from "framer-motion";
import {v4 as uuidv4} from "uuid";

interface Message {
  sender: "user" | "model" | "system";
  text: string;
  id: number;
  isPending?: boolean;
}

const getUserId = (): string => {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem("userId", userId);
  }
  return userId;
};

const getSessionId = (): string | null => localStorage.getItem("sessionId");
const setSessionId = (id: string) => localStorage.setItem("sessionId", id);

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [convertedText, setConvertedText] = useState<string>("");
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [sessionId, setSessionIdState] = useState<string>("");
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [isSessionCreating, setIsSessionCreating] = useState<boolean>(false);
  const [sessionName, setSessionName] = useState<string>("");
  const [sessions, setSessions] = useState<
    {
      sessionId: string;
      displayName: string | null;
      createTime: string;
      updateTime: string;
    }[]
  >([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const uid = getUserId();
    const sid = getSessionId();
    setUserId(uid);
    if (sid) {
      setSessionIdState(sid);
      setHasSession(true);
      setIsHistoryLoading(true);
      fetchSessionEvents(uid, sid);
      listSessions({
        projectId: process.env.NEXT_PUBLIC_PROJECTID || "",
        location: process.env.NEXT_PUBLIC_LOCATION || "",
        agentId: process.env.NEXT_PUBLIC_AGENTID || "",
        userId: uid,
      })
        .then(setSessions)
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
  }, [messages]);

  async function listSessions({
    projectId,
    location,
    agentId,
    userId,
  }: {
    projectId: string;
    location: string;
    agentId: string;
    userId: string;
  }) {
    const params = new URLSearchParams({
      projectId,
      location,
      agentId,
      userId,
    });

    const res = await fetch(`/api/session?${params.toString()}`);

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to list sessions");
    }
    const sortedSessions = sortSessionsByCreateTime(data.sessions);
    console.log("SESSIONS (sorted) --> ", sortedSessions);
    return data.sessions; // Array of session objects
  }

  async function updateSessionDisplayName({
    projectId,
    location,
    agentId,
    sessionId,
    newDisplayName,
  }: {
    projectId: string;
    location: string;
    agentId: string;
    sessionId: string;
    newDisplayName: string;
  }) {
    const res = await fetch("/api/session", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        location,
        agentId,
        sessionId,
        newDisplayName,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to update session");
    }

    return data.updatedSession; // updated session object
  }

  const fetchSessionEvents = async (uid: string, sid: string) => {
    try {
      const response = await fetch("/api/chat-history", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          projectId: process.env.NEXT_PUBLIC_PROJECTID,
          location: process.env.NEXT_PUBLIC_LOCATION,
          agentId: process.env.NEXT_PUBLIC_AGENTID,
          sessionId: sid,
        }),
      });
      const data = await response.json();
      if (data?.events) {
        const restoredMessages: Message[] = data.events.map(
          (event: any, index: number) => ({
            id: Date.now() + index,
            sender: event.role === "user" ? "user" : "model",
            text: event.content || "",
          })
        );
        setMessages(restoredMessages);
      }
    } catch (error) {
      console.error("Failed to fetch session events:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {type: "audio/wav"});
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  async function convertToText() {
    try {
      setIsProcessingAudio(true);
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({audio: audioBase64}),
      });
      const data = await response.json();
      const transcript = data.results[0].alternatives[0].transcript;
      setConvertedText(transcript);
      addMessage("user", transcript);
      return data;
    } catch (error) {
      console.error("Error converting speech to text:", error);
    } finally {
      setIsProcessingAudio(false);
    }
  }

  async function callReasoningEngine(
    message: string,
    uid: string,
    sid: string
  ) {
    const pendingMessageId = Date.now();
    try {
      setIsChatLoading(true);
      setMessages((prev) => [
        ...prev,
        {sender: "model", text: "", id: pendingMessageId, isPending: true},
      ]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message, userId: uid, sessionId: sid}),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          try {
            const parsedData = JSON.parse(line);
            const textChunk = parsedData?.content?.parts[0]?.text || "";
            fullResponse += textChunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === pendingMessageId
                  ? {...msg, text: fullResponse, isPending: false}
                  : msg
              )
            );
          } catch {}
        }
        buffer = lines[lines.length - 1];
      }
    } catch (error) {
      console.error("Reasoning engine error:", error);
    } finally {
      setIsChatLoading(false);
    }
  }

  async function callTitleSummarizerReasoningEngine() {
    const pendingMessageId = Date.now();
    if (!messages || messages.length < 2) return;

    try {
      setIsChatLoading(true);

      const response = await fetch("/api/title-summarize", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          message: `messages: [
        {
          role: "user",
          content: ${messages[0].text},
        },
        {
          role: "assistant",
          content: ${messages[1].text},
        },
      ]`,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          try {
            const parsedData = JSON.parse(line);
            const textChunk = parsedData?.content?.parts[0]?.text || "";
            fullResponse += textChunk;
            setSessionName(fullResponse);
          } catch {}
        }
        buffer = lines[lines.length - 1];
      }

      // Update the session name after we get the full response
      if (fullResponse && sessionId) {
        try {
          await updateSessionDisplayName({
            projectId: process.env.NEXT_PUBLIC_PROJECTID || "",
            location: process.env.NEXT_PUBLIC_LOCATION || "",
            agentId: process.env.NEXT_PUBLIC_AGENTID || "",
            sessionId: sessionId,
            newDisplayName: fullResponse,
          });

          // Refresh the sessions list
          const updatedSessions = await listSessions({
            projectId: process.env.NEXT_PUBLIC_PROJECTID || "",
            location: process.env.NEXT_PUBLIC_LOCATION || "",
            agentId: process.env.NEXT_PUBLIC_AGENTID || "",
            userId: userId,
          });
          setSessions(updatedSessions);
        } catch (error) {
          console.error("Failed to update session name:", error);
        }
      }
    } catch (error) {
      console.error("Reasoning engine error:", error);
    } finally {
      setIsChatLoading(false);
    }
  }

  const sortSessionsByCreateTime = (sessions: any[]) => {
    return [...sessions].sort((a, b) => {
      return (
        new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      );
    });
  };

  useEffect(() => {
    if (convertedText && userId && sessionId) {
      callReasoningEngine(convertedText, userId, sessionId);
    }
  }, [convertedText]);

  useEffect(() => {
    if (audioBase64) convertToText();
  }, [audioBase64]);

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current?.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        ?.getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
  };


  const handleCreateSession = async () => {
    setIsSessionCreating(true);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          projectId: process.env.NEXT_PUBLIC_PROJECTID,
          location: process.env.NEXT_PUBLIC_LOCATION,
          agentId: process.env.NEXT_PUBLIC_AGENTID,
          userId,
        }),
      });
      const data = await response.json();
      if (data.sessionId) {
        setSessionIdState(data.sessionId);
        setSessionId(data.sessionId);
        setHasSession(true);
        setMessages([]);
        setIsHistoryLoading(true);
        await fetchSessionEvents(userId, data.sessionId);

        // Refresh the sessions list and sort
        const updatedSessions = await listSessions({
          projectId: process.env.NEXT_PUBLIC_PROJECTID || "",
          location: process.env.NEXT_PUBLIC_LOCATION || "",
          agentId: process.env.NEXT_PUBLIC_AGENTID || "",
          userId: userId,
        });
        setSessions(updatedSessions);
      }
    } catch (e) {
      console.error("Session creation failed:", e);
    } finally {
      setIsSessionCreating(false);
    }
  };
  const addMessage = (
    sender: "user" | "model" | "system",
    text: string,
    id: number = Date.now()
  ) => {
    setMessages((prev) => [...prev, {sender, text, id}]);
  };

  useEffect(() => {
    if (messages && messages.length >= 2 && messages[1].text.length>0 && sessions && sessions.length > 0) {
      console.log("sessions =? ", sessions);
      const currentSession = sessions.find(
        (session) => session.sessionId === sessionId
      );
      if (!currentSession?.displayName) {
        callTitleSummarizerReasoningEngine();
      }
    }
  }, [messages, sessions]);

  return (
    <div className="app">
      <div className="sidebar">
        {hasSession && (
          <button
            className="create-session-button"
            onClick={handleCreateSession}
            disabled={isSessionCreating}
          >
            {isSessionCreating ? (
              <FaSpinner className="icon spinner" />
            ) : (
              <FaPlus className="icon" />
            )}
            <span>Create Session</span>
          </button>
        )}
        {sessions.length > 0 && (
          <div className="session-list">
            <h3 className="session-list-header border-b-[1px] border-b-blue-200">
              Chats
            </h3>
            <ul className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent hover:scrollbar-thumb-blue-400 transition-colors duration-300 pr-2">
              {sessions.map((session) => (
                <li
                  key={session.sessionId}
                  className={`session-list-item ${
                    session.sessionId === sessionId ? "active" : ""
                  }`}
                  onClick={() => {
                    setSessionIdState(session.sessionId);
                    setSessionId(session.sessionId);
                    setHasSession(true);
                    setIsHistoryLoading(true);
                    setMessages([]);
                    fetchSessionEvents(userId, session.sessionId);
                  }}
                >
                  {session.displayName || "New Conversation"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="chat-container">
        {!hasSession ? (
          <div className="empty-state">
            <button
              className="create-session-button large"
              onClick={handleCreateSession}
              disabled={isSessionCreating}
            >
              {isSessionCreating ? (
                <FaSpinner className="icon spinner" />
              ) : (
                <FaPlus className="icon" />
              )}
              <span>Create New Session</span>
            </button>
          </div>
        ) : (
          <>
            <div className="chat-messages">
              {isHistoryLoading && (
                <div className="loading-history">
                  <FaSpinner className="icon spinner" /> Loading previous
                  messages...
                </div>
              )}
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`message ${msg.sender}`}
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.3}}
                  >
                    {msg.sender === "model" ? (
                      <>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                        {msg.isPending && (
                          <motion.div
                            className="typing-indicator"
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                          >
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      msg.text
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="voice-input-container">
              <button
                className={`voice-button ${isRecording ? "recording" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={
                  isProcessingAudio ||
                  isChatLoading ||
                  isHistoryLoading ||
                  isSessionCreating
                }
              >
                {isRecording ? (
                  <FaStop className="icon" />
                ) : isProcessingAudio ? (
                  <FaSpinner className="icon spinner" />
                ) : (
                  <FaMicrophone className="icon" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
