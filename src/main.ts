import "./style.css";
import cytoscape from "cytoscape";
import nodeHtmlLabelCytoscape from "cytoscape-node-html-label";
import navigatorCytoscape from "cytoscape-navigator";
import dagre from "cytoscape-dagre";
import popper from "cytoscape-popper";
import "cytoscape-navigator/cytoscape.js-navigator.css";
import { Graph, GraphPERT, TaskPERT } from "./PERT";
import * as XLSX from "xlsx";
import { SVGGantt, CanvasGantt } from 'gantt';
import { generateGantt } from "./gantt";

enum ResultatTypeParsing {
  Error,
  Warning,
  Info,
}

interface ResultatParsing {
  type: ResultatTypeParsing;
  message: string;
  bold?: boolean;
}

cytoscape.use(dagre);
cytoscape.use(popper);
nodeHtmlLabelCytoscape(cytoscape);
navigatorCytoscape(cytoscape);
//@ts-ignore
const cy = cytoscape({
  container: document.querySelector("#cy"),
  style: cytoscape
    .stylesheet()
    .selector("node")
    .css({
      "background-fit": "cover",
      "border-color": "#000",
      "border-width": 3,
      height: "50px",
      width: "50px",
      "border-opacity": 0.5,
    })
    .selector("edge")
    .css({
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
    })
    .selector("edge[?fictif]")
    .css({
      "line-style": "dashed",
    })
    .selector("edge[?label]")
    .css({
      label: "data(label)",
      "text-margin-y": "-20px",
      "text-rotation": "autorotate",
    })
    .selector("edge[?alert]")
    .css({
      "line-color": "red",
      "target-arrow-color": "red",
    }),
});
window.cy = cy;

function afficherResultat(resultats: ResultatParsing[]) {
  document.querySelector("#resultat > ol").innerHTML = "";
  const resultatEl = document.getElementById("resultat");
  if (!resultatEl) return;

  let disabled = false;
  for (const resultat of resultats) {
    const liEl = document.createElement("li");
    liEl.textContent = resultat.message;
    switch (resultat.type) {
      case ResultatTypeParsing.Error:
        liEl.classList.add("text-red-600");
        disabled = true;
        break;

      case ResultatTypeParsing.Warning:
        liEl.classList.add("text-orange-600");
        break;

      case ResultatTypeParsing.Info:
        liEl.classList.add("text-blue-600");
        break;
    }

    if (disabled)
      document.getElementById("btn-showgraph")?.setAttribute("disabled", "");
    else document.getElementById("btn-showgraph")?.removeAttribute("disabled");

    if (resultat.bold) {
      liEl.classList.add("font-bold");
    }

    resultatEl.children[1].appendChild(liEl);
  }

  resultatEl.style.display = "block";
}

function readArrayBuffer(buffer: ArrayBuffer): Graph {
  const graph = new Graph();
  const workbook = XLSX.read(buffer, {
    dense: true,
  });
  const resultat: ResultatParsing[] = [];
  resultat.push({
    type: ResultatTypeParsing.Info,
    message: `Fichier de ${workbook.Props?.Author}, édité par ${
      workbook.Props?.LastAuthor
    } le ${workbook.Props?.ModifiedDate?.toLocaleString("fr-fr")}`,
  });

  if (workbook.Sheets["TACHES"]) {
    const sheet = workbook.Sheets["TACHES"] as any[];
    for (let i = 0; i < sheet.length; i++) {
      if (
        sheet[i] &&
        sheet[i][0] &&
        (i !== 0 || sheet[i][0].v !== "ID TACHE")
      ) {
        try {
          graph.addNode(TaskPERT.parse(sheet[i].map((el) => el.v)));
        } catch (e) {
          resultat.push({
            type: ResultatTypeParsing.Warning,
            message: `La ligne ${i + 1} a eu une erreur (${e})`,
          });
        }
      } else {
        resultat.push({
          type: ResultatTypeParsing.Info,
          message: `La ligne ${i + 1} a été ignoré`,
        });
      }
    }
  } else {
    resultat.push({
      type: ResultatTypeParsing.Error,
      message: "Il n'existe pas de feuille de calcul avec le nom 'TACHES'",
    });
  }

  graph.updateFrom();

  if (graph.hasMultipleEnd()) {
    console.log(graph.hasMultipleEnd());
    resultat.push({
      type: ResultatTypeParsing.Warning,
      message:
        "Il existe plusieurs noeuds sans successeurs, une correction automatique a été appliqué",
    });
    graph.createDummyEnd();
  }

  if (graph.hasMultipleStart()) {
    resultat.push({
      type: ResultatTypeParsing.Warning,
      message:
        "Il existe plusieurs noeuds sans antécédants, une correction automatique a été appliqué",
    });
    graph.createDummyStart();
  }

  const graphPERT = graph.generatePERT();
  graphPERT.calculerValeur();
  graphPERT.calculerCheminCritique();

  if (graphPERT._nodes.length > 0) graphPERT.renameNodesTopo();
  else
    resultat.push({
      type: ResultatTypeParsing.Error,
      message: `Le graphe PERT est vide`,
      bold: true,
    });

  resultat.push({
    type: ResultatTypeParsing.Info,
    message: `${graphPERT.countFictif()} chemins fictifs / ${graphPERT.countNormal()} chemins normaux / ${
      graphPERT._nodes.length
    } noeuds`,
    bold: true,
  });

  afficherResultat(resultat);

  return graphPERT;
}

