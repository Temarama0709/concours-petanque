export function Card({ children, className = "" }) {
  return <div className={`bg-white border-2 border-bord rounded-xl ${className}`}>{children}</div>;
}
export function CardContent({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
