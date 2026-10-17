import type { APIRoute } from 'astro';
import { referenceDocuments } from '../lib/referenceDocuments.mjs';
import { resourceGroups } from '../lib/navigation';
export const GET:APIRoute=async()=>{
 const resources=resourceGroups.flatMap(group=>group.resources.map(item=>({title:item.title,url:item.url,category:group.title,text:`${item.title} ${item.description}`})));
 const documents=(await referenceDocuments()).map((doc:{title:string,path:string,historical:boolean,text:string})=>({title:doc.title,url:doc.path,category:doc.historical?'Historical reference document':'Reference document',text:doc.text}));
 return new Response(JSON.stringify([...resources,...documents]),{headers:{'Content-Type':'application/json; charset=utf-8'}});
};
