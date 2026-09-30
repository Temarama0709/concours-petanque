export function Button({ children, onClick, className = "", variant = "default", size = "md", type = "button", disabled = false, ...props }) {
  const base = "rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm"
  };
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
    ghost: "text-blue-600 hover:bg-blue-50",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
