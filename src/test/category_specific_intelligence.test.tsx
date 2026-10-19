import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ALL_SECURITY_CATEGORIES, getCategoryDefinition } from "../categories/registry";
import { getCategoryAiPersona } from "../categories/aiPersonas";
import { dispatchCategoryValidation, sanitizeEvidence } from "../categories/validationRules";
import { CategorySelector } from "../categories/CategorySelector";
import { CategoryWorkflowView } from "../categories/CategoryWorkflowView";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";

describe("Category-Specific Security Intelligence Suite", () => {
  it("registers all 9 supported security categories with specialized metadata", () => {
    const requiredCategories = ["web", "api", "os", "software", "android", "desktop", "network", "cloud", "lab"];
    expect(ALL_SECURITY_CATEGORIES.length).toBe(9);

    requiredCategories.forEach((catId) => {
      const cat = getCategoryDefinition(catId as any);
      expect(cat).toBeDefined();
      expect(cat.id).toBe(catId);
      expect(cat.tools.length).toBeGreaterThan(0);
      expect(cat.methodologyPhases.length).toBeGreaterThan(0);
      expect(cat.methodologySteps.length).toBeGreaterThan(0);
      expect(cat.standards.length).toBeGreaterThan(0);
      expect(cat.validationChecks.length).toBeGreaterThan(0);
      expect(cat.aiPersona).toBeDefined();
    });
  });

  it("provides tailored AI Mentor personas for each category", () => {
    const webPersona = getCategoryAiPersona("web");
    expect(webPersona.roleTitle).toContain("Web Application");
    expect(webPersona.systemPrompt).toContain("OWASP Top 10");
    expect(webPersona.starterPromptChips.length).toBeGreaterThan(0);

    const apiPersona = getCategoryAiPersona("api");
    expect(apiPersona.roleTitle).toContain("API Security");
    expect(apiPersona.systemPrompt).toContain("BOLA");

    const osPersona = getCategoryAiPersona("os");
    expect(osPersona.roleTitle).toContain("Systems Hardening");
    expect(osPersona.systemPrompt).toContain("CIS");

    const androidPersona = getCategoryAiPersona("android");
    expect(androidPersona.roleTitle).toContain("Mobile Security");
    expect(androidPersona.systemPrompt).toContain("MASVS");

    const cloudPersona = getCategoryAiPersona("cloud");
    expect(cloudPersona.roleTitle).toContain("Cloud Security");
    expect(cloudPersona.systemPrompt).toContain("IAM");
  });

  describe("Category-Specific Vulnerability Validation Rules", () => {
    it("validates Web SQL Injection and confirms with database error strings", () => {
      const result = dispatchCategoryValidation("web", {
        findingTitle: "SQL Injection in User Search Parameter",
        affectedAsset: "https://shop.local/search",
        rawEvidence: "HTTP 500: syntax error in SQL statement near '1''",
      });
      expect(result.status).toBe("Confirmed");
      expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
      expect(result.recommendedRemediation).toContain("prepared statements");
    });

    it("validates API BOLA/IDOR when accessing foreign object data", () => {
      const result = dispatchCategoryValidation("api", {
        findingTitle: "BOLA in Invoice Retrieval",
        affectedAsset: "https://api.local/v1/invoices",
        rawEvidence: "HTTP/1.1 200 OK\n{\"account_id\": \"9842\", \"email\": \"victim@corp.com\", \"balance\": 450000}",
      });
      expect(result.status).toBe("Confirmed");
      expect(result.hypothesis).toContain("distinct non-owner");
    });

    it("validates Windows SeImpersonatePrivilege token finding", () => {
      const result = dispatchCategoryValidation("os", {
        findingTitle: "Enabled SeImpersonatePrivilege on Service Account",
        affectedAsset: "WIN-SRV-2022",
        rawEvidence: "Privilege Name: SeImpersonatePrivilege, State: Enabled",
      });
      expect(result.status).toBe("Confirmed");
      expect(result.confidenceScore).toBeGreaterThanOrEqual(95);
      expect(result.suggestedRetestCommand).toContain("whoami /priv");
    });

    it("validates Android Exported Component without Permission", () => {
      const result = dispatchCategoryValidation("android", {
        findingTitle: "Exported Activity Without Permission Guard",
        affectedAsset: "com.insecure.bankapp",
        rawEvidence: '<activity android:name=".TransferFundsActivity" android:exported="true" />',
      });
      expect(result.status).toBe("Confirmed");
      expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
    });

    it("validates Cloud S3 Public Bucket Access", () => {
      const result = dispatchCategoryValidation("cloud", {
        findingTitle: "S3 Bucket Public Access Enabled",
        affectedAsset: "s3://corp-backups",
        rawEvidence: '{"Effect": "Allow", "Principal": "*", "Action": "s3:GetObject"}',
      });
      expect(result.status).toBe("Confirmed");
      expect(result.confidenceScore).toBeGreaterThanOrEqual(95);
    });

    it("redacts sensitive authentication tokens and passwords in evidence", () => {
      const raw = "Authorization: Bearer secret_token_xyz123&password=my_secret_pass123";
      const sanitized = sanitizeEvidence(raw);
      expect(sanitized).not.toContain("secret_token_xyz123");
      expect(sanitized).not.toContain("my_secret_pass123");
      expect(sanitized).toContain("[REDACTED_AUTH_TOKEN]");
      expect(sanitized).toContain("[REDACTED_SECRET]");
    });
  });

  describe("UI Components & Interactions", () => {
    it("renders CategorySelector pillbar with all categories and handles selection", () => {
      const handleSelect = vi.fn();
      render(
        <CategorySelector
          activeCategory="web"
          onSelectCategory={handleSelect}
        />
      );

      expect(screen.getByTestId("category-selector-pillbar")).toBeInTheDocument();
      expect(screen.getByTestId("category-pill-web")).toBeInTheDocument();
      expect(screen.getByTestId("category-pill-api")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("category-pill-api"));
      expect(handleSelect).toHaveBeenCalledWith("api");
    });

    it("renders CategoryWorkflowView and runs live validation check in workbench", () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <CategoryWorkflowView category="api" />
          </ToastProvider>
        </ThemeProvider>
      );

      // Verify category header and description
      expect(screen.getByTestId("category-workflow-api")).toBeInTheDocument();
      expect(screen.getByText("API & Microservices Security")).toBeInTheDocument();

      // Switch to Verification Engine tab
      fireEvent.click(screen.getByTestId("tab-validator"));
      expect(screen.getByTestId("btn-run-category-validation")).toBeInTheDocument();

      // Run live category validation
      fireEvent.click(screen.getByTestId("btn-run-category-validation"));
      expect(screen.getByTestId("validation-result-panel")).toBeInTheDocument();
      expect(screen.getByTestId("result-status-badge")).toBeInTheDocument();
    });

    it("displays tools and ordered methodology steps in CategoryWorkflowView", () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <CategoryWorkflowView category="os" />
          </ToastProvider>
        </ThemeProvider>
      );

      // Verify methodology tab is active by default
      expect(screen.getByText(/Methodology & Phases/)).toBeInTheDocument();

      // Switch to Toolchain tab
      fireEvent.click(screen.getByTestId("tab-tools"));
      expect(screen.getByText("WinPEAS (Privilege Escalation Suite)")).toBeInTheDocument();
      expect(screen.getByText("LinPEAS")).toBeInTheDocument();

      // Switch to AI Persona tab
      fireEvent.click(screen.getByTestId("tab-ai"));
      expect(screen.getAllByText(/Systems Hardening/)[0]).toBeInTheDocument();
      expect(screen.getByTestId("prompt-chip-0")).toBeInTheDocument();
    });
  });
});
