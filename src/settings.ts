import { App, PluginSettingTab, Setting } from "obsidian";
import WeightBMITracker from "./main";

// Obsidian 1.13+ ships a declarative settings API whose entry point is
// `PluginSettingTab.getSettingDefinitions()`. Returning `[]` keeps the older
// imperative `display()` path (which fully defines the UI for users on every
// Obsidian version) and just lets the settings appear in Obsidian's
// settings search on 1.13.0+. The full type isn't in the public `obsidian.d.ts`
// yet, hence `unknown` cast.
export interface SettingDefinitionItem {
  id: string;
  name: string;
  description: string;
  type: "text" | "number" | "toggle" | "dropdown";
  options?: Record<string, string>;
}

export class TrackerSettingTab extends PluginSettingTab {
  plugin: WeightBMITracker;

  constructor(app: App, plugin: WeightBMITracker) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Declarative setting metadata for Obsidian 1.13+. The actual UI is
   * still rendered by `display()` so the tab behaves identically across
   * all Obsidian versions.
   */
  // @ts-ignore — getSettingDefinitions is added in Obsidian 1.13 and is
  // not yet present in the public TypeScript typings.
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        id: "height",
        name: "Height",
        description: "Your height (in cm) used for BMI calculation",
        type: "number",
      },
      {
        id: "heightUnit",
        name: "Height unit",
        description: "Unit for your height",
        type: "dropdown",
        options: { cm: "Centimeters", ft: "Feet & Inches (stored as cm)" },
      },
      {
        id: "unit",
        name: "Weight unit",
        description: "Unit for your weight",
        type: "dropdown",
        options: { kg: "Kilograms", lbs: "Pounds" },
      },
      {
        id: "weightTarget",
        name: "Weight target",
        description: "Your goal weight (optional)",
        type: "number",
      },
      {
        id: "bmiCategories.underweight",
        name: "Underweight BMI threshold",
        description: "BMI below this is underweight",
        type: "number",
      },
      {
        id: "bmiCategories.normal",
        name: "Normal weight BMI threshold",
        description: "BMI below this is normal weight",
        type: "number",
      },
      {
        id: "bmiCategories.overweight",
        name: "Overweight BMI threshold",
        description: "BMI below this is overweight",
        type: "number",
      },
    ];
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Body metrics")
      .setHeading();

    new Setting(containerEl)
      .setName("Height")
      .setDesc("Your height (in cm) used for BMI calculation")
      .addText((text) =>
        text
          .setPlaceholder("170")
          .setValue(String(this.plugin.settings.height))
          .onChange(async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.height = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Height unit")
      .setDesc("Unit for your height")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("cm", "Centimeters")
          .addOption("ft", "Feet & Inches (stored as cm)")
          .setValue(this.plugin.settings.heightUnit)
          .onChange(async (value: "cm" | "ft") => {
            this.plugin.settings.heightUnit = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Weight unit")
      .setDesc("Unit for your weight")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("kg", "Kilograms")
          .addOption("lbs", "Pounds")
          .setValue(this.plugin.settings.unit)
          .onChange(async (value: "kg" | "lbs") => {
            this.plugin.settings.unit = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Weight target")
      .setDesc("Your goal weight (optional)")
      .addText((text) =>
        text
          .setPlaceholder("70")
          .setValue(String(this.plugin.settings.weightTarget))
          .onChange(async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              this.plugin.settings.weightTarget = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl).setName("BMI Categories").setHeading();

    new Setting(containerEl)
      .setName("Underweight threshold")
      .setDesc("BMI below this is underweight")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.bmiCategories.underweight))
          .onChange(async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              this.plugin.settings.bmiCategories.underweight = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Normal weight threshold")
      .setDesc("BMI below this is normal weight")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.bmiCategories.normal))
          .onChange(async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              this.plugin.settings.bmiCategories.normal = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Overweight threshold")
      .setDesc("BMI below this is overweight")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.bmiCategories.overweight))
          .onChange(async (value) => {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              this.plugin.settings.bmiCategories.overweight = num;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
