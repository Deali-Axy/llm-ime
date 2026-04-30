import { useCallback, useEffect, useMemo, useState } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { api, type InputLog } from "@/lib/api.ts"

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function toRate(ms: number) {
  if (ms <= 0) {
    return 0
  }

  return (1000 * 60) / ms
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function StatisticsPage() {
  const [data, setData] = useState<InputLog | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatistics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setData(await api.inputLog())
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatistics()
  }, [loadStatistics])

  const keyAverage = useMemo(() => average(data?.keyDeltaTimes || []), [data])
  const ziAverage = useMemo(() => average(data?.ziDeltaTimes || []), [data])

  const offsetRows = useMemo(() => {
    return Object.entries(data?.offsetTimes || {})
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([offset, values]) => ({
        offset,
        count: values.length,
        average: average(values),
      }))
  }, [data])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>输入统计</CardTitle>
              <CardDescription>观察按键节奏、上屏速度和候选偏移分布。</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadStatistics()}>
              <RefreshCcwIcon className="size-4" />
              刷新
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? (
              <Badge variant="secondary" className="gap-1">
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                更新中
              </Badge>
            ) : null}
            {error ? <Badge variant="destructive">{error}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="平均按键间隔"
            value={`${keyAverage.toFixed(2)} ms`}
            hint={`${toRate(keyAverage).toFixed(2)} kpm`}
          />
          <MetricCard
            title="平均上屏间隔"
            value={`${ziAverage.toFixed(2)} ms`}
            hint={`${toRate(ziAverage).toFixed(2)} wpm`}
          />
          <MetricCard
            title="累计输入字数"
            value={`${data?.ziCount || 0}`}
            hint="自服务启动以来"
          />
          <MetricCard
            title="每字按键数"
            value={
              data && data.ziCount > 0
                ? (data.keyDeltaTimes.length / data.ziCount).toFixed(2)
                : "0.00"
            }
            hint="不含候选选择键"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>候选偏移分布</CardTitle>
          <CardDescription>偏移 0 表示首选命中，偏移越大说明候选排序越靠后。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>偏移</TableHead>
                <TableHead>选择次数</TableHead>
                <TableHead>平均耗时</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offsetRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    暂无可展示数据。
                  </TableCell>
                </TableRow>
              ) : (
                offsetRows.map((row) => (
                  <TableRow key={row.offset}>
                    <TableCell>{row.offset}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{row.average.toFixed(2)} ms</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
