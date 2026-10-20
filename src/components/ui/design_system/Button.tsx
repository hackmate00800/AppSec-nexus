import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "sm",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-all duration-150 select-none rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      primary:
        "bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-950/30 border border-cyan-500/30 active:scale-[0.98]",
      secondary:
        "bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/70 hover:border-slate-600 active:scale-[0.98]",
      ghost:
        "bg-transparent hover:bg-slate-850 text-slate-300 hover:text-white border border-transparent",
      danger:
        "bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500/40 shadow-sm active:scale-[0.98]",
      outline:
        "bg-transparent hover:bg-slate-850 text-slate-200 border border-slate-700 active:scale-[0.98]",
    };

    const sizeClasses = {
      xs: "text-[11px] px-2 py-1 gap-1.5 h-6",
      sm: "text-xs px-3 py-1.5 gap-2 h-8",
      md: "text-sm px-4 py-2 gap-2 h-9",
      lg: "text-base px-5 py-2.5 gap-2.5 h-10",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 size={size === "xs" ? 11 : size === "sm" ? 13 : 15} className="animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
