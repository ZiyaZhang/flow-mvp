import type { Session } from "../../../../packages/shared/src/index.js";

export type SessionDraftPayload = Pick<Session, "title" | "brief" | "nodes" | "edges" | "status">;

const apiBase = (import.meta.env.VITE_FLOW_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

async function request<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${pathname}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchSession(sessionId: string): Promise<Session> {
  return request<Session>(`/api/sessions/${sessionId}`);
}

export function saveSession(sessionId: string, payload: SessionDraftPayload): Promise<Session> {
  return request<Session>(`/api/sessions/${sessionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function completeSession(sessionId: string, payload: SessionDraftPayload): Promise<Session> {
  return request<Session>(`/api/sessions/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
