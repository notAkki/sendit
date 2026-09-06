import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function MemberAvatar({ name, size = "default", className, color }: {
  name: string
  size?: "default" | "sm" | "lg"
  className?: string
  color?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <Avatar
      size={size}
      className={cn(
        color && "border after:border-0",
        className,
      )}
      style={color ? { borderColor: color } : undefined}
    >
      <AvatarFallback
        className="font-medium"
        style={
          color
            ? {
                backgroundColor: `color-mix(in oklch, ${color} 14%, var(--background))`,
                color: `color-mix(in oklch, ${color} 70%, var(--foreground))`,
              }
            : undefined
        }
      >
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  )
}
