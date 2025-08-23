import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base styles with mobile optimization
        "resize-none border-2 border-input placeholder:text-muted-foreground",
        "flex min-h-16 w-full rounded-md px-3 py-2 text-base",
        "bg-white text-black", // Force white background and black text
        "transition-[color,box-shadow] outline-none",
        // Focus states
        "focus-visible:border-trato-orange focus-visible:ring-trato-orange/20 focus-visible:ring-4",
        "focus:bg-white focus:text-black", // Ensure visibility on focus
        // Error states
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        // Mobile specific
        "md:text-sm", // Smaller text on desktop
        "min-h-[88px] touch-manipulation", // Larger touch target
        "disabled:cursor-not-allowed disabled:opacity-50",
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

export { Textarea };
