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

const saveMxmlOutput = require("../mxml");

describe("saveMxmlOutput exact output", () => {
    // A full-string check anchors the indentation, element order and the
    // literal MusicXML boilerplate that the many toContain() assertions below
    // only spot-check.
    it("emits the complete MusicXML document for a single quarter note", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [[[["C", "", 4]], 4, 0]]
                }
            }
        };

        const expected = [
            "<?xml version='1.0' encoding='UTF-8'?>",
            '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
            '<score-partwise version="3.1">',
            "    <part-list>",
            '        <score-part id="P1">',
            "            <part-name> Voice #1 </part-name>",
            "        </score-part>",
            "    </part-list>",
            '    <part id="P1">',
            '            <measure number="1"> <attributes> <divisions>32</divisions> <key> <fifths>0</fifths> </key> <time> <beats>4</beats> <beat-type>4</beat-type> </time> <clef>  <sign>G</sign> <line>2</line> </clef> </attributes>',
            "            <note>",
            "                <pitch>",
            "                    <step>C</step>",
            "                    <octave>4</octave>",
            "                </pitch>",
            "                <duration>8</duration>",
            "            <notations>",
            "                <articulations>",
            "                </articulations>",
            "            </notations>",
            "            </note>",
            "            <barline>",
            "                <bar-style>light-heavy</bar-style>",
            "            </barline>",
            "        </measure>",
            "    </part>",
            "</score-partwise>",
            ""
        ].join("\n");

        expect(saveMxmlOutput(logo)).toBe(expected);
    });
});

