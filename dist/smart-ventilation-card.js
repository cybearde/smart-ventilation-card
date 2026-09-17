/** Airflow Card • dependency-free Lovelace module. */
export const FIELDS = {
  outdoor_temperature: 'Outdoor air', supply_temperature: 'Supply air',
  extract_temperature: 'Extract air', exhaust_temperature: 'Exhaust air',
  supply_fan: 'Supply fan output', extract_fan: 'Extract fan output',
  supply_rpm: 'Supply fan RPM (assumed)', extract_rpm: 'Extract fan RPM (assumed)',
  bypass: 'Bypass position', room_temperature: 'Room temperature', humidity: 'Humidity',
  level: 'Ventilation level', setpoint: 'Temperature setpoint', hygrostat: 'Hygrostat',
  gateway: 'Gateway connected', controller: 'Controller responding', efficiency: 'Heat recovery efficiency',
};
const LABELS = {...FIELDS, recovery:'Recovery'};
const DEFAULTS = {type: 'custom:smart-ventilation-card', title: 'Airflow Card', show_title: true, animation: true,
  exchanger_label: 'HEAT EXCHANGER', show_status_text: true, compact: false, labels: {},
  show_details: true, show_diagnostics: true, background_opacity: 1, calculate_efficiency: true, bypass_threshold: 1, bypass_active_state: 'on',
  cold_temperature: 0, hot_temperature: 30, temperature_unit: 'auto', entities: {}, extra_entities: []};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function numeric(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
export function normalizeConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Card configuration must be an object.');
  const c = {...DEFAULTS, ...config, entities: {...(config.entities ?? {})}, extra_entities: config.extra_entities ?? []};
  if (config.entities != null && (typeof config.entities !== 'object' || Array.isArray(config.entities))) throw new Error('entities must map roles to entity IDs.');
  for (const [key, value] of Object.entries(c.entities)) {
    if (!(key in FIELDS)) throw new Error(`Unknown entity role: ${key}`);
    if (value !== '' && (typeof value !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(value))) throw new Error(`Invalid entity ID for ${key}.`);
  }
  if (!Array.isArray(c.extra_entities) || c.extra_entities.some(v => typeof v !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(v))) throw new Error('extra_entities must be a list of entity IDs.');
  if (typeof c.exchanger_label !== 'string') throw new Error('exchanger_label must be text.');
  if (!c.labels || typeof c.labels !== 'object' || Array.isArray(c.labels)) throw new Error('labels must map reading roles to names.');
  for (const [key,value] of Object.entries(c.labels)) if (!(key in LABELS) || typeof value !== 'string') throw new Error(`Invalid custom label: ${key}`);
  for (const key of ['compact', 'show_status_text', 'animation', 'show_title', 'show_details', 'show_diagnostics', 'calculate_efficiency']) if (typeof c[key] !== 'boolean') throw new Error(`${key} must be true or false.`);
  for (const key of ['bypass_threshold','cold_temperature','hot_temperature','background_opacity']) if (typeof c[key] !== 'number' || !Number.isFinite(c[key])) throw new Error(`${key} must be a number.`);
  if (c.background_opacity < 0 || c.background_opacity > 1) throw new Error('background_opacity must be between 0 and 1.');
  if (c.bypass_threshold < 0 || c.bypass_threshold > 100) throw new Error('Bypass threshold must be between 0 and 100.');
  if (c.hot_temperature <= c.cold_temperature) throw new Error('Hot temperature must exceed cold temperature (°C).');
  if (!['auto','°C','°F'].includes(c.temperature_unit)) throw new Error('temperature_unit must be auto, °C or °F.');
  if (typeof c.title !== 'string' || typeof c.bypass_active_state !== 'string') throw new Error('Title and bypass active state must be text.');
  return c;
}
export function temperatureC(entity) {
  const n = numeric(entity?.state); if (n === null) return null;
  const unit = entity?.attributes?.unit_of_measurement;
  if (unit === '°F') return (n - 32) * 5 / 9;
  if (unit === 'K') return n - 273.15;
  return !unit || unit === '°C' ? n : null;
}
export function temperatureColor(c, config = DEFAULTS) {
  if (c === null || !Number.isFinite(c)) return 'var(--disabled-text-color, #88919b)';
  const ratio = Math.min(1, Math.max(0, (c - config.cold_temperature) / (config.hot_temperature - config.cold_temperature)));
  const warm = Math.min(1, Math.max(0, (ratio - .60) / .16));
  return `rgb(${Math.round(94+161*warm)} ${Math.round(220-49*warm)} ${Math.round(241-166*warm)})`;
}
export function bypassState(entity, config = DEFAULTS) {
  if (!entity || ['unknown','unavailable',''].includes(entity.state)) return 'unknown';
  const n = numeric(entity.state);
  if (n !== null) return n < 0 || n > 100 ? 'unknown' : n >= config.bypass_threshold ? 'active' : 'closed';
  if (entity.state.toLowerCase() === config.bypass_active_state.toLowerCase()) return 'active';
  return ['off','closed','false','inactive'].includes(entity.state.toLowerCase()) ? 'closed' : 'unknown';
}
export function recovery(outdoor, supply, extract, bypass) {
  if (bypass !== 'closed' || [outdoor,supply,extract].some(n => n === null) || Math.abs(extract-outdoor) < 1) return null;
  const result = (supply-outdoor) / (extract-outdoor) * 100;
  return result >= 0 && result <= 100 ? result : null;
}
export function fanSpeed(output, level, offline) {
  if (offline || ['off','0'].includes(String(level?.state).toLowerCase())) return 0;
  const n = numeric(output?.state);
  // Configured-but-unavailable output is never replaced with a guessed running state.
  if (output) return n === null ? 0 : Math.max(0, Math.min(100,n));
  const match = String(level?.state ?? '').match(/^(?:Level )?([1-4])$/i);
  return match ? Number(match[1])*25 : 0;
}
const style = `
:host{display:block;min-width:0;font-family:var(--ha-font-family,system-ui,sans-serif);color:#f2f5f8}
ha-card{display:block;overflow:hidden;position:relative;isolation:isolate;background:transparent;border:0;box-shadow:none;--ha-card-border-width:0;--ha-card-box-shadow:none;border-radius:16px;color:#f2f5f8;container-type:inline-size}
ha-card::before{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse at 50% 40%,#242c32 0%,#1b2025 75%);opacity:var(--airflow-background-opacity,1);pointer-events:none;z-index:0}
ha-card>*{position:relative;z-index:1}
header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 16px 5px;flex-wrap:wrap}h2{font-size:17px;font-weight:650;margin:0;line-height:1.25;overflow-wrap:anywhere}
.center-text{display:flex;align-items:center;justify-content:center;text-align:center;overflow-wrap:anywhere;line-height:1.15;height:100%;font-size:10px;color:#e4eaf0}.exchanger-name{font-size:9px}.mode-description{font-size:10px}
.diagram{padding:0 12px}svg{display:block;width:100%;height:auto;overflow:visible}svg text{fill:#f2f5f8;font-family:inherit}.label{font-size:10px;fill:#d7e0e9}.temp{font-size:14px;font-weight:600}.heat-core{fill:#9abacb;fill-opacity:.13;stroke:#9abacb;stroke-opacity:.2;stroke-width:.8}.heat-core.bypassed{fill-opacity:.13}.core-label{font-size:9px;fill:#eef4f8}.core-value{font-size:15px;font-weight:650}.mode-text{font-size:10px;fill:#e4eaf0}.subtle{font-size:8px;fill:#a6b3bf}.heat-arrow{fill:url(#heat-gradient);animation:heat-pulse 2s ease-in-out infinite}.heat-waves{fill:none;stroke:#ffb452;stroke-width:2;stroke-linecap:round}.damper{stroke:#f0f5f8;stroke-width:3;stroke-linecap:round;fill:none}.track{fill:none;stroke-width:16;stroke-linecap:butt;opacity:.25}.flow{fill:none;stroke-width:3;stroke-linecap:round;stroke-dasharray:.1 9;animation:flow 1s linear infinite;filter:drop-shadow(0 0 3px currentColor)}.stopped{animation:none!important;opacity:.25}.rotor{transform-box:view-box;transform-origin:18px 18px;animation:spin 2s linear infinite}.fan{display:flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;background:transparent;color:#b4bfcb}.fan>svg{width:36px;height:36px}.fan .housing{fill:#20272e;stroke:#aebac7;stroke-width:1.6}.fan-label{font-size:9px;fill:#cbd6e1}.fan-output{font-size:12px;font-weight:600}button{font:inherit;color:inherit;cursor:pointer;text-align:left;border:0}button:focus-visible,summary:focus-visible{outline:2px solid #67def0;outline-offset:-2px}button:disabled{cursor:default}
.compact .metrics{padding:10px 0}.compact header{padding-top:12px}.metrics{border-top:1px solid #39434c;display:flex;margin:0 14px;padding:16px 0;gap:0}.metric{background:none;padding:8px;min-width:0}.metrics .metric{flex:1;display:flex;align-items:center;gap:10px;padding:0 10px}.metrics .metric:first-child{padding-left:0}.metrics .metric+.metric{border-left:1px solid #63707c}.metric span{display:block;font-size:10px;color:#b6c3d0;overflow-wrap:anywhere}.metric strong{display:block;font-size:14px;font-weight:600;margin-top:3px;overflow-wrap:anywhere}.metric ha-icon{--mdc-icon-size:25px;color:#bdc9d5;flex-shrink:0}.metrics .metric:last-child{padding-right:0}details{border-top:1px solid #39434c;padding:10px 16px;font-size:11px}summary{cursor:pointer;color:#aab8c5}.extras{display:grid;grid-template-columns:1fr 1fr;margin-top:8px}.notice{margin:0;padding:8px 16px;color:#f2f5f8;border-left:3px solid #ffb452;font-size:11px}.empty{padding:28px 18px;color:#b6c3d0;font-size:14px}.disabled .flow,.disabled .rotor,.disabled .heat-arrow{animation:none!important}@keyframes flow{to{stroke-dashoffset:-36.4}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes heat-pulse{50%{opacity:.65}}@media(prefers-reduced-motion:reduce){.flow,.rotor,.heat-arrow{animation:none!important}}@container(max-width:350px){header{padding:14px 14px 2px}h2{font-size:16px}.metrics .metric{gap:5px;padding:0 7px}.metric ha-icon{--mdc-icon-size:22px}.metric strong{font-size:13px}}
`;
const fanIcon = speed => `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="housing" cx="18" cy="18" r="16"/><g class="rotor ${speed ? '' : 'stopped'}" style="animation-duration:${speed ? 6-5*speed/100 : 6}s" fill="currentColor">${[0,120,240].map(angle=>`<path transform="rotate(${angle} 18 18)" d="M17 16C12 10 13 6 17 6C24 5 24 11 19 16Z"/>`).join('')}<circle cx="18" cy="18" r="2"/></g></svg>`;
export class SmartVentilationCard extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); this._signature = ''; }
  static getConfigElement() { return document.createElement('smart-ventilation-card-editor'); }
  static getStubConfig() { return {type:DEFAULTS.type, title:DEFAULTS.title, entities:{}}; }
  setConfig(config) { this._config = normalizeConfig(config); this._signature = ''; this.render(); }
  set hass(hass) { this._hass = hass; this.render(); }
  get hass() { return this._hass; }
  getCardSize() { return (this._config?.show_details === false ? 5 : 7) - (this._config?.show_title === false ? 1 : 0) - (this._config?.compact ? 1 : 0); }
  getGridOptions() { return {columns:12,min_columns:6}; }
  entity(key) { const id = this._config.entities[key]; return id ? this._hass?.states[id] ?? {state:'unavailable',attributes:{}} : undefined; }
  value(entity, temperature = false) {
    if (!entity || ['unknown','unavailable',''].includes(entity.state)) return '—';
    const n = numeric(entity.state); let unit = entity.attributes?.unit_of_measurement ?? '';
    if (temperature) {
      let c = temperatureC(entity); if (c === null) return '—';
      unit = this._config.temperature_unit === 'auto' ? this._hass?.config?.unit_system?.temperature ?? '°C' : this._config.temperature_unit;
      return `${this.format(unit === '°F' ? c*9/5+32 : c,1)} ${unit}`;
    }
    return `${n === null ? entity.state : this.format(n,unit === 'rpm' ? 0 : 1)}${unit ? ' '+unit : ''}`;
  }
  format(n,digits) { try { return new Intl.NumberFormat(this._hass?.locale?.language ?? 'en',{maximumFractionDigits:digits}).format(n); } catch { return n.toFixed(digits); } }
  render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const signature = JSON.stringify([c, this._hass.locale,this._hass.config?.unit_system, Object.values(c.entities).concat(c.extra_entities).map(id=>this._hass.states[id])]);
    if (signature === this._signature) return;
    this._signature = signature;
    const detailsOpen = this.shadowRoot.querySelector('details')?.open;
    const focusedEntity = this.shadowRoot.activeElement?.dataset?.entity;
    const layout = c.compact ? {height:174,top:48,bottom:148,coreY:4,coreHeight:163,headingY:8,statusY:110} : {height:238,top:76,bottom:184,coreY:28,coreHeight:198,headingY:34,statusY:153};
    const e = key => this.entity(key);
    const name = (key,fallback=LABELS[key]) => c.labels[key]?.trim() || fallback;
    const fit = (value,limit=12,width=68) => value.length > limit ? ` textLength="${width}" lengthAdjust="spacingAndGlyphs"` : '';
    const centerText = (text,y,cls) => `<foreignObject x="144" y="${y}" width="72" height="23"><div xmlns="http://www.w3.org/1999/xhtml" class="center-text ${cls}">${escape(text)}</div></foreignObject>`;
    const bypass = bypassState(e('bypass'),c);
    const offline = ['gateway','controller'].some(key=>c.entities[key] && e(key)?.state !== 'on');
    const speed = side => fanSpeed(e(`${side}_fan`), e('level'), offline);
    const temp = key => temperatureC(e(`${key}_temperature`));
    const colors = Object.fromEntries(['outdoor','supply','extract','exhaust'].map(k=>[k,temperatureColor(temp(k),c)]));
    const textColor = key => colors[key];
    const efficiency = offline || bypass !== 'closed' ? '—' : c.entities.efficiency ? this.value(e('efficiency')) : c.calculate_efficiency ? (()=>{const r = recovery(temp('outdoor'),temp('supply'),temp('extract'),bypass);return r === null ? '—' : `${this.format(r,0)}%`;})() : '—';
    const delta = temp('extract') === null || temp('outdoor') === null ? null : temp('extract') - temp('outdoor');
    const heatVisible = bypass === 'closed' && !offline && Number.parseFloat(efficiency) > 0 && delta !== null && Math.abs(delta) >= 1 && speed('supply') > 0 && speed('extract') > 0;
    const description = offline ? 'Offline' : bypass === 'active' ? `${name('bypass','Bypass')} ${numeric(e('bypass')?.state) === null ? 'active' : this.value(e('bypass'))}` : bypass === 'unknown' ? `${name('bypass','Bypass')} unknown` : `${name('recovery')} ${efficiency}`;
    const heatIndicator = offline ? `<g data-mode="offline"></g>`
      : bypass === 'active' ? `<g data-mode="bypass"><path class="damper" d="M159 103V132M201 103V132M166 117H194"/></g>`
      : bypass === 'unknown' ? `<g data-mode="unknown"><text x="180" y="128" text-anchor="middle" class="core-value">?</text></g>`
      : `<g data-mode="recovery">${heatVisible ? `<g><path class="heat-arrow" aria-label="${delta > 0 ? 'Heat recovered to supply air' : 'Heat transferred from incoming air to exhaust'}" ${delta < 0 ? 'transform="rotate(180 180 113)"' : ''} d="M176 134V105H170L180 92L190 105H184V134Z"/><path class="heat-waves" d="M174 138q3 3 0 6t0 6M180 138q3 3 0 6t0 6M186 138q3 3 0 6t0 6"/></g>` : ''}</g>`;
    const path = (id,d,color,fan) => `<path class="track" d="${d}" stroke="${color}"/><path data-flow="${id}" class="flow ${speed(fan) ? '' : 'stopped'}" d="${d}" stroke="${color}" style="animation-duration:${3-2*speed(fan)/100}s"/>`;
    const metric = (key,label=FIELDS[key],entity=e(key),id=c.entities[key]) => `<button class="metric" ${id ? `data-entity="${escape(id)}"` : 'disabled'}><span>${escape(name(key,label))}</span><strong>${escape(this.value(entity,key.includes('temperature') || key==='setpoint'))}</strong></button>`;
    const corner = (key,x,y,label,anchor='start') => `<g transform="translate(${x} ${y})" text-anchor="${anchor}"><text class="label"${fit(name(`${key}_temperature`,label),15,104)}>${escape(name(`${key}_temperature`,label))}</text><text class="temp" y="15" style="fill:${textColor(key)}">${escape(this.value(e(`${key}_temperature`),true))}</text></g>`;
    const inlineFan = (side, x, y) => {
      const labelY = side === 'extract' && !c.compact ? 211 : y-36;
      return `<g class="inline-fan" data-fan="${side}"><text x="${x}" y="${labelY}" text-anchor="middle" class="fan-label"${fit(name(`${side}_fan`,`${side==='supply'?'Supply':'Extract'} fan`))}>${escape(name(`${side}_fan`,`${side==='supply'?'Supply':'Extract'} fan`))}</text><text x="${x}" y="${labelY+13}" text-anchor="middle" class="fan-output">${escape(this.value(e(`${side}_fan`)))}</text><foreignObject x="${x-18}" y="${y-18}" width="36" height="36"><button xmlns="http://www.w3.org/1999/xhtml" class="fan" aria-label="${escape(name(`${side}_fan`,`${side==='supply'?'Supply':'Extract'} fan`))} ${escape(this.value(e(`${side}_fan`)))}" ${c.entities[`${side}_fan`] ? `data-entity="${escape(c.entities[`${side}_fan`])}"` : 'disabled'}>${fanIcon(speed(side))}</button></foreignObject></g>`;
    };
    const status = offline ? 'Offline' : bypass==='active' ? 'Bypass active' : bypass==='closed' ? 'Heat recovery' : 'Bypass unknown';
    const missing = Object.entries(c.entities).filter(([,id])=>id && (!this._hass.states[id] || ['unknown','unavailable'].includes(this._hass.states[id].state))).length;
    const footer = (key,label,icon) => `<button class="metric" data-entity="${escape(c.entities[key])}"><ha-icon icon="mdi:${icon}"></ha-icon><div><span>${escape(name(key,label))}</span><strong>${escape(this.value(e(key),key==='room_temperature'))}</strong></div></button>`;
    const diagnostics = ['setpoint','hygrostat','supply_rpm','extract_rpm','gateway','controller'].filter(k=>c.entities[k]);
    this.shadowRoot.innerHTML = `<style>${style}</style><ha-card style="--airflow-background-opacity:${c.background_opacity}" class="${c.animation ? '' : 'disabled'} ${c.show_title ? '' : 'headerless'} ${c.compact ? 'compact' : ''}">
      ${c.show_title ? `<header><h2>${escape(c.title)}</h2></header>` : ''}
      ${Object.values(c.entities).some(Boolean) ? `<div class="diagram"><svg viewBox="0 0 360 ${layout.height}" role="group" aria-label="${status}. ${escape(['outdoor','supply','extract','exhaust'].map(key=>`${key}: ${this.value(e(`${key}_temperature`),true)}`).join('; '))}. Outdoor air flows to supply; extract air flows to exhaust. ${bypass==='active'?'Heat recovery is bypassed. The lines show airflow direction, not the physical bypass duct.':''}">

      <defs>
        <linearGradient id="supply-gradient" gradientUnits="userSpaceOnUse" x1="32" y1="${layout.top}" x2="328" y2="${layout.top}"><stop stop-color="${colors.outdoor}"/><stop offset="1" stop-color="${colors.supply}"/></linearGradient>
        <linearGradient id="extract-gradient" gradientUnits="userSpaceOnUse" x1="32" y1="${layout.bottom}" x2="328" y2="${layout.bottom}"><stop stop-color="${colors.exhaust}"/><stop offset="1" stop-color="${colors.extract}"/></linearGradient>
        <linearGradient id="heat-gradient" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#eaa64b"/><stop offset="1" stop-color="#50bed2"/></linearGradient>
      </defs>
      <rect class="heat-core ${bypass==='active'?'bypassed':''}" x="140" y="${layout.coreY}" width="80" height="${layout.coreHeight}" rx="8"/>
      ${c.exchanger_label ? centerText(c.exchanger_label,layout.headingY,'exchanger-name') : ''}
      ${path('supply',`M54 ${layout.top}H306`,'url(#supply-gradient)','supply')}
      ${path('extract',`M306 ${layout.bottom}H54`,'url(#extract-gradient)','extract')}
      <path d="M300 ${layout.top-4}L304 ${layout.top}L300 ${layout.top+4}" fill="none" stroke="${colors.supply}" stroke-width="2"/>
      <path d="M60 ${layout.bottom-4}L56 ${layout.bottom}L60 ${layout.bottom+4}" fill="none" stroke="${colors.exhaust}" stroke-width="2"/>
      ${c.compact ? `<g transform="translate(0 12) scale(1 .62)">${heatIndicator}</g>` : heatIndicator}
      ${c.show_status_text ? centerText(description,layout.statusY,'mode-description') : ''}
      ${inlineFan('supply',248,layout.top)}${inlineFan('extract',112,layout.bottom)}
      ${corner('outdoor',2,layout.top-20,'Outdoor')}${corner('supply',358,layout.top-20,'Supply','end')}${corner('exhaust',2,layout.bottom-7,'Exhaust')}${corner('extract',358,layout.bottom-7,'Extract','end')}
      </svg></div>

      ${c.show_details ? `<div class="metrics">${[['room_temperature','Room','home-outline'],['humidity','Humidity','water-outline'],['level','Level','signal']].filter(([k])=>c.entities[k]).map(([k,label,icon])=>footer(k,label,icon)).join('')}</div>` : ''}
      ${missing || offline ? `<p class="notice" role="status">${offline?'Connection lost or unknown. Readings may be stale. ':''}${missing?`${missing} configured ${missing===1?'entity':'entities'} unavailable or unknown.`:''}</p>`:''}
      ${c.show_diagnostics && (c.extra_entities.length || diagnostics.length) ? `<details ${detailsOpen?'open':''}><summary>Diagnostics & additional values</summary><div class="extras">${diagnostics.map(k=>metric(k)).join('')}${c.extra_entities.map(id=>metric('',this._hass.states[id]?.attributes?.friendly_name??id,this._hass.states[id],id)).join('')}</div></details>`:''}` : '<p class="empty">Choose your ventilation entities in the visual editor or YAML settings to get started.</p>'}
      </ha-card>`;
    if (focusedEntity) [...this.shadowRoot.querySelectorAll('[data-entity]')].find(el=>el.dataset.entity===focusedEntity)?.focus();
    this.shadowRoot.querySelectorAll('[data-entity]').forEach(button => button.addEventListener('click',()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:button.dataset.entity},bubbles:true,composed:true}))));
  }
}

