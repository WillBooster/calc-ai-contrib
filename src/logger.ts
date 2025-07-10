import ansis from 'ansis';

/**
 * Simple logging utility that respects verbose flag and provides colorized output
 */
export class Logger {
  private readonly _verbose: boolean;

  constructor(verbose: boolean = false) {
    this._verbose = verbose;
  }

  /**
   * Get the verbose flag value
   */
  get verbose(): boolean {
    return this._verbose;
  }

  /**
   * Log message only if verbose mode is enabled
   */
  log(message: string): void {
    if (this._verbose) {
      console.log(ansis.dim(message));
    }
  }

  /**
   * Always log important messages regardless of verbose mode
   */
  info(message: string): void {
    console.log(message);
  }

  /**
   * Log success messages in green
   */
  success(message: string): void {
    console.log(ansis.green(message));
  }

  /**
   * Always log errors regardless of verbose mode
   */
  error(message: string, error?: unknown): void {
    if (error) {
      console.error(ansis.red(message), error);
    } else {
      console.error(ansis.red(message));
    }
  }

  /**
   * Always log warnings regardless of verbose mode
   */
  warn(message: string): void {
    console.warn(ansis.yellow(message));
  }

  /**
   * Log repository processing messages in cyan
   */
  repository(message: string): void {
    console.log(ansis.cyan(message));
  }

  /**
   * Log progress messages in blue
   */
  progress(message: string): void {
    console.log(ansis.blue(message));
  }
}