describe("saveMxmlOutput", () => {
    it("should return a valid XML string for a basic input", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [[["C"], 4, 0]],
                    1: []
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain("<?xml version='1.0' encoding='UTF-8'?>");
        expect(output).toContain('<score-partwise version="3.1">');
        expect(output).toContain("<part-list>");
        expect(output).toContain('<score-part id="P1">');
        expect(output).toContain('<part id="P1">');
    });

    it("should handle multiple voices", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [
                        [["C"], 4, 0],
                        [["D"], 4, 0]
                    ],
                    1: [
                        [["E"], 4, 0],
                        [["F"], 4, 0]
                    ]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain('<score-part id="P1">');
        expect(output).toContain('<score-part id="P2">');
        expect(output).toContain('<part id="P1">');
        expect(output).toContain('<part id="P2">');
        expect(output).toContain("<step>C</step>");
        expect(output).toContain("<step>E</step>");
    });

    it("should ignore specified elements", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: ["voice one", [["C"], 4, 0], "voice two"]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).not.toContain("voice one");
        expect(output).not.toContain("voice two");
        expect(output).toContain("<step>C</step>");
    });

    it("should handle tempo changes", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: ["tempo", 120, 4, [["C"], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain('<sound tempo="120"/>');
        expect(output).toContain("<step>C</step>");
    });

    it("should handle meter changes", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: ["meter", 3, 4, [["C"], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain("<time>");
        expect(output).toContain("<beat-type>4</beat-type>");
        expect(output).toContain("<step>C</step>");
    });

    it("should handle crescendo and decrescendo markings", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [
                        "begin crescendo",
                        [["C"], 4, 0],
                        "end crescendo",
                        "begin decrescendo",
                        [["D"], 4, 0],
                        "end decrescendo"
                    ]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain('<wedge type="crescendo"/>');
        expect(output).toContain('<wedge type="diminuendo"/>');
        expect(output).toContain('<wedge type="stop"/>');
        expect(output).toContain("<step>C</step>");
        expect(output).toContain("<step>D</step>");
    });

    it("should handle tied notes", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [[["C"], 4, 0], "tie", [["C"], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain('<tie type="start"/>');
        expect(output).toContain('<tie type="stop"/>');
    });

    it("skips a key marker and its two following tokens without emitting them", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: ["key", "C", "major", [[["C", "", 4]], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        // The "key", "C" and "major" tokens are consumed silently: only the
        // single real note survives.
        expect(output).not.toContain("major");
        expect((output.match(/<note>/g) || []).length).toBe(1);
        expect(output).toContain("<step>C</step>");
        expect(output).toContain("<octave>4</octave>");
    });

    it("emits an inline <sound tempo> when a tempo marker follows an open measure", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [[[["C", "", 4]], 4, 0], "tempo", 120, 4, [[["D", "", 4]], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);
        const soundIdx = output.indexOf('<sound tempo="120"/>');
        const firstNoteIdx = output.indexOf("<note>");

        expect(soundIdx).toBeGreaterThan(-1);
        // Inline (not queued): the tempo appears after the first note has opened
        // the measure rather than immediately after the <measure> attributes.
        expect(soundIdx).toBeGreaterThan(firstNoteIdx);
        expect(output).toContain("<step>D</step>");
    });

    it("closes the current measure and opens a new one when a note overflows the bar", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [
                        [[["C", "", 4]], 1, 0],
                        [[["D", "", 4]], 1, 0]
                    ]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain('<measure number="1">');
        expect(output).toContain('<measure number="2">');
        expect(output.split("</measure>").length - 1).toBe(2);
    });

    it("applies a mid-piece meter change to the following measure's attributes", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [
                        [[["C", "", 4]], 1, 0],
                        [[["D", "", 4]], 1, 0],
                        "meter",
                        3,
                        4,
                        [[["E", "", 4]], 1, 0]
                    ]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        // The measure that opens after the meter marker carries the new
        // divisions (24 = 3 * (1/4) / (1/32)) and beat count.
        expect(output).toContain("<divisions>24</divisions>");
        expect(output).toContain("<beats>3</beats>");
        expect(output).toContain('<measure number="3">');
    });

    it("renders a rest note as <rest/> with no <pitch> element", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [[[["R"]], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain("<rest/>");
        expect(output).not.toContain("<pitch>");
    });

    it("emits <slur> start/stop notations around a slurred note", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: ["begin slur", [[["C", "", 4]], 4, 0], "end slur"]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain('<slur type="start"/>');
        expect(output).toContain('<slur type="stop"/>');
    });

    it("emits a <chord/> tag for every pitch after the first in a chord", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [
                        [
                            [
                                ["C", "", 4],
                                ["E", "", 4]
                            ],
                            4,
                            0
                        ]
                    ]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output.split("<chord/>").length - 1).toBe(1);
        expect(output).toContain("<step>C</step>");
        expect(output).toContain("<step>E</step>");
    });

    it("emits a staccato articulation when the note carries the staccato flag", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [[[["C", "", 4]], 4, 0, 0, 0, 0, true]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain('<staccato placement="below"/>');
    });

    it("emits an <alter> element for accidentals and renders the octave", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [
                        [[["E", "♭", 4]], 4, 0],
                        [[["F", "♯", 5]], 4, 0]
                    ]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect(output).toContain("<alter>-1</alter>");
        expect(output).toContain("<alter>1</alter>");
        expect(output).toContain("<octave>5</octave>");
    });

    it("renumbers parts by offsetting every voice index against the lowest one", () => {
        const logo = {
            notation: {
                notationStaging: {
                    3: [[[["C", "", 4]], 4, 0]],
                    5: [[[["E", "", 4]], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        // voiceNum is index+1, so the raw ids are P4/P6; renumbering subtracts
        // (min - 1) = 3, giving P1 and P3 (the spacing between voices is kept).
        expect(output).toContain('<score-part id="P1">');
        expect(output).toContain('<score-part id="P3">');
        expect(output).toContain("Voice #1");
        expect(output).toContain("Voice #3");
        expect(output).not.toContain("P4");
        expect(output).not.toContain("P6");
    });

    it("drops voices whose staging array is empty", () => {
        const logo = {
            notation: {
                notationStaging: {
                    0: [],
                    1: [[[["C", "", 4]], 4, 0]]
                }
            }
        };

        const output = saveMxmlOutput(logo);

        expect((output.match(/<part id=/g) || []).length).toBe(1);
    });
});
