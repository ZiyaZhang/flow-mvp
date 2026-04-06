import type { FlowNode } from "../../../../packages/shared/src/index.js";

export function getSessionIdFromLocation(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || !parts[1]) {
    return null;
  }

  return parts[1];
}

export function createNode(order: number): FlowNode {
  return {
    id: `node_${crypto.randomUUID().slice(0, 8)}`,
    title: "新节点",
    description: "",
    type: "step",
    order,
    parentId: null,
  };
}

export function reorderNodeList(nodes: FlowNode[], sourceId: string, targetId: string): FlowNode[] {
  const next = [...nodes];
  const sourceIndex = next.findIndex((node) => node.id === sourceId);
  const targetIndex = next.findIndex((node) => node.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return next;
  }

  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved!);

  return next.map((node, index) => ({
    ...node,
    order: index,
  }));
}
