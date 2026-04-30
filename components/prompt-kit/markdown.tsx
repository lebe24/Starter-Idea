"use client"

import { cn } from "@/lib/utils"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

export type MarkdownProps = {
  children: string
  className?: string
  components?: Partial<Components>
}

function Markdown({ children, className, components }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words text-inherit dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-code:text-inherit prose-a:text-blue-600 prose-a:underline prose-a:decoration-blue-600/60 hover:prose-a:text-blue-700 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300 prose-strong:text-red-600 dark:prose-strong:text-red-400",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export { Markdown }