export class SmartVentilationCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); }
  setConfig(config) { this._config = normalizeConfig(config); this.render(); }
  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; else this.render(); }
  async connectedCallback() {
    // ha-form is loaded lazily in some HA versions. Load built-in editor elements.
    if (!customElements.get('ha-form') && window.loadCardHelpers) {
      const helpers = await window.loadCardHelpers();
      const card = await helpers.createCardElement({type:'entities',entities:[]});
      await card.constructor.getConfigElement?.();
    }
    this.render();
  }
  render() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      this.shadowRoot.innerHTML = '<style>:host{display:block}p{color:var(--secondary-text-color);font-size:13px;line-height:1.5}</style><p>Map entities from either firmware integration. All fields are optional. Temperature color limits are in °C. Numeric bypass opens at the threshold; binary/text bypass uses the active state. RPM readings are displayed but do not drive animation.</p><ha-form></ha-form>';
      this._form = this.shadowRoot.querySelector('ha-form');
      this._form.computeLabel = schema => schema.label ?? schema.name;
      this._form.addEventListener('value-changed', event => {
        event.stopPropagation();
        const data = event.detail.value;
        const entities = Object.fromEntries(Object.keys(FIELDS).filter(key=>data[key]).map(key=>[key,data[key]]));
        const options = Object.fromEntries(Object.keys(DEFAULTS).filter(key=>key in data && key!=='entities' && key!=='type').map(key=>[key,data[key]]));
        const labels = Object.fromEntries(Object.keys(LABELS).filter(key=>data[`label_${key}`]?.trim()).map(key=>[key,data[`label_${key}`]]));
        const next = {...this._config,...options,entities,labels,exchanger_label:data.exchanger_label ?? ''};
        // Leave range validation to setConfig so HA shows its standard config error.
        this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));
      });
    }
    this._form.hass = this._hass;
    this._form.data = {...this._config,...this._config.entities,...Object.fromEntries(Object.keys(LABELS).map(key=>[`label_${key}`,this._config.labels[key] ?? '']))};
    this._form.schema = [
      {name:'background_opacity',label:'Background opacity (0 = transparent, 1 = opaque)',selector:{number:{min:0,max:1,step:0.05,mode:'slider'}}},
      {name:'compact',label:'Compact layout',selector:{boolean:{}}},
      {name:'show_title',label:'Show title',selector:{boolean:{}}},
      {name:'exchanger_label',label:'Heat exchanger label (empty hides it)',selector:{text:{}}},
      {name:'show_status_text',label:'Show center recovery/bypass description',selector:{boolean:{}}},
      {type:'expandable',flatten:true,name:'names',title:'Custom display names',schema:Object.entries(LABELS).map(([key,label])=>({name:`label_${key}`,label,selector:{text:{}}}))},
      {name:'title',label:'Title',selector:{text:{}}},
      {type:'expandable',flatten:true,name:'air',title:'Air temperatures',schema:Object.entries(FIELDS).slice(0,4).map(([name,label])=>({name,label,selector:{entity:{domain:['sensor','input_number']}}}))},
      {type:'expandable',flatten:true,name:'values',title:'Fans, bypass & other values',schema:Object.entries(FIELDS).slice(4).map(([name,label])=>({name,label,selector:{entity:{}}}))},
      {name:'extra_entities',label:'Additional values (diagnostics, calibration, clock)',selector:{entity:{multiple:true}}},
      {name:'animation',label:'Animate airflow and fans',selector:{boolean:{}}},
      {name:'show_diagnostics',label:'Show diagnostics and additional values',selector:{boolean:{}}},
      {name:'show_details',label:'Show room and operating values',selector:{boolean:{}}},
      {name:'calculate_efficiency',label:'Calculate heat recovery when no efficiency entity is set',selector:{boolean:{}}},
      {name:'temperature_unit',label:'Temperature display',selector:{select:{options:['auto','°C','°F'],mode:'dropdown'}}},
      {type:'expandable',flatten:true,name:'advanced',title:'Temperature colors & bypass detection',schema:[
        {name:'cold_temperature',label:'Cold color limit (°C)',selector:{number:{min:-50,max:50,step:1,mode:'box'}}},
        {name:'hot_temperature',label:'Hot color limit (°C)',selector:{number:{min:-49,max:80,step:1,mode:'box'}}},
        {name:'bypass_threshold',label:'Bypass active at or above (%)',selector:{number:{min:0,max:100,step:1,mode:'box'}}},
        {name:'bypass_active_state',label:'Active state for binary/text bypass',selector:{text:{}}},
      ]},
    ];
  }
}
if (!customElements.get('smart-ventilation-card')) customElements.define('smart-ventilation-card',SmartVentilationCard);
if (!customElements.get('smart-ventilation-card-editor')) customElements.define('smart-ventilation-card-editor',SmartVentilationCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(c=>c.type==='smart-ventilation-card')) window.customCards.push({type:'smart-ventilation-card',name:'Airflow Card',description:'Compact ventilation temperatures, animated airflow and heat-transfer status.',preview:true});
