"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, children, disabled, ...props },
    ref
  ) => {
    const variants = {
      primary:
        "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25",
      secondary:
        "bg-white/10 hover:bg-white/15 text-white border border-white/10 backdrop-blur-sm",
      danger:
        "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20",
      ghost: "hover:bg-white/10 text-white/70 hover:text-white",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 overflow-hidden group",
          variants[variant],
          sizes[size],
          (disabled || isLoading) && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : (
          children as React.ReactNode
        )}
      </motion.button>
    );
  }
);
AnimatedButton.displayName = "AnimatedButton";
