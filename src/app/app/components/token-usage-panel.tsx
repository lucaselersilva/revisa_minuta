import { Card } from "@/components/ui/card";
import { getTokenUsageMetrics } from "@/app/app/queries/metrics";
import { TokenUsagePanelClient } from "@/app/app/components/token-usage-panel-client";

export async function TokenUsagePanel() {
  const metrics = await getTokenUsageMetrics();

  return (
    <Card>
      <TokenUsagePanelClient metrics={metrics} />
    </Card>
  );
}
