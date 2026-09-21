import { ButtonBase, IconButton, Stack, Typography } from '@mui/material';
import { CalendarToday, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { SectionAccordion } from '../../components/common/SectionAccordion';
import { localDate } from '../tasks/taskDates';

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function shiftDate(value: string, amount: number) {
  const date = dateFromKey(value);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

export function CompactDateStrip({
  selectedDate,
  onChange,
}: {
  selectedDate: string;
  onChange: (date: string) => void;
}) {
  const selected = dateFromKey(selectedDate);
  const days = [-2, -1, 0, 1, 2].map((offset) => {
    const date = new Date(selected);
    date.setDate(selected.getDate() + offset);
    return { date, key: localDate(date) };
  });
  const selectedLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(selected);

  return (
    <SectionAccordion
      title="Your day"
      icon={<CalendarToday color="primary" />}
      meta={<Typography variant="caption" color="text.secondary">{selectedLabel}</Typography>}
      defaultExpanded
      appearance="plain"
    >
      <Stack direction="row" alignItems="center" gap={{ xs: 0.25, sm: 1 }}>
        <IconButton aria-label="Previous day" onClick={() => onChange(shiftDate(selectedDate, -1))}>
          <ChevronLeft />
        </IconButton>
        <Stack direction="row" flex={1} display="grid" gridTemplateColumns="repeat(5, minmax(0, 1fr))" gap={0.5}>
          {days.map(({ date, key }) => {
            const isSelected = key === selectedDate;
            return (
              <ButtonBase
                key={key}
                aria-label={`Show ${date.toLocaleDateString('en-GB')}`}
                aria-pressed={isSelected}
                onClick={() => onChange(key)}
                sx={{
                  minWidth: 0,
                  minHeight: 60,
                  borderRadius: 999,
                  flexDirection: 'column',
                  color: isSelected ? 'common.white' : 'text.secondary',
                  background: isSelected
                    ? 'linear-gradient(145deg, #35c2ff, #7864f6)'
                    : 'transparent',
                  boxShadow: isSelected ? '0 0 24px rgba(53, 194, 255, 0.28)' : 'none',
                }}
              >
                <Typography variant="caption" fontSize="0.66rem" color="inherit">
                  {new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date)}
                </Typography>
                <Typography fontWeight={800} color="inherit">{date.getDate()}</Typography>
              </ButtonBase>
            );
          })}
        </Stack>
        <IconButton aria-label="Next day" onClick={() => onChange(shiftDate(selectedDate, 1))}>
          <ChevronRight />
        </IconButton>
      </Stack>
    </SectionAccordion>
  );
}
