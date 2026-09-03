/**
 * @license
 * MusicBlocks v3.4.1
 * Copyright (C) 2025 Om Santosh Suneri
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

global._ = str => str;
const {
    TACAT,
    TAPAL,
    TASCORE,
    PALS,
    PALS_INDEX_MAP,
    PALLABELS,
    analyzeProject,
    scoreToChartData,
    getChartOptions,
    runAnalytics,
    getStatsFromNotation
} = require("../rubrics");
const { isCustomTemperament, getTemperament } = require("../utils/musicutils");

global.last = jest.fn();
global.isCustomTemperament = isCustomTemperament;
global.getTemperament = getTemperament;
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

jest.mock("../utils/musicutils", () => ({
    isCustomTemperament: jest.fn(() => false),
    getTemperament: jest.fn(() => [])
}));
jest.mock("../utils/utils.js", () => ({
    _: jest.fn(str => str)
}));

describe("rubrics.js test suite", () => {
    describe("analyzeProject", () => {
        it("should return an array of scores", () => {
            const activity = {
                blocks: {
                    blockList: [
                        { name: "note", connections: [null, {}] },
                        { name: "setbpm", connections: [null, {}, {}] },
                        { name: "random", connections: [null] }
                    ]
                }
            };
            const result = analyzeProject(activity);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(PALS.length);
        });

        it("should calculate correct category and palette scores using PALS_INDEX_MAP", () => {
            const activity = {
                blocks: {
                    blockList: [{ name: "forward", connections: ["conn1"] }]
                }
            };
            const result = analyzeProject(activity);
            const turtlepIndex = PALS_INDEX_MAP.get("turtlep");
            // TASCORE["forward"] (3) + TASCORE["turtlep"] (5) = 8
            expect(result[turtlepIndex]).toBe(8);
        });

        it("should ignore blocks in trash", () => {
            const activity = {
                blocks: {
                    blockList: [
                        { name: "note", trash: true, connections: [null, {}] },
                        { name: "setbpm", trash: false, connections: [null, {}, {}] }
                    ]
                }
            };
            const result = analyzeProject(activity);
            expect(result).toBeInstanceOf(Array);
        });

        it("should correctly map palettes to their indices in PALS_INDEX_MAP", () => {
            expect(PALS_INDEX_MAP).toBeInstanceOf(Map);
            expect(PALS_INDEX_MAP.size).toBe(PALS.length);
            PALS.forEach((pal, idx) => {
                expect(PALS_INDEX_MAP.get(pal)).toBe(idx);
            });
        });

        it("should warn when TAPAL value is not found in PALS_INDEX_MAP in cats loop", () => {
            const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
            const origIndex = PALS_INDEX_MAP.get("numberp");
            PALS_INDEX_MAP.delete("numberp");

            const activity = {
                blocks: {
                    blockList: [{ name: "random", connections: ["conn1"] }]
                }
            };
            analyzeProject(activity);

            expect(warnSpy).toHaveBeenCalledWith(
                "rubrics: TAPAL value not found in PALS:",
                "numberp"
            );
            warnSpy.mockRestore();
            PALS_INDEX_MAP.set("numberp", origIndex);
        });

        it("should warn when pal is not found in PALS_INDEX_MAP in pals loop", () => {
            const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
            const origIndex = PALS_INDEX_MAP.get("turtlep");
            PALS_INDEX_MAP.delete("turtlep");

            const activity = {
                blocks: {
                    blockList: [{ name: "forward", connections: ["conn1"] }]
                }
            };
            analyzeProject(activity);

            expect(warnSpy).toHaveBeenCalledWith("rubrics: pal not found in PALS:", "turtlep");
            warnSpy.mockRestore();
            PALS_INDEX_MAP.set("turtlep", origIndex);
        });
    });

    describe("scoreToChartData", () => {
        it("should return a properly formatted chart data object", () => {
            const scores = [10, 20, 30, 40, 50];
            const chartData = scoreToChartData(scores);

            expect(chartData).toHaveProperty("labels");
            expect(chartData).toHaveProperty("datasets");
            expect(Array.isArray(chartData.labels)).toBe(true);
            expect(chartData.datasets).toHaveLength(1);
            expect(chartData.datasets[0]).toHaveProperty("data");
            expect(chartData.datasets[0].data.length).toBe(scores.length);
        });
    });

    describe("getChartOptions", () => {
        it("should return an object with correct chart settings", () => {
            const callback = jest.fn();
            const options = getChartOptions(callback);

            expect(options).toHaveProperty("onAnimationComplete", callback);
            expect(options).toHaveProperty("scaleShowLine", true);
            expect(options).toHaveProperty("datasetFill", true);
        });
    });

    describe("runAnalytics", () => {
        it("should set correct properties on logo object", () => {
            const activity = {
                logo: {
                    runningLilypond: false,
                    collectingStats: false,
                    notation: {
                        notationStaging: {},
                        notationDrumStaging: {}
                    },
                    runLogoCommands: jest.fn()
                },
                turtles: {
                    turtleList: [{ painter: { doClear: jest.fn() } }],
                    getTurtleCount: jest.fn(() => 1),
                    getTurtle: jest.fn(id => ({
                        painter: { doClear: jest.fn() }
                    }))
                }
            };

            runAnalytics(activity);

            expect(activity.logo.runningLilypond).toBe(true);
            expect(activity.logo.collectingStats).toBe(true);
            expect(activity.logo.runLogoCommands).toHaveBeenCalled();
        });
    });

    describe("getStatsFromNotation", () => {
        it("should return an object with musical statistics", () => {
            const activity = {
                logo: {
                    notation: {
                        notationStaging: {
                            0: [["C4", "D4"], 3],
                            1: [["E4", "F4"], 5]
                        }
                    },
                    synth: {
                        inTemperament: false,
                        _getFrequency: jest.fn(note => note.length * 100)
                    }
                },
                blocks: {
                    blockList: [
                        {
                            name: "rest2",
                            trash: false,
                            protoblock: { palette: { name: "ornaments" } }
                        }
                    ]
                }
            };

            const stats = getStatsFromNotation(activity);

            expect(stats).toHaveProperty("numberOfNotes");
            expect(stats.numberOfNotes).toBeGreaterThan(0);
            expect(stats).toHaveProperty("rests", 1);
            expect(stats).toHaveProperty("ornaments", 1);
        });
    });

    describe("analyzeProject block-retention guards", () => {
        const analyze = blockList => analyzeProject({ blocks: { blockList } });

        it("drops a first-group block whose flow connection is null", () => {
            expect(analyze([{ name: "tie", connections: [null, null] }])).toEqual(
                new Array(PALS.length).fill(0)
            );
        });

        it("drops a tuplet2 block with no child", () => {
            expect(analyze([{ name: "tuplet2", connections: [null, {}, {}, null] }])).toEqual(
                new Array(PALS.length).fill(0)
            );
        });

        it("drops an invert block with no child", () => {
            expect(analyze([{ name: "invert", connections: [null, {}, {}, {}, null] }])).toEqual(
                new Array(PALS.length).fill(0)
            );
        });

        it("logs a debug line for a retained block that is not in the catalog", () => {
            const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
            analyze([{ name: "zzz_not_in_catalog", connections: ["parent"] }]);
            expect(spy).toHaveBeenCalledWith("zzz_not_in_catalog not in catalog");
            spy.mockRestore();
        });

        it("retains connected blocks from every guarded switch group", () => {
            jest.spyOn(console, "debug").mockImplementation(() => {});
            const result = analyze([
                { name: "start", connections: [null, {}] },
                { name: "note", connections: [null, {}, {}] },
                { name: "crescendo", connections: [null, {}, {}] },
                { name: "tuplet2", connections: [null, {}, {}, {}] },
                { name: "invert", connections: [null, {}, {}, {}, {}] }
            ]);
            expect(result).toHaveLength(PALS.length);
            console.debug.mockRestore();
        });
    });

    describe("getStatsFromNotation notation branches", () => {
        const emptyBlocks = { blockList: [] };

        it("counts duples, triplets and quintuplets and records articulation markers", () => {
            const activity = {
                logo: {
                    notation: {
                        notationStaging: {
                            0: [[[], 2], [[], 3], [[], 5], "begin articulation", "end articulation"]
                        }
                    },
                    synth: { inTemperament: false, _getFrequency: jest.fn(() => 440) }
                },
                blocks: emptyBlocks
            };

            const stats = getStatsFromNotation(activity);

            expect(stats.duples).toBe(1);
            expect(stats.triplets).toBe(1);
            expect(stats.quintuplets).toBe(1);
            expect(stats.articulation.begin).toEqual(["3", "4"]);
        });

        it("tracks the lowest and highest notes as it walks the staging list", () => {
            const freqs = { C4: 400, A4: 200, E4: 800 };
            const activity = {
                logo: {
                    notation: { notationStaging: { 0: [[["C4", "A4", "E4"], 4]] } },
                    synth: { inTemperament: false, _getFrequency: jest.fn(n => freqs[n]) }
                },
                blocks: emptyBlocks
            };

            const stats = getStatsFromNotation(activity);

            expect(stats.lowestNote[0]).toBe("A4");
            expect(stats.highestNote[0]).toBe("E4");
            expect(stats.numberOfNotes).toBe(3);
            expect([...stats.pitchNames].sort()).toEqual(["A", "C", "E"]);
        });

        it("uses the custom-temperament frequency path and relabels the note", () => {
            isCustomTemperament.mockReturnValueOnce(true);
            getTemperament.mockReturnValueOnce([["x", "Do", "y", "C"]]);
            const activity = {
                logo: {
                    notation: { notationStaging: { 0: [[["C4"], 4]] } },
                    synth: {
                        inTemperament: "custom",
                        getCustomFrequency: jest.fn(() => 260),
                        _getFrequency: jest.fn(() => NaN)
                    }
                },
                blocks: emptyBlocks
            };

            const stats = getStatsFromNotation(activity);

            expect(activity.logo.synth.getCustomFrequency).toHaveBeenCalled();
            expect(stats.pitches).toEqual([260]);
            expect([...stats.pitchNames]).toEqual(["Do"]);
        });

        it("records a rest pitch name when a note carries no letter", () => {
            const activity = {
                logo: {
                    notation: { notationStaging: { 0: [[["4"], 4]] } },
                    synth: { inTemperament: false, _getFrequency: jest.fn(() => 100) }
                },
                blocks: emptyBlocks
            };

            const stats = getStatsFromNotation(activity);

            expect([...stats.pitchNames]).toEqual(["R"]);
        });

        it("skips trashed blocks in the rest and ornament tally", () => {
            const activity = {
                logo: {
                    notation: { notationStaging: {} },
                    synth: { inTemperament: false, _getFrequency: jest.fn(() => 1) }
                },
                blocks: {
                    blockList: [
                        {
                            name: "rest2",
                            trash: true,
                            protoblock: { palette: { name: "rhythm" } }
                        },
                        {
                            name: "rest2",
                            trash: false,
                            protoblock: { palette: { name: "ornaments" } }
                        }
                    ]
                }
            };

            const stats = getStatsFromNotation(activity);

            expect(stats.rests).toBe(1);
            expect(stats.ornaments).toBe(1);
        });
    });
});
