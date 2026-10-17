import { Lesson } from "./types";

export interface PrerequisiteEvaluation {
  isUnlocked: boolean;
  missingPrerequisites: Lesson[];
  totalRequired: number;
  completedRequired: number;
  percentageReady: number;
}

/**
 * Resolves a prerequisite string (which could be a lesson ID or a lesson title) to a Lesson object.
 */
export function resolvePrerequisiteLesson(
  prereqIdentifier: string,
  allLessons: Lesson[]
): Lesson | undefined {
  const clean = prereqIdentifier.trim().toLowerCase();
  return allLessons.find(
    (l) => l.id.toLowerCase() === clean || l.title.toLowerCase() === clean
  );
}

/**
 * Evaluates whether a user has fulfilled all prerequisites for a given lesson.
 */
export function evaluateLessonPrerequisites(
  lesson: Lesson,
  completedLessonIds: string[],
  allLessons: Lesson[]
): PrerequisiteEvaluation {
  if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
    return {
      isUnlocked: true,
      missingPrerequisites: [],
      totalRequired: 0,
      completedRequired: 0,
      percentageReady: 100
    };
  }

  const missing: Lesson[] = [];
  let completedCount = 0;

  for (const prereqStr of lesson.prerequisites) {
    const resolvedLesson = resolvePrerequisiteLesson(prereqStr, allLessons);
    if (resolvedLesson) {
      if (completedLessonIds.includes(resolvedLesson.id)) {
        completedCount++;
      } else {
        missing.push(resolvedLesson);
      }
    } else {
      // If it's a general text prerequisite like "None - Beginner Entry Point"
      if (
        prereqStr.toLowerCase().includes("none") ||
        prereqStr.toLowerCase().includes("entry point") ||
        prereqStr.toLowerCase().includes("beginner")
      ) {
        completedCount++;
      }
    }
  }

  const total = lesson.prerequisites.length;
  const isUnlocked = missing.length === 0;
  const percentageReady = total > 0 ? Math.round((completedCount / total) * 100) : 100;

  return {
    isUnlocked,
    missingPrerequisites: missing,
    totalRequired: total,
    completedRequired: completedCount,
    percentageReady
  };
}

/**
 * Recommends the next optimal lesson(s) for the learner based on:
 * 1. Lesson is not yet completed.
 * 2. All prerequisites for the lesson are fully satisfied.
 * 3. Foundations first: prioritizes lower level numbers before higher levels.
 */
export function getRecommendedNextLessons(
  completedLessonIds: string[],
  allLessons: Lesson[],
  limit: number = 3
): Lesson[] {
  const uncompleted = allLessons.filter((l) => !completedLessonIds.includes(l.id));

  const eligible = uncompleted.filter((lesson) => {
    const evalResult = evaluateLessonPrerequisites(lesson, completedLessonIds, allLessons);
    return evalResult.isUnlocked;
  });

  // Level priority mapping for foundational order
  const levelPriority: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4
  };

  eligible.sort((a, b) => {
    const prioA = levelPriority[a.level] || 99;
    const prioB = levelPriority[b.level] || 99;
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    // Secondary sort by path ordering
    return a.pathId.localeCompare(b.pathId);
  });

  return eligible.slice(0, limit);
}
