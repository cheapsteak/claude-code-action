/**
 * Stub implementation of @actions/core for local execution
 * This replaces GitHub Actions-specific outputs with console logging
 */

export function setOutput(name: string, value: string): void {
  console.log(`\n📤 Output: ${name} = ${value}`);
}

export function setFailed(message: string | Error): void {
  console.error(`\n❌ Failed: ${message}`);
  process.exit(1);
}

export function warning(message: string | Error): void {
  console.warn(`\n⚠️  Warning: ${message}`);
}

export function info(message: string): void {
  console.log(`ℹ️  ${message}`);
}

export function debug(message: string): void {
  if (process.env.DEBUG) {
    console.debug(`🐛 ${message}`);
  }
}

export function error(message: string | Error): void {
  console.error(`❌ ${message}`);
}

// Export other @actions/core functions as no-ops or simple implementations
export function getInput(name: string): string {
  return process.env[`INPUT_${name.toUpperCase()}`] || "";
}

export function setSecret(secret: string): void {
  // No-op for local execution
}

export function addPath(inputPath: string): void {
  // No-op for local execution
}

export function exportVariable(name: string, val: string): void {
  process.env[name] = val;
}

export function group<T>(name: string, fn: () => Promise<T>): Promise<T> {
  console.log(`\n📦 ${name}`);
  return fn();
}

export async function startGroup(name: string): Promise<void> {
  console.log(`\n📦 ${name}`);
}

export async function endGroup(): Promise<void> {
  // No-op for local execution
}

export function saveState(name: string, value: string): void {
  // No-op for local execution
}

export function getState(name: string): string {
  return "";
}

export const ExitCode = {
  Success: 0,
  Failure: 1,
};
