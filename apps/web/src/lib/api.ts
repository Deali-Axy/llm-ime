import { hc } from "hono/client";
import type { AppType, CandidatesResult } from "@workspace/server/api-type";

export type {
  Candidate,
  CandidatesResult,
  CommitResponse,
  EngineStatus,
  InputLog,
  LearnTextResponse,
  UserData,
} from "@workspace/server/api-type";

const client = hc<AppType>("/");

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ error: `Request failed with status ${response.status}` }));
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const api = {
  status() {
    return client.api.status.$get().then((r) => r.json());
  },
  candidates(keys: string, signal?: AbortSignal) {
    return fetch("/api/candidates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys }),
      signal,
    }).then((r) => parseResponse<CandidatesResult>(r));
  },
  commit(payload: { text: string; isNew?: boolean; update?: boolean }) {
    return client.api.commit
      .$post({
        json: {
          text: payload.text,
          new: payload.isNew,
          update: payload.update,
        },
      })
      .then((r) => r.json());
  },
  userData() {
    return client.api.userdata.$get().then((r) => r.json());
  },
  inputLog() {
    return client.api.inputlog.$get().then((r) => r.json());
  },
  learnText(text: string) {
    return client.api.learntext.$post({ json: { text } }).then((r) => r.json());
  },
};
