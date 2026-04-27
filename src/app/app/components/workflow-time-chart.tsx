import { Card } from "@/components/ui/card";
import { getWorkflowTimeData } from "@/app/app/queries/metrics";
import { WorkflowTimeChartClient } from "@/app/app/components/workflow-time-chart-client";

export async function WorkflowTimeChart() {
  const data = await getWorkflowTimeData();

  return (
    <Card>
      <WorkflowTimeChartClient data={data} />
    </Card>
  );
}
