import { Edge } from "./edge";
import { Graph } from "./graph";
import { NodePERT } from "./node";

export class GraphPERT extends Graph {
  constructor() {
    super();
  }

  countFictif() {
    return this._edges.filter((v) => v.data.fictif).length;
  }

  countNormal() {
    return this._edges.filter((v) => !v.data.fictif).length;
  }

  calculerValeur() {
    this._nodes.find((v) => v.to.length === 0)?.calculateMoins();
    this._nodes.find((v) => v.from.length === 0)?.calculatePlus();
  }

  calculerCheminCritique() {
    for (const edge of this._edges) {
      if (
        edge.from.marge === 0 &&
        edge.to.marge === 0 &&
        edge.data.critique_local
      )
        edge.data.alert = true;
    }
  }

  /**
   * Algorithme de tri topologique
   */
  renameNodesTopo() {
    let i = -1;
    const file: NodePERT[] = [];

    file.push(this._nodes.find((v) => v.from.length === 0) || this._nodes[0]);

    while (file.length > 0) {
      i++;
      const s = file.shift();
      //@ts-ignore
      s.id = i.toString();
      //@ts-ignore
      for (const edge of s.to) {
        edge.data.topo = true;
        if (!edge.to.from.find((v) => !v.data.topo)) {
          file.push(edge.to);
        }
      }
    }

    this._nodes.find((v) => v.from.length === 0).id = "D";
    this._nodes.find((v) => v.to.length === 0).id = "F";
  }

  /**
   * @deprecated Algorithme en profondeur, ne marche pas sous certaine condition
   */
  renameNodes() {
    let i = -1;
    const file: NodePERT[] = [];
    const alreadyTag: NodePERT[] = [];

    file.push(this._nodes.find((v) => v.from.length === 0) || this._nodes[0]);
    alreadyTag.push(file[0]);

    while (file.length > 0) {
      i++;
      const s = file.shift();
      //@ts-ignore
      s.id = i.toString();
      //@ts-ignore
      for (const neigh of s.to) {
        if (!alreadyTag.includes(neigh.to)) {
          file.push(neigh.to);
          alreadyTag.push(neigh.to);
        }
      }
    }

    alreadyTag[0].id = "D";
    alreadyTag[alreadyTag.length - 1].id = "F";
  }

  transformerGe2() {
    const sC = this.generateToClasses();

    for (const group of sC) {
      if (group[0].id.startsWith("b")) {
        for (let index = 1; index < group.length; index++) {
          for (const fromValue of group[index].from) {
            const edge = new Edge(
              this,
              fromValue.from,
              group[0],
              fromValue.data
            );
            group[0].addFrom(edge);
            fromValue.from.addTo(edge);
          }

          group[index].delete(true);
          this.removeNode(group[index]);
        }
      }
    }
  }

  transformerGe3() {
    const fC = this.generateFromClasses();

    for (const group of fC) {
      if (group[0].id.startsWith("a")) {
        for (let index = 1; index < group.length; index++) {
          for (const toValue of group[index].to) {
            const edge = new Edge(this, group[0], toValue.to, toValue.data);
            group[0].addTo(edge);
            toValue.to.addFrom(edge);
          }

          group[index].delete(true);
          this.removeNode(group[index]);
        }
      }
    }
  }

  transformerGe4() {
    const edgeList = [...this._edges];
    for (const edge of edgeList) {
      // Verif
      if (edge.data.fictif && edge.to.from.length === 1) {
        // Merge
        for (const toEdge of edge.to.to) {
          toEdge.from = edge.from;
          edge.from.addTo(toEdge);
        }
        edge.from.id = edge.from.id.replace("b_", "ab_");
        this.removeNode(edge.to);

        edge.delete();
      }
    }
  }

  transformerGe5() {
    const edgeList = [...this._edges];
    for (const edge of edgeList) {
      if (edge.data.fictif && edge.from.to.length === 1) {
        // Merge
        for (const fromEdge of edge.from.from) {
          fromEdge.to = edge.to;
          edge.to.addFrom(fromEdge);
        }
        edge.to.id = edge.to.id.replace("a_", "ba_");
        this.removeNode(edge.from);

        edge.delete();
      }
    }
  }

  generateGe6Classes(): Map<NodePERT, NodePERT[]> {
    const map = new Map<NodePERT, NodePERT[]>();
    for (const node of this._nodes) {
      if (!node.id.startsWith("b_")) continue;
      const list = [];
      for (const n of this._nodes) {
        if (node !== n) {
          if (node.checkNodeIncludesInTo(n)) {
            list.push(n);
          }
        }
      }
      if (list.length > 0) map.set(node, list);
    }
    return map;
  }

  transformerGe6() {
    const map = this.generateGe6Classes();
    for (const [key, value] of map) {
      for (const v of value) {
        while (v.to.length > 0) v.to[0].delete();

        const edge = new Edge(this, v, key, { fictif: true });
        v.addTo(edge);
        key.addFrom(edge);
      }
    }
  }

  generateGe6bisClasses(): Map<NodePERT, NodePERT[]> {
    const map = new Map<NodePERT, NodePERT[]>();
    for (const node of this._nodes) {
      if (!node.id.startsWith("a_")) continue;
      const list = [];
      for (const n of this._nodes) {
        if (node !== n) {
          if (node.checkNodeIncludesInFrom(n)) {
            list.push(n);
          }
        }
      }
      if (list.length > 0) map.set(node, list);
    }
    return map;
  }

  cleanFictif() {
    const edgeList = [...this._edges];
    for (const edge of edgeList) {
      if (
        edge.data.fictif &&
        edge.from.to.some((v) => !v.data.fictif && v.to === edge.to)
      ) {
        edge.delete();
      }
    }
  }
}
