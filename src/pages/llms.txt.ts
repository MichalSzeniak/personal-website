import type { APIRoute } from 'astro';
import { content, defaultLocale, site } from '../content';
import { buildFacts, resolveJobs } from '../lib/career';
import { visibleProjects } from '../lib/projects';

/** Plain-text summary for language models (https://llmstxt.org), built from the same copy as the page. */
export const GET: APIRoute = () => {
  const t = content[defaultLocale];
  const facts = buildFacts(site.jobs);
  const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

  const jobs = resolveJobs(site.jobs, t.experience.jobs, facts.buildDate).map(
    (job) => `### ${job.company}, ${job.role}, ${t.dates.period(job.start, job.end)}\n${list(job.points)}`,
  );
  // Drafts never reach llms.txt, not even from the dev server.
  const projects = visibleProjects(site.projects, false).map(
    (project) =>
      `- [${project.name}](${project.href}): ${t.projects.items[project.id].description} (${project.stack.join(', ')})`,
  );

  const body = [
    `# ${site.author}`,
    `> ${t.meta.description(facts.years)}`,
    `## ${t.sections['o-mnie']}`,
    t.about.text(facts),
    `## ${t.sections.doswiadczenie}`,
    ...jobs,
    `## ${t.sections.technologie}`,
    list(t.technologies.groups.map((group) => `${group.name}: ${group.items.join(', ')}`)),
    ...(projects.length > 0 ? [`## ${t.sections.projekty}`, projects.join('\n')] : []),
    `## ${t.llms.linksHeading}`,
    list([`[${t.hero.name}](${site.url})`, ...t.hero.links.map((link) => `[${link.label}](${link.href})`)]),
  ].join('\n\n');
  return new Response(`${body}\n`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
