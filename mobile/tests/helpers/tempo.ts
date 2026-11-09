/** Congela só o relógio (Date); timers e microtarefas continuam reais. */
export function fixarHoje(iso: string) {
  jest.useRealTimers();
  jest.useFakeTimers({
    now: new Date(`${iso}T12:00:00`),
    doNotFake: [
      'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval',
      'clearInterval', 'setTimeout', 'clearTimeout',
    ],
  });
}

export function restaurarTempo() {
  jest.useRealTimers();
}
