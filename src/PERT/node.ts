import { Edge } from "./edge";
import { Graph } from "./graph";

export class NodePERT {
  id: string;
  from: Edge[];
  to: Edge[];
  graph: Graph | null;

  moins: number | -1;
  plus: number | -1;

  constructor({ id, graph }: { id: string; graph?: Graph }) {
    this.from = [];
    this.to = [];

    this.id = id;
    this.graph = graph || null;

    this.moins = -1;
    this.plus = -1;
  }

  delete(safe = false) {
    if (safe) {
      while (this.from.length > 0) this.from.shift()?.delete();
      while (this.to.length > 0) this.to.shift()?.delete();
    }

    for (const edge of this.from) edge.from.removeTo(edge);
    for (const edge of this.to) edge.to.removeFrom(edge);
  }

  toCytoscape(): NodePERTSerializedCytoscape {
    return {
      group: "nodes",
      data: {
        id: this.id,
        marge: this.marge,
        moins: this.moins,
        plus: this.plus,
      },
    };
  }

  get marge() {
    return this.plus - this.moins;
  }

  toEdgesCytoscape(): EdgePERTSerializedCytoscape[] {
    return this.from.map((v, index) => {
      return {
        group: "edges",
        data: {
          id: `e_${v.from.id}_${this.id}_${index}`,
          source: v.from.id,
          target: this.id,
          label: v.label,
          ...v.data,
        },
      };
    });
  }

  calculateMoins() {
    if (this.moins === -1) {
      this.moins = Math.max(
        ...this.from.map((e) => e.from.calculateMoins() + (e.data.duree || 0)),
        0
      );
    }
    return this.moins;
  }

  calculatePlus() {
    // if(this.plus === -1) {
    //   let max = 0;
    //   let maxV = null;
    //   for (const edge of this.to) {
    //     edge.to.calculatePlus();
    //     if (edge.data.duree && (edge.data.duree) > max){
    //       max = edge.data.duree;
    //       maxV = edge;
    //     }
    //   }
    if (this.plus === -1) {
      let min = Infinity;
      let maxV = null;

      let listeCritique = [];
      for (const edge of this.to) {
        const vPlus = edge.to.calculatePlus() - (edge.data.duree || 0);
        if (vPlus < min) {
          min = vPlus;
          maxV = edge;
          listeCritique = [];
        }

        if (min === vPlus) {
          listeCritique.push(edge);
        }
      }
      listeCritique.forEach((v) => (v.data.critique_local = true));
      this.plus = maxV === null ? this.calculateMoins() : min;
    }
    // }
    return this.plus;
  }

  addFrom(edge: Edge) {
    if (this.graph === edge.graph) this.from.push(edge);
  }

  removeFrom(edge: Edge) {
    const i = this.from.indexOf(edge);
    if (i >= 0) this.from.splice(i, 1);
  }

  addTo(edge: Edge) {
    if (this.graph === edge.graph) this.to.push(edge);
  }

  removeTo(edge: Edge) {
    const i = this.to.indexOf(edge);
    if (i >= 0) this.to.splice(i, 1);
  }

  includesFrom(edge: Edge) {
    return this.from.some((v) => v === edge);
  }

  includesFromNode(node: NodePERT) {
    return this.from.some((v) => v.from === node);
  }

  includesTo(edge: Edge) {
    return this.to.some((v) => v === edge);
  }

  checkNodeIncludesInTo(node: NodePERT) {
    let found = true;
    if (node.to.length === 0) return false;
    for (const edge of node.to) {
      if (!this.includesToNode(edge.to)) return false;
      if (!edge.data.fictif) found = false;
    }
    return found;
  }

  checkNodeIncludesInFrom(node: NodePERT) {
    let found = true;
    if (node.from.length === 0) return false;
    for (const edge of node.from) {
      if (!this.includesFromNode(edge.from)) return false;
      if (!edge.data.fictif) found = false;
    }
    return found;
  }

  includesToNode(node: NodePERT, filterNode?: NodePERT) {
    return this.to.some((v) => v.to === node && v.from !== filterNode);
  }

  equalFrom(node: NodePERT) {
    if (node.from.length != this.from.length) return false;
    for (const fp of node.from)
      if (!this.includesFromNode(fp.from)) return false;
    return true;
  }

  equalTo(node: NodePERT) {
    if (node.to.length != this.to.length) return false;
    for (const tp of node.to) if (!this.includesToNode(tp.to)) return false;
    return true;
  }
}
