import { useCallback, useEffect, useState } from "react"
import { LoaderCircleIcon, RefreshCcwIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { api, type EngineStatus } from "@/lib/api.ts"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

export function AdminPage() {
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setStatus(await api.status())
    } catch (requestError) {
      setStatus(null)
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>服务状态</CardTitle>
              <CardDescription>当前统一服务的引擎可用性和运行计数。</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadStatus()}>
              <RefreshCcwIcon className="size-4" />
              刷新
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status ? "default" : "destructive"}>
              {status ? "在线" : "离线"}
            </Badge>
            {isLoading ? (
              <Badge variant="secondary" className="gap-1">
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                检查中
              </Badge>
            ) : null}
            {error ? <Badge variant="destructive">{error}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetric
            label="就绪时间"
            value={status ? formatDateTime(status.readyAt) : "-"}
          />
          <AdminMetric
            label="用户词数"
            value={status ? String(status.userWordCount) : "-"}
          />
          <AdminMetric
            label="上下文 token"
            value={status ? String(status.contextTokenCount) : "-"}
          />
          <AdminMetric
            label="累计输入字数"
            value={status ? String(status.ziCount) : "-"}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
