import { Edge } from './edge';
import { Graph } from "./graph";
import { NodePERT } from "./node";

export class TaskPERT extends NodePERT {
  fromRaw: string[];
  duree: number;
  description: string;

  constructor({
    id,
    graph,
    fromRaw = [],
    duree = 0,
    description = "",
  }: {
    id: string;
    graph?: Graph;
    duree?: number;
    fromRaw?: string[];
    description?: string;
  }) {
    super({ id, graph });

    this.duree = duree;
    this.description = description;
    this.fromRaw = fromRaw;
  }

  static parseFrom(raw: string): string[] {
    if (raw.includes("+")) return raw.split("+");
    else if (raw.includes("...")) return raw.split("...");
    else return [raw];
  }

  static parse(parsed: string[]): TaskPERT {
    return new TaskPERT({
      id: parsed[0],
      fromRaw: TaskPERT.parseFrom(parsed[3]),
      duree: Number(parsed[2]),
      description: parsed[1],
    });
  }

  toCytoscape(): NodePERTSerializedCytoscape {
    return {
      group: "nodes",
      data: {
        id: this.id,
        marge: 0,
        moins: 0,
        plus: 0,
      },
    };
  }

  updateFrom() {
    if (this.graph) {
      for (const id of this.fromRaw) {
        const targetNode = this.graph.getId(id);
        if (targetNode) {
          const edge = new Edge(this.graph, targetNode, this);
          targetNode.addTo(edge);
          this.addFrom(edge);
        }
      }
    }
  }

  /**
   * @deprecated
   */
  updateTo() {
    return;
  }
}
