import type { CliRuntime } from "../runtime.js";

export async function installCommand(runtime: CliRuntime): Promise<number> {
  runtime.stdout("KRN install: skeleton only; no downstream files written\n");
  return 0;
}
