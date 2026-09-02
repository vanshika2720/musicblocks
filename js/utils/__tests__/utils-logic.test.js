/**
 * @license
 * MusicBlocks v3.4.1
 * Copyright (C) 2014-2026 Walter Bender
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

global._ = msg => msg;

const {
    toTitleCase,
    fileExt,
    fileBasename,
    last,
    safeSVG,
    toFixed2,
    mixedNumber,
    nearestBeat,
    oneHundredToFraction,
    rationalToFraction,
    GCD,
    LCD,
    rationalSum,
    rgbToHex,
    hexToRGB,
    hex2rgb,
    resolveObject,
    safeJSONParse,
    escapeHTML,
    unescapeHTML,
    deepClone,
    isSafeUrl,
    isUnsafeObjectKey,
    isValidHex,
    safeNumber,
    toArray,
    formatSeconds
} = require("../utils-logic.js");

describe("Utility Logic Functions", () => {
    describe("safeJSONParse()", () => {
        it("parses valid JSON", () => {
            expect(safeJSONParse('{"a":1}')).toEqual({ a: 1 });
        });

        it("returns fallback for invalid JSON", () => {
            expect(safeJSONParse("invalid", "fallback")).toBe("fallback");
        });

        it("returns fallback for non-string input", () => {
            expect(safeJSONParse(null, "fallback")).toBe("fallback");
        });

        it("returns null fallback by default for invalid JSON", () => {
            expect(safeJSONParse("invalid")).toBeNull();
        });
    });

    describe("toTitleCase()", () => {
        it("converts first character to uppercase", () => {
            expect(toTitleCase("hello")).toBe("Hello");
        });

        it("returns undefined if not a string", () => {
            expect(toTitleCase(123)).toBeUndefined();
        });

        it("returns empty string for empty input", () => {
            expect(toTitleCase("")).toBe("");
        });
    });

    describe("fileExt()", () => {
        it("returns file extension", () => {
            expect(fileExt("image.png")).toBe("png");
            expect(fileExt("archive.tar.gz")).toBe("gz");
        });

        it("returns empty string if no extension", () => {
            expect(fileExt("filename")).toBe("");
            expect(fileExt(null)).toBe("");
        });
    });

    describe("fileBasename()", () => {
        it("returns basename without extension", () => {
            expect(fileBasename("image.png")).toBe("image");
            expect(fileBasename("archive.tar.gz")).toBe("archive.tar");
        });

        it("handles files without extension", () => {
            expect(fileBasename("filename")).toBe("filename");
        });

        it("handles hidden files like .env", () => {
            expect(fileBasename(".env")).toBe(".env");
        });

        it("returns empty string for null input", () => {
            expect(fileBasename(null)).toBe("");
        });
    });

    describe("last()", () => {
        it("returns last element of array", () => {
            expect(last([1, 2, 3])).toBe(3);
            expect(last(["a", "b", "c"])).toBe("c");
        });

        it("returns null if empty array", () => {
            expect(last([])).toBeNull();
        });
    });

    describe("safeSVG()", () => {
        it("escapes HTML entities", () => {
            expect(safeSVG("<svg>")).toBe("&lt;svg&gt;");
            expect(safeSVG("Hello & goodbye")).toBe("Hello &amp; goodbye");
        });

        it("returns non-string as is", () => {
            expect(safeSVG(123)).toBe(123);
        });
    });

    describe("toFixed2()", () => {
        it("formats number to two decimals if needed", () => {
            expect(toFixed2(3.14159)).toBe("3.14");
            expect(toFixed2(3)).toBe("3");
        });

        it("returns input as is if not a number", () => {
            expect(toFixed2("abc")).toBe("abc");
        });

        it("strips trailing zeros left by toFixed, dropping a bare decimal point", () => {
            expect(toFixed2(3.1)).toBe("3.1");
            expect(toFixed2(3.5)).toBe("3.5");
            expect(toFixed2(3.001)).toBe("3");
            expect(toFixed2(-2.5)).toBe("-2.5");
        });

        it("rounds to two decimals and keeps non-zero hundredths", () => {
            expect(toFixed2(0.005)).toBe("0.01");
            expect(toFixed2(1.238)).toBe("1.24");
        });
    });

    describe("mixedNumber()", () => {
        it("returns mixed fraction for fractional numbers", () => {
            expect(mixedNumber(2.25)).toBe("2 1/4");
            expect(mixedNumber(0.5)).toBe("1/2");
        });

        it("returns number/1 for integer", () => {
            expect(mixedNumber(2)).toBe("2/1");
        });

        it("returns input if not a number", () => {
            expect(mixedNumber("abc")).toBe("abc");
        });
    });

    describe("nearestBeat()", () => {
        it("finds nearest beat", () => {
            expect(nearestBeat(50, 8)).toEqual([4, 8]);
        });

        it("returns zero beat when very small", () => {
            expect(nearestBeat(1, 8)).toEqual([0, 8]);
        });
    });

    describe("oneHundredToFraction()", () => {
        it("returns fraction for given number", () => {
            expect(oneHundredToFraction(50)).toEqual([1, 2]);
            expect(oneHundredToFraction(1)).toEqual([1, 64]);
            expect(oneHundredToFraction(100)).toEqual([1, 1]);
        });

        it("handles exhaustive branch coverage", () => {
            expect(oneHundredToFraction(0)).toEqual([1, 64]);
            expect(oneHundredToFraction(150)).toEqual([1, 1]);
            expect(oneHundredToFraction(2)).toEqual([1, 48]);
            expect(oneHundredToFraction(7)).toEqual([1, 16]);
            expect(oneHundredToFraction(18)).toEqual([3, 16]);
            expect(oneHundredToFraction(40)).toEqual([2, 5]);
            expect(oneHundredToFraction(53)).toEqual([17, 32]);
            expect(oneHundredToFraction(66)).toEqual([2, 3]);
            expect(oneHundredToFraction(81)).toEqual([13, 16]);
            expect(oneHundredToFraction(91)).toEqual([11, 12]);
            expect(oneHundredToFraction(96)).toEqual([31, 32]);
            expect(oneHundredToFraction(99)).toEqual([63, 64]);
            expect(oneHundredToFraction(55)).toEqual([9, 16]);
            expect(oneHundredToFraction(97)).toEqual([31, 32]);
        });
    });

    describe("rationalToFraction()", () => {
        it("converts float to fraction", () => {
            expect(rationalToFraction(0.5)).toEqual([1, 2]);
            expect(rationalToFraction(2)).toEqual([2, 1]);
            expect(rationalToFraction(1)).toEqual([1, 1]);
            expect(rationalToFraction(4 / 3)).toEqual([4, 3]);
        });

        it("handles 0, NaN, Infinity, -Infinity", () => {
            expect(rationalToFraction(0)).toEqual([0, 1]);
            expect(rationalToFraction(NaN)).toEqual([0, 1]);
            expect(rationalToFraction(Infinity)).toEqual([0, 1]);
            expect(rationalToFraction(-Infinity)).toEqual([0, 1]);
        });

        it("handles negative numbers preserving sign on numerator", () => {
            expect(rationalToFraction(-0.5)).toEqual([-1, 2]);
            expect(rationalToFraction(-2.5)).toEqual([-5, 2]);
            expect(rationalToFraction(-0.75)).toEqual([-3, 4]);
        });

        it("handles values greater than one that exhaust iteration cap without reciprocal bug (pi, e)", () => {
            const [nPi, dPi] = rationalToFraction(Math.PI);
            expect(nPi / dPi).toBeGreaterThan(1);
            expect(Math.abs(nPi / dPi - Math.PI)).toBeLessThan(0.001);
            expect(GCD(nPi, dPi)).toBe(1);
            expect(dPi).toBeGreaterThan(0);

            const [nE, dE] = rationalToFraction(Math.E);
            expect(nE / dE).toBeGreaterThan(1);
            expect(Math.abs(nE / dE - Math.E)).toBeLessThan(0.001);
            expect(GCD(nE, dE)).toBe(1);
            expect(dE).toBeGreaterThan(0);
        });

        it("handles negative numbers greater than one without unreduced denominator", () => {
            const [n, d] = rationalToFraction(-Math.PI);
            expect(n).toBeLessThan(0);
            expect(d).toBeGreaterThan(0);
            expect(d).toBeLessThan(5000);
            expect(Math.abs(n / d - -Math.PI)).toBeLessThan(0.001);
            expect(GCD(Math.abs(n), d)).toBe(1);
        });

        it("reduces fractions via GCD on iteration cap", () => {
            const [n, d] = rationalToFraction(0.0003);
            expect(GCD(n, d)).toBe(1);
            expect(n).toBe(1);
            expect(d).toBe(3334);
        });

        it("ensures standard musical subdivisions stay exact and reduced", () => {
            for (let j = 1; j <= 64; j++) {
                const [n, d] = rationalToFraction(j / 64);
                expect(Math.abs(n / d - j / 64)).toBeLessThan(0.000001);
                expect(GCD(n, d)).toBe(1);
                expect(d).toBeGreaterThan(0);
            }
        });
    });

    describe("rationalSum()", () => {
        it("adds simple fractions", () => {
            expect(rationalSum([1, 2], [1, 2])).toEqual([[2, 2], null]);
        });

        it("handles unequal denominators", () => {
            expect(rationalSum([1, 3], [1, 6])).toEqual([[3, 6], null]);
        });

        it("handles invalid input", () => {
            const [result] = rationalSum(null, [1, 2]);
            expect(result).toEqual([0, 1]);
        });

        it("handles zero values", () => {
            expect(rationalSum([0, 1], [1, 2])).toEqual([[1, 2], null]);
            expect(rationalSum([1, 2], [0, 1])).toEqual([[1, 2], null]);
        });

        it("handles negative values", () => {
            expect(rationalSum([-1, 2], [1, 2])).toEqual([[0, 2], null]);
            expect(rationalSum([1, 2], [-1, 2])).toEqual([[0, 2], null]);
        });

        it("handles zero denominator", () => {
            const [result1] = rationalSum([1, 0], [1, 2]);
            expect(result1).toEqual([0, 1]);
            const [result2] = rationalSum([1, 2], [1, 0]);
            expect(result2).toEqual([0, 1]);
        });

        it("rejects a malformed operand on either side, whichever slot is bad", () => {
            const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
            try {
                for (const [a, b] of [
                    [[1], [1, 2]],
                    [[1, 2], [1]],
                    [
                        ["x", 2],
                        [1, 2]
                    ],
                    [
                        [1, "x"],
                        [1, 2]
                    ],
                    [
                        [1, 2],
                        [null, 2]
                    ],
                    [
                        [1, 2],
                        [1, undefined]
                    ],
                    [[1, 2], "not-an-array"]
                ]) {
                    const [value, message] = rationalSum(a, b);
                    expect(value).toEqual([0, 1]);
                    expect(message).toBe("Invalid input passed to rational sum");
                }
            } finally {
                warn.mockRestore();
            }
        });

        it("reports the zero-denominator failure with its own message", () => {
            const error = jest.spyOn(console, "error").mockImplementation(() => {});
            try {
                const [value, message] = rationalSum([1, 0], [1, 2]);
                expect(value).toEqual([0, 1]);
                expect(message).toBe("Note calculation failed: zero denominator");
            } finally {
                error.mockRestore();
            }
        });
    });

    describe("clampNumber()", () => {
        it("clamps values within range", () => {
            expect(clampNumber(5, 0, 10)).toBe(5);
        });

        it("clamps values below lower bound", () => {
            expect(clampNumber(-5, 0, 10)).toBe(0);
        });

        it("clamps values above upper bound", () => {
            expect(clampNumber(15, 0, 10)).toBe(10);
        });

        it("handles inverted min and max bounds", () => {
            expect(clampNumber(5, 10, 0)).toBe(5);
            expect(clampNumber(-2, 10, 0)).toBe(0);
            expect(clampNumber(12, 10, 0)).toBe(10);
        });

        it("returns fallback for non-numeric or NaN inputs", () => {
            expect(clampNumber("invalid", 0, 10)).toBe(0);
            expect(clampNumber(NaN, 0, 10, 5)).toBe(5);
            expect(clampNumber(null, 0, 10)).toBe(0);
        });
    });

    describe("safeNumber()", () => {
        it("returns finite numbers as is", () => {
            expect(safeNumber(42)).toBe(42);
            expect(safeNumber(3.14)).toBe(3.14);
            expect(safeNumber(0)).toBe(0);
            expect(safeNumber(-10)).toBe(-10);
        });

        it("parses valid numeric strings", () => {
            expect(safeNumber("42")).toBe(42);
            expect(safeNumber("  100  ")).toBe(100);
            expect(safeNumber("-15.5")).toBe(-15.5);
        });

        it("returns fallback for non-numeric, NaN, or non-finite inputs", () => {
            expect(safeNumber("invalid", 10)).toBe(10);
            expect(safeNumber(NaN, 5)).toBe(5);
            expect(safeNumber(Infinity, 0)).toBe(0);
            expect(safeNumber(null, 7)).toBe(7);
            expect(safeNumber(undefined, 0)).toBe(0);
            expect(safeNumber({}, 0)).toBe(0);
        });
    });

    describe("toArray()", () => {
        it("returns the original array if input is already an array", () => {
            const arr = [1, 2, 3];
            expect(toArray(arr)).toBe(arr);
            expect(toArray([])).toEqual([]);
        });

        it("wraps single non-array values in an array", () => {
            expect(toArray(42)).toEqual([42]);
            expect(toArray("hello")).toEqual(["hello"]);
            expect(toArray(true)).toEqual([true]);
            expect(toArray({ key: "val" })).toEqual([{ key: "val" }]);
        });

        it("returns an empty array for null or undefined", () => {
            expect(toArray(null)).toEqual([]);
            expect(toArray(undefined)).toEqual([]);
        });
    });

    describe("formatSeconds()", () => {
        it("formats seconds into MM:SS format", () => {
            expect(formatSeconds(0)).toBe("00:00");
            expect(formatSeconds(5)).toBe("00:05");
            expect(formatSeconds(65)).toBe("01:05");
            expect(formatSeconds(125)).toBe("02:05");
        });

        it("formats large durations into HH:MM:SS format", () => {
            expect(formatSeconds(3600)).toBe("01:00:00");
            expect(formatSeconds(3665)).toBe("01:01:05");
        });

        it("handles numeric string inputs", () => {
            expect(formatSeconds("125")).toBe("02:05");
            expect(formatSeconds("65.8")).toBe("01:05");
        });

        it("returns fallback 00:00 for invalid or negative inputs", () => {
            expect(formatSeconds(-10)).toBe("00:00");
            expect(formatSeconds(NaN)).toBe("00:00");
            expect(formatSeconds(null)).toBe("00:00");
            expect(formatSeconds(undefined)).toBe("00:00");
            expect(formatSeconds("invalid")).toBe("00:00");
        });
    });

    describe("rgbToHex()", () => {
        it("converts rgb to hex", () => {
            expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
            expect(rgbToHex(0, 0, 0)).toBe("#000000");
            expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
        });
    });

    describe("hexToRGB()", () => {
        it("converts hex to rgb object", () => {
            expect(hexToRGB("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
            expect(hexToRGB("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
        });

        it("converts shorthand 3-digit hex to rgb object", () => {
            expect(hexToRGB("#fff")).toEqual({ r: 255, g: 255, b: 255 });
            expect(hexToRGB("f00")).toEqual({ r: 255, g: 0, b: 0 });
            expect(hexToRGB("#0f0")).toEqual({ r: 0, g: 255, b: 0 });
        });

        it("returns null for invalid hex or non-string inputs", () => {
            expect(hexToRGB("#zzz")).toBeNull();
            expect(hexToRGB(null)).toBeNull();
            expect(hexToRGB(123)).toBeNull();
        });
    });

    describe("hex2rgb()", () => {
        it("converts hex to rgba string", () => {
            expect(hex2rgb("ff0000")).toBe("rgba(255,0,0,1)");
        });

        it("handles leading hash prefix", () => {
            expect(hex2rgb("#ff0000")).toBe("rgba(255,0,0,1)");
            expect(hex2rgb("#00ff00")).toBe("rgba(0,255,0,1)");
        });

        it("handles 3-digit shorthand hex codes", () => {
            expect(hex2rgb("#f00")).toBe("rgba(255,0,0,1)");
            expect(hex2rgb("f00")).toBe("rgba(255,0,0,1)");
            expect(hex2rgb("#abc")).toBe("rgba(170,187,204,1)");
        });

        it("supports custom alpha transparency values", () => {
            expect(hex2rgb("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)");
            expect(hex2rgb("#00ff00", 0)).toBe("rgba(0,255,0,0)");
        });

        it("clamps alpha value between 0 and 1", () => {
            expect(hex2rgb("#ff0000", 1.5)).toBe("rgba(255,0,0,1)");
            expect(hex2rgb("#ff0000", -0.5)).toBe("rgba(255,0,0,0)");
            expect(hex2rgb("#ff0000", "invalid")).toBe("rgba(255,0,0,1)");
        });

        it("returns fallback rgba for invalid or non-string inputs", () => {
            expect(hex2rgb(null)).toBe("rgba(0,0,0,1)");
            expect(hex2rgb("invalid")).toBe("rgba(0,0,0,1)");
        });
    });

    describe("isValidHex()", () => {
        it("returns true for valid 6-digit hex color codes with or without hash prefix", () => {
            expect(isValidHex("#ffffff")).toBe(true);
            expect(isValidHex("ffffff")).toBe(true);
            expect(isValidHex("#FF0031")).toBe(true);
            expect(isValidHex("00FF00")).toBe(true);
        });

        it("returns true for valid 3-digit shorthand hex color codes with or without hash prefix", () => {
            expect(isValidHex("#fff")).toBe(true);
            expect(isValidHex("fff")).toBe(true);
            expect(isValidHex("#f00")).toBe(true);
            expect(isValidHex("ABC")).toBe(true);
        });

        it("returns false for invalid length or non-hex characters", () => {
            expect(isValidHex("#12345")).toBe(false);
            expect(isValidHex("#1234567")).toBe(false);
            expect(isValidHex("#gggggg")).toBe(false);
            expect(isValidHex("invalid")).toBe(false);
            expect(isValidHex("")).toBe(false);
        });

        it("returns false for non-string inputs", () => {
            expect(isValidHex(null)).toBe(false);
            expect(isValidHex(undefined)).toBe(false);
            expect(isValidHex(123456)).toBe(false);
            expect(isValidHex({})).toBe(false);
        });
    });

    describe("resolveObject()", () => {
        beforeAll(() => {
            global.TestNamespace = { Sub: { value: 42 } };
        });

        afterAll(() => {
            delete global.TestNamespace;
        });

        it("resolves nested path", () => {
            expect(resolveObject("TestNamespace.Sub.value")).toBe(42);
        });

        it("returns undefined for invalid path", () => {
            expect(resolveObject("TestNamespace.Invalid.prop")).toBeUndefined();
        });

        it("returns undefined for non-string input", () => {
            expect(resolveObject(123)).toBeUndefined();
        });
    });

    describe("escapeHTML() and unescapeHTML()", () => {
        it("escapes special characters", () => {
            const original = "<div>\"Hello\" & 'World'</div>";
            const escaped = "&lt;div&gt;&quot;Hello&quot; &amp; &#039;World&#039;&lt;/div&gt;";
            expect(escapeHTML(original)).toBe(escaped);
        });

        it("unescapes special characters", () => {
            const escaped = "&lt;div&gt;&quot;Hello&quot; &amp; &#039;World&#039;&lt;/div&gt;";
            const unescaped = "<div>\"Hello\" & 'World'</div>";
            expect(unescapeHTML(escaped)).toBe(unescaped);
        });
    });

    describe("deepClone()", () => {
        it("clones objects", () => {
            const obj = { a: 1, b: { c: 2 } };
            const cloned = deepClone(obj);
            expect(cloned).toEqual(obj);
            expect(cloned).not.toBe(obj);
            expect(cloned.b).not.toBe(obj.b);
        });

        it("clones nested arrays and objects", () => {
            const obj = {
                a: [1, 2, { b: 3 }],
                c: { d: [4, 5], e: 6 }
            };
            const cloned = deepClone(obj);
            expect(cloned).toEqual(obj);
            expect(cloned.a).not.toBe(obj.a);
            expect(cloned.a[2]).not.toBe(obj.a[2]);
            expect(cloned.c.d).not.toBe(obj.c.d);
        });
    });

    describe("isSafeUrl()", () => {
        it("identifies safe urls", () => {
            expect(isSafeUrl("http://example.com")).toBe(true);
            expect(isSafeUrl("https://example.com")).toBe(true);
        });
        it("identifies unsafe urls", () => {
            expect(isSafeUrl("mailto:test@example.com")).toBe(false);
            expect(isSafeUrl("javascript:alert(1)")).toBe(false);
            expect(isSafeUrl("data:text/html,Hello")).toBe(false);
            expect(isSafeUrl("vbscript:alert(1)")).toBe(false);
            expect(isSafeUrl("file:///etc/passwd")).toBe(false);
            expect(isSafeUrl("blob:https://example.com/uuid")).toBe(false);
            expect(isSafeUrl("tel:123456789")).toBe(false);
            expect(isSafeUrl("sms:123456789")).toBe(false);
            expect(isSafeUrl("chrome://settings")).toBe(false);
            expect(isSafeUrl("about:blank")).toBe(false);
            expect(isSafeUrl("invalid-url")).toBe(false);
            expect(isSafeUrl(null)).toBe(false);
            expect(isSafeUrl(undefined)).toBe(false);
            expect(isSafeUrl(123)).toBe(false);
        });
        it("identifies bypass attempts", () => {
            expect(isSafeUrl("&#106;avascript:alert(1)")).toBe(false);
            expect(isSafeUrl("javascript&colon;alert(1)")).toBe(false);
            expect(isSafeUrl("java\tscript:alert(1)")).toBe(false);
            expect(isSafeUrl("jav\rascript:alert(1)")).toBe(false);
            expect(isSafeUrl(" javascript:alert(1)")).toBe(false);
        });
    });

    describe("isUnsafeObjectKey()", () => {
        it("flags reserved prototype-related keys", () => {
            expect(isUnsafeObjectKey("__proto__")).toBe(true);
            expect(isUnsafeObjectKey("constructor")).toBe(true);
            expect(isUnsafeObjectKey("prototype")).toBe(true);
        });

        it("allows ordinary keys", () => {
            expect(isUnsafeObjectKey("myPlugin")).toBe(false);
            expect(isUnsafeObjectKey("FLOWPLUGINS")).toBe(false);
            expect(isUnsafeObjectKey("")).toBe(false);
        });
    });

    // ---------------------------------------------------------------------
    // The blocks below were derived from the module test plan
    // (scripts/generate-tests/cli.js js/utils/utils-logic.js): every export
    // is enumerated there with its parameter list and branch/return counts,
    // which flagged LCD as having no test at all and oneHundredToFraction /
    // rationalSum / mixedNumber / rationalToFraction as having branches the
    // existing suite never reaches.
    // ---------------------------------------------------------------------

    describe("LCD()", () => {
        it("returns the least common multiple of two positive integers", () => {
            expect(LCD(4, 6)).toBe(12);
            expect(LCD(3, 5)).toBe(15);
            expect(LCD(6, 6)).toBe(6);
            expect(LCD(1, 7)).toBe(7);
        });

        it("ignores the sign of either argument", () => {
            expect(LCD(-4, 6)).toBe(12);
            expect(LCD(4, -6)).toBe(12);
            expect(LCD(-4, -6)).toBe(12);
        });

        it("returns a common multiple of both inputs", () => {
            for (const [a, b] of [
                [4, 6],
                [9, 12],
                [7, 3],
                [10, 15],
                [8, 8]
            ]) {
                const m = LCD(a, b);
                expect(m % a).toBe(0);
                expect(m % b).toBe(0);
            }
        });

        it("satisfies GCD(a, b) * LCD(a, b) === |a * b| for coprime and non-coprime pairs", () => {
            for (const [a, b] of [
                [4, 6],
                [12, 18],
                [7, 13],
                [21, 6]
            ]) {
                expect(GCD(a, b) * LCD(a, b)).toBe(Math.abs(a * b));
            }
        });
    });

    describe("oneHundredToFraction() — every integer percent", () => {
        // Each row is [inclusiveStart, inclusiveEnd, [numerator, denominator]],
        // transcribed from the switch statement in oneHundredToFraction. The
        // existing suite only spot-checks a dozen values, leaving most switch
        // arms unexecuted.
        const table = [
            [1, 1, [1, 64]],
            [2, 2, [1, 48]],
            [3, 5, [1, 32]],
            [6, 8, [1, 16]],
            [9, 11, [1, 12]],
            [12, 14, [1, 8]],
            [15, 17, [1, 6]],
            [18, 19, [3, 16]],
            [20, 22, [1, 5]],
            [23, 29, [1, 4]],
            [30, 31, [5, 16]],
            [32, 35, [1, 3]],
            [36, 39, [3, 8]],
            [40, 41, [2, 5]],
            [42, 44, [7, 16]],
            [45, 47, [15, 32]],
            [48, 52, [1, 2]],
            [53, 54, [17, 32]],
            [55, 58, [9, 16]],
            [59, 61, [3, 5]],
            [62, 65, [5, 8]],
            [66, 67, [2, 3]],
            [68, 70, [11, 16]],
            [71, 74, [23, 32]],
            [75, 80, [3, 4]],
            [81, 82, [13, 16]],
            [83, 86, [5, 6]],
            [87, 90, [7, 8]],
            [91, 92, [11, 12]],
            [93, 95, [15, 16]],
            [96, 98, [31, 32]],
            [99, 99, [63, 64]]
        ];

        it("maps every integer from 1 to 99 onto its documented fraction", () => {
            for (const [start, end, expected] of table) {
                for (let d = start; d <= end; d++) {
                    expect(oneHundredToFraction(d)).toEqual(expected);
                }
            }
        });

        it("uses the floor of a fractional input to pick the switch arm", () => {
            expect(oneHundredToFraction(23.9)).toEqual([1, 4]);
            expect(oneHundredToFraction(48.5)).toEqual([1, 2]);
        });

        it("clamps out-of-range values to the extreme fractions", () => {
            expect(oneHundredToFraction(0)).toEqual([1, 64]);
            expect(oneHundredToFraction(0.99)).toEqual([1, 64]);
            expect(oneHundredToFraction(-10)).toEqual([1, 64]);
            expect(oneHundredToFraction(99.5)).toEqual([1, 1]);
            expect(oneHundredToFraction(100)).toEqual([1, 1]);
            expect(oneHundredToFraction(250)).toEqual([1, 1]);
        });

        it("is monotonically non-decreasing across the whole 1-99 domain", () => {
            let previous = -Infinity;
            for (let d = 1; d <= 99; d++) {
                const [n, den] = oneHundredToFraction(d);
                const value = n / den;
                expect(value).toBeGreaterThanOrEqual(previous);
                previous = value;
            }
        });

        it("stays within 0.06 of the requested ratio for every percent", () => {
            for (let d = 1; d <= 99; d++) {
                const [n, den] = oneHundredToFraction(d);
                expect(Math.abs(n / den - d / 100)).toBeLessThan(0.06);
            }
        });
    });

    describe("mixedNumber() — carry and precision edges", () => {
        it("carries a fractional part that rounds up to the next whole number", () => {
            // rationalToFraction(0.9999999) hits its iteration cap and reduces
            // to [1, 1], so mixedNumber must return the incremented whole part.
            expect(mixedNumber(1.9999999)).toBe("2");
            expect(mixedNumber(4.9999999)).toBe("5");
        });

        it("falls back to a two-decimal string when the denominator exceeds 99", () => {
            // 0.01 approximates to [1, 100]; a 1/100 fraction is not a musical
            // subdivision, so the string form is used instead.
            expect(mixedNumber(2.01)).toBe("2.01");
        });

        it("returns a bare fraction with no whole part for values below one", () => {
            expect(mixedNumber(0.25)).toBe("1/4");
            expect(mixedNumber(0.5)).toBe("1/2");
        });

        it("returns <n>/1 for whole numbers and echoes non-numeric input", () => {
            expect(mixedNumber(3)).toBe("3/1");
            expect(mixedNumber("abc")).toBe("abc");
        });
    });

    describe("rationalToFraction() — collapse and cap paths", () => {
        it("collapses a vanishingly small positive value to [0, 1]", () => {
            // Not the d === 0 early return: 1e-9 is a non-zero finite input that
            // drives the numerator to 0 inside the approximation loop.
            expect(rationalToFraction(1e-9)).toEqual([0, 1]);
        });

        it("returns a reduced integer pair when the value never converges", () => {
            const [n, d] = rationalToFraction(Math.PI);
            expect(Number.isInteger(n)).toBe(true);
            expect(Number.isInteger(d)).toBe(true);
            expect(d).toBeGreaterThan(0);
            expect(GCD(n, d)).toBe(1);
            expect(Math.abs(n / d - Math.PI)).toBeLessThan(1e-3);
        });
    });

    describe("rationalSum() — non-integer components", () => {
        // Math.floor(x) !== x on any of the four slots routes that slot through
        // rationalToFraction before the sum; the existing suite only passes
        // whole-number components.
        it("normalizes a non-integer numerator on either side before summing", () => {
            expect(rationalSum([1.5, 2], [1, 2])).toEqual([[5, 4], null]);
            expect(rationalSum([1, 2], [1.5, 2])).toEqual([[5, 4], null]);
        });

        it("normalizes a non-integer denominator on either side before summing", () => {
            expect(rationalSum([1, 2.5], [1, 2])).toEqual([[9, 10], null]);
            expect(rationalSum([1, 2], [1, 2.5])).toEqual([[9, 10], null]);
        });

        it("keeps the result unreduced when both denominators already match", () => {
            expect(rationalSum([3, 4], [1, 4])).toEqual([[4, 4], null]);
        });
    });

    describe("resolveObject() — traversal that throws", () => {
        it("returns undefined when reading a segment of the path throws", () => {
            const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
            global.MbResolveThrows = new Proxy(
                {},
                {
                    get() {
                        throw new Error("boom");
                    }
                }
            );
            try {
                expect(resolveObject("MbResolveThrows.value")).toBeUndefined();
                expect(warn).toHaveBeenCalled();
            } finally {
                delete global.MbResolveThrows;
                warn.mockRestore();
            }
        });

        it("returns undefined for an empty-string path", () => {
            expect(resolveObject("")).toBeUndefined();
        });
    });
});
