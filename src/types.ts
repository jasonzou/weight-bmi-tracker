export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number; // in user's chosen unit
  bmi: number;
}

export interface TrackerSettings {
  height: number; // stored in cm
  unit: "kg" | "lbs";
  heightUnit: "cm" | "ft";
  weightTarget: number;
  // Dashboard chart layout: one at a time behind tabs, or both stacked.
  chartLayout: "tabs" | "stacked";
  bmiCategories: {
    underweight: number;
    normal: number;
    overweight: number;
  };
}

export const DEFAULT_SETTINGS: TrackerSettings = {
  height: 170,
  unit: "kg",
  heightUnit: "cm",
  weightTarget: 70,
  chartLayout: "tabs",
  bmiCategories: {
    underweight: 18.5,
    normal: 25,
    overweight: 30,
  },
};

export interface PluginData {
  settings: TrackerSettings;
  weightData: WeightEntry[];
}

export const DEFAULT_DATA: PluginData = {
  settings: DEFAULT_SETTINGS,
  weightData: [],
};
