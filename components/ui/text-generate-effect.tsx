"use client"
import { cn } from "@/lib/utils"
import { motion, stagger, useAnimate, useInView } from "motion/react"
import { useEffect } from "react"

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string
  className?: string
  filter?: boolean
  duration?: number
}) => {
  const [scope, animate] = useAnimate()
  const isInView = useInView(scope, { once: true })
  const wordsArray = words.split(" ")

  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          opacity: 1,
          filter: filter ? "blur(0px)" : "none",
        },
        {
          duration: duration,
          delay: stagger(0.1),
        }
      )
    }
  }, [isInView, animate, duration, filter])

  return (
    <div className={cn("font-medium", className)}>
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className="opacity-0"
              style={{
                filter: filter ? "blur(10px)" : "none",
              }}
            >
              {word}{" "}
            </motion.span>
          )
        })}
      </motion.div>
    </div>
  )
}
