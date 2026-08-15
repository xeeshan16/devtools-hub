import { CronParserTool } from "@/components/tools/impl/CronParserTool";
import { ToolShell } from "@/components/tools/ToolShell";
import { getToolContent } from "@/content/tools";
import { toolMetadata } from "@/lib/tools/metadata";
import { getTool } from "@/lib/tools/registry";

const SLUG = "cron-parser";

export const metadata = toolMetadata(SLUG);

export default function Page() {
  return (
    <ToolShell tool={getTool(SLUG)} content={getToolContent(SLUG)}>
      <CronParserTool />
    </ToolShell>
  );
}
