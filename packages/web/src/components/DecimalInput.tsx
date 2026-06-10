import { InputHTMLAttributes } from 'react';

type DecimalInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'inputMode'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

const DECIMAL_PATTERN = /^\d*\.?\d*$/;

/**
 * Numeric text input accepting both "4.2" and "4,2" — Polish keyboards expose
 * a comma on the numeric layout. State always stores the dot form, so
 * parseFloat on the value stays correct.
 */
export function DecimalInput({ value, onValueChange, ...rest }: DecimalInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const normalized = e.target.value.replace(',', '.');
        if (normalized === '' || DECIMAL_PATTERN.test(normalized)) {
          onValueChange(normalized);
        }
      }}
      {...rest}
    />
  );
}
