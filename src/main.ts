import { Plugin, Notice, Modal, Setting } from "obsidian";
import Chart from "chart.js/auto";
import { TrackerSettingTab } from "./settings";
import { ImportWeightModal } from "./importModal";
import { ExportWeightModal } from "./exportModal";
import {
  DEFAULT_DATA,
  PluginData,
  TrackerSettings,
  WeightEntry,
} from "./types";

export default class WeightBMITracker extends Plugin {
  settings: TrackerSettings;
  weightData: WeightEntry[] = [];

  // ---------- lifecycle ----------

  async onload() {
    await this.loadAll();

    this.addRibbonIcon("scale", "Open Weight Tracker", () => {
      this.openTrackerModal();
    });

    this.addCommand({
      id: "add-todays-weight",
      name: "Add Today's Weight",
      callback: () => this.addTodaysWeight(),
    });

    this.addCommand({
      id: "open-weight-tracker",
      name: "Open Weight Tracker Dashboard",
      callback: () => this.openTrackerModal(),
    }); 
    
    this.addCommand({
      id: "import-weight-data",
      name: "Import Previous Weight Data",
      callback: () => this.importWeightData(),
    });

    this.addCommand({
      id: "export-weight-data",
      name: "Export Weight Data",
      callback: () => this.exportWeightData(),
    });

    this.addSettingTab(new TrackerSettingTab(this.app, this));
  }

  // ---------- data ----------

  async loadAll() {
    const raw = (await this.loadData()) as Partial<PluginData> | null;
    const merged: PluginData = {
      settings: Object.assign({}, DEFAULT_DATA.settings, raw?.settings ?? {}),
      weightData: raw?.weightData ?? [],
    };
    this.settings = merged.settings;
    this.weightData = merged.weightData;
  }

  async persist() {
    const data: PluginData = {
      settings: this.settings,
      weightData: this.weightData,
    };
    await this.saveData(data);
  }

  async saveSettings() {
    await this.persist();
  }

  async saveWeightData() {
    await this.persist();
  }

  // ---------- BMI ----------

  calculateBMI(weight: number): number {
    const heightInMeters = this.settings.height / 100;
    let weightInKg = weight;
    if (this.settings.unit === "lbs") {
      weightInKg = weight * 0.453592;
    }
    const bmi = weightInKg / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  }

  getBMICategory(bmi: number): string {
    const c = this.settings.bmiCategories;
    if (bmi < c.underweight) return "Underweight";
    if (bmi < c.normal) return "Normal weight";
    if (bmi < c.overweight) return "Overweight";
    return "Obesity";
  }

  // ---------- actions ----------

  async addTodaysWeight() {
    const today = new Date().toISOString().split("T")[0];

    const modal = new WeightInputModal(this.app, async (weight: number) => {
      const bmi = this.calculateBMI(weight);

      const idx = this.weightData.findIndex((e) => e.date === today);
      if (idx >= 0) {
        this.weightData[idx] = { date: today, weight, bmi };
      } else {
        this.weightData.push({ date: today, weight, bmi });
      }

      this.weightData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      await this.saveWeightData();

      const category = this.getBMICategory(bmi);
      new Notice(
        `Weight logged: ${weight} ${this.settings.unit} — BMI ${bmi} (${category})`
      );
    });

    modal.open();
  }

  importWeightData() {
    const modal = new ImportWeightModal(
      this.app,
      async (rows, mode) => {
        const byDate = new Map<string, WeightEntry>();

        // Merge keeps existing days (same-date imports replace them);
        // replace starts from an empty set.
        if (mode === "merge") {
          for (const e of this.weightData) byDate.set(e.date, e);
        }

        for (const r of rows) {
          byDate.set(r.date, {
            date: r.date,
            weight: r.weight,
            bmi: this.calculateBMI(r.weight),
          });
        }

        this.weightData = Array.from(byDate.values()).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        await this.saveWeightData();

        new Notice(
          `✅ Import complete. Total entries: ${this.weightData.length}`
        );
      }
    );

    modal.open();
  }

  exportWeightData() {
    if (this.weightData.length === 0) {
      new Notice("No weight data to export yet.");
      return;
    }

    const modal = new ExportWeightModal(this.app, this.weightData);
    modal.open();
  }

  openTrackerModal() {
    const modal = new TrackerDashboardModal(this.app, this);
    modal.open();
  }
}

// ---------- input modal ----------

class WeightInputModal extends Modal {
  onSubmit: (weight: number) => void;
  weight: string = "";

