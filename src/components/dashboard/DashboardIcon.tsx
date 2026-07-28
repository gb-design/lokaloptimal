import type { ComponentType } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDots,
  CaretDown,
  Check,
  CheckCircle,
  Circle,
  ClipboardText,
  Copy,
  DownloadSimple,
  EyeSlash,
  FilePdf,
  FileText,
  FloppyDisk,
  GearSix,
  GlobeHemisphereWest,
  Handshake,
  Info,
  Kanban,
  Lightbulb,
  ListPlus,
  LockKey,
  MagnifyingGlass,
  PaperPlaneTilt,
  Password,
  RocketLaunch,
  SignIn,
  SignOut,
  SpinnerGap,
  User,
  UserFocus,
  UserPlus,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";

const iconMap = {
  add_task: ListPlus,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  check: Check,
  check_circle: CheckCircle,
  content_copy: Copy,
  done_all: CheckCircle,
  download: DownloadSimple,
  error: WarningCircle,
  expand_more: CaretDown,
  fact_check: ClipboardText,
  group: UsersThree,
  handshake: Handshake,
  info: Info,
  lightbulb: Lightbulb,
  lock: LockKey,
  login: SignIn,
  logout: SignOut,
  password: Password,
  person: User,
  person_add: UserPlus,
  person_search: UserFocus,
  picture_as_pdf: FilePdf,
  playlist_add: ListPlus,
  progress_activity: SpinnerGap,
  radio_button_unchecked: Circle,
  request_quote: FileText,
  rocket_launch: RocketLaunch,
  save: FloppyDisk,
  search: MagnifyingGlass,
  send: PaperPlaneTilt,
  settings: GearSix,
  settings_alert: WarningCircle,
  task_alt: CheckCircle,
  today: CalendarDots,
  travel_explore: GlobeHemisphereWest,
  view_kanban: Kanban,
  visibility_off: EyeSlash,
} satisfies Record<string, ComponentType<IconProps>>;

export type DashboardIconName = keyof typeof iconMap;

export default function DashboardIcon({
  name,
  size = 18,
  className = "",
  weight = "regular",
}: {
  name: DashboardIconName;
  size?: number;
  className?: string;
  weight?: IconProps["weight"];
}) {
  const Icon = iconMap[name];
  return (
    <Icon
      aria-hidden="true"
      className={`dash-svg-icon ${name === "progress_activity" ? "is-spinning" : ""} ${className}`.trim()}
      focusable="false"
      size={size}
      weight={weight}
    />
  );
}
