import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TAXONOMY_DOMAINS,
  searchTaxonomy,
  getTaxonomyStats,
  findTaxonomyTopic,
  getDomainProgress,
} from "../academy/taxonomy/data";
import { TaxonomyKnowledgeTreeView } from "../academy/components/TaxonomyKnowledgeTreeView";
import { CyberAcademy } from "../academy/CyberAcademy";
import { Finding } from "../types";

describe("Cyber Academy Taxonomy - Data Integrity & Query Helpers", () => {
  it("contains all 7 master domains and valid hierarchical nodes down to procedures", () => {
    expect(TAXONOMY_DOMAINS.length).toBeGreaterThanOrEqual(7);

    const domainIds = TAXONOMY_DOMAINS.map((d) => d.id);
    expect(domainIds).toContain("domain-foundations");
    expect(domainIds).toContain("domain-web-api-security");
    expect(domainIds).toContain("domain-ethical-hacking");
    expect(domainIds).toContain("domain-systems-security");
    expect(domainIds).toContain("domain-mobile-security");
    expect(domainIds).toContain("domain-enterprise-cloud");
    expect(domainIds).toContain("domain-operations-emerging");

    // Every domain must have at least one discipline, phase, sub-phase, and topic
    TAXONOMY_DOMAINS.forEach((domain) => {
      expect(domain.title).toBeTruthy();
      expect(domain.disciplines.length).toBeGreaterThan(0);

      domain.disciplines.forEach((discipline) => {
        expect(discipline.title).toBeTruthy();
        expect(discipline.phases.length).toBeGreaterThan(0);

        discipline.phases.forEach((phase) => {
          expect(phase.title).toBeTruthy();
          expect(phase.subPhases.length).toBeGreaterThan(0);

          phase.subPhases.forEach((subPhase) => {
            expect(subPhase.title).toBeTruthy();
            expect(subPhase.topics.length).toBeGreaterThan(0);

            subPhase.topics.forEach((topic) => {
              expect(topic.id).toBeTruthy();
              expect(topic.title).toBeTruthy();
              expect(topic.definition).toBeTruthy();
              expect(topic.purpose).toBeTruthy();
              expect(topic.technicalFoundations).toBeTruthy();
              if (topic.architectureDataFlow) {
                expect(typeof topic.architectureDataFlow).toBe("string");
              }
              if (topic.threatModel) {
                expect(typeof topic.threatModel).toBe("string");
              }
              expect(topic.commonWeaknesses.length).toBeGreaterThan(0);
              expect(topic.defensiveControls.length).toBeGreaterThan(0);
              expect(topic.assessmentMethodology).toBeTruthy();
              if (topic.procedure) {
                expect(topic.procedure.steps.length).toBeGreaterThan(0);
                expect(topic.procedure.remediation).toBeDefined();
                expect(topic.procedure.retestProcedure).toBeDefined();
              }
              if (topic.assessment) {
                expect(topic.assessment.questions.length).toBeGreaterThan(0);
              }
              expect(topic.references.length).toBeGreaterThan(0);
            });
          });
        });
      });
    });
  });

  it("calculates taxonomy statistics correctly", () => {
    const stats = getTaxonomyStats();
    expect(stats.totalDomains).toBeGreaterThanOrEqual(7);
    expect(stats.totalDisciplines).toBeGreaterThanOrEqual(7);
    expect(stats.totalPhases).toBeGreaterThanOrEqual(7);
    expect(stats.totalTopics).toBeGreaterThanOrEqual(8);
    expect(stats.totalProcedures).toBeGreaterThanOrEqual(8);
    expect(stats.totalHours).toBeGreaterThan(0);
  });

  it("finds specific topics by ID", () => {
    const sqli = findTaxonomyTopic("topic-sqli-deep-dive");
    expect(sqli).toBeDefined();
    expect(sqli?.topic.title).toContain("SQL Injection");
    expect(sqli?.topic.relatedCwe).toContain("CWE-89");

    const nonExistent = findTaxonomyTopic("topic-does-not-exist");
    expect(nonExistent).toBeNull();
  });

  it("searches topics across titles, definitions, and references", () => {
    const resultsPromptInjection = searchTaxonomy("Prompt Injection");
    expect(resultsPromptInjection.length).toBeGreaterThan(0);
    expect(resultsPromptInjection.some((item) => item.topic.id === "topic-indirect-prompt-injection")).toBe(true);

    const resultsSqli = searchTaxonomy("injection");
    expect(resultsSqli.some((item) => item.topic.id === "topic-sqli-deep-dive")).toBe(true);

    const resultsBopla = searchTaxonomy("BOPLA");
    expect(resultsBopla.some((item) => item.topic.id === "topic-mass-assignment-deep-dive")).toBe(true);

    const emptyResults = searchTaxonomy("xyz999nonexistentword");
    expect(emptyResults.length).toBe(0);
  });

  it("calculates domain completion progress cleanly", () => {
    const foundationsDomain = TAXONOMY_DOMAINS[0];
    const initialProgress = getDomainProgress(foundationsDomain.id, []);
    expect(initialProgress.percent).toBe(0);
    expect(initialProgress.completed).toBe(0);
    expect(initialProgress.total).toBeGreaterThan(0);

    const firstTopicId = foundationsDomain.disciplines[0].phases[0].subPhases[0].topics[0].id;
    const halfProgress = getDomainProgress(foundationsDomain.id, [firstTopicId]);
    expect(halfProgress.completed).toBe(1);
    expect(halfProgress.percent).toBeGreaterThan(0);
  });
});

