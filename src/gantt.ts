import { GraphPERT } from "./PERT";

interface Link {
  target: number;
  type: "FS" | "FF" | "SS" | "SF";
}

interface Item {
  id: number;
  parent?: number;
  text: string;
  start: Date;
  end: Date;
  percent: number;
  links: Array<Link>;
  type?: 'group';
}

export function generateGantt(g: GraphPERT) {
  const data: Item[] = [];

  let i = 1;
  for (const edge of g._edges) {
    if (!edge.data.fictif && typeof edge.data.description === "string" && edge.data.duree > 0) {
      const start = new Date(1672531200000);
      start.setDate(start.getDate() + edge.from.calculateMoins());
      const end = new Date(1672531200000);
      end.setDate(end.getDate() + edge.from.calculateMoins() + edge.data.duree);
      data.push({
        id: i++,
        text: `${edge.data.name} : ${edge.data.description}`,
        start: start,
        end: end,
        percent: 0,
        links: [],
      })
    }
  }

  data.sort((a, b) => a.start - b.start || a.end - b.end)
  
  return data;
}
