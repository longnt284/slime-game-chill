interface IconProps {
  name: string;
  className?: string;
}

/* Icon SVG nét thô kiểu pixel, viewBox 24x24 */
export function Icon({ name, className = "w-5 h-5" }: IconProps) {
  const p: Record<string, React.ReactNode> = {
    bolt: <path d="M12 2l2.4 6.2L21 9l-5 4.4 1.6 6.6L12 16.4 6.4 20 8 13.4 3 9l6.6-.8z" />,
    orbit: (
      <>
        <circle cx="12" cy="12" r="3" />
        <ellipse cx="12" cy="12" rx="9.5" ry="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="19.4" y="8" width="3.4" height="3.4" />
        <rect x="1.2" y="12.6" width="3.4" height="3.4" />
      </>
    ),
    aura: (
      <>
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M19.8 4.2L17 7M7 17l-2.8 2.8" stroke="currentColor" strokeWidth="2.4" />
      </>
    ),
    zap: <path d="M13 2L4 14h6l-2 8 10-13h-6z" />,
    boom: <path d="M4 5c6-3 13-2 16 3-2 0-4 .6-5.4 1.8L21 16l-4.6 1L14 21.6 11.8 15C10 16 8 16.4 6 16c2-2 3-4.6 3-7.4C9 6.8 6.7 5.6 4 5z" />,
    frost: <path d="M12 1v22M12 5l-3-2M12 5l3-2M12 19l-3 2M12 19l3 2M2.5 6.5l19 11M5.6 4.7l-.8 3.6M5.6 4.7l3.6-.8M18.4 19.3l.8-3.6M18.4 19.3l-3.6.8M21.5 6.5l-19 11M18.4 4.7l.8 3.6M18.4 4.7l-3.6-.8M5.6 19.3l-.8-3.6M5.6 19.3l3.6.8" stroke="currentColor" strokeWidth="2" fill="none" />,
    speed: <path d="M3 17l4-9h5l2 4h7l-3 5h-6l-1 3H6l1-3zm6-7l-2 4h3l2-4z" />,
    heart: <path d="M12 21S3 14.5 3 8.5C3 5.5 5.5 3 8.5 3c1.7 0 3 .9 3.5 2 .5-1.1 1.8-2 3.5-2C18.5 3 21 5.5 21 8.5c0 6-9 12.5-9 12.5z" />,
    power: <path d="M4 3h13l3 3v15H4zm3 3v12h10V9h-3V6H7zm3 5h6v2h-6zm0 4h6v2h-6z" />,
    haste: <path d="M5 2h14v4l-5 6 5 6v4H5v-4l5-6-5-6zm4 2v2.2L12 10l3-3.8V4zm3 16v-2.2L12 14l-3 3.8V20z" />,
    magnet: <path d="M4 3h6v8a2 2 0 004 0V3h6v8a8 8 0 01-16 0zm0 0v5h6V3zm10 0v5h6V3z" />,
    regen: <path d="M9 2h6v2h-1v4l5 9a3 3 0 01-2.7 4.4H7.7A3 3 0 015 17l5-9V4H9zm2 6l-4 7.5c-.4.8.1 1.5 1 1.5h8c.9 0 1.4-.7 1-1.5z" />,
    skull: <path d="M12 2a8 8 0 00-8 8c0 3 1.6 5.4 4 6.8V21h2v-3h1.5v3h1.5v-3H14.5v3h2v-4.2c2.4-1.4 4-3.8 4-6.8a8 8 0 00-8-8zM8.5 8.5A2 2 0 118.5 12.5 2 2 0 018.5 8.5zm7 0a2 2 0 110 4 2 2 0 010-4z" />,
    core: <path d="M12 1l6 6-6 16L6 7zm0 4L8.5 7.5 12 16l3.5-8.5z" />,
    crown: <path d="M2 7l5 4 5-7 5 7 5-4-2 13H4zm4 11h12v2H6z" />,
    coin: <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15zM10.5 7h3v2h2.5v3h-2.5v5h-3v-5H8v-3h2.5z" />,
    bag: <path d="M8 2h8l1 4H7zm-3 5h14l1.5 14h-17zm5 3v2h2v-2zm4 0v2h2v-2z" />,
    pause: <path d="M5 3h5v18H5zm9 0h5v18h-5z" />,
    play: <path d="M6 3l15 9-15 9z" />,
    sound: <path d="M3 9h4l6-5v16l-6-5H3zm14.5-1.5a6 6 0 010 9M19.5 5a9.5 9.5 0 010 14" stroke="currentColor" strokeWidth="2" fill="none" />,
    mute: <path d="M3 9h4l6-5v16l-6-5H3zm18-1l-5 5m0-5l5 5" stroke="currentColor" strokeWidth="2.4" fill="none" />,
    sword: <path d="M19 2l3 3-9.5 9.5 1.5 1.5-2 2-1.5-1.5L7 20l-1.5 1.5L4 20 2 22l-1-1 2-2-1.5-1.5L3 16l1.5 1.5L14 8z" />,
    wave: <path d="M2 12c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 5 4v4c-2.5 0-2.5-4-5-4s-2.5 4-5 4-2.5-4-5-4-2.5 4-5 4z" />,
    arrow: <path d="M4 10h10V5l8 7-8 7v-5H4z" />,
    wasd: <path d="M8 2h8v8H8zm0 2v4h4V4zM2 12h8v8H2zm0 2v4h4v-4zm12 0h8v8h-8zm0 2v4h4v-4z" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden="true"
    >
      {p[name] ?? p.bolt}
    </svg>
  );
}
