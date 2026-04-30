import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CopyIcon, EraserIcon, LoaderCircleIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

import { api, type Candidate } from "@/lib/api.ts"

const PAGE_SIZE = 5
const DEBOUNCE_MS = 150

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function removeLastChar(value: string) {
  return Array.from(value).slice(0, -1).join("")
}

export function WritingPad() {
  const editorRef = useRef<HTMLDivElement>(null)
  const requestSequenceRef = useRef(0)
  const draftTextRef = useRef("")
  const composingKeysRef = useRef("")
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [committedText, setCommittedText] = useState("")
  const [draftText, setDraftText] = useState("")
  const [composingKeys, setComposingKeys] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState("复制")

  useEffect(() => {
    draftTextRef.current = draftText
  }, [draftText])

  useEffect(() => {
    editorRef.current?.focus()
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (editor) {
      editor.scrollTop = editor.scrollHeight
    }
  }, [committedText, draftText, composingKeys, candidates])

  /**
   * Fetch candidates for the given key sequence. Uses sequence numbers to
   * discard stale responses when a newer request has already been issued.
   */
  const fetchCandidates = useCallback(async (keys: string, sequence: number) => {
    try {
      const result = await api.candidates(keys)
      if (sequence !== requestSequenceRef.current) return
      setCandidates(result.candidates)
      setError(null)
    } catch (err) {
      if (sequence !== requestSequenceRef.current) return
      setCandidates([])
      setError(getErrorMessage(err))
    } finally {
      if (sequence === requestSequenceRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  /**
   * Update composing keys immediately (for responsive display), then schedule
   * an API call after DEBOUNCE_MS. Older pending calls are cancelled so fast
   * typing only triggers one network request.
   */
  const refreshCandidates = useCallback(
    (nextKeys: string) => {
      // Update ref synchronously so the next handleKeyDown sees the latest value
      composingKeysRef.current = nextKeys
      setComposingKeys(nextKeys)
      setPageIndex(0)
      setError(null)

      // Cancel any pending debounced request
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      if (!nextKeys) {
        setCandidates([])
        setIsLoading(false)
        requestSequenceRef.current++
        return
      }

      // Show loading immediately, but debounce the actual API call
      setIsLoading(true)
      const sequence = ++requestSequenceRef.current

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        void fetchCandidates(nextKeys, sequence)
      }, DEBOUNCE_MS)
    },
    [fetchCandidates],
  )

  const finalizeDraft = useCallback(
    async (suffix = "") => {
      const currentDraft = draftTextRef.current

      try {
        if (currentDraft) {
          await api.commit({
            text: currentDraft,
            isNew: true,
          })
        }

        setCommittedText((current) => `${current}${currentDraft}${suffix}`)
        setDraftText("")
        refreshCandidates("")
      } catch (commitError) {
        setError(getErrorMessage(commitError))
      } finally {
        requestAnimationFrame(() => editorRef.current?.focus())
      }
    },
    [refreshCandidates]
  )

  const selectCandidate = useCallback(
    async (index: number) => {
      const candidate = candidates[index]

      if (!candidate) {
        return
      }

      const nextDraft = `${draftTextRef.current}${candidate.word}`
      setDraftText(nextDraft)

      try {
        if (candidate.remainkeys.length > 0) {
          await api.commit({
            text: nextDraft,
            isNew: false,
          })

          const nextKeys = composingKeysRef.current.slice(candidate.consumedkeys)
          refreshCandidates(nextKeys)
          return
        }

        await api.commit({
          text: nextDraft,
          isNew: true,
        })

        setCommittedText((current) => `${current}${nextDraft}`)
        setDraftText("")
        refreshCandidates("")
      } catch (commitError) {
        setError(getErrorMessage(commitError))
      } finally {
        requestAnimationFrame(() => editorRef.current?.focus())
      }
    },
    [candidates, refreshCandidates]
  )

  const clearComposition = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    requestSequenceRef.current++
    composingKeysRef.current = ""
    setDraftText("")
    setCandidates([])
    setComposingKeys("")
    setPageIndex(0)
    setIsLoading(false)
    requestAnimationFrame(() => editorRef.current?.focus())
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${committedText}${draftText}`)
      setCopyLabel("已复制")
      window.setTimeout(() => setCopyLabel("复制"), 1500)
    } catch (copyError) {
      setError(getErrorMessage(copyError))
    }
  }, [committedText, draftText])

  const visibleCandidates = useMemo(() => {
    const start = pageIndex * PAGE_SIZE
    return candidates.slice(start, start + PAGE_SIZE)
  }, [candidates, pageIndex])

  const totalPages = useMemo(() => {
    if (candidates.length === 0) {
      return 1
    }

    return Math.ceil(candidates.length / PAGE_SIZE)
  }, [candidates.length])

  const preedit = useMemo(() => {
    if (!composingKeys) {
      return ""
    }

    const firstCandidate = candidates[0]
    if (!firstCandidate) {
      return composingKeys
    }

    return `${firstCandidate.preedit}${firstCandidate.remainkeys.join("")}`
  }, [candidates, composingKeys])

  const characterCount = useMemo(() => {
    return Array.from(`${committedText}${draftText}`).length
  }, [committedText, draftText])

  const isComposing = draftText.length > 0 || composingKeys.length > 0

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event
      const lowerKey = key.toLowerCase()
      const isLetter = lowerKey >= "a" && lowerKey <= "z"
      const isSplitKey = key === "'"

      if (
        !isLetter &&
        !isSplitKey &&
        key !== "Backspace" &&
        key !== " " &&
        key !== "=" &&
        key !== "-" &&
        key !== "]" &&
        key !== "[" &&
        key !== "Escape" &&
        key !== "Enter" &&
        !(key >= "1" && key <= "5")
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (key === "Backspace") {
        if (composingKeysRef.current.length > 0) {
          refreshCandidates(removeLastChar(composingKeysRef.current))
          return
        }

        if (draftTextRef.current) {
          clearComposition()
          return
        }

        setCommittedText((current) => removeLastChar(current))
        return
      }

      if (key === "Escape") {
        clearComposition()
        return
      }

      if (key === "Enter") {
        if (isComposing) {
          void finalizeDraft("\n")
          return
        }

        setCommittedText((current) => `${current}\n`)
        return
      }

      if (key === " " && visibleCandidates.length > 0) {
        void selectCandidate(pageIndex * PAGE_SIZE)
        return
      }

      if ((key === "=" || key === "]") && (pageIndex + 1) * PAGE_SIZE < candidates.length) {
        setPageIndex((current) => current + 1)
        return
      }

      if ((key === "-" || key === "[") && pageIndex > 0) {
        setPageIndex((current) => current - 1)
        return
      }

      if (key >= "1" && key <= "5") {
        const offset = Number(key) - 1
        void selectCandidate(pageIndex * PAGE_SIZE + offset)
        return
      }

      if (isLetter || isSplitKey) {
        refreshCandidates(`${composingKeysRef.current}${lowerKey}`)
      }
    },
    [
      candidates.length,
      clearComposition,
      finalizeDraft,
      isComposing,
      pageIndex,
      refreshCandidates,
      selectCandidate,
      visibleCandidates.length,
    ]
  )

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <CardTitle>写字板</CardTitle>
            <CardDescription>
              在这里直接测试 LLM 拼音候选，不依赖 Rime。
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{characterCount} 字</Badge>
            <Badge variant="secondary">{isComposing ? "输入中" : "待命"}</Badge>
            {isLoading ? (
              <Badge variant="secondary" className="gap-1">
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                查询中
              </Badge>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
              <CopyIcon className="size-4" />
              {copyLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearComposition()
                setCommittedText("")
                setError(null)
              }}
            >
              <EraserIcon className="size-4" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={editorRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseDown={() => editorRef.current?.focus()}
          className={cn(
            "min-h-72 rounded-xl border bg-muted/20 p-4 font-mono text-lg leading-8 outline-none transition",
            "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
          )}
        >
          <span className="whitespace-pre-wrap break-all">{committedText}</span>
          <span className="whitespace-pre-wrap break-all text-primary">{draftText}</span>
          <span className="whitespace-pre-wrap break-all text-muted-foreground underline decoration-dotted underline-offset-4">
            {preedit}
          </span>
          <span className="ml-0.5 inline-block h-6 w-px animate-pulse bg-foreground align-middle" />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>输入拼音：a-z / '</span>
          <span>选词：空格 / 1-5</span>
          <span>翻页：= / -</span>
          <span>取消：Esc</span>
          <span>换行：Enter</span>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">候选词</h3>
              <Badge variant="secondary">
                第 {Math.min(pageIndex + 1, totalPages)} / {totalPages} 页
              </Badge>
            </div>
            {error ? (
              <span className="text-sm text-destructive">{error}</span>
            ) : null}
          </div>

          {visibleCandidates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {composingKeys
                ? "暂无候选，继续输入或退格调整拼音。"
                : "聚焦上面的写字板后即可开始输入。"}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleCandidates.map((candidate, index) => {
                const displayIndex = pageIndex * PAGE_SIZE + index

                return (
                  <Button
                    key={`${candidate.word}-${displayIndex}`}
                    variant="outline"
                    className="h-auto justify-between gap-3 px-3 py-3 text-left"
                    onClick={() => void selectCandidate(displayIndex)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {index + 1}. {candidate.word}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {candidate.pinyin.join(" ")}
                    </Badge>
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
