export interface CliRuntime {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
  now?: () => Date;
  tracePath?: string;
}

export function defaultRuntime(): CliRuntime {
  return {
    cwd: process.cwd(),
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  };
}
