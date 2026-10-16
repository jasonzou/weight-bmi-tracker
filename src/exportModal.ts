import { App, Modal, Notice, Setting } from "obsidian";
import { WeightEntry } from "./types";

export type ExportFormat = "csv" | "json";

/** Serializes entries as CSV (date,weight,bmi); re-importable by the import modal. */
export function toCSV(entries: WeightEntry[]): string {
  const lines = ["date,weight,bmi"];
  for (const e of entries) {
    lines.push(`${e.date},${e.weight},${e.bmi}`);
  }
  return lines.join("\n") + "\n";
}

/** Serializes entries as pretty JSON in the shape the importer accepts. */
export function toJSON(entries: WeightEntry[]): string {
  return JSON.stringify({ weightData: entries }, null, 2) + "\n";
}

export class ExportWeightModal extends Modal {
  private entries: WeightEntry[];
  private format: ExportFormat = "csv";

  constructor(app: App, entries: WeightEntry[]) {
    super(app);
    this.entries = entries;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Export Weight Data" });

    contentEl.createEl("p", {
      text: `Ready to export ${this.entries.length} entries. Select the text below to copy it, or save it into your vault.`,
      cls: "setting-item-description",
    });

    const preview = contentEl.createEl("textarea", { cls: "import-textarea" });
    preview.rows = 12;
    preview.readOnly = true;
    preview.value = this.serialize();
    // This plugin deliberately avoids the system paste buffer: clicking or
    // focusing the read-only preview selects everything so the user can copy
    // it with their own shortcut; the "Select all" button does the same.
    preview.addEventListener("focus", () => preview.select());

    new Setting(contentEl)
      .setName("Format")
      .setDesc(
        "CSV opens in a spreadsheet; JSON keeps every field and re-imports as-is."
      )
      .addDropdown((dd) =>
        dd
          .addOption("csv", "CSV")
          .addOption("json", "JSON")
          .setValue(this.format)
          .onChange((value: ExportFormat) => {
            this.format = value;
            preview.value = this.serialize();
          })
      );

    new Setting(contentEl)
      .setName("Export")
      .setDesc(
        "Select the text above and copy it with your system shortcut, or save it into your vault."
      )
      .addButton((btn) =>
        btn.setButtonText("Select all").onClick(() => {
          preview.focus();
          preview.select();
        })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Save to vault")
          .setCta()
          .onClick(() => this.saveToVault(preview.value))
      );
  }

  private serialize(): string {
    return this.format === "csv" ? toCSV(this.entries) : toJSON(this.entries);
  }

  private async saveToVault(content: string): Promise<void> {
    const ext = this.format === "csv" ? "csv" : "json";
    const stamp = new Date().toISOString().split("T")[0];
    let path = `weight-data-${stamp}.${ext}`;
    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = `weight-data-${stamp}-${counter++}.${ext}`;
    }

    try {
      await this.app.vault.create(path, content);
      new Notice(`Exported to ${path}`);
      this.close();
    } catch (err) {
      new Notice("Export failed: " + (err as Error).message);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
