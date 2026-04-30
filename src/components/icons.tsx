import type { HTMLAttributes } from "react";

type IconProps = HTMLAttributes<HTMLSpanElement> & { name?: string; size?: number };

export function MaterialIcon({ name = "arrow_forward", size = 20, className = "", style, ...props }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded ${className}`.trim()}
      aria-hidden="true"
      style={{ fontSize: size, ...style }}
      {...props}
    >
      {name}
    </span>
  );
}

export function ArrowRight(props: IconProps) {
  return <MaterialIcon name="arrow_forward" {...props} />;
}

export function Calendar(props: IconProps) {
  return <MaterialIcon name="calendar_month" {...props} />;
}

export function Check(props: IconProps) {
  return <MaterialIcon name="check_circle" {...props} />;
}

export function Star(props: IconProps) {
  return <MaterialIcon name="star" {...props} />;
}

export function Store(props: IconProps) {
  return <MaterialIcon name="storefront" {...props} />;
}

export function MapPin(props: IconProps) {
  return <MaterialIcon name="location_on" {...props} />;
}

export function Shield(props: IconProps) {
  return <MaterialIcon name="verified_user" {...props} />;
}

export function Lightning(props: IconProps) {
  return <MaterialIcon name="bolt" {...props} />;
}

export function Route(props: IconProps) {
  return <MaterialIcon name="route" {...props} />;
}

export function Handshake(props: IconProps) {
  return <MaterialIcon name="handshake" {...props} />;
}

export function Message(props: IconProps) {
  return <MaterialIcon name="forum" {...props} />;
}
