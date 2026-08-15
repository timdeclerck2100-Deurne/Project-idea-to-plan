"use client";

import { PlannerView } from "@/components/planner/planner-view";
import { usePlannerController } from "@/hooks/use-planner-controller";

export default function Home() {
  const controller = usePlannerController();

  return <PlannerView {...controller} />;
}