describe("TaxonomyKnowledgeTreeView Component", () => {
  it("renders the split-pane layout with search, filters, and default selected topic", () => {
    render(<TaxonomyKnowledgeTreeView />);

    // Header title and search
    expect(screen.getByText(/Cybersecurity Knowledge & Training Taxonomy/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search taxonomy \(e\.g\. SQLi, UEFI, SUID, IDOR\)\.\.\./i)).toBeInTheDocument();

    // Quick filter view modes
    expect(screen.getByText("All Topics")).toBeInTheDocument();
    expect(screen.getByText(/🌱 Start Here/i)).toBeInTheDocument();
    expect(screen.getByText(/★ Bookmarked/i)).toBeInTheDocument();

    // Default active topic view tabs
    expect(screen.getByText(/1\. Theory & Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Authorized Procedure & Lab/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Assessment Quiz/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. References & Notes/i)).toBeInTheDocument();
  });

  it("allows searching for specific topics and clicking to display topic details", () => {
    render(<TaxonomyKnowledgeTreeView />);

    const searchInput = screen.getByPlaceholderText(/Search taxonomy \(e\.g\. SQLi, UEFI, SUID, IDOR\)\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "IDOR" } });

    // Topic should appear in search results
    const topicButtons = screen.getAllByText(/IDOR: Object Ownership Verification/i);
    expect(topicButtons.length).toBeGreaterThan(0);
    fireEvent.click(topicButtons[0]);

    // Verify right-pane details updated
    expect(screen.getAllByText(/IDOR: Object Ownership Verification/i).length).toBeGreaterThan(0);
  });

  it("switches to the Authorized Procedure tab and displays non-destructive steps and copyable commands", () => {
    render(<TaxonomyKnowledgeTreeView />);

    // Switch to Authorized Procedure tab
    const procedureTabBtn = screen.getByText(/2\. Authorized Procedure & Lab/i);
    fireEvent.click(procedureTabBtn);

    // Verify procedure header and safety badges
    expect(screen.getByText(/Step-by-Step Authorized Procedure/i)).toBeInTheDocument();
    expect(screen.getByText(/Authorized Rules of Engagement:/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified Remediation & Code Fix/i)).toBeInTheDocument();
    expect(screen.getByText(/Regression & Retest Validation/i)).toBeInTheDocument();

    // Check step items and badges
    expect(screen.getAllByText(/Read-Only \/ Safe/i).length).toBeGreaterThan(0);
  });

  it("switches to the Assessment Quiz tab, answers questions, and displays scores", () => {
    render(<TaxonomyKnowledgeTreeView />);

    // Switch to Assessment Quiz
    const quizTabBtn = screen.getByText(/3\. Assessment Quiz/i);
    fireEvent.click(quizTabBtn);

    // Check quiz question title
    expect(screen.getByText(/Hardware Rings & Memory Architecture Quiz/i)).toBeInTheDocument();

    // Click answer options (buttons)
    const ring3Btn = screen.getByRole("button", { name: "Ring 3" });
    fireEvent.click(ring3Btn);

    const nxBtn = screen.getByRole("button", {
      name: /It prevents CPU instructions from executing inside data-marked memory pages/i,
    });
    fireEvent.click(nxBtn);

    // Click submit answer
    const submitBtn = screen.getByText(/Submit Quiz & Check Answers/i);
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // Score or Correct rationale should now be visible
    expect(screen.getByText(/Score:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/✓ Correct!/i).length).toBeGreaterThan(0);
  });

  it("switches to References & Notes tab, shows links and personal notepad", () => {
    render(<TaxonomyKnowledgeTreeView />);

    const refsTabBtn = screen.getByText(/4\. References & Notes/i);
    fireEvent.click(refsTabBtn);

    expect(screen.getByText(/Authoritative Standards & References/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Study Notes/i)).toBeInTheDocument();

    // Verify notepad textarea
    const textarea = screen.getByPlaceholderText(/Record notes, payload tests, or key insights for this topic/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Reviewing kernel rings and UEFI secure boot keys." } });
    expect((textarea as HTMLTextAreaElement).value).toBe("Reviewing kernel rings and UEFI secure boot keys.");
  });

  it("invokes the AI Security Mentor callback when requested", () => {
    const mockAiMentor = vi.fn();
    render(<TaxonomyKnowledgeTreeView onOpenAiMentor={mockAiMentor} />);

    const aiMentorBtn = screen.getByText(/Ask AI Mentor/i);
    fireEvent.click(aiMentorBtn);

    expect(mockAiMentor).toHaveBeenCalledTimes(1);
    expect(mockAiMentor.mock.calls[0][0]).toContain("I am studying the topic");
  });

  it("toggles bookmark on current topic and filters correctly", () => {
    render(<TaxonomyKnowledgeTreeView />);

    const bookmarkBtn = screen.getByTitle(/Bookmark this topic/i);
    fireEvent.click(bookmarkBtn);

    // Switch to Bookmarked view
    const bookmarkedTabBtn = screen.getByText(/★ Bookmarked/i);
    fireEvent.click(bookmarkedTabBtn);

    // The bookmarked topic should be visible in the list
    expect(screen.getAllByText(/Processor Privilege Rings & Virtual Memory Paging/i).length).toBeGreaterThan(0);
  });
});

describe("CyberAcademy integration with Taxonomy Tab", () => {
  const dummyFindings: Finding[] = [];

  it("renders the Knowledge Taxonomy subtab in CyberAcademy and switches to it", () => {
    render(
      <CyberAcademy
        findings={dummyFindings}
      />
    );

    // Verify the Knowledge Taxonomy tab button exists
    const taxonomyNavBtn = screen.getByText("Knowledge Taxonomy");
    expect(taxonomyNavBtn).toBeInTheDocument();

    // Click to switch tab
    fireEvent.click(taxonomyNavBtn);

    // Verify TaxonomyKnowledgeTreeView is rendered
    expect(screen.getByText(/Cybersecurity Knowledge & Training Taxonomy/i)).toBeInTheDocument();
  });
});
