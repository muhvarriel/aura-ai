import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  className,
}) => {
  // Definisi components yang sesuai dengan Aura Design System
  const customComponents: Components = {
    // 1. Headings: Serif, Hitam, Editorial Look
    h1: ({ ...props }) => (
      <h1
        className="font-serif text-3xl md:text-4xl font-medium mb-6 mt-2 text-black tracking-tight leading-tight border-b border-neutral-100 pb-4"
        {...props}
      />
    ),
    h2: ({ ...props }) => (
      <h2
        className="font-serif text-2xl md:text-3xl font-medium mt-10 mb-4 text-black tracking-tight"
        {...props}
      />
    ),
    h3: ({ ...props }) => (
      <h3
        className="font-serif text-xl font-medium mt-8 mb-3 text-black"
        {...props}
      />
    ),

    // 2. Paragraph & Lists: Sans-Serif, Readable, Neutral
    p: ({ ...props }) => (
      <p
        className="text-neutral-600 leading-relaxed mb-4 font-sans"
        {...props}
      />
    ),
    ul: ({ ...props }) => (
      <ul
        className="list-disc list-outside ml-5 mb-6 text-neutral-600 space-y-1"
        {...props}
      />
    ),
    ol: ({ ...props }) => (
      <ol
        className="list-decimal list-outside ml-5 mb-6 text-neutral-600 space-y-1"
        {...props}
      />
    ),

    // 3. Links: Minimalist Underline interaction
    a: ({ ...props }) => (
      <a
        className="font-medium text-black underline underline-offset-4 decoration-neutral-300 hover:decoration-black transition-all"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),

    // 4. Blockquotes: Editorial Pull-Quote style
    blockquote: ({ ...props }) => (
      <blockquote
        className="border-l-4 border-black pl-4 py-1 my-6 text-lg font-serif italic text-neutral-700 bg-neutral-50 rounded-r-lg"
        {...props}
      />
    ),

    // 5. Code Blocks (Strict Typing Fix)
    // Kita menggunakan React.ComponentPropsWithoutRef<'code'> untuk type safety
    code: ({
      className,
      children,
      ...props
    }: React.ComponentPropsWithoutRef<"code">) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;

      return isInline ? (
        // Inline Code: Pill shape halus, monokrom
        <code
          className="bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-md text-sm font-mono text-neutral-800"
          {...props}
        >
          {children}
        </code>
      ) : (
        // Block Code: Hitam Pekat (High Contrast)
        <div className="relative my-6 rounded-2xl overflow-hidden bg-neutral-950 shadow-2xl shadow-black/10 group">
          {/* Optional: Mac-style dots decoration */}
          <div className="flex items-center gap-1.5 px-4 py-3 bg-neutral-900/50 border-b border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-600/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-600/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-600/50" />
          </div>

          <div className="p-5 overflow-x-auto">
            <code
              className={cn("text-sm font-mono text-neutral-200", className)}
              {...props}
            >
              {children}
            </code>
          </div>
        </div>
      );
    },
  };

  return (
    // 'prose' class dimatikan style default-nya untuk elemen yang kita override,
    // tapi tetap berguna untuk spacing element yang tidak tertangani (misal table/img)
    <article className={cn("prose prose-neutral max-w-none", className)}>
      <ReactMarkdown components={customComponents}>{content}</ReactMarkdown>
    </article>
  );
};
