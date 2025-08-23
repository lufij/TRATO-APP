import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles with mobile optimization
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "flex h-10 w-full min-w-0 rounded-md border-2 border-input px-3 py-2 text-base",
        "bg-white text-black", // Force white background and black text for visibility
        "transition-[color,box-shadow] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Focus states
        "focus-visible:border-trato-orange focus-visible:ring-trato-orange/20 focus-visible:ring-4",
        "focus:bg-white focus:text-black", // Ensure visibility on focus
        // Error states
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        // Mobile specific
        "md:h-9 md:text-sm", // Smaller on desktop
        "min-h-[44px] touch-manipulation", // Touch target size
        className,
      )}
      style={{
        fontSize: '16px', // Prevent zoom on iOS
        backgroundColor: '#ffffff',
        color: '#000000',
        ...props.style
      }}
      {...props}
    />
  );
}

export { Input };
