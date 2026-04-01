"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingCardProps extends HTMLMotionProps<"div"> {
  className?: string;
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export function FloatingCard({
  className,
  children,
  hoverEffect = true,
  ...props
}: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={
        hoverEffect
          ? {
              y: -4,
              transition: { duration: 0.2, ease: "easeOut" },
            }
          : undefined
      }
      className={cn(
        "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden",
        "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
