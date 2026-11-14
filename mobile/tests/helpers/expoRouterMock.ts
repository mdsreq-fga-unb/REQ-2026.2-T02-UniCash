import * as React from 'react';

export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
};

export const useLocalSearchParams = jest.fn(() => ({ id: 'abc' }));

/** Em teste, o foco acontece uma vez, na montagem. */
export function useFocusEffect(cb: () => void) {
  React.useEffect(cb, [cb]);
}
