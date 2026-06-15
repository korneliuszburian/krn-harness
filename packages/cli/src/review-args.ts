interface ReviewCommandOptions {
  format: "markdown" | "json";
  write: boolean;
  error?: string | undefined;
}

export function parseReviewArgs(args: string[]): ReviewCommandOptions {
  const options: ReviewCommandOptions = {
    format: "markdown",
    write: false,
  };

  for (const arg of args) {
    if (arg === "--json") {
      options.format = "json";
      continue;
    }

    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg === "--llm") {
      return {
        ...options,
        error:
          "KRN review: `--llm` is not implemented; deterministic reviewers only in this slice.",
      };
    }

    return {
      ...options,
      error: "KRN review: expected `krn review [--json] [--write]`",
    };
  }

  return options;
}
