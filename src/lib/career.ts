/** Parses a `YYYY-MM` string into the first day of that month (UTC). */
export function parseYearMonth(value: string): Date {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) throw new Error(`Expected YYYY-MM, got "${value}"`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
}

/** First day of the month after `date`. */
const nextMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

/** Completed years between two dates, counted in whole UTC months. */
export function fullYearsBetween(start: Date, end: Date): number {
  const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  return Math.floor(months / 12);
}

export interface Job {
  id: string;
  company: string;
  /** YYYY-MM */
  start: string;
  /** YYYY-MM, the last month worked (inclusive); omitted for the current job. */
  end?: string;
}

export interface Period {
  start: Date;
  /** The last month as written; undefined while ongoing. */
  end?: Date;
  /** Exclusive end used for lengths and drawing: the month after `end`, or the build date. */
  until: Date;
}

/**
 * Parses and checks the job list. Fails the build instead of publishing nonsense: exactly one
 * current job, newest first, every period ends after it starts and before the next one begins.
 */
function parseJobs<J extends Job>(jobs: readonly J[], buildDate: Date): (J & Period)[] {
  const parsed = jobs.map((job) => {
    const start = parseYearMonth(job.start);
    const end = job.end ? parseYearMonth(job.end) : undefined;
    return { ...job, start, end, until: end ? nextMonth(end) : buildDate };
  });
  const valid =
    parsed.filter((job) => !job.end).length === 1 &&
    parsed.every(
      (job, i) =>
        job.start < job.until &&
        job.until <= buildDate &&
        (i === 0 || job.until <= parsed[i - 1]!.start),
    );
  if (!valid) throw new Error('Invalid job history: check dates, order (newest first) and the single current job');
  return parsed;
}

/** Jobs with their parsed periods and the copy for one language. */
export function resolveJobs<J extends Job, C extends object>(
  jobs: readonly J[],
  copy: Record<J['id'], C>,
  buildDate: Date,
): (J & Period & C)[] {
  return parseJobs(jobs, buildDate).map((job) => ({ ...job, ...copy[job.id as J['id']] }));
}

export interface BuildFacts {
  buildDate: Date;
  careerStart: Date;
  /** Completed years since the career start. */
  years: number;
  /** Completed years in the current role. */
  roleYears: number;
  /** Completed years in the previous job, if there is one. */
  previousYears?: number;
}

/** Numbers derived from the job dates at build time, so the copy never states a stale figure. */
export function buildFacts(jobs: readonly Job[], buildDate = new Date()): BuildFacts {
  const [current, previous] = parseJobs(jobs, buildDate);
  const careerStart = new Date(Math.min(...jobs.map((job) => parseYearMonth(job.start).getTime())));
  const years = fullYearsBetween(careerStart, buildDate);
  const roleYears = fullYearsBetween(current!.start, buildDate);
  // A role younger than a year is a normal CV update, so roleYears may be 0; the copy handles it.
  const previousYears = previous && fullYearsBetween(previous.start, previous.until);
  return { buildDate, careerStart, years, roleYears, previousYears };
}

export interface YearAxis {
  /** Year ticks with their position on the axis in percent. */
  ticks: { year: number; at: number }[];
  /** Start, end and width of the interval in percent. */
  from: number;
  to: number;
  width: number;
}

/** Percentages rounded to 2 decimals, so SVG attributes stay short and free of float noise. */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * A number line from 1 January of the first year to 1 January of the year after `last`, so the
 * current year always has room to the right of "today". `span` is the interval marked on it
 * (by default the whole career); several spans on one domain share the same scale.
 */
export function yearAxis(first: Date, last: Date, span: { start: Date; end: Date } = { start: first, end: last }): YearAxis {
  const firstYear = first.getUTCFullYear();
  const lastYear = last.getUTCFullYear();
  const min = Date.UTC(firstYear, 0, 1);
  const max = Date.UTC(lastYear + 1, 0, 1);
  const at = (time: number) => ((time - min) / (max - min)) * 100;

  const ticks = [];
  for (let year = firstYear; year <= lastYear; year++) {
    ticks.push({ year, at: round(at(Date.UTC(year, 0, 1))) });
  }
  const from = at(span.start.getTime());
  const to = at(span.end.getTime());
  return { ticks, from: round(from), to: round(to), width: round(to - from) };
}
