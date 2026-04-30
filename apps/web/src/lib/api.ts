import { hc } from "hono/client";
import type { AppType } from "@workspace/server/api-type";

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

export const api = {
  status() {
    return client.api.status.$get().then((r) => r.json());
  },
  candidates(keys: string) {
    return client.api.candidates.$post({ json: { keys } }).then((r) => r.json());
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
