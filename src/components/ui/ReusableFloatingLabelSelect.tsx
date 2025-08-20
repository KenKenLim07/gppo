import React, { useMemo, useRef, useState } from "react";

export interface ReusableFloatingLabelSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: boolean;
  labelClassName?: string;
  containerClassName?: string;
  selectClassName?: string;
  animationDuration?: number;
}

export const ReusableFloatingLabelSelect: React.FC<ReusableFloatingLabelSelectProps> = ({
  id,
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  error = false,
  labelClassName = "",
  containerClassName = "",
  selectClassName = "",
  animationDuration = 200,
  className,
  children,
  ...rest
}) => {
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = useMemo(() => {
    return value !== undefined && value !== null && String(value).length > 0;
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const float = isFocused || hasValue;

  return (
    <div className={`relative ${containerClassName || ""}`}>
      <select
        id={id}
        ref={selectRef}
        value={value as any}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={[
          "peer w-full rounded border border-gray-300 bg-white text-base md:text-sm text-gray-900 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none",
          "px-3 py-3",
          error ? "border-red-500 focus:ring-red-500" : "",
          selectClassName || ""
        ].join(" ")}
        {...rest}
      >
        {children}
      </select>
      <label
        htmlFor={id}
        className={[
          "floating-label absolute left-3 text-gray-500 transition-all pointer-events-none",
          float ? "-top-2 text-xs px-1 bg-white dark:bg-gray-800" : "top-1/2 -translate-y-1/2",
          error ? "text-red-600" : "",
          labelClassName || ""
        ].join(" ")}
        style={{ transitionDuration: `${animationDuration}ms` }}
      >
        {label}
      </label>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 3a1 1 0 01.832.445l5 7a1 1 0 01-1.664 1.11L10 5.882 5.832 11.555a1 1 0 11-1.664-1.11l5-7A1 1 0 0110 3z" clipRule="evenodd" />
      </svg>
    </div>
  );
};

export default ReusableFloatingLabelSelect; 