  constructor(app: any, onSubmit: (weight: number) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Log Today's Weight" });

    new Setting(contentEl)
      .setName("Weight")
      .setDesc("Enter your weight for today")
      .addText((text) =>
        text
          .setPlaceholder("e.g. 72.5")
          .setValue(this.weight)
          .onChange((value) => {
            this.weight = value;
          })
      );

    const btn = contentEl.createEl("button", {
      text: "Save",
      cls: "mod-cta",
    });
    btn.addEventListener("click", () => {
      const w = parseFloat(this.weight);
      if (!isNaN(w) && w > 0) {
        this.onSubmit(w);
        this.close();
      } else {
        new Notice("Please enter a valid weight.");
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ---------- dashboard modal ----------

class TrackerDashboardModal extends Modal {
  plugin: WeightBMITracker;
  weightChart: Chart | null = null;
  bmiChart: Chart | null = null;
  range: "10" | "15" | "30" | "60" | "all" | "custom" = "all";
  private customDays = 30;

  constructor(app: any, plugin: WeightBMITracker) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    this.modalEl.addClass("weight-tracker-modal-wide");
    this.renderDashboard();
  }

  private renderDashboard() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("weight-tracker-dashboard");

    const header = contentEl.createDiv({ cls: "tracker-header" });
    header.createEl("h2", { text: "Weight & BMI Dashboard" });

    const actions = header.createDiv({ cls: "tracker-actions" });
    const addBtn = actions.createEl("button", {
      text: "Add Today's Weight",
      cls: "mod-cta",
    });
    addBtn.addEventListener("click", () => {
      this.close();
      this.plugin.addTodaysWeight();
    });

    const importBtn = actions.createEl("button", { text: "Import Data" });
    importBtn.addEventListener("click", () => {
      this.close();
      this.plugin.importWeightData();
    });

    const exportBtn = actions.createEl("button", { text: "Export Data" });
    exportBtn.addEventListener("click", () => {
      this.close();
      this.plugin.exportWeightData();
    });

    new Setting(contentEl)
      .setName("Display range")
      .setDesc("Show the most recent entries")
      .addDropdown((dd) =>
        dd
          .addOption("10", "Last 10 days")
          .addOption("15", "Last 15 days")
          .addOption("30", "Last 30 days")
          .addOption("60", "Last 60 days")
          .addOption("all", "All days")
          .addOption("custom", "Custom days…")
          .setValue(this.range)
          .onChange(
            (
              value: "10" | "15" | "30" | "60" | "all" | "custom"
            ) => {
              this.range = value;
              this.renderDashboard();
            }
          )
      )
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "99999";
        text.inputEl.addClass("tracker-custom-days");
        text.setPlaceholder("30").setValue(String(this.customDays));
        text.inputEl.style.display = this.range === "custom" ? "" : "none";
        text.inputEl.addEventListener("change", () => {
          const n = Number(text.inputEl.value);
          if (Number.isInteger(n) && n >= 1 && n <= 99999) {
            this.customDays = n;
            this.renderDashboard();
          } else {
            text.inputEl.value = String(this.customDays);
          }
        });
      });

    const data = this.getFilteredData();
    if (data.length === 0) {
      contentEl.createEl("p", {
        text: "No data yet. Use the command 'Add Today's Weight' to log your first entry.",
      });
      return;
    }

    const latest = data[data.length - 1];
    const first = data[0];
    const weightChange = latest.weight - first.weight;
    const category = this.plugin.getBMICategory(latest.bmi);

    const statsDiv = contentEl.createDiv({ cls: "tracker-stats" });
    const stats = [
      {
        label: "Current Weight",
        value: `${latest.weight} ${this.plugin.settings.unit}`,
      },
      { label: "Current BMI", value: `${latest.bmi} (${category})` },
      {
        label: "Total Change",
        value: `${weightChange >= 0 ? "+" : ""}${weightChange.toFixed(1)} ${this.plugin.settings.unit}`,
      },
      { label: "Entries", value: String(data.length) },
    ];
    stats.forEach((s) => {
      const card = statsDiv.createDiv({ cls: "stat-card" });
      card.createEl("div", { text: s.label, cls: "stat-label" });
      card.createEl("div", { text: s.value, cls: "stat-value" });
    });

    const chartsDiv = contentEl.createDiv({ cls: "tracker-charts" });
    const weightCanvas = chartsDiv.createEl("canvas");
    const bmiCanvas = chartsDiv.createEl("canvas");

    window.setTimeout(() => {
      this.renderWeightChart(weightCanvas);
      this.renderBMIChart(bmiCanvas);
    }, 30);
  }

  private getFilteredData(): WeightEntry[] {
    const data = this.plugin.weightData;
    if (this.range === "all" || data.length === 0) return data;

    const days =
      this.range === "custom" ? this.customDays : parseInt(this.range, 10);
    const latest = new Date(data[data.length - 1].date).getTime();
    const cutoff = latest - (days - 1) * 24 * 60 * 60 * 1000;
    return data.filter((e) => new Date(e.date).getTime() >= cutoff);
  }

  renderWeightChart(canvas: HTMLCanvasElement) {
    if (this.weightChart) this.weightChart.destroy();
    const data = this.getFilteredData();

    this.weightChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: data.map((e) => e.date),
        datasets: [
          {
            label: `Weight (${this.plugin.settings.unit})`,
            data: data.map((e) => e.weight),
            borderColor: "#4A90D9",
            backgroundColor: "rgba(74, 144, 217, 0.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#4A90D9",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: "Weight Trend" } },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: `Weight (${this.plugin.settings.unit})` },
          },
          x: { title: { display: true, text: "Date" } },
        },
      },
    });
  }

  renderBMIChart(canvas: HTMLCanvasElement) {
    if (this.bmiChart) this.bmiChart.destroy();
    const data = this.getFilteredData();
    const cats = this.plugin.settings.bmiCategories;

    const pointColors = data.map((e) => {
      if (e.bmi < cats.underweight) return "#F5A623";
      if (e.bmi < cats.normal) return "#7ED321";
      if (e.bmi < cats.overweight) return "#F8E71C";
      return "#D0021B";
    });

    this.bmiChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: data.map((e) => e.date),
        datasets: [
          {
            label: "BMI",
            data: data.map((e) => e.bmi),
            borderColor: "#9B59B6",
            backgroundColor: "rgba(155, 89, 182, 0.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: "BMI Trend" } },
        scales: {
          y: { beginAtZero: false, title: { display: true, text: "BMI" } },
          x: { title: { display: true, text: "Date" } },
        },
      },
    });
  }

  onClose() {
    if (this.weightChart) this.weightChart.destroy();
    if (this.bmiChart) this.bmiChart.destroy();
    this.contentEl.empty();
  }
}
