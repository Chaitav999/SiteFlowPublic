import type { InspectionQuestion, InspectionTemplate } from "@/types";

const condition = ["Good", "Fair", "Poor", "Critical"];
const severity = ["Low", "Medium", "High", "Critical"];

export const inspectionTemplates: Record<InspectionTemplate, InspectionQuestion[]> = {
  guardrail: [
    { id: "guardrail", label: "Guardrail condition", type: "select", options: condition, required: true },
    { id: "posts", label: "Post condition", type: "select", options: ["Good", "Fair", "Poor"], required: true },
    { id: "reflectors", label: "Reflectors present", type: "boolean", required: true },
    { id: "damage", label: "Damage observed", type: "boolean", required: true },
    { id: "severity", label: "Severity", type: "select", options: severity },
  ],
  drainage: [
    { id: "inlet", label: "Inlet condition", type: "select", options: condition, required: true },
    { id: "outlet", label: "Outlet condition", type: "select", options: condition, required: true },
    { id: "blocked", label: "Blockage present", type: "boolean", required: true },
    { id: "erosion", label: "Erosion observed", type: "boolean", required: true },
    { id: "severity", label: "Severity", type: "select", options: severity },
  ],
  surface: [
    { id: "condition", label: "Overall surface condition", type: "select", options: condition, required: true },
    { id: "cracking", label: "Cracking", type: "select", options: ["None", "Minor", "Moderate", "Severe"], required: true },
    { id: "potholes", label: "Potholes present", type: "boolean", required: true },
    { id: "hazard", label: "Immediate hazard to traffic", type: "boolean", required: true },
    { id: "severity", label: "Severity", type: "select", options: severity },
  ],
  structure: [
    { id: "condition", label: "Structural condition", type: "select", options: condition, required: true },
    { id: "hazard", label: "Hazard present", type: "boolean", required: true },
    { id: "severity", label: "Severity", type: "select", options: severity },
  ],
};

/** Severity becomes required whenever a problem is flagged. */
export function severityRequired(answers: Record<string, string>) {
  return ["damage", "blocked", "erosion", "potholes", "hazard"].some((k) => answers[k] === "Yes");
}
