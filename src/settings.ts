import { App, PluginSettingTab, Setting } from "obsidian";
import WeightBMITracker from "./main";

export class TrackerSettingTab extends PluginSettingTab {
  plugin: WeightBMITracker;

  constructor(app: App, plugin: WeightBMITracker) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Weight & BMI Tracker Settings" });

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

    containerEl.createEl("h3", { text: "BMI Categories" });

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
