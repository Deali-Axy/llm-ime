export type Candidate = {
  word: string
  score: number
  pinyin: string[]
  remainkeys: string[]
  preedit: string
  consumedkeys: number
}

export type CandidatesResponse = {
  candidates: Candidate[]
}

export type UserData = {
  words: Record<number, Array<number>>
  context: Array<{ t: string; token: number }>
}

export type InputLog = {
  keyDeltaTimes: number[]
  lastKeyTime: number | null
  ziDeltaTimes: number[]
  lastZiTime: number | null
  ziCount: number
  lastCandidates: {
    time: number
    candidates: string[]
  }
  offsetTimes: Record<number, number[]>
}

export type EngineStatus = {
  readyAt: number
  userWordCount: number
  contextTokenCount: number
  lastCandidateCount: number
  ziCount: number
}

type MessageResponse = {
  message: string
}

type CommitResponse = MessageResponse & {
  committedText: string | null
}

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  ""

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api${path}`, init)

  if (!response.ok) {
    const text = await response.text()

    try {
      const json = JSON.parse(text) as { error?: string }
      throw new Error(json.error || `Request failed: ${response.status}`)
    } catch {
      throw new Error(text || `Request failed: ${response.status}`)
    }
  }

  return (await response.json()) as T
}

export const api = {
  candidates(keys: string) {
    return request<CandidatesResponse>("/candidates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys }),
    })
  },
  commit(payload: { text: string; isNew?: boolean; update?: boolean }) {
    return request<CommitResponse>("/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: payload.text,
        new: payload.isNew,
        update: payload.update,
      }),
    })
  },
  userData() {
    return request<UserData>("/userdata")
  },
  inputLog() {
    return request<InputLog>("/inputlog")
  },
  learnText(text: string) {
    return request<MessageResponse>("/learntext", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: text,
    })
  },
  status() {
    return request<EngineStatus>("/status")
  },
}
