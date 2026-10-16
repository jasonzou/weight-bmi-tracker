import { App, Modal, Notice, Setting } from "obsidian";

interface ParsedRow {
  date: string;
  weight: number;
}

export interface ImportResult {
  entries: ParsedRow[];
  errors: string[];
}

export class ImportWeightModal extends Modal {
  private onImport: (rows: ParsedRow[]) => void | Promise<void>;
  private text: string = "";
  private mode: "merge" | "replace" = "merge";

  constructor(
    app: App,
    onImport: (rows: ParsedRow[], mode: "merge" | "replace") => void | Promise<void>
  ) {
    super(app);
    // wrap so we can pass mode through
    this.onImport = (rows) => onImport(rows, this.mode);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Import Previous Weight Data" });

    contentEl.createEl("p", {
      text:
        "Paste CSV (date,weight per line) or JSON (array of {date, weight}) below, or pick a file.",
      cls: "setting-item-description",
    });

    // --- Paste area ---
    const ta = contentEl.createEl("textarea", {
      cls: "import-textarea",
    });
    ta.placeholder =
      "2026-10-01,74.2\n2026-10-02,74.0\n2026-10-03,73.8";
    ta.rows = 10;
    ta.addEventListener("input", () => {
      this.text = ta.value;
    });

    // --- File picker ---
    new Setting(contentEl)
      .setName("Or load from file")
      .setDesc("Accepts .csv or .json")
      .addButton((btn) =>
        btn.setButtonText("Choose file…").onClick(() => {
          // Attach the input under the modal so Obsidian's createEl wrapper
          // applies, then remove it once we have the chosen file.
          const input = contentEl.createEl("input", { cls: "import-file-input" });
          input.type = "file";
          input.accept = ".csv,.json,text/csv,application/json";
          input.onchange = async () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return;
            const content = await file.text();
            ta.value = content;
            this.text = content;
            new Notice(`Loaded ${file.name}`);
          };
          input.click();
        })
      );

    // --- Mode ---
    new Setting(contentEl)
      .setName("Import mode")
      .setDesc("Merge replaces same-date entries; Replace wipes existing data first.")
      .addDropdown((dd) =>
        dd
          .addOption("merge", "Merge with existing")
          .addOption("replace", "Replace all data")
          .setValue(this.mode)
          .onChange((v: "merge" | "replace") => {
            this.mode = v;
          })
      );

    // --- Import button ---
    const importBtn = contentEl.createEl("button", {
      text: "Import",
      cls: "mod-cta import-btn",
    });
    importBtn.addEventListener("click", () => {
      const result = parseInput(this.text);
      if (result.errors.length && result.entries.length === 0) {
        new Notice("Import failed:\n" + result.errors.slice(0, 3).join("\n"));
        return;
      }
      if (result.entries.length === 0) {
        new Notice("Nothing to import.");
        return;
      }
      void this.onImport(result.entries);
      new Notice(
        `Imported ${result.entries.length} entr${
          result.entries.length === 1 ? "y" : "ies"
        }${result.errors.length ? ` (${result.errors.length} skipped)` : ""}.`
      );
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

interface RawJsonItem {
  date?: unknown;
  weight?: unknown;
}

interface RawJsonInput {
  weightData?: RawJsonItem[];
}

function asRawItemArray(input: unknown): RawJsonItem[] | null {
  if (Array.isArray(input)) {
    return input as RawJsonItem[];
  }
  if (input && typeof input === "object") {
    const obj = input as RawJsonInput;
    if (Array.isArray(obj.weightData)) {
      return obj.weightData;
    }
  }
  return null;
}

/** Coerces a scalar JSON value to a string, avoiding "[object Object]". */
function toScalarString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/** Left-pads a 1- or 2-digit value to two characters. */
function pad2(value: string): string {
  return value.length >= 2 ? value : "0" + value;
}

/** Parses CSV or JSON text into date/weight rows. */
export function parseInput(raw: string): ImportResult {
  const text = raw.trim();
  const errors: string[] = [];
  const entries: ParsedRow[] = [];

  if (!text) return { entries, errors: ["Empty input."] };

  // Try JSON first
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(text);
      const arr = asRawItemArray(parsed);
      if (!arr) {
        return {
          entries,
          errors: ["JSON must be an array or contain weightData[]."],
        };
      }
      for (const item of arr) {
        const date = toScalarString(item.date).trim();
        const weight = parseFloat(toScalarString(item.weight));
        if (!isValidDate(date) || isNaN(weight)) {
          errors.push(`Skipped invalid row: ${JSON.stringify(item)}`);
          continue;
        }
        entries.push({ date, weight });
      }
      return { entries, errors };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push("Invalid JSON: " + msg);
      return { entries, errors };
    }
  }

  // Fall back to CSV
  const lines = text.split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (i === 0 && /^date\s*,\s*weight(\s*,\s*bmi)?$/i.test(trimmed)) continue; // header
    const parts = trimmed.split(/[,;\t]/);
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: expected "date,weight"`);
      continue;
    }
    const date = normalizeDate(parts[0].trim());
    const weight = parseFloat(parts[1].trim());
    if (!date || isNaN(weight)) {
      errors.push(`Line ${i + 1}: invalid date or weight`);
      continue;
    }
    entries.push({ date, weight });
  }

  return { entries, errors };
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}

/** Accepts YYYY-MM-DD or MM/DD/YYYY or DD.MM.YYYY → normalizes to YYYY-MM-DD. */
function normalizeDate(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, a, b, y] = slash;
    return `${y}-${pad2(a)}-${pad2(b)}`;
  }
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dot) {
    const [, d, m, y] = dot;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  return null;
}
