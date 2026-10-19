import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

/**
 * Base primitive Skeleton component supporting theming and reduced-motion preferences.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  borderRadius = "var(--radius-card, 6px)",
  className = "",
  style,
  ...props
}) => {
  return (
    <div
      className={`appsec-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * Skeleton Loader matching Analytics Dashboard metric cards.
 */
export const DashboardCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginBottom: "20px",
      }}
      aria-label="Loading dashboard metrics..."
      role="status"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`dash-skel-${idx}`}
          className="card"
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: "100px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton width="45%" height="0.85rem" />
            <Skeleton width="28px" height="28px" borderRadius="50%" />
          </div>
          <Skeleton width="60%" height="1.8rem" />
          <Skeleton width="75%" height="0.75rem" />
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton Loader matching Findings Table & Result Rows.
 */
export const FindingsTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="card" style={{ padding: "16px" }} aria-label="Loading findings..." role="status">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
        <Skeleton width="200px" height="1.2rem" />
        <div style={{ display: "flex", gap: "8px" }}>
          <Skeleton width="80px" height="28px" borderRadius="6px" />
          <Skeleton width="80px" height="28px" borderRadius="6px" />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={`finding-skel-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 2fr 1.5fr 1fr 100px",
              gap: "12px",
              padding: "12px",
              background: "var(--bg-secondary)",
              borderRadius: "6px",
              alignItems: "center",
            }}
          >
            <Skeleton width="70px" height="22px" borderRadius="12px" />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Skeleton width="85%" height="1rem" />
              <Skeleton width="45%" height="0.75rem" />
            </div>
            <Skeleton width="80%" height="0.85rem" />
            <Skeleton width="60px" height="0.85rem" />
            <Skeleton width="70px" height="26px" borderRadius="4px" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton Loader matching Scan Audit History & Activity Logs.
 */
export const ScanHistorySkeleton: React.FC<{ count?: number; rows?: number }> = ({ count = 4, rows }) => {
  const actualCount = rows !== undefined ? rows : count;
  return (
    <div className="card" style={{ padding: "16px" }} aria-label="Loading scan history..." role="status">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <Skeleton width="180px" height="1.2rem" />
        <Skeleton width="70px" height="28px" borderRadius="6px" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from({ length: actualCount }).map((_, idx) => (
          <div
            key={`hist-skel-${idx}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderRadius: "6px",
              background: "var(--bg-secondary)",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1 }}>
              <Skeleton width="24px" height="24px" borderRadius="50%" />
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <Skeleton width="30%" height="0.95rem" />
                <Skeleton width="50%" height="0.75rem" />
              </div>
            </div>
            <Skeleton width="80px" height="0.85rem" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton Loader matching Detailed Vulnerability Reports.
 */
export const ReportDetailsSkeleton: React.FC = () => {
  return (
    <div
      className="card"
      style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}
      role="status"
      aria-label="Loading report details..."
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "60%" }}>
          <Skeleton width="90%" height="1.4rem" />
          <Skeleton width="50%" height="0.85rem" />
        </div>
        <Skeleton width="90px" height="32px" borderRadius="16px" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton width="40%" height="0.85rem" />
          <Skeleton width="80%" height="1.1rem" />
          <Skeleton width="60%" height="0.75rem" />
        </div>
        <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton width="40%" height="0.85rem" />
          <Skeleton width="80%" height="1.1rem" />
          <Skeleton width="60%" height="0.75rem" />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Skeleton width="25%" height="1rem" />
        <Skeleton width="100%" height="4.5rem" borderRadius="6px" />
      </div>
    </div>
  );
};
