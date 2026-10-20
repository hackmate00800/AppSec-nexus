import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ label: string; value: string | number }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      children,
      className = "",
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
          <select
            ref={ref}
            disabled={disabled}
            className={`w-full appearance-none bg-slate-900 border rounded-md text-xs text-slate-100 placeholder:text-slate-500 pl-3 pr-8 py-2 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
              error
                ? "border-rose-500/80 focus:border-rose-500"
                : "border-slate-800 hover:border-slate-700 focus:border-cyan-500/80"
            } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-2.5 flex items-center pointer-events-none text-slate-400">
            <ChevronDown size={14} />
          </div>
        </div>
        {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}
        {!error && helperText && (
          <span className="text-[11px] text-slate-500">{helperText}</span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
