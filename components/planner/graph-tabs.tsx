"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataModelFlow } from "./data-model-flow";
import { PlannerProcessFlow } from "./planner-process-flow";
import type { ProjectBrief } from "@/lib/brief-schema";

interface GraphTabsProps {
  dataModel: ProjectBrief["dataModel"];
}

export function GraphTabs({ dataModel }: GraphTabsProps) {
  return (
    <Tabs defaultValue="data-model" className="w-full">
      <TabsList>
        <TabsTrigger value="data-model">Data Model</TabsTrigger>
        <TabsTrigger value="planner-flow">Planner Flow</TabsTrigger>
      </TabsList>
      <TabsContent value="data-model">
        <DataModelFlow dataModel={dataModel} />
      </TabsContent>
      <TabsContent value="planner-flow">
        <PlannerProcessFlow />
      </TabsContent>
    </Tabs>
  );
}