document.getElementById("btn-showgantt")?.addEventListener("click", (e) => {
  new SVGGantt('#svg-gantt', generateGantt(window.graph), {
    viewMode: 'day',
    styleOptions: {
      warning: "#65c16f",
      danger: "#65c16f",
    }
  });

  document.getElementById("pres").style.display = "none";
  document.getElementById("gantt").style.display = "block";
})

document.getElementById("btn-showgraph")?.addEventListener("click", (e) => {
  window.graph.updateCytoscape(cy);

  document.getElementById("pres").style.display = "none";
  document.getElementById("cy").style.display = "block";
  cy.layout({
    name: "dagre",
    nodeSep: undefined, // the separation between adjacent nodes in the same rank
    edgeSep: undefined, // the separation between adjacent edges in the same rank
    rankSep: undefined, // the separation between each rank in the layout
    rankDir: "LR", // 'TB' for top to bottom flow, 'LR' for left to right,
    align: undefined, // alignment for rank nodes. Can be 'UL', 'UR', 'DL', or 'DR', where U = up, D = down, L = left, and R = right
    acyclicer: undefined, // If set to 'greedy', uses a greedy heuristic for finding a feedback arc set for a graph.
    // A feedback arc set is a set of edges that can be removed to make a graph acyclic.
    ranker: undefined, // Type of algorithm to assign a rank to each node in the input graph. Possible values: 'network-simplex', 'tight-tree' or 'longest-path'
    minLen: function (edge) {
      return 3;
    }, // number of ranks to keep between the source and target of the edge
    edgeWeight: function (edge) {
      return edge.data().fictif ? 1 : 5;
    }, // higher weight edges are generally made shorter and straighter than lower weight edges

    // general layout options
    fit: true, // whether to fit to viewport
    padding: 30, // fit padding
    spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
    nodeDimensionsIncludeLabels: false, // whether labels should be included in determining the space used by a node
    animate: false, // whether to transition the node positions
    animateFilter: function (node, i) {
      return true;
    }, // whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
    animationDuration: 500, // duration of animation in ms if enabled
    animationEasing: undefined, // easing of animation if enabled
    boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    transform: function (node, pos) {
      return pos;
    }, // a function that applies a transform to the final node position
    ready: function () {}, // on layoutready
    sort: undefined, // a sorting function to order the nodes and edges; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
    // because cytoscape dagre creates a directed graph, and directed graphs use the node order as a tie breaker when
    // defining the topology of a graph, this sort function can help ensure the correct order of the nodes/edges.
    // this feature is most useful when adding and removing the same nodes and edges multiple times in a graph.
    stop: function () {}, // on layoutstop
  }).run();

  cy.nodeHtmlLabel([
    {
      query: "node",
      halign: "center",
      valign: "center",
      halignBox: "center",
      valignBox: "center",
      cssClass: "flex",
      tpl(data) {
        return `
  <svg xmlns="http://www.w3.org/2000/svg" width="60px" height="60px" viewBox="-0.5 -0.5 101 81" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">
    <defs />
    <g>
      <ellipse cx="50" cy="40" rx="40" ry="40" fill="rgb(255, 255, 255)" stroke="rgb(0, 0, 0)" pointer-events="none" />
      <path d="M 21.6 11.6 L 78.4 68.4" fill="none" stroke="rgb(0, 0, 0)" stroke-miterlimit="10" pointer-events="none" />
      <path d="M 78.4 11.6 L 21.6 68.4" fill="none" stroke="rgb(0, 0, 0)" stroke-miterlimit="10" pointer-events="none" />
      <g transform="translate(-0.5 -0.5)">
        <switch>
          <foreignObject pointer-events="none" width="100%" height="100%" requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility" style="overflow: visible; text-align: left;">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: unsafe center; justify-content: unsafe center; width: 18px; height: 1px; padding-top: 40px; margin-left: 21px;">
              <div data-drawio-colors="color: rgb(0, 0, 0); " style="box-sizing: border-box; font-size: 0px; text-align: center;">
                <div style="display: inline-block; font-size: 12px; font-family: Helvetica; color: rgb(0, 0, 0); line-height: 1.2; pointer-events: none; white-space: normal; overflow-wrap: normal;">${data.id}</div>
              </div>
            </div>
          </foreignObject>
        </switch>
      </g>
      <g transform="translate(-0.5 -0.5)">
        <switch>
          <foreignObject pointer-events="none" width="100%" height="100%" requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility" style="overflow: visible; text-align: left;">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: unsafe center; justify-content: unsafe center; width: 18px; height: 1px; padding-top: 60px; margin-left: 41px;">
              <div data-drawio-colors="color: rgb(0, 0, 0); " style="box-sizing: border-box; font-size: 0px; text-align: center;">
                <div style="display: inline-block; font-size: 12px; font-family: Helvetica; color: rgb(0, 0, 0); line-height: 1.2; pointer-events: none; white-space: normal; overflow-wrap: normal;">${data.moins}</div>
              </div>
            </div>
          </foreignObject>
        </switch>
      </g>
      <g transform="translate(-0.5 -0.5)">
        <switch>
          <foreignObject pointer-events="none" width="100%" height="100%" requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility" style="overflow: visible; text-align: left;">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: unsafe center; justify-content: unsafe center; width: 18px; height: 1px; padding-top: 40px; margin-left: 61px;">
              <div data-drawio-colors="color: rgb(0, 0, 0); " style="box-sizing: border-box; font-size: 0px; text-align: center;">
                <div style="display: inline-block; font-size: 12px; font-family: Helvetica; color: rgb(0, 0, 0); line-height: 1.2; pointer-events: none; white-space: normal; overflow-wrap: normal;">${data.marge}</div>
              </div>
            </div>
          </foreignObject>
        </switch>
      </g>
      <g transform="translate(-0.5 -0.5)">
        <switch>
          <foreignObject pointer-events="none" width="100%" height="100%" requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility" style="overflow: visible; text-align: left;">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: unsafe center; justify-content: unsafe center; width: 18px; height: 1px; padding-top: 20px; margin-left: 41px;">
              <div data-drawio-colors="color: rgb(0, 0, 0); " style="box-sizing: border-box; font-size: 0px; text-align: center;">
                <div style="display: inline-block; font-size: 12px; font-family: Helvetica; color: rgb(0, 0, 0); line-height: 1.2; pointer-events: none; white-space: normal; overflow-wrap: normal;">${data.plus}</div>
              </div>
            </div>
          </foreignObject>
        </switch>
      </g>
    </g>
  </svg>
  `; // your html template here
      },
    },
  ]);

  // @ts-ignore
  const nav = cy.navigator({
    container: false, // string | false | undefined. Supported strings: an element id selector (like "#someId"), or a className selector (like ".someClassName"). Otherwise an element will be created by the library.
    viewLiveFramerate: 0, // set false to update graph pan only on drag end; set 0 to do it instantly; set a number (frames per second) to update not more than N times per second
    thumbnailEventFramerate: 30, // max thumbnail's updates per second triggered by graph updates
    thumbnailLiveFramerate: false, // max thumbnail's updates per second. Set false to disable
    dblClickDelay: 200, // milliseconds
    removeCustomContainer: true, // destroy the container specified by user on plugin destroy
    rerenderDelay: 100, // ms to throttle rerender updates to the panzoom for performance
  });
});

document.getElementById("btn-importfile")?.addEventListener("click", (e) => {
  e.preventDefault();
  let input = document.createElement("input");
  input.type = "file";
  input.accept =
    "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  input.onchange = (_) => {
    let files = Array.from(input.files);
    if (files.length > 0 && files[0]) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(files[0]);
      reader.addEventListener("load", (e) => {
        const content = e.target?.result;
        if (content) {
          window.graph = readArrayBuffer(content);
        }
      });
    }
  };
  input.click();
});
