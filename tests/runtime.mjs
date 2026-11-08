import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.hawari?.scene.getScene('alley')?.hero);
await page.locator('[data-screen="title"] [data-action="start"]').click();
const setup=fn=>page.evaluate(fn);const state=()=>page.evaluate(()=>{const s=window.hawari.scene.getScene('alley');return {x:s.hero.x,y:s.hero.y,vy:s.hero.body.velocity.y,mode:s.mode,power:s.power,kills:s.kills,lives:s.lives,bonus:s.bonus,time:s.remaining,coins:s.levelCoins,level:s.level};});
await page.waitForTimeout(200);
// Position a descending player directly above a stationary original cat.
await setup(()=>{const s=window.hawari.scene.getScene('alley');s.hurtUntil=0;const e=s.enemies.getChildren()[0];e.body.setVelocityX(0);s.hero.body.reset(e.x,242);s.hero.setVelocity(0,170);});await page.waitForTimeout(230);
console.log('Stomp:',await state());assert.equal((await state()).kills,1,'stomp must defeat the cat, not injure the player');
await browser.close();assert.deepEqual(errors,[]);
