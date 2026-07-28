import {
  Button,
  Checkbox,
  DateField,
  DateInput,
  DateSegment,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import { parseDate, parseDateTime, type DateValue } from "@internationalized/date";
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

  return (
    <DateField
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
      <DateInput id={id} className="dash-aria-date-input">
        {(segment) => <DateSegment segment={segment} className="dash-aria-date-segment" />}
      </DateInput>
    </DateField>
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
