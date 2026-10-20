import React from "react";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ title, subtitle, headerAction, noPadding = false, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-lg border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-sm ${className}`}
        {...props}
      >
        {(title || headerAction) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
            <div>
              {typeof title === "string" ? (
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>
              )}
            </div>
            {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
          </div>
        )}
        <div className={noPadding ? "" : "p-4"}>{children}</div>
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
