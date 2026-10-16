import {
  App,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
} from "obsidian";
import WeightBMITracker from "./main";

/** Reads a dot-path (e.g. "bmiCategories.underweight") from an object. */
function readPath(source: unknown, key: string): unknown {
  let current: unknown = source;
  for (const part of key.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Writes a dot-path, creating intermediate objects as needed. */
function writePath(target: object, key: string, value: unknown): void {
  const parts = key.split(".");
  const last = parts.pop();
  if (!last) return;
  let current = target as Record<string, unknown>;
  for (const part of parts) {
    const next = current[part];
    if (next && typeof next === "object") {
      current = next as Record<string, unknown>;
    } else {
      const created: Record<string, unknown> = {};
      current[part] = created;
      current = created;
    }
  }
  current[last] = value;
}

export class TrackerSettingTab extends PluginSettingTab {
  plugin: WeightBMITracker;

  constructor(app: App, plugin: WeightBMITracker) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Declarative settings for Obsidian 1.13+. Obsidian renders, searches,
   * and persists these and skips `display()`; older versions fall back to
   * `display()` below (minAppVersion is below 1.13).
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "Body metrics",
        items: [
          {
            name: "Height",
            desc: "Your height (in cm) used for BMI calculation",
            control: {
              type: "number",
              key: "height",
              placeholder: "170",
              min: 1,
            },
          },
          {
            name: "Height unit",
            desc: "Unit for your height",
            control: {
              type: "dropdown",
              key: "heightUnit",
              options: { cm: "Centimeters", ft: "Feet & Inches (stored as cm)" },
            },
          },
          {
            name: "Weight unit",
            desc: "Unit for your weight",
            control: {
              type: "dropdown",
              key: "unit",
              options: { kg: "Kilograms", lbs: "Pounds" },
            },
          },
          {
            name: "Weight target",
            desc: "Your goal weight (optional)",
            control: { type: "number", key: "weightTarget", placeholder: "70" },
          },
        ],
      },
      {
        type: "group",
        heading: "BMI categories",
        items: [
          {
            name: "Underweight threshold",
            desc: "BMI below this is underweight",
            control: { type: "number", key: "bmiCategories.underweight" },
          },
          {
            name: "Normal weight threshold",
            desc: "BMI below this is normal weight",
            control: { type: "number", key: "bmiCategories.normal" },
          },
          {
            name: "Overweight threshold",
            desc: "BMI below this is overweight",
            control: { type: "number", key: "bmiCategories.overweight" },
          },
        ],
      },
    ];
  }

  /** Read a control value from this plugin's settings. */
  getControlValue(key: string): unknown {
    return readPath(this.plugin.settings, key);
  }

  /**
   * Persist a control value through the plugin's own data model. The
   * default implementation saves `this.plugin.settings` as the entire
   * plugin data, which would drop the stored weight entries.
   */
  async setControlValue(key: string, value: unknown): Promise<void> {
    writePath(this.plugin.settings, key, value);
    await this.plugin.saveSettings();
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
