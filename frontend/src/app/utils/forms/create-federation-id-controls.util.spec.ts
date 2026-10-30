import { createFederationIdControls } from './create-federation-id-controls.util';

describe('createFederationIdControls', () => {
  it('should start both IDs empty, which is valid as both are optional', () => {
    const { fideId, cfcId } = createFederationIdControls();

    expect(fideId.value).toBe('');
    expect(fideId.valid).toBe(true);
    expect(cfcId.value).toBe('');
    expect(cfcId.valid).toBe(true);
  });

  it('should take only digits, up to the length of each ID', () => {
    const { fideId, cfcId } = createFederationIdControls();

    fideId.setValue('26OO123');
    cfcId.setValue('12345678');

    expect(fideId.hasError('pattern')).toBe(true);
    expect(cfcId.hasError('pattern')).toBe(true);

    fideId.setValue('2600123');
    cfcId.setValue('150123');

    expect(fideId.valid).toBe(true);
    expect(cfcId.valid).toBe(true);
  });
});
