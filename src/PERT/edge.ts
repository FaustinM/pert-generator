import { Graph } from "./graph";
import { NodePERT } from "./node";

interface DataPayload {
  fictif?: boolean;
  duree?: number;
  [x: string | number | symbol]: unknown;
}

export class Edge {
  from: NodePERT;
  to: NodePERT;
  graph: Graph;
  data: DataPayload;

  constructor(
    graph: Graph,
    from: NodePERT,
    to: NodePERT,
    data: DataPayload = { fictif: false }
  ) {
    this.graph = graph;
    this.graph.addEdge(this);

    this.from = from;
    this.to = to;
    this.data = data;
  }

  get label() {
    if (this.data.name) return `${this.data.name} : ${this.data.duree || 0}`;
  }

  delete() {
    this.graph.removeEdge(this);
    this.from.removeTo(this);
    this.to.removeFrom(this);
  }
}
