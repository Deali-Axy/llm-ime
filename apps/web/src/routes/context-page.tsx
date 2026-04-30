import { useCallback, useEffect, useState } from "react"
import { LoaderCircleIcon, RefreshCcwIcon, WandSparklesIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Textarea } from "@workspace/ui/components/textarea"

import { api } from "@/lib/api.ts"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function ContextPage() {
  const [contextText, setContextText] = useState("")
  const [userWordCount, setUserWordCount] = useState(0)
  const [learnText, setLearnText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadContext = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.userData()
      setContextText(data.context.map((entry) => entry.t).join(""))
      setUserWordCount(Object.keys(data.words).length)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleLearn = useCallback(async () => {
    if (!learnText.trim()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await api.learnText(learnText)
      setLearnText("")
      await loadContext()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }, [learnText, loadContext])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>上下文快照</CardTitle>
              <CardDescription>当前模型上下文中已记录的文本内容。</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadContext()}>
              <RefreshCcwIcon className="size-4" />
              刷新
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{contextText.length} 字符</Badge>
            <Badge variant="secondary">{userWordCount} 用户词</Badge>
            {isLoading ? (
              <Badge variant="secondary" className="gap-1">
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                加载中
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[28rem] rounded-xl border p-4">
            <pre className="whitespace-pre-wrap break-words text-sm leading-7">
              {contextText || "当前还没有可展示的上下文。"}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>学习文本</CardTitle>
          <CardDescription>把一段文本直接送入模型上下文，用于快速试验。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={learnText}
            onChange={(event) => setLearnText(event.target.value)}
            rows={14}
            placeholder="粘贴一段你希望模型学习的文本..."
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={() => void handleLearn()} disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <WandSparklesIcon className="size-4" />
            )}
            学习并刷新
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
