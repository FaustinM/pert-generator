import { Edge } from "./edge";
import { GraphPERT } from "./graphPERT";
import { NodePERT } from "./node";
import { TaskPERT } from "./task";

export class Graph {
  protected _nodes: NodePERT[];
  protected _edges: Edge[];

  constructor() {
    this._nodes = [];
    this._edges = [];
  }

  addNode(node: NodePERT): boolean {
    if (node.graph && node.graph !== this) return false;
    if (this.getId(node.id)) return false;

    node.graph = this;
    this._nodes.push(node);

    return true;
  }

  addEdge(edge: Edge): boolean {
    if (edge.graph !== this || this.includeEdge(edge)) return false;

    this._edges.push(edge);
    return true;
  }

  removeNode(node: NodePERT): void {
    const i = this._nodes.indexOf(node);
    if (i >= 0) this._nodes.splice(i, 1);
  }

  removeEdge(edge: Edge): void {
    const i = this._edges.indexOf(edge);
    if (i >= 0) this._edges.splice(i, 1);
  }

  includeNode(node: NodePERT): boolean {
    return this._nodes.includes(node);
  }

  includeEdge(edge: Edge): boolean {
    return this._edges.includes(edge);
  }

  updateCytoscape(cy: cytoscape.Core) {
    cy.add(this._nodes.map((d) => d.toCytoscape()));
    cy.add(this._nodes.map((d) => d.toEdgesCytoscape()).flat());
    // cy.elements().qtip({
    //   content: function() {
    //     return "Hello";
    //   }
    // })
  }

  getId(id: string) {
    for (const node of this._nodes) {
      if (node.id === id) return node;
    }
    return null;
  }

  updateTo() {
    for (const node of this._nodes)
      if (node instanceof TaskPERT) node.updateTo();
  }

  updateFrom() {
    for (const node of this._nodes)
      if (node instanceof TaskPERT) node.updateFrom();
  }

  hasMultipleEnd() {
    let found = false;
    for (const node of this._nodes)
      if (node.to.length === 0)
        if (found) return true;
        else found = true;
    return false;
  }

  hasMultipleStart() {
    let found = false;
    for (const node of this._nodes)
      if (node.from.length === 0)
        if (found) return true;
        else found = true;
    return false;
  }

  createDummyStart() {
    const node = new TaskPERT({
      id: "D",
      duree: 0,
    });
    this.addNode(node);

    for (const n of this._nodes)
      if (n.from.length === 0 && n !== node) {
        const edge = new Edge(this, node, n);
        n.addFrom(edge);
        node.addTo(edge);
      }
  }

  createDummyEnd() {
    const node = new TaskPERT({
      id: "F",
      duree: 0,
    });
    this.addNode(node);

    for (const n of this._nodes)
      if (n.to.length === 0 && n !== node) {
        const edge = new Edge(this, n, node);
        node.addFrom(edge);
        n.addTo(edge);
      }
  }

  generateFromClasses(): NodePERT[][] {
    let classes: NodePERT[][] = [];
    for (const n of this._nodes) {
      let found = false;
      for (const classeIndex in classes) {
        if (classes[classeIndex][0].equalFrom(n)) {
          classes[classeIndex].push(n);
          found = true;
        }
      }
      if (!found) classes.push([n]);
    }
    return classes;
  }

  generateToClasses(): NodePERT[][] {
    let classes: NodePERT[][] = [];
    for (const n of this._nodes) {
      let found = false;
      for (const classeIndex in classes) {
        if (classes[classeIndex][0].equalTo(n)) {
          classes[classeIndex].push(n);
          found = true;
        }
      }
      if (!found) classes.push([n]);
    }
    return classes;
  }

  generatePERT() {
    const graph = new GraphPERT();

    // Ge1
    for (const task of this._nodes) {
      const ai = new NodePERT({ id: `a_${task.id}` });
      const bi = new NodePERT({ id: `b_${task.id}` });

      graph.addNode(ai);
      graph.addNode(bi);

      const edge = new Edge(graph, ai, bi, {
        fictif: false,
        duree: task.duree,
        name: task.id,
        description: task.description,
      });
      ai.addTo(edge);
      bi.addFrom(edge);
    }

    for (const task of this._nodes) {
      const bi = graph.getId(`b_${task.id}`);
      if (!bi) continue;

      for (const taskJ of task.to) {
        const aj = graph.getId(`a_${taskJ.to.id}`);
        if (aj) {
          const edge = new Edge(graph, bi, aj, { fictif: true });
          bi.addTo(edge);
          aj.addFrom(edge);
        }
      }
    }

    graph.transformerGe2();
    graph.transformerGe3();
    graph.transformerGe4();
    graph.transformerGe5(); // Ge5 (16 fif/17 som)
    while (graph.generateGe6Classes().size > 0) graph.transformerGe6();
    graph.transformerGe4();
    graph.cleanFictif();

    return graph;
  }
}
