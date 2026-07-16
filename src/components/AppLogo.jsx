export const PITAHAYA_PATH = 'M12 21C6 21 3 16.5 3 12S6 3 12 3s9 4.5 9 9-3 9-9 9zM11 3V1h2v2M7 6.5L5 4.5l3.5 2.5M17 6.5l2-2-3.5 2.5M4 11.5l-2-1L4.5 13M20 11.5l2-1-2.5 2.5M7 17.5l-2 2 3.5-2M17 17.5l2 2-3.5-2'

export default function AppLogo({ className, size, style, ...props }) {
  return (
    <svg
      className={className}
      style={size ? { width: size, height: size, ...style } : style}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d={PITAHAYA_PATH} />
    </svg>
  )
}
