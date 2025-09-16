"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  defaultChecked?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Switch({ 
  defaultChecked = false, 
  checked, 
  onCheckedChange,
  disabled = false,
  className,
  ...props 
}: SwitchProps) {
  const [isChecked, setIsChecked] = React.useState(checked ?? defaultChecked)

  React.useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked)
    }
  }, [checked])

  const handleToggle = () => {
    if (disabled) return
    
    const newChecked = !isChecked
    setIsChecked(newChecked)
    onCheckedChange?.(newChecked)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={handleToggle}
      disabled={disabled}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isChecked 
          ? "bg-freelaw-primary data-[state=checked]:bg-primary" 
          : "bg-input data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          isChecked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}