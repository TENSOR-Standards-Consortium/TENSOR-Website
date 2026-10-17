// Display positions only. Imported definitions and exported bytes are not rewritten.
import { DOMAINS, STAGES } from './graphAtlas.mjs';
export function studioPositions(nodes) {
  const domains=[...DOMAINS,...[...new Set(nodes.map(n=>n.category||'Uncategorized'))].filter(d=>!DOMAINS.includes(d)).sort()];
  const stages=[...STAGES,...[...new Set(nodes.map(n=>n.archetype||'additional'))].filter(d=>!STAGES.includes(d)).sort()];
  const groups=new Map();
  for(const n of nodes){const key=JSON.stringify([n.category||'Uncategorized',n.archetype||'additional']);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);}
  const rows=Math.max(1,...[...groups.values()].map(g=>Math.ceil(g.length/4)));
  const positions=new Map();
  for(const group of groups.values())group.slice().sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true})).forEach((n,i)=>positions.set(n.id,{x:stages.indexOf(n.archetype||'additional')*900+(i%4)*200,y:domains.indexOf(n.category||'Uncategorized')*(rows*100+100)+Math.floor(i/4)*100}));
  return positions;
}

export function studioNeighborhoodPositions(nodes, selectedId) {
  const columns=Math.max(1,Math.ceil(Math.sqrt(nodes.length*.7)));
  const rows=Math.ceil(nodes.length/columns),middle=Math.floor(rows/2)*columns+Math.floor(columns/2);
  const positions=new Map([[selectedId,{x:0,y:0}]]);
  let slot=0;
  for(const node of nodes.filter(n=>n.id!==selectedId).sort((a,b)=>String(a.category).localeCompare(String(b.category))||String(a.archetype).localeCompare(String(b.archetype))||a.id.localeCompare(b.id,'en',{numeric:true}))){
    if(slot===middle)slot++;
    positions.set(node.id,{x:(slot%columns-Math.floor(columns/2))*210,y:(Math.floor(slot/columns)-Math.floor(rows/2))*110});slot++;
  }
  return positions;
}
