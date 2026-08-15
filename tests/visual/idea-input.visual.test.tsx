import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { IdeaInput } from "@/components/planner/idea-input";
import "@/app/globals.css";

test("matches the populated IdeaInput baseline", async () => {
  const screen = await render(
    <>
      <style>{`
        *, *::before, *::after {
          animation: none !important;
          caret-color: transparent !important;
          transition: none !important;
        }
      `}</style>
      <div
        data-testid="idea-input-visual"
        style={{
          background: "#111d35",
          colorScheme: "dark",
          height: 180,
          padding: 24,
          width: 480,
        }}
      >
        <IdeaInput
          value="A neighborhood tool library with simple pickup scheduling."
          onChange={() => undefined}
        />
      </div>
    </>,
  );

  await document.fonts.ready;
  await expect
    .element(screen.getByTestId("idea-input-visual"))
    .toMatchScreenshot("idea-input-populated");
});
