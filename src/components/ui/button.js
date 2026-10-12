export function Button({ children, onClick, className = "", variant = "default", size = "md", type = "button", disabled = false, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-[10px] font-bold transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-jaune";
  const sizes = {
    sm: "min-h-[36px] px-3 text-sm",
    md: "min-h-[44px] px-4 text-sm"
  };
  const variants = {
    default: "bg-jaune text-navy hover:bg-jaune-dark",
    navy: "bg-navy text-white hover:bg-navy-dark",
    outline: "border-2 border-bord text-navy bg-white hover:bg-fond",
    ghost: "text-navy hover:bg-fond",
    destructive: "bg-red-700 text-white hover:bg-red-800"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
