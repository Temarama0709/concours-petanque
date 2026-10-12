export function Input({ type = "text", className = "", ...props }) {
  return (
    <input
      type={type}
      className={`w-full h-11 px-3 bg-fond text-navy placeholder:text-ardoise border-2 border-transparent rounded-[10px] focus:outline-none focus:border-jaune ${className}`}
      {...props}
    />
  );
}
