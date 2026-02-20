import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Storefront Block", () => {
  const blockLiquidPath = path.join(
    __dirname,
    "../extensions/tf-storefront/blocks/node-health/block.liquid"
  );

  it("block renders when metafield exists", () => {
    const blockContent = fs.readFileSync(blockLiquidPath, "utf-8");

    // Check that block conditionally renders based on metafield
    expect(blockContent).toContain("{% if product.metafields.thunderfire.node_id %}");
    expect(blockContent).toContain("class=\"tf-node-health\"");
    expect(blockContent).toContain("data-node-id=");
  });

  it("block hidden when no metafield", () => {
    const blockContent = fs.readFileSync(blockLiquidPath, "utf-8");

    // The entire block is wrapped in the metafield check
    // So if metafield doesn't exist, nothing renders
    const ifStatement = blockContent.indexOf("{% if product.metafields.thunderfire.node_id %}");
    const endifStatement = blockContent.indexOf("{% endif %}");

    expect(ifStatement).toBeGreaterThan(-1);
    expect(endifStatement).toBeGreaterThan(ifStatement);

    // All the visible HTML should be between if and endif
    expect(blockContent.substring(ifStatement, endifStatement)).toContain("tf-node-health");
  });
});
