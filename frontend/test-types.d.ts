// Ambient test-only globals so spec files can use the Vitest mock types without
// per-file imports. Scoped to tsconfig.spec.json (not the app build).

export {};

declare global {
  type Mock<TReturn = any, TArgs extends any[] = any[]> = import('vitest').Mock<
    (...args: TArgs) => TReturn
  >;
  type Mocked<T> = import('vitest').Mocked<T>;
  type MockInstance<T extends (...args: any[]) => any = (...args: any[]) => any> =
    import('vitest').MockInstance<T>;
}
