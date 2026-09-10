import { describe, expect, it } from 'vitest';
import { parseApplicationText, applicationPatch } from './applicationImport';
describe('partner application extraction', () => {
  it('maps label/value pairs including multiple fields on one line', () => {
    const result = parseApplicationText('Legal Business Name: Example LLC   DBA: Example\nCity: Austin State: TX ZIP: 78701\nOwner Full Name: Test Person\nRequested Amount: $125,000.50\nDate of Birth: 01/02/1980');
    expect(result.fields).toMatchObject({legal_name:'Example LLC',dba:'Example',city:'Austin',state:'TX',zip:'78701',owner_full_name:'Test Person',funding_amount_requested:'125000.50',owner_dob:'1980-01-02'});
  });
  it('does not silently select among conflicting owners or ambiguous dates', () => {
    const result = parseApplicationText('Owner Name: First Person\nOwner Name: Second Person\nBusiness Start Date: 02/30/2020');
    expect(result.fields.owner_full_name).toBeUndefined();
    expect(result.fields.start_date).toBeUndefined();
    expect(result.warnings.length).toBe(2);
  });
  it('keeps only last four tax digits in CRM candidates', () => {
    expect(parseApplicationText('EIN: 12-3456789\nSSN: 123-45-6789').fields).toMatchObject({ein_last_four:'6789',ssn_last_four:'6789'});
  });
  it('flags invalid OCR email instead of saving it', () => {
    const result=parseApplicationText('Business Email: sample @example.com');
    expect(result.fields.business_email).toBeUndefined();expect(result.warnings).toHaveLength(1);
  });
  it('does not infer signature execution or fields from unlabeled text', () => {
    expect(parseApplicationText('Signature: Test Person\nArbitrary contract text.').fields).toEqual({});
  });
  it('accepts next-line values and rejects empty checkbox answers', () => {
    expect(parseApplicationText('Business Legal Name\nExample LLC\nEntity Type: [ ] LLC [ ] Corp').fields).toEqual({legal_name:'Example LLC'});
  });
});
describe('reviewed application save', () => {
  it('preserves zero and clears blank amounts/dates with null', () => {
    expect(applicationPatch({legal_name:'Example',annual_revenue:'0',funding_amount_requested:'',start_date:'',owner_dob:''})).toMatchObject({business_name:'Example',annual_revenue:0,funding_amount_requested:null,requested_amount:null,start_date:null,owner_dob:null});
  });
  it.each(['-20','not a number','12.5.3'])('rejects invalid amount %s', value => {
    expect(() => applicationPatch({annual_revenue:value})).toThrow();
  });
  it('persists only last four digits when full identifiers are reviewed', () => {
    expect(applicationPatch({full_ein:'12-3456789',full_ssn:'123-45-6789'})).toEqual({ein_last_four:'6789',ssn_last_four:'6789'});
  });
  it('does not persist unknown extracted properties', () => {
    expect(applicationPatch({role:'admin',ssn:'123-45-6789',signature:'test'})).toEqual({});
  });
});
