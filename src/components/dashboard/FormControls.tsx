import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Checkbox,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  TimeField,
} from "react-aria-components";
import {
  getLocalTimeZone,
  parseDate,
  parseDateTime,
  Time,
  toCalendarDateTime,
  today,
  type CalendarDateTime,
  type DateValue,
} from "@internationalized/date";
import DashboardIcon from "./DashboardIcon";

export type SelectOption = {
  value: string;
  label: string;
};

export function DashboardSelect({
  id,
  label,
  name,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  name?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      className="dash-aria-select"
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
      aria-label={label}
    >
      <Label>{label}</Label>
      {name && <input type="hidden" name={name} value={value} />}
      <Button id={id} className="dash-aria-trigger">
        <SelectValue />
        <DashboardIcon name="expand_more" size={17} />
      </Button>
      <Popover className="dash-aria-popover">
        <ListBox className="dash-aria-listbox" items={options}>
          {(option) => (
            <ListBoxItem id={option.value} textValue={option.label} className="dash-aria-option">
              {({ isSelected }) => (
                <>
                  <span>{option.label}</span>
                  {isSelected && <DashboardIcon name="check" size={16} />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

function parseValue(value: string, includeTime: boolean): DateValue | null {
  if (!value) return null;
  try {
    return includeTime ? parseDateTime(value.length === 16 ? `${value}:00` : value) : parseDate(value.slice(0, 10));
  } catch {
    return null;
  }
}

export function DashboardDateField({
  id,
  label,
  name,
  value,
  onChange,
  includeTime = false,
  required = false,
}: {
  id: string;
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  includeTime?: boolean;
  required?: boolean;
}) {
  const parsed = parseValue(value, includeTime);

  function update(next: DateValue | null) {
    if (!next) {
      onChange("");
      return;
    }
    const serialized = next.toString();
    onChange(includeTime ? serialized.slice(0, 16) : serialized.slice(0, 10));
  }

  // Der Kalender wählt den Tag, das Zeitfeld darunter die Uhrzeit. Ohne bereits
  // gewähltes Datum dient der heutige Tag als Basis, damit eine Uhrzeit allein
  // schon einen gültigen Termin ergibt.
  const timeValue = parsed && "hour" in parsed ? new Time(parsed.hour, parsed.minute) : null;

  function updateTime(next: Time | null) {
    if (!next) return;
    const base = parsed && "hour" in parsed ? (parsed as CalendarDateTime) : toCalendarDateTime(today(getLocalTimeZone()));
    update(base.set({ hour: next.hour, minute: next.minute, second: 0, millisecond: 0 }));
  }

  return (
    <I18nProvider locale="de-AT">
      <DatePicker
        className="dash-aria-date"
        value={parsed}
        onChange={update}
        granularity={includeTime ? "minute" : "day"}
        hourCycle={24}
        isRequired={required}
        aria-label={label}
      >
        <Label>{label}</Label>
        {name && <input type="hidden" name={name} value={value} />}
        <Group id={id} className="dash-aria-date-input">
          <DateInput className="dash-aria-date-segments">
            {(segment) => <DateSegment segment={segment} className="dash-aria-date-segment" />}
          </DateInput>
          <Button className="dash-aria-date-trigger" aria-label={`${label}: Kalender öffnen`}>
            <DashboardIcon name="today" size={17} />
          </Button>
        </Group>
        <Popover className="dash-aria-date-popover" placement="bottom start">
          <Dialog className="dash-aria-date-dialog">
            <Calendar className="dash-aria-calendar">
              <header className="dash-aria-calendar-head">
                <Button slot="previous" className="dash-aria-calendar-nav" aria-label="Voriger Monat">
                  <DashboardIcon name="arrow_back" size={16} />
                </Button>
                <Heading />
                <Button slot="next" className="dash-aria-calendar-nav" aria-label="Nächster Monat">
                  <DashboardIcon name="arrow_forward" size={16} />
                </Button>
              </header>
              <CalendarGrid className="dash-aria-calendar-grid" weekdayStyle="short">
                <CalendarGridHeader>
                  {(day) => <CalendarHeaderCell className="dash-aria-calendar-weekday">{day}</CalendarHeaderCell>}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => <CalendarCell date={date} className="dash-aria-calendar-cell" />}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
            {includeTime && (
              <div className="dash-aria-time-row">
                <TimeField
                  className="dash-aria-time"
                  value={timeValue}
                  onChange={updateTime}
                  hourCycle={24}
                  aria-label="Uhrzeit"
                >
                  <Label>Uhrzeit</Label>
                  <DateInput className="dash-aria-date-input">
                    {(segment) => <DateSegment segment={segment} className="dash-aria-date-segment" />}
                  </DateInput>
                </TimeField>
              </div>
            )}
          </Dialog>
        </Popover>
      </DatePicker>
    </I18nProvider>
  );
}

export function DashboardCheckbox({
  isSelected,
  onChange,
  children,
  className = "dash-choice",
}: {
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Checkbox className={className} isSelected={isSelected} onChange={onChange}>
      <span className="dash-choice-control" aria-hidden="true">
        <DashboardIcon name="check" size={14} />
      </span>
      {children}
    </Checkbox>
  );
}
