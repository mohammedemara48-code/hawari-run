export const approach = (v:number, target:number, amount:number) => v < target ? Math.min(v+amount,target):Math.max(v-amount,target);
export const jumpAllowed = (sinceGround:number, sincePress:number) => sinceGround < 110 && sincePress < 120;
export const stomped = (velocityY:number, previousBottom:number, enemyTop:number) => velocityY > 0 && previousBottom <= enemyTop+9;
export const tally = (seconds:number, coins:number, enemies:number) => ({time:seconds*10,treasure:coins*100,enemies:enemies*200,total:seconds*10+coins*100+enemies*200});
export function levelSpec(index:number) {
  return index === 0 ? {name:'حارة الفوانيس',width:4992,gaps:[[1104,1176],[2112,2208],[3336,3408],[4104,4200]] as [number,number][],checkpoint:2496,portal:1632,exit:4848} : {name:'سوق تحت البلد',width:5376,gaps:[[984,1056],[1848,1944],[3072,3168],[3936,4008],[4512,4608]] as [number,number][],checkpoint:2688,portal:2352,exit:5232};
}
