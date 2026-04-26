// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeveloperSettingsPanel } from "@/components/developer-settings-panel";

beforeEach(() => {
  localStorage.clear();
});

describe("DeveloperSettingsPanel", () => {
  it("keeps developer controls hidden until toggled on", async () => {
    const user = userEvent.setup();

    render(
      <DeveloperSettingsPanel>
        <p>Experimental sync controls</p>
      </DeveloperSettingsPanel>,
    );

    expect(screen.queryByText("Experimental sync controls")).toBeNull();

    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByText("Experimental sync controls")).toBeTruthy();
    expect(localStorage.getItem("developer-settings-visible")).toBe("true");
  });

  it("restores the stored developer settings state", () => {
    localStorage.setItem("developer-settings-visible", "true");

    render(
      <DeveloperSettingsPanel>
        <p>Stored controls</p>
      </DeveloperSettingsPanel>,
    );

    expect(screen.getByText("Stored controls")).toBeTruthy();
  });
});
