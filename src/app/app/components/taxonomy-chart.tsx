import { Card } from "@/components/ui/card";
import { getTaxonomyDatasets } from "@/app/app/queries/metrics";
import { TaxonomyChartClient } from "@/app/app/components/taxonomy-chart-client";

export async function TaxonomyChart() {
  const datasets = await getTaxonomyDatasets();

  return (
    <Card>
      <TaxonomyChartClient datasets={datasets} />
    </Card>
  );
}
