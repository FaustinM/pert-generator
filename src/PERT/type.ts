interface NodePERTSerializedCytoscape extends cytoscape.ElementDefinition {
  data: cytoscape.NodeDataDefinition & {
    plus: number;
    moins: number;
    marge: number;
  };
}

interface EdgePERTSerializedCytoscape extends cytoscape.ElementDefinition {
  data: cytoscape.EdgeDataDefinition;
}
