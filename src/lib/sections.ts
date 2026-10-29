import type { SectionId, SiteContent } from '../content';
import type { BuildFacts } from './career';

/** Props every page section component receives from src/pages/index.astro. */
export interface SectionProps {
  id: SectionId;
  t: SiteContent;
  facts: BuildFacts;
}
