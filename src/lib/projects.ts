import type { Project } from '../content';

/** Draft projects (templates waiting for real data) are shown only by the dev server. */
export const visibleProjects = <P extends Project>(projects: readonly P[], includeDrafts = import.meta.env.DEV): P[] =>
  projects.filter((project) => includeDrafts || !project.draft);
