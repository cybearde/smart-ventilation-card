import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><body></body>',{url:'http://localhost/'});
for (const key of ['window','document','HTMLElement','customElements','CustomEvent']) globalThis[key]=dom.window[key];
await import('../smart-ventilation-card.js');
const config = {entities:{outdoor_temperature:'sensor.outdoor',supply_temperature:'sensor.supply',extract_temperature:'sensor.extract',exhaust_temperature:'sensor.exhaust',supply_fan:'sensor.fan',extract_fan:'sensor.extract_fan',bypass:'sensor.bypass',controller:'binary_sensor.controller'},extra_entities:['sensor.extra']};
const e=(state,unit)=>({state:String(state),attributes:{unit_of_measurement:unit}});
const hass={states:{'sensor.outdoor':e(0,'°C'),'sensor.supply':e(18,'°C'),'sensor.extract':e(20,'°C'),'sensor.exhaust':e(5,'°C'),'sensor.fan':e(50,'%'),'sensor.extract_fan':e(50,'%'),'sensor.bypass':e(0,'%'),'binary_sensor.controller':e('on'),'sensor.extra':e('<img src=x onerror=alert(1)>')},locale:{language:'en'},config:{unit_system:{temperature:'°C'}}};
function card(c=config) {const el=document.createElement('smart-ventilation-card');el.setConfig(c);document.body.append(el);el.hass=hass;return el;}
test('real DOM renders readings, keeps straight rails in bypass, and stops offline',()=>{
 const el=card();const initial=el.shadowRoot.querySelector('[data-flow="supply"]').getAttribute('d');
 assert.match(el.shadowRoot.textContent,/90%/);
 el.hass={...hass,states:{...hass.states,'sensor.bypass':e(100,'%')}};
 assert.equal(el.shadowRoot.querySelector('[data-flow="supply"]').getAttribute('d'),initial);assert.equal(el.shadowRoot.querySelector('[data-mode]').getAttribute('data-mode'),'bypass');
 el.hass={...hass,states:{...hass.states,'binary_sensor.controller':e('off')}};
 assert.ok(el.shadowRoot.querySelector('[data-flow="supply"]').classList.contains('stopped'));
 assert.match(el.shadowRoot.textContent,/Readings may be stale/);
});
test('unrelated HA updates preserve DOM and diagnostics stay open across relevant updates',()=>{
 const el=card();const before=el.shadowRoot.querySelector('ha-card');el.hass={...hass,states:{...hass.states,'sensor.unrelated':e(10)}};assert.equal(el.shadowRoot.querySelector('ha-card'),before);
 el.shadowRoot.querySelector('details').open=true;el.hass={...hass,states:{...hass.states,'sensor.supply':e(17,'°C')}};assert.ok(el.shadowRoot.querySelector('details').open);
});
test('configuration and entity text cannot inject markup',()=>{
 const el=card({...config,title:'<img src=x onerror=alert(1)>'});assert.equal(el.shadowRoot.querySelector('img'),null);assert.match(el.shadowRoot.querySelector('h2').textContent,/<img/);
});
test('more-info has correct entity and bubbles across shadow DOM',()=>{
 const el=card();let event;el.addEventListener('hass-more-info',e=>event=e);el.shadowRoot.querySelector('[data-entity="sensor.fan"]').click();assert.equal(event.detail.entityId,'sensor.fan');assert.ok(event.bubbles && event.composed);
});
test('missing sensor is shown as unavailable; Fahrenheit conversion and optional fields',()=>{
 const el=card({...config,temperature_unit:'°F',show_title:false,show_details:false,show_diagnostics:false,entities:{...config.entities,outdoor_temperature:'sensor.missing'}});
 assert.match(el.shadowRoot.textContent,/1 configured entity unavailable/);assert.match(el.shadowRoot.textContent,/64.4 °F/);assert.equal(el.shadowRoot.querySelector('.metrics'),null);assert.equal(el.shadowRoot.querySelector('header'),null);assert.equal(el.shadowRoot.querySelector('details'),null);assert.equal(el.shadowRoot.querySelector('.status-values'),null);
});
test('editor round-trip preserves HA layout options and removes cleared entities',()=>{
 const editor=document.createElement('smart-ventilation-card-editor');editor.setConfig({...config,grid_options:{columns:6},visibility:[{condition:'screen',media_query:'(min-width: 500px)'}]});editor.hass=hass;
 const form=editor.shadowRoot.querySelector('ha-form');
 assert.ok(form.schema.filter(s=>s.type==='expandable').every(s=>s.flatten));
 let result;editor.addEventListener('config-changed',event=>result=event.detail.config);
 form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,title:'Changed',outdoor_temperature:undefined,bypass:'sensor.other',show_title:false,show_diagnostics:false,background_opacity:0.4,animation:false}}}));
 assert.equal(result.title,'Changed');assert.equal(result.entities.outdoor_temperature,undefined);assert.equal(result.entities.bypass,'sensor.other');assert.equal(result.animation,false);assert.equal(result.show_title,false);assert.equal(result.show_diagnostics,false);assert.equal(result.background_opacity,0.4);assert.equal(result.grid_options.columns,6);assert.equal(result.visibility.length,1);
 editor.setConfig(result);assert.equal(editor.shadowRoot.querySelector('ha-form').data.bypass,'sensor.other');
});

