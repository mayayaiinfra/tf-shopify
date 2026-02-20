import { Badge, Tooltip } from "@shopify/polaris";

interface Props {
  stage: number;
  status?: string;
}

const STAGE_NAMES = [
  "Given",      // 0 - G
  "Self",       // 1 - V0
  "Task",       // 2 - V1
  "Connect",    // 3 - C
  "Plan",       // 4 - Ap
  "Expected",   // 5 - Obe
  "Execute",    // 6 - Ae
  "Observed",   // 7 - Oe
  "Delta",      // 8 - D
  "Correct",    // 9 - Ac
  "Timeline",   // 10 - Ti
  "Efficiency", // 11 - n
];

const STAGE_CODES = ["G", "V0", "V1", "C", "Ap", "Obe", "Ae", "Oe", "D", "Ac", "Ti", "n"];

function getStageTone(stage: number, status?: string): "success" | "info" | "critical" | "warning" {
  if (status?.toLowerCase() === "halted") return "critical";
  if (status?.toLowerCase() === "complete") return "success";
  if (stage >= 6) return "info"; // Executing
  if (stage >= 3) return "warning"; // Planning
  return "info"; // Early stages
}

export function ThetaStatusBadge({ stage, status }: Props) {
  const stageName = STAGE_NAMES[stage] || `Stage ${stage}`;
  const stageCode = STAGE_CODES[stage] || `S${stage}`;
  const tone = getStageTone(stage, status);

  const tooltipContent = `THETA Stage ${stage}: ${stageName}${status ? ` (${status})` : ""}`;

  return (
    <Tooltip content={tooltipContent}>
      <Badge tone={tone}>{stageCode}</Badge>
    </Tooltip>
  );
}
