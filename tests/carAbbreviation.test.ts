import {describe, expect, it} from 'vitest';
import {
  parseWikiAbbreviations,
  synthesizeCarAbbreviation,
  displayNameHasYearSuffix,
} from '@edge/carAbbreviation.ts';

describe('parseWikiAbbreviations', () => {
  it('reads a single quoted HUD name', () => {
    const wt = `The 2016 '''Abarth 695 Biposto''' - abbreviated as "Abarth 695 '16" - is a track-focused hot hatch`;
    expect(parseWikiAbbreviations(wt)).toEqual(["Abarth 695 '16"]);
  });

  it('reads multiple aliases and strips refs', () => {
    const wt = `The 2018 '''Lamborghini Huracán Performante''' - abbreviated as "Lambo Huracán P" or "L. Huracán '18" - is an all-wheel drive`;
    expect(parseWikiAbbreviations(wt)).toEqual(['Lambo Huracán P', "L. Huracán '18"]);
    const refs = `The 1993 '''McLaren F1''' - abbreviated as "McL. F1 '93"<ref>Abbreviation in ''Forza Motorsport'' (2023)</ref> - is a rear-wheel drive`;
    expect(parseWikiAbbreviations(refs)).toEqual(["McL. F1 '93"]);
  });

  it('returns empty when the lead has no abbreviated as', () => {
    const wt = `The 2016 '''Ariel Nomad''' is a rear-wheel drive off-road buggy`;
    expect(parseWikiAbbreviations(wt)).toEqual([]);
  });
});

describe('synthesizeCarAbbreviation', () => {
  it('keeps names that already fit the HUD', () => {
    expect(synthesizeCarAbbreviation('Ariel Nomad', 2016)).toBe('Ariel Nomad');
    expect(synthesizeCarAbbreviation('BMW X5 M', 2011)).toBe('BMW X5 M');
  });

  it('peels extra model words and appends year, like wiki HUD names', () => {
    expect(synthesizeCarAbbreviation('Porsche 911 Carrera RS', 1973)).toBe(
      "Porsche 911 '73",
    );
    expect(synthesizeCarAbbreviation('Acura Integra Type R', 2001)).toBe(
      "Acura Integra '01",
    );
  });

  it('drops a trailing trim when that fits the HUD', () => {
    expect(synthesizeCarAbbreviation('Alfa Romeo 8C Competizione', 2007)).toBe(
      'Alfa Romeo 8C',
    );
  });

  it('compresses long wiki-stub names with year', () => {
    expect(synthesizeCarAbbreviation('Alumicraft Class 10 Race Car', 2015)).toBe(
      "Alumicraft Class '15",
    );
  });
});

describe('displayNameHasYearSuffix', () => {
  it('detects Forza YY suffixes', () => {
    expect(displayNameHasYearSuffix("Abarth 695 '16")).toBe(true);
    expect(displayNameHasYearSuffix('Abarth 695 Biposto')).toBe(false);
  });
});
