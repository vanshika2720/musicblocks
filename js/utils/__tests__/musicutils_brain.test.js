/**
 * @license
 * MusicBlocks
 * Copyright (C) 2024
 */

const { TextEncoder } = require("util");
global.TextEncoder = TextEncoder;
global._ = jest.fn(str => str);
global.window = {
    btoa: jest.fn(str => Buffer.from(str, "utf8").toString("base64"))
};
global.INVALIDPITCH = "Not a valid pitch name";
global.last = myList => {
    const i = myList.length;
    return i === 0 ? null : myList[i - 1];
};

const {
    noteToFrequency,
    getPitchInfo,
    convertFromSolfege,
    getSolfege,
    splitSolfege,
    i18nSolfege,
    SOLFEGECONVERSIONTABLE,
    FIXEDSOLFEGE1,
    EQUIVALENTNATURALS,
    NOTESSHARP,
    PITCHES1,
    A0,
    TWELTHROOT2,
    TWELVEHUNDRETHROOT2,
    SHARP,
    FLAT,
    DOUBLESHARP,
    DOUBLEFLAT
} = require("../musicutils");

describe("MusicUtils Brain - Core Logic Tests", () => {
    describe("noteToFrequency", () => {
        it("should calculate correct frequency for standard A4", () => {
            const freq = noteToFrequency("A4", "C major");
            expect(freq).toBeCloseTo(440, 1);
        });

        it("should calculate correct frequency for C4 (Middle C)", () => {
            const freq = noteToFrequency("C4", "C major");
            expect(freq).toBeCloseTo(261.63, 1);
        });

        it("should handle extreme octaves (C0)", () => {
            const freq = noteToFrequency("C0", "C major");
            expect(freq).toBeLessThan(20);
            expect(freq).toBeGreaterThan(15);
        });

        it("should handle extreme octaves (C9)", () => {
            const freq = noteToFrequency("C9", "C major");
            expect(freq).toBeCloseTo(8372.02, 1);
        });

        it("should handle ASCII accidentals (C#4 vs C♯4)", () => {
            const freqSharpASCII = noteToFrequency("C#4", "C major");
            const freqSharpUnicode = noteToFrequency("C♯4", "C major");
            expect(freqSharpASCII).toBe(freqSharpUnicode);
        });

        it("should handle double sharps (Cx4)", () => {
            const freqCx4 = noteToFrequency("Cx4", "C major");
            const freqD4 = noteToFrequency("D4", "C major");
            expect(freqCx4).toBeCloseTo(freqD4, 1);
        });

        it("should handle double flats (Ebb4)", () => {
            const freqEbb4 = noteToFrequency("Ebb4", "C major");
            const freqD4 = noteToFrequency("D4", "C major");
            expect(freqEbb4).toBeCloseTo(freqD4, 1);
        });

        it("should handle invalid note names gracefully", () => {
            const freq = noteToFrequency("X9", "C major");
            expect(freq).toBeDefined();
        });
    });

    describe("getPitchInfo - Legacy Mode (4 arguments)", () => {
        const mockTur = {
            singer: {
                keySignature: "C major"
            }
        };

        it("should return alphabet pitch for type 'alphabet' (mapped to key signature)", () => {
            const pitch = getPitchInfo(null, "alphabet", "C#4", mockTur);
            // C major scale doesn't have C#. It remaps to Db.
            expect(pitch).toBe(FLAT === "♭" ? "D♭" : "Db");
        });

        it("should return correct alphabet pitch when in scale (D major)", () => {
            const turD = { singer: { keySignature: "D major" } };
            const pitch = getPitchInfo(null, "alphabet", "F#4", turD);
            // D major scale includes F#.
            expect(pitch).toBe(SHARP === "♯" ? "F♯" : "F#");
        });

        it("should return letter class for type 'letter class' (after mapping)", () => {
            const letter = getPitchInfo(null, "letter class", "C#4", mockTur);
            // C# -> Db, so letter class is D.
            expect(letter).toBe("D");
        });

        it("should return solfege syllable for type 'solfege syllable'", () => {
            const solfege = getPitchInfo(null, "solfege syllable", "C4", mockTur);
            expect(solfege).toBe("do");
        });

        it("should handle frequency as currentNote", () => {
            const pitch = getPitchInfo(null, "alphabet", 440, mockTur);
            expect(pitch).toBe("A");
        });

        it("should handle double sharps and remap them", () => {
            const pitch = getPitchInfo(null, "alphabet", "Cx4", mockTur);
            expect(pitch).toBe("D");
        });

        it("should handle double flats and remap them", () => {
            const pitch = getPitchInfo(null, "alphabet", "Ebb4", mockTur);
            expect(pitch).toBe("D");
        });

        it("should map to key signature if not in scale (G# in C major -> Ab)", () => {
            // This depends on EQUIVALENTFLATS/SHARPS and the logic in getPitchInfo
            const pitch = getPitchInfo(null, "alphabet", "G#4", mockTur);
            // C major scale doesn't have G#. It might remap to Ab.
            expect(["G♯", "A♭"]).toContain(pitch);
        });
    });

    describe("Solfege to Western Conversion", () => {
        it("convertFromSolfege should return Western note name", () => {
            expect(convertFromSolfege("do")).toBe("C");
            expect(convertFromSolfege("re")).toBe("D");
            expect(convertFromSolfege("mi")).toBe("E");
            expect(convertFromSolfege("fa")).toBe("F");
            expect(convertFromSolfege("sol")).toBe("G");
            expect(convertFromSolfege("la")).toBe("A");
            expect(convertFromSolfege("ti")).toBe("B");
        });

        it("convertFromSolfege should handle accidentals", () => {
            expect(convertFromSolfege("do♯")).toBe("C♯");
            expect(convertFromSolfege("re♭")).toBe("D♭");
        });

        it("convertFromSolfege should handle double accidentals", () => {
            expect(convertFromSolfege("do𝄪")).toBe("D");
            expect(convertFromSolfege("re𝄫")).toBe("C");
        });

        it("getSolfege should handle movable-do in G major", () => {
            expect(getSolfege("G", "G major", true)).toBe("do");
            expect(getSolfege("A", "G major", true)).toBe("re");
            expect(getSolfege("F#", "G major", true)).toBe("ti");
        });

        it("getSolfege should handle minor movable-do (A minor)", () => {
            // A minor: A is 'la' if using la-based minor
            expect(getSolfege("A", "A minor", true)).toBe("la");
            expect(getSolfege("C", "A minor", true)).toBe("do");
            expect(getSolfege("E", "A minor", true)).toBe("mi");
        });
    });

    describe("Matrix/Constant Integrity", () => {
        it("SOLFEGECONVERSIONTABLE should be complete", () => {
            expect(SOLFEGECONVERSIONTABLE["C"]).toBe("do");
            expect(SOLFEGECONVERSIONTABLE["D"]).toBe("re");
            expect(SOLFEGECONVERSIONTABLE["E"]).toBe("mi");
            expect(SOLFEGECONVERSIONTABLE["F"]).toBe("fa");
            expect(SOLFEGECONVERSIONTABLE["G"]).toBe("sol");
            expect(SOLFEGECONVERSIONTABLE["A"]).toBe("la");
            expect(SOLFEGECONVERSIONTABLE["B"]).toBe("ti");
        });

        it("FIXEDSOLFEGE1 should cover double accidentals", () => {
            expect(FIXEDSOLFEGE1["do𝄪"]).toBe("D");
            expect(FIXEDSOLFEGE1["re𝄫"]).toBe("C");
        });
    });
});
