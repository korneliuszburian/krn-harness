export interface CliRuntime {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
  now?: () => Date;
  tracePath?: string;
  stdin?: () => Promise<string>;
}

async function readProcessStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function defaultRuntime(): CliRuntime {
  return {
    cwd: process.cwd(),
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    stdin: readProcessStdin,
  };
}
