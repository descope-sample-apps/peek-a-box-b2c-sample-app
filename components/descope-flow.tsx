"use client"

import { useCallback, useState, type ComponentProps } from "react"
import { Descope } from "@descope/nextjs-sdk"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type DescopeFlowProps = ComponentProps<typeof Descope> & {
  /** Text shown under the spinner while the flow loads. */
  loadingText?: string
}

/**
 * Descope flow that shows a spinner until the flow has rendered (onReady), then fades the flow in.
 * The flow stays mounted (hidden) while loading so it can render in the background.
 */
export function DescopeFlow({ loadingText = "Loading...", onReady, ...props }: DescopeFlowProps) {
  const [isReady, setIsReady] = useState(false)

  const handleReady = useCallback(
    (e: CustomEvent<{}>) => {
      setIsReady(true)
      onReady?.(e)
    },
    [onReady]
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
        className={cn(
          "transition-opacity duration-300",
          isReady ? "opacity-100" : "pointer-events-none absolute inset-x-0 top-0 opacity-0"
        )}
      >
        <Descope {...props} onReady={handleReady} />
      </div>
    </div>
  )
}
