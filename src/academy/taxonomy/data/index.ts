import { TaxonomyDomain, TaxonomyTopic, TaxonomySkillLevel } from "../types";
import { FOUNDATIONS_DOMAIN } from "./foundationsData";
import { WEB_AND_API_SECURITY_DOMAIN } from "./webAndApiSecurityData";
import { SYSTEMS_SECURITY_DOMAIN } from "./systemsSecurityData";
import { ETHICAL_HACKING_DOMAIN } from "./ethicalHackingData";
import { MOBILE_SECURITY_DOMAIN } from "./mobileSecurityData";
import { ENTERPRISE_AND_CLOUD_DOMAIN } from "./enterpriseAndCloudData";
import { OPERATIONS_AND_EMERGING_DOMAIN } from "./operationsAndEmergingData";

export const TAXONOMY_DOMAINS: TaxonomyDomain[] = [
  FOUNDATIONS_DOMAIN,
  WEB_AND_API_SECURITY_DOMAIN,
  ETHICAL_HACKING_DOMAIN,
  SYSTEMS_SECURITY_DOMAIN,
  MOBILE_SECURITY_DOMAIN,
  ENTERPRISE_AND_CLOUD_DOMAIN,
  OPERATIONS_AND_EMERGING_DOMAIN,
];

export function getAllTaxonomyDomains(): TaxonomyDomain[] {
  return TAXONOMY_DOMAINS;
}

export function getAllTaxonomyTopics(): { topic: TaxonomyTopic; domain: TaxonomyDomain; disciplineTitle: string; phaseTitle: string; subPhaseTitle: string }[] {
  const result: { topic: TaxonomyTopic; domain: TaxonomyDomain; disciplineTitle: string; phaseTitle: string; subPhaseTitle: string }[] = [];

  for (const domain of TAXONOMY_DOMAINS) {
    for (const disc of domain.disciplines) {
      for (const phase of disc.phases) {
        for (const subPhase of phase.subPhases) {
          for (const topic of subPhase.topics) {
            result.push({
              topic,
              domain,
              disciplineTitle: disc.title,
              phaseTitle: phase.title,
              subPhaseTitle: subPhase.title,
            });
          }
        }
      }
    }
  }

  return result;
}

export function findTaxonomyTopic(topicId: string): { topic: TaxonomyTopic; domain: TaxonomyDomain; disciplineTitle: string; phaseTitle: string; subPhaseTitle: string } | null {
  const all = getAllTaxonomyTopics();
  return all.find((item) => item.topic.id === topicId) || null;
}

export function searchTaxonomy(
  query: string,
  levelFilter: TaxonomySkillLevel | "ALL" = "ALL",
  technologyFilter: string = "ALL"
): { topic: TaxonomyTopic; domain: TaxonomyDomain; disciplineTitle: string; phaseTitle: string; subPhaseTitle: string }[] {
  const all = getAllTaxonomyTopics();
  const q = query.toLowerCase().trim();

  return all.filter((item) => {
    // Level filter
    if (levelFilter !== "ALL" && item.topic.skillLevel !== levelFilter) {
      return false;
    }

    // Technology filter
    if (technologyFilter !== "ALL" && !item.topic.technologies.includes(technologyFilter)) {
      return false;
    }

    // Text query
    if (q) {
      const matchTitle = item.topic.title.toLowerCase().includes(q);
      const matchDesc = item.topic.description.toLowerCase().includes(q);
      const matchDef = item.topic.definition.toLowerCase().includes(q);
      const matchTech = item.topic.technologies.some((t) => t.toLowerCase().includes(q));
      const matchDomain = item.domain.title.toLowerCase().includes(q);
      const matchDisc = item.disciplineTitle.toLowerCase().includes(q);
      const matchCwe = item.topic.relatedCwe?.some((c) => c.toLowerCase().includes(q));

      if (!matchTitle && !matchDesc && !matchDef && !matchTech && !matchDomain && !matchDisc && !matchCwe) {
        return false;
      }
    }

    return true;
  });
}

export function getTaxonomyStats() {
  const all = getAllTaxonomyTopics();
  let totalProcedures = 0;
  let totalMinutes = 0;

  for (const item of all) {
    if (item.topic.procedure) {
      totalProcedures++;
    }
    totalMinutes += item.topic.estimatedMinutes || 30;
  }

  return {
    totalDomains: TAXONOMY_DOMAINS.length,
    totalDisciplines: TAXONOMY_DOMAINS.reduce((acc, d) => acc + d.disciplines.length, 0),
    totalPhases: TAXONOMY_DOMAINS.reduce((acc, d) => acc + d.disciplines.reduce((pAcc, disc) => pAcc + disc.phases.length, 0), 0),
    totalTopics: all.length,
    totalProcedures,
    totalHours: Math.round(totalMinutes / 60),
  };
}

export function getDomainProgress(domainId: string, completedTopicIds: string[]) {
  const all = getAllTaxonomyTopics().filter((item) => item.domain.id === domainId);
  if (all.length === 0) return { total: 0, completed: 0, percent: 0 };

  const completed = all.filter((item) => completedTopicIds.includes(item.topic.id)).length;
  return {
    total: all.length,
    completed,
    percent: Math.round((completed / all.length) * 100),
  };
}

export function getBeginnerRecommendedTopics(): TaxonomyTopic[] {
  const all = getAllTaxonomyTopics();
  return all
    .filter((item) => item.topic.skillLevel === "beginner")
    .map((item) => item.topic);
}