test('heat transfer switches to a damper in bypass and hides for unknown, offline or stopped fans',()=>{
 const el=card();
 assert.ok(el.shadowRoot.querySelector('.heat-arrow'));
 for (const states of [ {'sensor.bypass':e(100,'%')}, {'sensor.bypass':e('unavailable')}, {'binary_sensor.controller':e('off')}, {'sensor.fan':e(0,'%')}, {'sensor.extract_fan':e(0,'%')}, {'sensor.supply':e(0,'°C')} ]) {
  el.hass={...hass,states:{...hass.states,...states}};
  assert.equal(el.shadowRoot.querySelector('.heat-arrow'),null);
  assert.equal(!!el.shadowRoot.querySelector('.damper'),states['sensor.bypass']?.state==='100');
 }
});
test('summer recovery reverses heat transfer without reversing the air streams',()=>{
 const el=card();
 const paths=()=>[...el.shadowRoot.querySelectorAll('[data-flow]')].map(p=>p.getAttribute('d'));
 const original=paths();
 el.hass={...hass,states:{...hass.states,'sensor.outdoor':e(30,'°C'),'sensor.supply':e(22,'°C')}};
 assert.match(el.shadowRoot.querySelector('.heat-arrow').getAttribute('aria-label'),/incoming air to exhaust/);
 assert.ok(el.shadowRoot.querySelector('.heat-arrow').hasAttribute('transform'));
 assert.deepEqual(paths(),original);
});

test('three-part footer keeps secondary readings accessible in diagnostics',()=>{
 const el=card({...config,entities:{...config.entities,room_temperature:'sensor.supply',humidity:'sensor.fan',level:'sensor.fan',setpoint:'sensor.outdoor',supply_rpm:'sensor.extract'}});
 assert.equal(el.shadowRoot.querySelectorAll('.metrics .metric').length,3);
 assert.equal(el.shadowRoot.querySelectorAll('.metrics ha-icon').length,3);
 assert.ok(el.shadowRoot.querySelector('details [data-entity="sensor.outdoor"]'));
 assert.ok(el.shadowRoot.querySelector('details [data-entity="sensor.extract"]'));
});

test('custom names are escaped, center mode is consolidated and both center texts can hide',()=>{
 const el=card({...config,exchanger_label:'My unit',labels:{outdoor_temperature:'Fresh air',supply_fan:'Intake',recovery:'Efficiency'}});
 assert.equal(el.shadowRoot.querySelector('.exchanger-name').textContent,'My unit');
 assert.equal(el.shadowRoot.querySelector('.mode-description').textContent,'Efficiency 90%');
 assert.match(el.shadowRoot.querySelector('.diagram').textContent,/Fresh air/);
 assert.match(el.shadowRoot.querySelector('[data-fan="supply"]').textContent,/Intake/);
 el.hass={...hass,states:{...hass.states,'sensor.bypass':e(100,'%')}};
 assert.equal(el.shadowRoot.querySelector('.mode-description').textContent,'Bypass 100 %');
 assert.doesNotMatch(el.shadowRoot.querySelector('.diagram').textContent,/Heat recoverybypassed/);
 el.setConfig({...config,exchanger_label:'',show_status_text:false,labels:{supply_fan:'<img src=x>'}});
 assert.equal(el.shadowRoot.querySelector('.exchanger-name'),null);
 assert.equal(el.shadowRoot.querySelector('.mode-description'),null);
 assert.equal(el.shadowRoot.querySelector('img'),null);
});
test('editor preserves and clears custom names without changing entity mappings',()=>{
 const editor=document.createElement('smart-ventilation-card-editor');editor.setConfig({...config,labels:{supply_fan:'Intake'}});editor.hass=hass;
 const form=editor.shadowRoot.querySelector('ha-form');let result;
 editor.addEventListener('config-changed',event=>result=event.detail.config);
 assert.equal(form.data.label_supply_fan,'Intake');
 form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,label_supply_fan:'',label_outdoor_temperature:'Outside',exchanger_label:undefined,show_status_text:false}}}));
 assert.deepEqual(result.labels,{outdoor_temperature:'Outside'});
 assert.equal(result.entities.supply_fan,config.entities.supply_fan);
 assert.equal(result.exchanger_label,'');assert.equal(result.show_status_text,false);
});

test('compact layout preserves readings and controls through bypass changes',()=>{
 const settings={...config,entities:{...config.entities,room_temperature:'sensor.supply',humidity:'sensor.fan',level:'sensor.fan'}};
 const regular=card(settings), small=card({...settings,compact:true});
 const readings=el=>[...el.shadowRoot.querySelectorAll('.temp,.fan-output,.metrics strong,.mode-description')].map(e=>e.textContent);
 assert.deepEqual(readings(small),readings(regular));
 assert.ok(small.getCardSize()<regular.getCardSize());
 assert.equal(small.shadowRoot.querySelectorAll('[data-entity]').length,regular.shadowRoot.querySelectorAll('[data-entity]').length);
 small.hass={...hass,states:{...hass.states,'sensor.bypass':e(100,'%')}};
 assert.equal(small.shadowRoot.querySelector('.mode-description').textContent,'Bypass 100 %');
 assert.ok(small.shadowRoot.querySelector('.damper'));
});
