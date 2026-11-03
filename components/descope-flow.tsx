"use client"

import { useCallback, useState, type ComponentProps } from "react"
import { Descope } from "@descope/nextjs-sdk"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type DescopeProps = ComponentProps<typeof Descope>

type DescopeFlowProps = DescopeProps & {
  /** Text shown under the spinner while the flow loads. */
  loadingText?: string
}

/**
 * Descope flow that shows a spinner until the flow has rendered (onReady), then fades the flow in.
 * The flow stays mounted (hidden and inert) while loading so it can render in the background.
 * It's also shown when it fails, so its error is shown instead of an endless spinner.
 */
export function DescopeFlow({ loadingText = "Loading...", onReady, onError, ...props }: DescopeFlowProps) {
  // The flow that is ready, so the spinner is shown again when the flow changes (e.g. from ?flow=)
  const [readyFlowId, setReadyFlowId] = useState<string | null>(null)
  const isReady = readyFlowId === props.flowId

  const handleReady = useCallback<NonNullable<DescopeProps["onReady"]>>(
    (e) => {
      setReadyFlowId(props.flowId)
      onReady?.(e)
    },
    [props.flowId, onReady]
  )

  const handleError = useCallback<NonNullable<DescopeProps["onError"]>>(
    (e) => {
      setReadyFlowId(props.flowId)
      onError?.(e)
    },
    [props.flowId, onError]
  )

  return (
    <div className="relative">
      {!isReady && (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner className="size-8" />
          <span className="text-base">{loadingText}</span>
        </div>
      )}
      <div
        inert={!isReady}
        className={cn(
          "transition-opacity duration-300",
          isReady ? "opacity-100" : "pointer-events-none absolute inset-x-0 top-0 opacity-0"
        )}
      >
        <Descope {...props} onReady={handleReady} onError={handleError} />
      </div>
    </div>
  )
}
