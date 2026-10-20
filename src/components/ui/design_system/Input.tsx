import React from "react";
import { X } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onClear,
      className = "",
      value,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label className="text-xs font-medium text-slate-300 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-2.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            value={value}
            disabled={disabled}
            className={`w-full bg-slate-900 border rounded-md text-xs text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
              error
                ? "border-rose-500/80 focus:border-rose-500"
                : "border-slate-800 hover:border-slate-700 focus:border-cyan-500/80"
            } ${leftIcon ? "pl-8" : "pl-3"} ${
              rightIcon || onClear ? "pr-8" : "pr-3"
            } py-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {onClear && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-200 transition"
              tabIndex={-1}
            >
              <X size={12} />
            </button>
          )}
          {rightIcon && !onClear && (
            <div className="absolute right-2.5 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}
        {!error && helperText && (
          <span className="text-[11px] text-slate-500">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
