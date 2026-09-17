import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.HTMLElement = class {};
globalThis.customElements = {get(){return true;}};
globalThis.window = {};
const {normalizeConfig, numeric, temperatureC, temperatureColor, bypassState, recovery, fanSpeed} = await import('../smart-ventilation-card.js');
const e = (state,unit) => ({state:String(state),attributes:{unit_of_measurement:unit}});
test('configuration validation and defaults',()=>{
 const c=normalizeConfig({entities:{supply_temperature:'sensor.supply'}});assert.equal(c.animation,true);assert.equal(c.background_opacity,1);assert.equal(normalizeConfig({background_opacity:0}).background_opacity,0);
 for(const c of [{background_opacity:-0.1},{background_opacity:1.1},{background_opacity:'0.5'},{background_opacity:NaN},{entities:[]},{entities:{bad:'sensor.a'}},{entities:{bypass:'<script>'}},{hot_temperature:0},{animation:'false'},{extra_entities:'sensor.a'},{bypass_threshold:101}])assert.throws(()=>normalizeConfig(c));
});
test('unknown values never become zero',()=>{for(const v of [null,undefined,'',' ','unknown','unavailable','NaN','Infinity'])assert.equal(numeric(v),null);assert.equal(numeric('0'),0);});
test('temperature conversions and bounded colors',()=>{assert.equal(temperatureC(e(32,'°F')),0);assert.equal(temperatureC(e(273.15,'K')),0);assert.equal(temperatureC(e(20,'rpm')),null);assert.equal(temperatureColor(-30),temperatureColor(0));assert.equal(temperatureColor(90),temperatureColor(30));assert.notEqual(temperatureColor(0),temperatureColor(30));});
test('numeric, binary, text and unknown bypass',()=>{assert.equal(bypassState(e(0)),'closed');assert.equal(bypassState(e(1)),'active');assert.equal(bypassState(e(99)),'active');assert.equal(bypassState(e('on')),'active');assert.equal(bypassState(e('off')),'closed');for(const v of ['unavailable',-1,101,'unexpected'])assert.equal(bypassState(e(v)),'unknown');assert.equal(bypassState(e('open'),normalizeConfig({bypass_active_state:'open'})),'active');});
test('efficiency excludes bypass, small deltas and implausible recovery',()=>{assert.equal(recovery(0,18,20,'closed'),90);assert.equal(recovery(30,22,20,'closed'),80);for(const args of [[0,18,20,'active'],[0,18,20,'unknown'],[20,20,20,'closed'],[0,25,20,'closed'],[null,18,20,'closed']])assert.equal(recovery(...args),null);});
test('fan output takes priority over provisional RPM and missing states stop motion',()=>{assert.equal(fanSpeed(e(50),e('Level 3'),false),50);assert.equal(fanSpeed(e(0),e('Level 3'),false),0);assert.equal(fanSpeed(e(50),e('Off'),false),0);assert.equal(fanSpeed(e(50),e('Level 3'),true),0);assert.equal(fanSpeed(e('unavailable'),e('Level 3'),false),0);assert.equal(fanSpeed(undefined,e('Level 3'),false),75);});
