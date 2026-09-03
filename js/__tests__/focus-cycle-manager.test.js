// Copyright (c) 2026 Sugarlabs
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the The GNU Affero General Public
// License as published by the Free Software Foundation; either
// version 3 of the License, or (at your option) any later version.
//
// You should have received a copy of the GNU Affero General Public
// License along with this library; if not, write to the Free Software
// Foundation, 51 Franklin Street, Suite 500 Boston, MA 02110-1335 USA

"use strict";

const FocusCycleManager = require("../focus-cycle-manager");

const pressTab = shiftKey => {
    const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey,
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(event);
    return event;
};

describe("FocusCycleManager module", () => {
    afterEach(() => {
        const region = document.getElementById("fcm-announcer");
        if (region) {
            region.remove();
        }
        document.body.innerHTML = "";
    });

    describe("init lifecycle", () => {
        test("init registers keydown (capture), mousedown (bubble) and focusin (capture) listeners", () => {
            const addSpy = jest.spyOn(document, "addEventListener");
            const manager = new FocusCycleManager();
            manager.init();

            expect(addSpy).toHaveBeenCalledWith("keydown", manager._onKeyDown, true);
            expect(addSpy).toHaveBeenCalledWith("mousedown", manager._onMouseDown, false);
            expect(addSpy).toHaveBeenCalledWith("focusin", manager._onFocusIn, true);

            addSpy.mockRestore();
            manager.dispose();
        });

        test("init is idempotent: a second call registers no additional listeners", () => {
            const manager = new FocusCycleManager();
            const addSpy = jest.spyOn(document, "addEventListener");

            manager.init();
            const callsAfterFirstInit = addSpy.mock.calls.length;
            manager.init();

            expect(addSpy.mock.calls.length).toBe(callsAfterFirstInit);

            addSpy.mockRestore();
            manager.dispose();
        });

        test("init creates the visually hidden aria-live announcer", () => {
            const manager = new FocusCycleManager();
            manager.init();

            const region = document.getElementById("fcm-announcer");
            expect(region).not.toBeNull();
            expect(region.getAttribute("aria-live")).toBe("polite");
            expect(manager._liveRegion).toBe(region);

            manager.dispose();
        });

        test("dispose removes exactly the (type, handler, capture) triples init adds", () => {
            const added = [];
            const removed = [];
            const addSpy = jest
                .spyOn(document, "addEventListener")
                .mockImplementation((...args) => added.push(args));
            const removeSpy = jest
                .spyOn(document, "removeEventListener")
                .mockImplementation((...args) => removed.push(args));

            const manager = new FocusCycleManager();
            manager.init();
            manager.dispose();

            expect(removed.length).toBe(added.length);
            added.forEach(([type, fn, capture]) => {
                const match = removed.find(
                    ([rType, rFn, rCapture]) => rType === type && rFn === fn && rCapture === capture
                );
                expect(match).toBeDefined();
            });

            // After dispose, init must fully re-register (no partial init).
            manager.init();
            expect(added.length).toBe(6);

            addSpy.mockRestore();
            removeSpy.mockRestore();
        });

        test("the announcer node stays a singleton across instances and re-inits", () => {
            const first = new FocusCycleManager();
            const second = new FocusCycleManager();
            first.init();
            second.init();
            first.dispose();
            first.init();

            expect(document.querySelectorAll("#fcm-announcer").length).toBe(1);
            expect(first._liveRegion).toBe(second._liveRegion);

            first.dispose();
            expect(first._liveRegion).toBeNull();
            second.dispose();
        });

        test("dispose removes all document-level listeners so Tab no longer cycles", () => {
            const manager = new FocusCycleManager();
            manager.init();
            manager.dispose();

            pressTab(false);

            expect(manager._keyboardMode).toBe(false);
            expect(manager._currentZone).toBeNull();
        });

        test("init after dispose reattaches the existing live region and keeps announcing", () => {
            const manager = new FocusCycleManager();
            manager.init();
            const region = document.getElementById("fcm-announcer");
            expect(manager._liveRegion).toBe(region);

            manager.dispose();
            expect(manager._liveRegion).toBeNull();
            // The DOM node deliberately survives disposal.
            expect(document.getElementById("fcm-announcer")).toBe(region);

            manager.init();
            expect(manager._liveRegion).toBe(region);

            manager._announce("Toolbar active");
            expect(region.textContent).toBe("Toolbar active");

            // Listeners work again after re-init.
            pressTab(false);
            expect(manager._currentZone).toBe("toolbar");

            manager.dispose();
        });
    });

    describe("Tab cycling", () => {
        test("Tab cycles forward workspace -> toolbar -> palette -> workspace", () => {
            const manager = new FocusCycleManager();
            manager.init();

            pressTab(false);
            expect(manager._currentZone).toBe("toolbar");
            expect(manager._keyboardMode).toBe(true);

            pressTab(false);
            expect(manager._currentZone).toBe("palette");

            pressTab(false);
            expect(manager._currentZone).toBe("workspace");

            manager.dispose();
        });

        test("Shift+Tab cycles in reverse workspace -> palette -> toolbar", () => {
            const manager = new FocusCycleManager();
            manager.init();

            pressTab(true);
            expect(manager._currentZone).toBe("palette");

            pressTab(true);
            expect(manager._currentZone).toBe("toolbar");

            manager.dispose();
        });

        test("includes visible canvas controls in the Tab cycle", () => {
            const controls = document.createElement("div");
            controls.id = "buttoncontainerBOTTOM";
            const button = document.createElement("div");
            button.className = "tooltipped";
            button.setAttribute("tabindex", "0");
            Object.defineProperty(button, "offsetWidth", { configurable: true, value: 48 });
            const focusSpy = jest.spyOn(button, "focus");
            controls.appendChild(button);
            document.body.appendChild(controls);

            const manager = new FocusCycleManager();
            manager.init();
            manager._currentZone = "palette";
            manager._keyboardMode = true;

            pressTab(false);

            expect(manager._currentZone).toBe("controls");
            expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });

            manager.dispose();
        });

        test("non-Tab keys are ignored", () => {
            const manager = new FocusCycleManager();
            manager.init();

            const event = new KeyboardEvent("keydown", {
                key: "Enter",
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);

            expect(manager._keyboardMode).toBe(false);
            expect(manager._currentZone).toBeNull();
            expect(event.defaultPrevented).toBe(false);

            manager.dispose();
        });
    });

    describe("keyboard navigation handoff", () => {
        test("exits keyboard mode without disposing the manager", () => {
            const manager = new FocusCycleManager();
            manager._keyboardMode = true;
            manager._currentZone = "toolbar";
            manager._lastFocusedButton = document.createElement("button");

            manager.exitKeyboardNavigation();

            expect(manager._keyboardMode).toBe(false);
            expect(manager._currentZone).toBeNull();
            expect(manager._lastFocusedButton).toBeNull();
        });
    });

    describe("bypass rules", () => {
        test("Tab is not intercepted while a textarea has focus", () => {
            const manager = new FocusCycleManager();
            manager.init();

            const textarea = document.createElement("textarea");
            document.body.appendChild(textarea);
            textarea.focus();

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(false);
            expect(event.defaultPrevented).toBe(false);

            manager.dispose();
        });

        test("Tab is not intercepted while a text input has focus", () => {
            const manager = new FocusCycleManager();
            manager.init();

            const input = document.createElement("input");
            input.type = "text";
            document.body.appendChild(input);
            input.focus();

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(false);
            expect(event.defaultPrevented).toBe(false);

            manager.dispose();
        });

        test("Tab is not intercepted while a contenteditable element has focus", () => {
            const manager = new FocusCycleManager();
            manager.init();

            const editable = {
                nodeName: "DIV",
                isContentEditable: true,
                closest: () => null
            };
            const activeSpy = jest
                .spyOn(document, "activeElement", "get")
                .mockReturnValue(editable);

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(false);
            expect(event.defaultPrevented).toBe(false);

            activeSpy.mockRestore();
            manager.dispose();
        });

        test("Tab with a modifier key is not intercepted", () => {
            const manager = new FocusCycleManager();
            manager.init();

            const event = new KeyboardEvent("keydown", {
                key: "Tab",
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);

            expect(manager._keyboardMode).toBe(false);
            expect(event.defaultPrevented).toBe(false);

            manager.dispose();
        });
    });

    describe("mouse interaction", () => {
        test("any mousedown exits keyboard mode and resets the tracked zone", () => {
            const manager = new FocusCycleManager();
            manager.init();

            pressTab(false);
            expect(manager._keyboardMode).toBe(true);
            expect(manager._currentZone).toBe("toolbar");

            document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

            expect(manager._keyboardMode).toBe(false);
            expect(manager._currentZone).toBeNull();

            manager.dispose();
        });
    });

    describe("legacy export compatibility", () => {
        test("toolbar-ui re-exports the same class (CommonJS)", () => {
            const ToolbarUI = require("../toolbar-ui");
            expect(ToolbarUI.FocusCycleManager).toBe(FocusCycleManager);
        });

        test("toolbar.js shim re-exports the same class", () => {
            const shim = require("../toolbar");
            expect(shim.FocusCycleManager).toBe(FocusCycleManager);
        });

        test("AMD registration exposes window.FocusCycleManager and ToolbarUI.FocusCycleManager", () => {
            let amdToolbarUI;
            global.define = (deps, factory) => {
                if (typeof deps === "function") {
                    factory = deps;
                    deps = [];
                }
                const resolved = deps.map(dep =>
                    dep === "activity/focus-cycle-manager" ? FocusCycleManager : undefined
                );
                const result = factory(...resolved);
                if (result && result.name === "ToolbarUI") {
                    amdToolbarUI = result;
                }
            };
            global.define.amd = {};

            try {
                jest.isolateModules(() => {
                    require("../toolbar-ui");
                });
            } finally {
                delete global.define;
            }

            expect(amdToolbarUI).toBeDefined();
            expect(amdToolbarUI.FocusCycleManager).toBe(FocusCycleManager);
            expect(window.ToolbarUI).toBe(amdToolbarUI);
            expect(window.ToolbarUI.FocusCycleManager).toBe(FocusCycleManager);
            expect(window.Toolbar).toBe(amdToolbarUI);
            expect(window.FocusCycleManager).toBe(FocusCycleManager);

            delete window.Toolbar;
            delete window.ToolbarUI;
            delete window.FocusCycleManager;
        });
    });

    describe("notification popup bypass", () => {
        // index.html ships both popups in the DOM permanently; css/activities.css
        // hides them with `visibility: hidden` and reveals them by adding `.show`.
        // Reproduce that here so getComputedStyle behaves as it does in a browser.
        const POPUP_CSS = `
            .popupMsg { visibility: hidden; }
            #printText.show, #errorText.show { visibility: visible; }
        `;

        const mountPopups = () => {
            const style = document.createElement("style");
            style.id = "popup-css";
            style.textContent = POPUP_CSS;
            document.head.appendChild(style);
            document.body.insertAdjacentHTML(
                "beforeend",
                '<div class="popupMsg" id="printText" tabindex="-1" aria-live="polite" role="status"></div>' +
                    '<div class="popupMsg" id="errorText" tabindex="-1" aria-live="assertive" role="alert"></div>'
            );
            return {
                printText: document.getElementById("printText"),
                errorText: document.getElementById("errorText")
            };
        };

        afterEach(() => {
            const style = document.getElementById("popup-css");
            if (style) style.remove();
        });

        test("Tab still cycles when the popups are present but hidden", () => {
            mountPopups();
            const manager = new FocusCycleManager();
            manager.init();

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(true);
            expect(event.defaultPrevented).toBe(true);

            manager.dispose();
        });

        test("Tab is not intercepted while the print popup is shown", () => {
            const { printText } = mountPopups();
            printText.classList.add("show");

            const manager = new FocusCycleManager();
            manager.init();

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(false);
            expect(event.defaultPrevented).toBe(false);

            manager.dispose();
        });

        test("Tab is not intercepted while the error popup is shown", () => {
            const { errorText } = mountPopups();
            errorText.classList.add("show");

            const manager = new FocusCycleManager();
            manager.init();

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(false);
            expect(event.defaultPrevented).toBe(false);

            manager.dispose();
        });

        test("a popup hidden with display:none does not block cycling", () => {
            const { errorText } = mountPopups();
            // activity.js hides errorText this way rather than by class.
            errorText.style.display = "none";

            const manager = new FocusCycleManager();
            manager.init();

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(true);
            expect(event.defaultPrevented).toBe(true);

            manager.dispose();
        });
    });

    // -----------------------------------------------------------------------
    // Zone entry / exit against a realistic DOM (toolbars, palette, canvas)
    // and an ActivityContext exposing a palette model. The suites above run
    // without these fixtures, so _enterZone / _leaveZone / _focusWorkspaceFromMouse
    // early-return; here they execute fully.
    // -----------------------------------------------------------------------
    describe("zone entry and DOM handoff", () => {
        let palettes;

        const buildZoneDom = () => {
            document.body.innerHTML = `
                <div id="toolbars"><button id="tb1">a</button><button id="tb2">b</button></div>
                <div id="palette" tabindex="0">
                    <div><div></div><div><div></div><div id="listBody">
                        <div id="r0"></div><div id="r1"></div>
                    </div></div></div>
                </div>
                <div id="canvasHolder"></div>
                <div id="canvas"></div>
                <div id="canvasContainer"></div>
            `;
            for (const id of ["tb1", "tb2"]) {
                Object.defineProperty(document.getElementById(id), "offsetWidth", {
                    configurable: true,
                    value: 40
                });
            }
        };

        beforeEach(() => {
            if (typeof PointerEvent === "undefined") {
                global.PointerEvent = class PointerEvent extends Event {};
            }
            buildZoneDom();
            palettes = {
                _keyboardNavActive: false,
                resetKeyboardNavigation: jest.fn(),
                _navSection: null,
                _navBlockIndex: null
            };
            global.ActivityContext = { getActivity: () => ({ palettes, blocks: {} }) };
            window.platformColor = { hoverColor: "#123456" };
        });

        afterEach(() => {
            delete global.ActivityContext;
        });

        test("entering the toolbar focuses a visible button, sets the ring and announces", () => {
            const manager = new FocusCycleManager();
            manager.init();
            const focusSpy = jest.spyOn(document.getElementById("tb1"), "focus");

            pressTab(false);

            expect(manager._currentZone).toBe("toolbar");
            expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
            expect(
                document.getElementById("toolbars").classList.contains("focus-zone-active")
            ).toBe(true);
            expect(document.getElementById("fcm-announcer").textContent).toBe("Toolbar active");

            manager.dispose();
        });

        test("entering the palette syncs keyboard state and highlights a block row", () => {
            const manager = new FocusCycleManager();
            manager.init();

            pressTab(false); // toolbar
            pressTab(false); // palette

            expect(manager._currentZone).toBe("palette");
            expect(palettes._keyboardNavActive).toBe(true);
            expect(palettes._navSection).toBe("blocks");
            expect(document.getElementById("r1").dataset.keyboardFocus).toBe("true");
            expect(document.getElementById("fcm-announcer").textContent).toBe("Palette active");

            manager.dispose();
        });

        test("leaving the palette calls resetKeyboardNavigation", () => {
            const manager = new FocusCycleManager();
            manager.init();

            pressTab(false); // toolbar
            pressTab(false); // palette
            pressTab(false); // workspace

            expect(palettes.resetKeyboardNavigation).toHaveBeenCalledWith({
                closeMenus: true,
                blur: true
            });

            manager.dispose();
        });

        test("palette sync falls back to the flag when resetKeyboardNavigation is absent", () => {
            palettes = { _keyboardNavActive: false };
            const manager = new FocusCycleManager();
            manager.init();

            pressTab(false); // toolbar
            pressTab(false); // palette
            expect(palettes._keyboardNavActive).toBe(true);
            pressTab(false); // workspace
            expect(palettes._keyboardNavActive).toBe(false);

            manager.dispose();
        });

        test("entering the workspace focuses canvasHolder and re-engages the canvas", () => {
            const manager = new FocusCycleManager();
            manager.init();
            const holderFocus = jest.spyOn(document.getElementById("canvasHolder"), "focus");
            const canvasDispatch = jest.spyOn(document.getElementById("canvas"), "dispatchEvent");

            pressTab(false); // toolbar
            pressTab(false); // palette
            pressTab(false); // workspace

            expect(manager._currentZone).toBe("workspace");
            expect(holderFocus).toHaveBeenCalledWith({ preventScroll: true });
            expect(canvasDispatch).toHaveBeenCalled();
            expect(document.getElementById("canvasHolder").getAttribute("tabindex")).toBe("-1");
            expect(document.getElementById("fcm-announcer").textContent).toBe("Workspace active");

            manager.dispose();
        });

        test("leaving the toolbar strips toolbar-btn-focused and blurs the button", () => {
            const manager = new FocusCycleManager();
            manager.init();
            const btn = document.getElementById("tb1");
            btn.classList.add("toolbar-btn-focused");
            const blurSpy = jest.spyOn(btn, "blur");

            pressTab(false); // enter toolbar
            pressTab(false); // leave toolbar

            expect(btn.classList.contains("toolbar-btn-focused")).toBe(false);
            expect(blurSpy).toHaveBeenCalled();

            manager.dispose();
        });

        test("mousedown on the workspace focuses it and hands off palette state", () => {
            const manager = new FocusCycleManager();
            manager.init();
            pressTab(false);

            const holder = document.getElementById("canvasHolder");
            const holderFocus = jest.spyOn(holder, "focus");
            holder.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

            expect(manager._keyboardMode).toBe(false);
            expect(holderFocus).toHaveBeenCalled();
            expect(manager._currentZone).toBe("workspace");
            expect(palettes.resetKeyboardNavigation).toHaveBeenCalledWith({
                closeMenus: true,
                blur: true
            });

            manager.dispose();
        });

        test("focusin on a toolbar button records it as the remembered button", () => {
            const manager = new FocusCycleManager();
            manager.init();
            const btn = document.getElementById("tb2");

            btn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

            expect(manager._lastFocusedButton).toBe(btn);

            manager.dispose();
        });

        test("re-entering the toolbar restores the remembered button", () => {
            const manager = new FocusCycleManager();
            manager.init();
            const btn = document.getElementById("tb2");
            btn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
            const focusSpy = jest.spyOn(btn, "focus");

            pressTab(false);

            expect(focusSpy).toHaveBeenCalled();

            manager.dispose();
        });

        test("focusin inside the palette while in keyboard mode updates the tracked zone", () => {
            const manager = new FocusCycleManager();
            manager.init();
            manager._keyboardMode = true;

            document
                .getElementById("r0")
                .dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

            expect(manager._currentZone).toBe("palette");

            manager.dispose();
        });

        test("Tab is bypassed when the active element sits inside a dialog", () => {
            const manager = new FocusCycleManager();
            manager.init();
            document.body.insertAdjacentHTML(
                "beforeend",
                '<div role="dialog"><button id="dlg">x</button></div>'
            );
            document.getElementById("dlg").focus();

            const event = pressTab(false);

            expect(manager._keyboardMode).toBe(false);
            expect(event.defaultPrevented).toBe(false);

            manager.dispose();
        });
    });
});
