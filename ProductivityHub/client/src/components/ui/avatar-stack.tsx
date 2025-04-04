import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/lib/utils";

export interface AvatarData {
  src?: string;
  fallback: string;
  alt?: string;
}

interface AvatarStackProps {
  avatars: AvatarData[];
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "h-5 w-5 text-[8px]",
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function AvatarStack({
  avatars,
  max = 3,
  size = "sm",
  className,
}: AvatarStackProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  
  return (
    <div className={cn("flex items-center -space-x-1", className)}>
      {visibleAvatars.map((avatar, i) => (
        <Avatar 
          key={i} 
          className={cn(
            sizeClasses[size],
            "border-2 border-white dark:border-gray-800",
          )}
        >
          <AvatarImage src={avatar.src} alt={avatar.alt || `Avatar ${i + 1}`} />
          <AvatarFallback 
            className="bg-primary text-primary-foreground text-xs font-medium"
          >
            {avatar.fallback}
          </AvatarFallback>
        </Avatar>
      ))}
      
      {remainingCount > 0 && (
        <Avatar 
          className={cn(
            sizeClasses[size],
            "border-2 border-white dark:border-gray-800 bg-muted",
          )}
        >
          <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-medium">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
