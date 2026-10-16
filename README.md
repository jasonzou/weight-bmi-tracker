# Weight & BMI Tracker (Obsidian Plugin)

Track daily weight, visualize trends, automatically calculate + chart BMI, and import or export your data.

## Features
- Log today's weight with one command (auto-fills today's date)
- Weight trend line chart
- Automatic BMI calculation from your height
- BMI trend chart with category-colored points
- Duplicate entries for the same day are replaced
- Configurable units (kg / lbs), height, and BMI thresholds
- Dashboard display range: last 10, 15, 30, or 60 days, all, or a custom 1–99999 days
- Import previous weight data from CSV or JSON (paste or file)
- Export your data as CSV or JSON (select and copy the preview, or save into the vault)

## Install (development)
1. Copy this folder into `<vault>/.obsidian/plugins/weight-bmi-tracker/`
2. `npm install`
3. `npm run build`
4. Enable the plugin in **Settings → Community Plugins**

## Usage
- Ribbon icon (scale) or command palette → "Open Weight Tracker Dashboard"
- Command palette → "Add Today's Weight"
- Command palette → "Import Previous Weight Data" (also an **Import Data** button on the dashboard)
- Command palette → "Export Weight Data" (also an **Export Data** button on the dashboard)
- Dashboard → **Display range**: last 10, 15, 30, or 60 days, all, or custom (1–99999 days)

## Import / Export

### Import
Command palette → **"Import Previous Weight Data"**. Paste text, or choose a `.csv` / `.json` file.

**CSV** — one `date,weight` per line. A `date,weight` or `date,weight,bmi` header is optional, and commas, semicolons, or tabs all work:

```csv
date,weight
2026-10-01,74.2
2026-10-02,74.0
```

**JSON** — an array of `{ "date": "...", "weight": ... }`, or an object containing a `weightData` array:

```json
{ "weightData": [ { "date": "2026-10-01", "weight": 74.2 } ] }
```

Dates are normalized to `YYYY-MM-DD` (`MM/DD/YYYY` and `DD.MM.YYYY` are also accepted). Invalid rows are skipped and reported. Pick **Merge with existing** (same-date entries are replaced — the default) or **Replace all data**.

### Export
Command palette → **"Export Weight Data"**, or the **Export Data** button on the dashboard. Choose a format, then select the preview text and copy it with your system shortcut, or **Save to vault**.

- **CSV** — `date,weight,bmi` (opens in any spreadsheet, and re-imports cleanly)
- **JSON** — `{ "weightData": [ { "date": "...", "weight": ..., "bmi": ... } ] }` (keeps every field)

Saved files go to the vault root as `weight-data-YYYY-MM-DD.csv` / `.json`, with `-1`, `-2`, … appended if that name is taken. BMI is always recalculated from your current height and unit when importing.

## Privacy

The plugin keeps its data in `data.json` inside the plugin folder and never reads or writes the system clipboard. Export shows your data in a read-only preview that you select and copy yourself; **Save to vault** writes the file into your vault.

## BMI formula
Metric: `BMI = kg / m²`
Imperial: `BMI = 703 · lb / in²`

## License
MIT
