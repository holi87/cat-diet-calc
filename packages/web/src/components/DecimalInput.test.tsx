import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { DecimalInput } from './DecimalInput';

function Harness({ onValue }: { onValue: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <DecimalInput
      placeholder="amount"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValue(v);
      }}
    />
  );
}

describe('DecimalInput', () => {
  it('normalizes a comma to a dot', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await user.type(screen.getByPlaceholderText('amount'), '4,25');

    expect(onValue).toHaveBeenLastCalledWith('4.25');
    expect((screen.getByPlaceholderText('amount') as HTMLInputElement).value).toBe('4.25');
  });

  it('rejects letters and a second decimal separator', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    const input = screen.getByPlaceholderText('amount');
    await user.type(input, '4a.2.5');

    expect((input as HTMLInputElement).value).toBe('4.25');
  });

  it('uses the decimal software keyboard', () => {
    render(<Harness onValue={() => {}} />);
    expect(screen.getByPlaceholderText('amount').getAttribute('inputmode')).toBe('decimal');
  });
});
