// Dollar amount input. Validation happens in the parent with
// parseDollarsToCents so the submitted value is always exact integer cents.
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material'

type MoneyFieldProps = Omit<TextFieldProps, 'onChange' | 'value' | 'type'> & {
  value: string
  onChange: (value: string) => void
}

export function MoneyField({ value, onChange, slotProps, ...props }: MoneyFieldProps) {
  return (
    <TextField
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      // type="text" + inputMode keeps a numeric keypad on phones without the
      // browser silently accepting exponent notation like "1e3".
      type="text"
      placeholder="0.00"
      autoComplete="off"
      slotProps={{
        ...slotProps,
        inputLabel: { shrink: true, ...(slotProps?.inputLabel as object) },
        htmlInput: { inputMode: 'decimal', className: 'tabular', ...(slotProps?.htmlInput as object) },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <span style={{ fontWeight: 700 }}>$</span>
            </InputAdornment>
          ),
          ...(slotProps?.input as object),
        },
      }}
    />
  )
}
