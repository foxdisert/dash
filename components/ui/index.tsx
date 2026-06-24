import * as React from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------- Card ---------------- */
export function NBCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("nb-card", className)} {...props}>
      {children}
    </div>
  );
}

/* ---------------- Button ---------------- */
type NBButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: "white" | "pink" | "yellow" | "cyan" | "lime" | "blue" | "red";
};

const colorMap: Record<NonNullable<NBButtonProps["color"]>, string> = {
  white: "bg-white",
  pink: "bg-pink",
  yellow: "bg-yellow",
  cyan: "bg-cyan text-white",
  lime: "bg-lime",
  blue: "bg-blue",
  red: "bg-red text-white",
};

export function NBButton({
  className,
  color = "white",
  children,
  ...props
}: NBButtonProps) {
  return (
    <button className={cx("nb-btn", colorMap[color], className)} {...props}>
      {children}
    </button>
  );
}

/* ---------------- Badge ---------------- */
type NBBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  color?: "white" | "pink" | "yellow" | "cyan" | "lime" | "red" | "blue";
};

export function NBBadge({
  className,
  color = "white",
  children,
  ...props
}: NBBadgeProps) {
  const bg: Record<NonNullable<NBBadgeProps["color"]>, string> = {
    white: "bg-white",
    pink: "bg-pink",
    yellow: "bg-yellow",
    cyan: "bg-cyan text-white",
    lime: "bg-lime",
    red: "bg-red text-white",
    blue: "bg-blue",
  };
  return (
    <span className={cx("nb-badge", bg[color], className)} {...props}>
      {children}
    </span>
  );
}

/* ---------------- Input ---------------- */
export const NBInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function NBInput({ className, ...props }, ref) {
  return <input ref={ref} className={cx("nb-input", className)} {...props} />;
});

/* ---------------- Select ---------------- */
export const NBSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function NBSelect({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx("nb-select", className)} {...props}>
      {children}
    </select>
  );
});

/* ---------------- Label ---------------- */
export function NBLabel({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cx("nb-label", className)} {...props}>
      {children}
    </label>
  );
}

/* ---------------- Field (label + control wrapper) ---------------- */
export function NBField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <NBLabel>{label}</NBLabel>
      {children}
      {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  );
}
