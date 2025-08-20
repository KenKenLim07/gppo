import React, { useEffect, useMemo, useRef, useState } from "react";

export interface ReusableFloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: boolean;
  icon?: React.ReactNode;
  labelClassName?: string;
  containerClassName?: string;
  inputClassName?: string;
  animationDuration?: number;
  useIntervalFocusDetection?: boolean;
  focusCheckInterval?: number;
}

export const ReusableFloatingLabelInput: React.FC<ReusableFloatingLabelInputProps> = ({
  id,
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  error = false,
  icon,
  labelClassName = "",
  containerClassName = "",
  inputClassName = "",
  animationDuration = 200,
  useIntervalFocusDetection = false,
  focusCheckInterval = 120,
  type = "text",
  className,
  ...rest
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const hasContent = useMemo(() => {
    if (typeof value === "string") return value.length > 0;
    return value !== undefined && value !== null && String(value).length > 0;
  }, [value]);

  useEffect(() => {
    if (!useIntervalFocusDetection) return;
    const intervalId = window.setInterval(() => {
      const active = document.activeElement === inputRef.current;
      setIsFocused(active);
    }, Math.max(60, focusCheckInterval));
    return () => window.clearInterval(intervalId);
  }, [useIntervalFocusDetection, focusCheckInterval]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const float = isFocused || hasContent;

  return (
    <div className={`relative ${containerClassName || ""}`}>
      {icon && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={value as any}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={[
          "peer w-full rounded border border-gray-300 bg-white text-base md:text-sm text-gray-900 dark:bg-gray-800 dark:text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
          icon ? "pl-9 pr-10" : "px-3",
          "py-3",
          error ? "border-red-500 focus:ring-red-500" : "",
          inputClassName || ""
        ].join(" ")}
        placeholder=" "
        aria-invalid={error || undefined}
        {...rest}
      />
      <label
        htmlFor={id}
        className={[
          "floating-label absolute left-3 text-gray-500 transition-all",
          "pointer-events-none",
          icon ? "left-9" : "left-3",
          float ? "-top-2 text-xs px-1 bg-white dark:bg-gray-800" : "top-1/2 -translate-y-1/2",
          error ? "text-red-600" : "",
          labelClassName || ""
        ].join(" ")}
        style={{ transitionDuration: `${animationDuration}ms` }}
      >
        {label}
      </label>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" aria-hidden="true" />
    </div>
  );
};

export default ReusableFloatingLabelInput; 