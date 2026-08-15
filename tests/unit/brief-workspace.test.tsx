import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BriefWorkspace } from "@/components/planner/brief-workspace";
import { completeProjectBrief } from "@/tests/fixtures/project-brief";

vi.hoisted(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

describe("BriefWorkspace", () => {
  it("renders the six decision domains and navigation in exact document order", () => {
    const { container } = render(
      <BriefWorkspace brief={completeProjectBrief} onBriefChange={vi.fn()} />
    );
    const expectedDomains = [
      ["purpose", "Purpose", ["App name", "App Summary"]],
      ["people", "People", ["Target Users"]],
      ["product", "Product", ["Core Features", "Pages & Routes"]],
      ["architecture", "Architecture", ["Tech Stack", "Data Model", "Data Model Graph"]],
      ["delivery", "Delivery", ["Roadmap", "Risks & Edge Cases", "Planner Flow"]],
      ["handoff", "Handoff", ["Markdown Brief", "Starter Prompt"]],
    ] as const;

    const domains = Array.from(container.querySelectorAll("section[id]"));
    expect(domains.map((domain) => domain.id)).toEqual(
      expectedDomains.map(([id]) => id),
    );

    expectedDomains.forEach(([id, title, sectionHeadings]) => {
      const domain = container.querySelector(`#${id}`);
      expect(domain).not.toBeNull();
      expect(domain?.querySelectorAll("h2")).toHaveLength(1);
      expect(domain?.querySelector("h2")).toHaveTextContent(title);
      expect(Array.from(domain?.querySelectorAll("h3") ?? []).map((heading) => heading.textContent)).toEqual(
        sectionHeadings,
      );
    });

    const navLinks = screen.getByRole("navigation", { name: "Decision trace" }).querySelectorAll("a");
    expect(Array.from(navLinks).map((link) => link.getAttribute("href"))).toEqual(
      expectedDomains.map(([id]) => `#${id}`),
    );
  });

  it("maps actual brief data and handoff freshness to visible domain states", () => {
    const emptyBrief = {
      ...completeProjectBrief,
      appName: "",
      appSummary: "",
      targetUsers: [],
      coreFeatures: [],
      recommendedTechStack: { frontend: [], backend: [], ai: [] },
      pagesRoutes: [],
      dataModel: { entities: [], relationships: [] },
      buildPhases: {
        initialPhase: { name: "", goals: [], deliverables: [] },
        milestones: [],
      },
      risksEdgeCases: [],
      starterPrompt: "",
      markdownBrief: "",
    };
    const { container, rerender } = render(
      <BriefWorkspace brief={emptyBrief} onBriefChange={vi.fn()} />
    );

    Array.from(container.querySelectorAll("section[id]")).forEach((section) => {
      expect(section.querySelector("header")).toHaveTextContent("Needs input");
    });
    expect(
      screen.getByRole("link", { name: "06 Handoff: Needs input" })
    ).toBeInTheDocument();

    rerender(
      <BriefWorkspace
        brief={completeProjectBrief}
        handoffFresh={false}
        onBriefChange={vi.fn()}
        onUpdateExports={vi.fn()}
      />
    );
    const handoff = container.querySelector("#handoff");
    expect(handoff).toHaveTextContent("Refresh needed");
    expect(handoff).toHaveTextContent(
      "These artifacts do not include the latest brief changes."
    );
    expect(
      screen.getByRole("link", { name: "06 Handoff: Refresh needed" })
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("link", { name: "06 Handoff: Refresh needed" })
        .querySelector("span.ml-auto"),
    ).toHaveClass("text-sm");
    expect(
      screen.getByText(
        "Refresh needed. These artifacts do not include the latest brief changes.",
      ),
    ).toHaveClass("text-base");

    rerender(
      <BriefWorkspace
        brief={completeProjectBrief}
        handoffFresh
        onBriefChange={vi.fn()}
        onUpdateExports={vi.fn()}
      />
    );
    expect(container.querySelector("#handoff")).toHaveTextContent(
      "Current. The brief and starter prompt are ready to use."
    );
  });

  it("wires app-name commit, generation, use, and dismiss actions", () => {
    const onCommitName = vi.fn();
    const onGenerateName = vi.fn();
    const onUseGeneratedName = vi.fn();
    const onDismissGeneratedName = vi.fn();
    render(
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={vi.fn()}
        onCommitName={onCommitName}
        onGenerateName={onGenerateName}
        generatedNameSuggestion="Research Atlas"
        onUseGeneratedName={onUseGeneratedName}
        onDismissGeneratedName={onDismissGeneratedName}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "App name" }), {
      target: { value: "Field Atlas" },
    });
    fireEvent.blur(screen.getByRole("textbox", { name: "App name" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate name" }));
    fireEvent.click(screen.getByRole("button", { name: "Use name" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onCommitName).toHaveBeenCalledWith("Field Atlas");
    expect(onGenerateName).toHaveBeenCalledOnce();
    expect(onUseGeneratedName).toHaveBeenCalledWith("Research Atlas");
    expect(onDismissGeneratedName).toHaveBeenCalledOnce();
  });

  it("wires assistant ask, apply, and dismiss actions by section", () => {
    const onAskAssistant = vi.fn();
    const onApplyAssistantSuggestion = vi.fn();
    const onDismissAssistant = vi.fn();
    render(
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={vi.fn()}
        assistantStates={{
          appSummary: {
            isLoading: false,
            answer: "Use a clearer summary.",
            canApply: true,
          },
        }}
        onAskAssistant={onAskAssistant}
        onApplyAssistantSuggestion={onApplyAssistantSuggestion}
        onDismissAssistant={onDismissAssistant}
      />
    );

    const trigger = screen.getAllByRole("button", { name: "Ask AI" })[0];
    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask about this section" }), {
      target: { value: "Make this more specific" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Ask AI" })[1]);
    expect(onAskAssistant).toHaveBeenCalledWith("appSummary", "Make this more specific");

    fireEvent.click(screen.getByRole("button", { name: "Use suggestion" }));
    expect(onApplyAssistantSuggestion).toHaveBeenCalledWith("appSummary");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismissAssistant).toHaveBeenCalledWith("appSummary");
  });

  it("wires starter-prompt feedback updates", () => {
    const onUpdateStarterPrompt = vi.fn();
    render(
      <BriefWorkspace
        brief={completeProjectBrief}
        handoffFresh
        onBriefChange={vi.fn()}
        onUpdateStarterPrompt={onUpdateStarterPrompt}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Starter prompt update feedback" }),
      { target: { value: "  Include deployment constraints.  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onUpdateStarterPrompt).toHaveBeenCalledWith("Include deployment constraints.");
  });

  it("renders the major sections of a complete generated brief", () => {
    render(
      <BriefWorkspace brief={completeProjectBrief} onBriefChange={vi.fn()} />
    );

    for (const heading of [
      "App Summary",
      "Markdown Brief",
      "Starter Prompt",
      "Target Users",
      "Core Features",
      "Tech Stack",
      "Pages & Routes",
      "Data Model",
      "Risks & Edge Cases",
      "Data Model Graph",
      "Planner Flow",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }

    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fieldnote")).toBeInTheDocument();
    expect(screen.getByText("Capture tagged observations")).toBeInTheDocument();
    expect(screen.getByText("/projects")).toBeInTheDocument();
    expect(screen.getAllByText("Observation").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("Research foundation")).toBeInTheDocument();
  });

  it("reports app summary edits through onBriefChange", () => {
    const onBriefChange = vi.fn();

    render(
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={onBriefChange}
      />
    );

    const summary = screen.getByDisplayValue(completeProjectBrief.appSummary);
    fireEvent.change(summary, { target: { value: "A concise updated summary." } });

    expect(onBriefChange).toHaveBeenLastCalledWith({
      ...completeProjectBrief,
      appSummary: "A concise updated summary.",
    });
  });

  it("exposes named remove controls and reports an explicit removal", () => {
    const onBriefChange = vi.fn();

    render(
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={onBriefChange}
      />
    );

    expect(
      screen.getByRole("button", { name: "Remove page /projects" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove entity Project" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Research teams" })
    );

    expect(onBriefChange).toHaveBeenLastCalledWith({
      ...completeProjectBrief,
      targetUsers: ["Product managers"],
    });
  });

  it("shows export and graph controls when generated data is complete", () => {
    const onUpdateExports = vi.fn();
    render(
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={vi.fn()}
        onUpdateExports={onUpdateExports}
      />
    );

    expect(screen.getAllByRole("button", { name: "Copy" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Regenerate Exports" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Data model outline/)).toBeInTheDocument();
    expect(screen.getByText("Edit and export system flow outline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate Exports" }));
    expect(onUpdateExports).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Expand Data Model Graph" }));
    expect(screen.getByRole("button", { name: "Collapse Data Model Graph" })).toBeInTheDocument();
  });

  it("uses a typographic ellipsis while exports regenerate", () => {
    render(
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={vi.fn()}
        onUpdateExports={vi.fn()}
        isUpdatingExports
      />
    );

    expect(
      screen.getByRole("button", { name: "Regenerating Exports…" }),
    ).toBeDisabled();
  });

  it("preserves explicit add callbacks inside the domains", () => {
    const onBriefChange = vi.fn();
    render(<BriefWorkspace brief={completeProjectBrief} onBriefChange={onBriefChange} />);

    fireEvent.change(screen.getAllByRole("textbox", { name: "Add item" })[0], {
      target: { value: "Design leads" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Add Item" })[0]);

    expect(onBriefChange).toHaveBeenLastCalledWith({
      ...completeProjectBrief,
      targetUsers: [...completeProjectBrief.targetUsers, "Design leads"],
    });
  });

  it("requires values before enabling explicit add actions", () => {
    render(
      <BriefWorkspace brief={completeProjectBrief} onBriefChange={vi.fn()} />
    );

    const itemInput = screen.getAllByRole("textbox", { name: "Add item" })[0];
    const addItem = screen.getAllByRole("button", { name: "Add Item" })[0];
    const addPage = screen.getByRole("button", { name: "Add Page" });
    const addEntity = screen.getByRole("button", { name: "Add Entity" });

    expect(itemInput).toHaveAttribute("name", "targetUser");
    expect(itemInput).toHaveAttribute("autocomplete", "off");
    expect(addItem).toBeDisabled();
    expect(addPage).toBeDisabled();
    expect(addEntity).toBeDisabled();

    fireEvent.change(itemInput, { target: { value: "Design leads" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Page route" }), {
      target: { value: "/reports" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Page purpose" }), {
      target: { value: "Review reports" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Entity name" }), {
      target: { value: "Report" },
    });

    expect(addItem).toBeEnabled();
    expect(addPage).toBeEnabled();
    expect(addEntity).toBeEnabled();
  });

  it("keeps long item and route removal labels accessible", () => {
    const longUser = "International research program administrators with distributed teams";
    const longRoute = "/organizations/:organizationId/research-programs/:researchProgramId/observations";
    render(
      <BriefWorkspace
        brief={{
          ...completeProjectBrief,
          targetUsers: [longUser],
          pagesRoutes: [
            {
              path: longRoute,
              purpose: "Review observations gathered across a distributed research program",
              keyComponents: [],
            },
          ],
        }}
        onBriefChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: `Remove ${longUser}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Remove page ${longRoute}` })).toBeInTheDocument();
    expect(screen.getByText(longRoute)).toHaveClass("[overflow-wrap:anywhere]");
  });
});
