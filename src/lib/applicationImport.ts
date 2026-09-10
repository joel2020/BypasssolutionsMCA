export interface ApplicationField { key: string; label: string; aliases: string[]; type?: 'date' | 'number'; wide?: boolean }
export const APPLICATION_FIELDS: ApplicationField[] = [
  {key:'legal_name',label:'Legal business name',aliases:['business legal name','legal name','business name','company name']},
  {key:'dba',label:'DBA',aliases:['doing business as','business dba']},
  {key:'business_address',label:'Business address',aliases:['business street address','physical business address'],wide:true},
  {key:'city',label:'City',aliases:['business city']},
  {key:'state',label:'State',aliases:['business state']},
  {key:'zip',label:'ZIP',aliases:['zip code','business zip','postal code']},
  {key:'business_phone',label:'Business phone',aliases:['business telephone','company phone']},
  {key:'business_email',label:'Business email',aliases:['business email address','company email']},
  {key:'website',label:'Website',aliases:['business website']},
  {key:'start_date',label:'Business start date',aliases:['date business started','date established','business inception date'],type:'date'},
  {key:'entity_type',label:'Entity type',aliases:['business structure','business entity type','type of entity']},
  {key:'industry',label:'Industry',aliases:['type of business','business industry']},
  {key:'funding_amount_requested',label:'Requested amount ($)',aliases:['requested amount','amount requested','funding amount requested','loan amount','requested funding'],type:'number'},
  {key:'use_of_funds',label:'Use of funds',aliases:['purpose of funding','loan purpose']},
  {key:'annual_revenue',label:'Gross annual revenue ($)',aliases:['gross annual revenue','annual revenue','annual sales'],type:'number'},
  {key:'owner_full_name',label:'Owner full name',aliases:['owner name','principal name','applicant name']},
  {key:'owner_title',label:'Owner title',aliases:['principal title']},
  {key:'ownership_pct',label:'Ownership %',aliases:['ownership percentage','percent ownership','percentage ownership']},
  {key:'owner_dob',label:'Owner date of birth',aliases:['owner dob','date of birth','dob'],type:'date'},
  {key:'phone',label:'Owner mobile',aliases:['owner phone','mobile phone','cell phone','owner cell']},
  {key:'owner_home_address',label:'Owner home address',aliases:['home address','owner address','residential address'],wide:true},
  {key:'ein_last_four',label:'EIN last four',aliases:[]},
  {key:'full_ein',label:'Full EIN (PDF only)',aliases:['ein','business ein','federal tax id','tax id']},
  {key:'ssn_last_four',label:'SSN last four',aliases:[]},
  {key:'full_ssn',label:'Full SSN (PDF only)',aliases:['ssn','owner ssn','social security number']},
];
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function dateValue(value: string): string | null {
  let iso = value;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (us) iso = `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === iso ? iso : null;
}
function normalized(field: ApplicationField, raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > 250 || /\[\s*\]|☐/.test(value)) return null;
  if (field.key === 'business_email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  if (field.key === 'ownership_pct') {
    const number=value.replace(/%$/,'').trim();
    return /^\d+(?:\.\d+)?$/.test(number) && Number(number)<=100 ? number : null;
  }
  if (field.type === 'date') return dateValue(value);
  if (field.type === 'number') {
    const number = value.replace(/[$,\s]/g,'');
    return /^\d+(?:\.\d{1,2})?$/.test(number) && Number.isFinite(Number(number)) ? number : null;
  }
  if (field.key.startsWith('full_')) {
    const digits = value.replace(/[\s-]/g,'');
    return /^\d{9}$/.test(digits) ? digits : null;
  }
  if (field.key.endsWith('_last_four')) {
    const digits = value.replace(/[\s-]/g,'');
    return /^(?:\d{9}|\d{4})$/.test(digits) ? digits.slice(-4) : null;
  }
  return value;
}
export function parseApplicationText(text: string) {
  const aliases = new Map<string, ApplicationField>();
  for (const field of APPLICATION_FIELDS) for (const alias of [field.label, field.key.replace(/_/g,' '), ...field.aliases]) aliases.set(alias.toLowerCase(), field);
  // Labels need a colon or a line break. PDF/OCR engines can collapse column spacing.
  const pattern = new RegExp(`(?:^|[\\n\\t]| +)(${[...aliases.keys()].sort((a,b)=>b.length-a.length).map(escaped).join('|')})[ \\t]*(?::[ \\t]*|(?=\\r?\\n|$))`, 'gim');
  const matches = [...text.matchAll(pattern)];
  const candidates = new Map<string, Set<string>>();
  const warnings = new Set<string>();
  if (/owner\s*(?:#?\s*2|two)|additional owner|second owner/i.test(text)) warnings.add('Additional owner information found. The Bypass form has one owner section; review all owners in the original.');
  for (let i=0;i<matches.length;i++) {
    const match=matches[i]; const field=aliases.get(match[1].toLowerCase())!;
    const raw=text.slice(match.index!+match[0].length,matches[i+1]?.index ?? text.length).trim().split(/\r?\n/)[0];
    if (!raw) continue;
    const value=normalized(field,raw);
    if (value === null) { warnings.add(`${field.label}: could not confidently read this value; check the original.`); continue; }
    if (!candidates.has(field.key)) candidates.set(field.key,new Set());
    candidates.get(field.key)!.add(value);
  }
  const fields: Record<string,string>={};
  for (const [key,values] of candidates) {
    if (values.size===1) fields[key]=[...values][0];
    else warnings.add(`${APPLICATION_FIELDS.find(f=>f.key===key)!.label}: multiple different values found; choose the correct applicant/value from the original.`);
  }
  if (fields.full_ein) fields.ein_last_four=fields.full_ein.slice(-4);
  if (fields.full_ssn) fields.ssn_last_four=fields.full_ssn.slice(-4);
  return { fields, warnings:[...warnings] };
}
export function applicationPatch(form: Record<string,string>): Record<string,unknown> {
  const patch: Record<string,unknown>={};
  for (const field of APPLICATION_FIELDS) {
    if (!(field.key in form)) continue;
    const raw=form[field.key].trim();
    const value=raw ? normalized(field,raw) : null;
    if (raw && value===null) throw new Error(`Check ${field.label.toLowerCase()}.`);
    if (field.key.startsWith('full_')) continue;
    patch[field.key]=value===null ? null : field.type==='number' ? Number(value) : value;
  }
  if (form.full_ein?.trim()) patch.ein_last_four=form.full_ein.replace(/[\s-]/g,'').slice(-4);
  if (form.full_ssn?.trim()) patch.ssn_last_four=form.full_ssn.replace(/[\s-]/g,'').slice(-4);
  if ('legal_name' in patch) patch.business_name=patch.legal_name;
  if ('funding_amount_requested' in patch) patch.requested_amount=patch.funding_amount_requested;
  return patch;
}
