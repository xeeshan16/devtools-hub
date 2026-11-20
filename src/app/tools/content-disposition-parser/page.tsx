import { ContentDispositionParserTool } from "@/components/tools/impl/ContentDispositionParserTool";
import { ToolShell } from "@/components/tools/ToolShell";
import { getToolContent } from "@/content/tools";
import { toolMetadata } from "@/lib/tools/metadata";
import { getTool } from "@/lib/tools/registry";

const SLUG = "content-disposition-parser";

export const metadata = toolMetadata(SLUG);

export default function Page() {
  return (
    <ToolShell tool={getTool(SLUG)} content={getToolContent(SLUG)}>
      <ContentDispositionParserTool />
    </ToolShell>
  );
}
