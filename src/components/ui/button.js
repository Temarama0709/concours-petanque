export function Button({ children, onClick, className = "", variant = "default" }) {
  const base = "px-4 py-2 rounded-xl font-semibold text-sm transition";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
    ghost: "text-blue-600 hover:bg-blue-50",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}