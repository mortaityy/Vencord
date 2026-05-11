/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import {
    Button,
    ColorPicker,
    Forms,
    SearchableSelect,
    Slider,
    Text,
} from "@webpack/common";

const STYLE_ID = "vc-smoothtype";

const EASING_OPTIONS = [
    { label: "Ease-out (recommended)", value: "ease-out" },
    { label: "Ease", value: "ease" },
    { label: "Linear", value: "linear" },
    { label: "Ease-in", value: "ease-in" },
    { label: "Ease-in-out", value: "ease-in-out" },
] as const;

const IDLE_OPTIONS = [
    { label: "Off", value: "off" },
    { label: "Breathe (while idle, not blinking)", value: "breathe" },
    { label: "Shimmer glow (while idle, not blinking)", value: "shimmer" },
] as const;

/** Subscribe to every key the HUD / chat button read, so UI stays live */
const LIVE_SETTING_KEYS = [
    "transitionDelay",
    "animationType",
    "useGpuTransform",
    "caretWidth",
    "caretBorderRadius",
    "caretOpacity",
    "caretGlow",
    "blinkEnabled",
    "blinkDurationMs",
    "caretColor",
    "showChatBarButton",
    "keyPressPulse",
    "keyPressPulseMs",
    "idleMotion",
    "rainbowCaret",
] as const;

function onPickColor(color: number) {
    settings.store.caretColor = color;
    applyCSS();
}

const settings = definePluginSettings({
    showChatBarButton: {
        type: OptionType.BOOLEAN,
        description: "Show the SmoothType button in the chat bar (next to GIFs, etc.)",
        default: true,
    },
    transitionDelay: {
        type: OptionType.NUMBER,
        description: "Caret move duration (ms) — higher = smoother/slower",
        default: 55,
        onChange: () => applyCSS(),
    },
    animationType: {
        type: OptionType.SELECT,
        description: "Move easing",
        options: [
            { label: "Ease-out (recommended)", value: "ease-out", default: true },
            { label: "Ease", value: "ease" },
            { label: "Linear", value: "linear" },
            { label: "Ease-in", value: "ease-in" },
            { label: "Ease-in-out", value: "ease-in-out" },
        ],
        onChange: () => applyCSS(),
    },
    useGpuTransform: {
        type: OptionType.BOOLEAN,
        description: "Use GPU transform for caret movement (usually smoothest)",
        default: true,
        onChange: () => applyCSS(),
    },
    caretWidth: {
        type: OptionType.NUMBER,
        description: "Caret width (px)",
        default: 2,
        onChange: () => applyCSS(),
    },
    caretBorderRadius: {
        type: OptionType.NUMBER,
        description: "Caret corner radius (px)",
        default: 2,
        onChange: () => applyCSS(),
    },
    caretOpacity: {
        type: OptionType.NUMBER,
        description: "Caret opacity (0.25–1)",
        default: 1,
        onChange: () => applyCSS(),
    },
    caretGlow: {
        type: OptionType.NUMBER,
        description: "Soft glow radius (px, 0 = off)",
        default: 0,
        onChange: () => applyCSS(),
    },
    blinkEnabled: {
        type: OptionType.BOOLEAN,
        description: "Blink caret when idle",
        default: true,
        onChange: () => applyCSS(),
    },
    blinkDurationMs: {
        type: OptionType.NUMBER,
        description: "Blink cycle duration (ms)",
        default: 1000,
        onChange: () => applyCSS(),
    },
    keyPressPulse: {
        type: OptionType.BOOLEAN,
        description: "Brief flash / pulse on caret when you type",
        default: true,
        onChange: () => applyCSS(),
    },
    keyPressPulseMs: {
        type: OptionType.NUMBER,
        description: "Typing pulse duration (ms)",
        default: 150,
        onChange: () => applyCSS(),
    },
    idleMotion: {
        type: OptionType.SELECT,
        description: "Extra motion while caret is idle (disabled while blinking)",
        options: [
            { label: "Off", value: "off", default: true },
            { label: "Breathe", value: "breathe" },
            { label: "Shimmer", value: "shimmer" },
        ],
        onChange: () => applyCSS(),
    },
    rainbowCaret: {
        type: OptionType.BOOLEAN,
        description: "Rainbow hue animation on the caret (CPU/GPU heavier)",
        default: false,
        onChange: () => applyCSS(),
    },
    caretColor: {
        type: OptionType.COMPONENT,
        description: "Caret color",
        default: 0x00b0f4,
        component: () => (
            <div>
                <Forms.FormTitle tag="h3">Caret Color</Forms.FormTitle>
                <ColorPicker
                    color={settings.store.caretColor}
                    onChange={onPickColor}
                    showEyeDropper={true}
                />
            </div>
        ),
    },
});

function toHex(n: number) {
    return `#${n.toString(16).padStart(6, "0")}`;
}

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

function buildCSS(): string {
    const color = toHex(settings.store.caretColor ?? 0x00b0f4);
    const ms = clamp(settings.store.transitionDelay ?? 55, 0, 800);
    const easing = settings.store.animationType ?? "ease-out";
    const gpu = settings.store.useGpuTransform !== false;
    const w = clamp(settings.store.caretWidth ?? 2, 1, 10);
    const r = clamp(settings.store.caretBorderRadius ?? 2, 0, 12);
    const op = clamp(settings.store.caretOpacity ?? 1, 0.25, 1);
    const glow = clamp(settings.store.caretGlow ?? 0, 0, 24);
    const blinkOn = settings.store.blinkEnabled !== false;
    const blinkMs = clamp(settings.store.blinkDurationMs ?? 1000, 400, 3000);
    const kickMs = clamp(settings.store.keyPressPulseMs ?? 150, 60, 400);
    const rainbow = settings.store.rainbowCaret === true;
    const idle = (settings.store.idleMotion ?? "off") as "off" | "breathe" | "shimmer";

    const moveProps = gpu
        ? `transform ${ms}ms ${easing}, height ${ms}ms ${easing}, opacity 120ms ease-out`
        : `left ${ms}ms ${easing}, top ${ms}ms ${easing}, height ${ms}ms ${easing}, opacity 120ms ease-out`;

    const willChange = gpu ? "transform, height" : "left, top, height";

    const shadow =
        glow > 0
            ? `box-shadow: 0 0 ${glow}px ${glow * 0.75}px ${color}55;`
            : "";

    const blinkBlock = blinkOn
        ? `
@keyframes vc-blink {
    0%, 45% { opacity: ${op}; }
    50%, 95% { opacity: 0.08; }
    100% { opacity: ${op}; }
}
#vc-smoothtype-caret.is-blinking {
    animation: vc-blink ${blinkMs}ms ease-in-out infinite;
}`
        : `
#vc-smoothtype-caret.is-blinking { animation: none; }`;

    const transformBase = gpu ? "transform: translate3d(0px, 0px, 0);" : "";

    const kickBlock = `
@keyframes vc-keykick {
    0% { filter: brightness(1.55) saturate(1.12) drop-shadow(0 0 8px ${color}88); }
    100% { filter: brightness(1) saturate(1) drop-shadow(0 0 0 transparent); }
}
#vc-smoothtype-caret.vc-kick {
    animation: vc-keykick ${kickMs}ms ease-out 1;
}`;

    const rainbowBlock = rainbow
        ? `
@keyframes vc-rainbow {
    from { filter: hue-rotate(0deg); }
    to { filter: hue-rotate(360deg); }
}
#vc-smoothtype-caret.vc-rainbow {
    animation: vc-rainbow 4.5s linear infinite;
}`
        : "";

    let idleBlock = "";
    if (!rainbow && idle === "breathe") {
        idleBlock = `
@keyframes vc-idle-breathe {
    0%, 100% { filter: brightness(0.9); }
    50% { filter: brightness(1.18); }
}
#vc-smoothtype-caret.vc-idle-breathe:not(.is-blinking) {
    animation: vc-idle-breathe 2.4s ease-in-out infinite;
}`;
    } else if (!rainbow && idle === "shimmer") {
        idleBlock = `
@keyframes vc-idle-shimmer {
    0%, 100% { box-shadow: 0 0 0 0 transparent; }
    50% { box-shadow: 0 0 16px 3px ${color}66; }
}
#vc-smoothtype-caret.vc-idle-shimmer:not(.is-blinking) {
    animation: vc-idle-shimmer 1.85s ease-in-out infinite;
}`;
    }

    return `
${blinkBlock}
${kickBlock}
${rainbowBlock}
${idleBlock}
#vc-smoothtype-caret {
    position: fixed;
    top: 0;
    left: 0;
    width: ${w}px;
    border-radius: ${r}px;
    background: ${color};
    opacity: ${op};
    pointer-events: none;
    z-index: 99999;
    display: none;
    will-change: ${willChange};
    transition: ${moveProps};
    ${transformBase}
    ${shadow}
}
[data-slate-editor] { caret-color: transparent !important; }
`;
}

function getCaret(): HTMLDivElement {
    let el = document.getElementById("vc-smoothtype-caret") as HTMLDivElement | null;
    if (!el) {
        el = document.createElement("div");
        el.id = "vc-smoothtype-caret";
        document.body.appendChild(el);
    }
    return el;
}

let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let kickTimer: ReturnType<typeof setTimeout> | null = null;

function startBlink() {
    if (settings.store.blinkEnabled === false) return;
    getCaret().classList.add("is-blinking");
}

function stopBlink() {
    if (settings.store.blinkEnabled === false) {
        getCaret().classList.remove("is-blinking");
        return;
    }
    getCaret().classList.remove("is-blinking");
    if (blinkTimer) clearTimeout(blinkTimer);
    blinkTimer = setTimeout(startBlink, 900);
}

function pulseCaretKick() {
    if (settings.store.keyPressPulse === false) return;
    const el = getCaret();
    if (el.style.display === "none") return;
    el.classList.remove("vc-kick");
    void el.offsetWidth;
    el.classList.add("vc-kick");
    if (kickTimer) clearTimeout(kickTimer);
    kickTimer = setTimeout(() => el.classList.remove("vc-kick"), clamp(settings.store.keyPressPulseMs ?? 150, 60, 400) + 40);
}

function syncCaretMotionClasses(el: HTMLDivElement) {
    const idle = (settings.store.idleMotion ?? "off") as string;
    const rainbow = settings.store.rainbowCaret === true;
    el.classList.toggle("vc-rainbow", rainbow);
    el.classList.toggle("vc-idle-breathe", !rainbow && idle === "breathe");
    el.classList.toggle("vc-idle-shimmer", !rainbow && idle === "shimmer");
}

let lastX = Number.NaN;
let lastY = Number.NaN;

let rafScheduled = 0;

function scheduleApplyCaretPosition() {
    if (rafScheduled) return;
    rafScheduled = requestAnimationFrame(() => {
        rafScheduled = 0;
        applyCaretPosition();
    });
}

function applyCaretPosition() {
    const el = getCaret();
    const gpu = settings.store.useGpuTransform !== false;

    if (!document.activeElement?.closest("[data-slate-editor]")) {
        el.style.display = "none";
        lastX = Number.NaN;
        lastY = Number.NaN;
        return;
    }

    const sel = window.getSelection();
    if (!sel?.rangeCount) {
        el.style.display = "none";
        return;
    }

    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(false);

    const rects = range.getClientRects();
    let rect: DOMRect | null = rects.length > 0 ? rects[0] : null;
    if (!rect || rect.height === 0) {
        const node = range.startContainer;
        const parent = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
        if (parent) rect = parent.getBoundingClientRect();
    }
    if (!rect || rect.height === 0) {
        el.style.display = "none";
        return;
    }

    const x = rect.right;
    const y = rect.top;
    const h = rect.height;

    const moved =
        !Number.isFinite(lastX) ||
        !Number.isFinite(lastY) ||
        Math.abs(x - lastX) > 0.25 ||
        Math.abs(y - lastY) > 0.25 ||
        Math.abs(h - (parseFloat(el.style.height) || 0)) > 0.25;

    if (moved && el.style.display !== "none") stopBlink();

    lastX = x;
    lastY = y;

    el.style.display = "block";

    if (gpu) {
        el.style.left = "0px";
        el.style.top = "0px";
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    } else {
        el.style.transform = "";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
    }
    el.style.height = `${h}px`;

    syncCaretMotionClasses(el);
}

let observer: MutationObserver | null = null;

function startObserver() {
    observer = new MutationObserver(() => scheduleApplyCaretPosition());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stopObserver() {
    observer?.disconnect();
    observer = null;
}

const handlers = {
    sel: () => scheduleApplyCaretPosition(),
    focus: () => applyCaretPosition(),
    blur: () => {
        getCaret().style.display = "none";
        lastX = Number.NaN;
        lastY = Number.NaN;
    },
    fast: () => applyCaretPosition(),
    pulse: () => {
        applyCaretPosition();
        pulseCaretKick();
    },
    click: () => applyCaretPosition(),
};

function startListeners() {
    document.addEventListener("selectionchange", handlers.sel);
    document.addEventListener("focusin", handlers.focus);
    document.addEventListener("focusout", handlers.blur);

    document.addEventListener("keydown", handlers.pulse, true);
    document.addEventListener("beforeinput", handlers.pulse, true);
    document.addEventListener("input", handlers.fast, true);
    document.addEventListener("keyup", handlers.fast, true);

    document.addEventListener("compositionupdate", handlers.fast, true);
    document.addEventListener("compositionend", handlers.pulse, true);

    document.addEventListener("click", handlers.click, true);
}

function stopListeners() {
    document.removeEventListener("selectionchange", handlers.sel);
    document.removeEventListener("focusin", handlers.focus);
    document.removeEventListener("focusout", handlers.blur);

    document.removeEventListener("keydown", handlers.pulse, true);
    document.removeEventListener("beforeinput", handlers.pulse, true);
    document.removeEventListener("input", handlers.fast, true);
    document.removeEventListener("keyup", handlers.fast, true);

    document.removeEventListener("compositionupdate", handlers.fast, true);
    document.removeEventListener("compositionend", handlers.pulse, true);

    document.removeEventListener("click", handlers.click, true);
}

function applyCSS() {
    document.getElementById(STYLE_ID)?.remove();
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = buildCSS();
    document.head.appendChild(s);
    applyCaretPosition();
}

function removeCSS() {
    document.getElementById(STYLE_ID)?.remove();
}

function applyPreset(kind: "snappy" | "cinematic" | "chill") {
    if (kind === "snappy") {
        settings.store.transitionDelay = 42;
        settings.store.animationType = "ease-out";
        settings.store.caretGlow = 2;
        settings.store.keyPressPulse = true;
        settings.store.keyPressPulseMs = 120;
        settings.store.idleMotion = "off";
        settings.store.rainbowCaret = false;
    } else if (kind === "cinematic") {
        settings.store.transitionDelay = 190;
        settings.store.animationType = "ease-in-out";
        settings.store.caretGlow = 14;
        settings.store.keyPressPulse = true;
        settings.store.keyPressPulseMs = 220;
        settings.store.idleMotion = "shimmer";
        settings.store.rainbowCaret = false;
    } else {
        settings.store.transitionDelay = 320;
        settings.store.animationType = "ease-out";
        settings.store.caretGlow = 6;
        settings.store.keyPressPulse = true;
        settings.store.keyPressPulseMs = 180;
        settings.store.idleMotion = "breathe";
        settings.store.rainbowCaret = false;
    }
    applyCSS();
}

const SmoothTypeIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        aria-hidden
        width={width}
        height={height}
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M12 3l1.35 4.7L18 8.5l-4.65 1.35L12 14l-1.35-4.15L5.5 8.5l4.85-0.8L12 3zm6 9.5l.9 3.1L22 16.5l-2.6.75L18 20.5l-.9-2.65-2.6-.75 2.1-.6.9-3.1zm-12 .5l1 3.4 3.5 1-3.5 1-1 3.4-1-3.4-3.5-1 3.5-1 1-3.4z" />
    </svg>
);

function SmoothTypeQuickPanel({ close }: { close(): void; }) {
    settings.use([...LIVE_SETTING_KEYS]);

    return (
        <div className={Margins.bottom8}>
            <Forms.FormText style={{ marginBottom: 12 }}>
                Quick controls from the chat bar. The same values appear in the SmoothType plugin page in Vencord settings.
            </Forms.FormText>

            <FormSwitch
                title="Show chat bar button"
                description={settings.def.showChatBarButton.description}
                value={settings.store.showChatBarButton !== false}
                onChange={v => {
                    settings.store.showChatBarButton = v;
                }}
                hideBorder
            />

            <Divider16 />

            <Forms.FormTitle tag="h5">Caret color</Forms.FormTitle>
            <ColorPicker
                color={settings.store.caretColor}
                onChange={c => {
                    settings.store.caretColor = c;
                    applyCSS();
                }}
                showEyeDropper={true}
            />

            <Divider16 />

            <Forms.FormTitle tag="h5">Caret movement speed</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 8 }}>Transition duration (ms) — higher is slower and usually smoother.</Forms.FormText>
            <Slider
                initialValue={settings.store.transitionDelay}
                onValueChange={(v: number) => {
                    settings.store.transitionDelay = v;
                    applyCSS();
                }}
                minValue={0}
                maxValue={800}
                markers={[0, 100, 200, 400, 800]}
                stickToMarkers={false}
                onValueRender={(v: number) => `${Math.round(v)}ms`}
            />

            <Divider16 />

            <Forms.FormTitle tag="h5">Easing</Forms.FormTitle>
            <SearchableSelect
                options={[...EASING_OPTIONS]}
                value={settings.store.animationType}
                placeholder="Easing"
                maxVisibleItems={6}
                closeOnSelect
                onChange={(v: string) => {
                    settings.store.animationType = v;
                    applyCSS();
                }}
            />

            <Divider16 />

            <Forms.FormTitle tag="h5">Typing animations</Forms.FormTitle>
            <FormSwitch
                title="Pulse on key / typing"
                description={settings.def.keyPressPulse.description}
                value={settings.store.keyPressPulse !== false}
                onChange={v => {
                    settings.store.keyPressPulse = v;
                    applyCSS();
                }}
                hideBorder
            />
            <Forms.FormText style={{ marginBottom: 8 }}>Pulse duration (ms)</Forms.FormText>
            <Slider
                initialValue={settings.store.keyPressPulseMs}
                onValueChange={(v: number) => {
                    settings.store.keyPressPulseMs = v;
                    applyCSS();
                }}
                minValue={60}
                maxValue={400}
                markers={[60, 120, 200, 300, 400]}
                stickToMarkers={false}
                onValueRender={(v: number) => `${Math.round(v)}ms`}
            />

            <FormSwitch
                title="Rainbow caret"
                description={settings.def.rainbowCaret.description}
                value={settings.store.rainbowCaret === true}
                onChange={v => {
                    settings.store.rainbowCaret = v;
                    applyCSS();
                }}
                hideBorder
            />

            <Forms.FormTitle tag="h5" style={{ marginTop: 8 }}>Idle motion</Forms.FormTitle>
            <SearchableSelect
                options={[...IDLE_OPTIONS]}
                value={settings.store.idleMotion ?? "off"}
                placeholder="Idle motion"
                maxVisibleItems={5}
                closeOnSelect
                onChange={(v: string) => {
                    settings.store.idleMotion = v;
                    applyCSS();
                }}
            />

            <Divider16 />

            <Forms.FormTitle tag="h5">Caret appearance</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 8 }}>Width (px)</Forms.FormText>
            <Slider
                initialValue={settings.store.caretWidth}
                onValueChange={(v: number) => {
                    settings.store.caretWidth = v;
                    applyCSS();
                }}
                minValue={1}
                maxValue={10}
                markers={[1, 2, 4, 6, 10]}
                stickToMarkers={false}
                onValueRender={(v: number) => `${Math.round(v)}px`}
            />
            <Forms.FormText style={{ marginBottom: 8 }}>Corner radius (px)</Forms.FormText>
            <Slider
                initialValue={settings.store.caretBorderRadius}
                onValueChange={(v: number) => {
                    settings.store.caretBorderRadius = v;
                    applyCSS();
                }}
                minValue={0}
                maxValue={12}
                markers={[0, 2, 4, 8, 12]}
                stickToMarkers={false}
                onValueRender={(v: number) => `${Math.round(v)}px`}
            />
            <Forms.FormText style={{ marginBottom: 8 }}>Opacity</Forms.FormText>
            <Slider
                initialValue={settings.store.caretOpacity * 100}
                onValueChange={(v: number) => {
                    settings.store.caretOpacity = clamp(v / 100, 0.25, 1);
                    applyCSS();
                }}
                minValue={25}
                maxValue={100}
                markers={[25, 50, 75, 100]}
                stickToMarkers={false}
                onValueRender={(v: number) => `${Math.round(v)}%`}
            />
            <Forms.FormText style={{ marginBottom: 8 }}>Glow (px)</Forms.FormText>
            <Slider
                initialValue={settings.store.caretGlow}
                onValueChange={(v: number) => {
                    settings.store.caretGlow = v;
                    applyCSS();
                }}
                minValue={0}
                maxValue={24}
                markers={[0, 4, 8, 16, 24]}
                stickToMarkers={false}
                onValueRender={(v: number) => `${Math.round(v)}px`}
            />

            <Divider16 />

            <FormSwitch
                title="GPU movement (transform)"
                description={settings.def.useGpuTransform.description}
                value={settings.store.useGpuTransform !== false}
                onChange={v => {
                    settings.store.useGpuTransform = v;
                    applyCSS();
                }}
                hideBorder
            />
            <FormSwitch
                title="Blink caret when idle"
                description={settings.def.blinkEnabled.description}
                value={settings.store.blinkEnabled !== false}
                onChange={v => {
                    settings.store.blinkEnabled = v;
                    applyCSS();
                }}
                hideBorder
            />
            <Forms.FormText style={{ marginBottom: 8 }}>Blink cycle (ms)</Forms.FormText>
            <Slider
                initialValue={settings.store.blinkDurationMs}
                onValueChange={(v: number) => {
                    settings.store.blinkDurationMs = v;
                    applyCSS();
                }}
                minValue={400}
                maxValue={3000}
                markers={[400, 800, 1200, 2000, 3000]}
                stickToMarkers={false}
                onValueRender={(v: number) => `${Math.round(v)}ms`}
            />

            <Divider16 />

            <Forms.FormTitle tag="h5">Presets</Forms.FormTitle>
            <Flex style={{ gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => applyPreset("snappy")}>Snappy</Button>
                <Button onClick={() => applyPreset("cinematic")}>Cinematic</Button>
                <Button onClick={() => applyPreset("chill")}>Chill</Button>
            </Flex>

            <div style={{ marginTop: 20 }}>
                <Button color={Button.Colors.PRIMARY} onClick={close}>
                    Done
                </Button>
            </div>
        </div>
    );
}

function Divider16() {
    return <div style={{ height: 16 }} />;
}

function openSmoothTypeHud() {
    const key = openModal(props => (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>
                    SmoothType
                </Text>
                <ModalCloseButton onClick={() => closeModal(key)} />
            </ModalHeader>
            <ModalContent>
                <SmoothTypeQuickPanel close={() => closeModal(key)} />
            </ModalContent>
        </ModalRoot>
    ));
}

const SmoothTypeChatBarButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    settings.use([...LIVE_SETTING_KEYS]);
    if (!isAnyChat || settings.store.showChatBarButton === false) return null;

    return (
        <ChatBarButton
            tooltip="SmoothType — caret speed, color, and animations"
            onClick={() => openSmoothTypeHud()}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <SmoothTypeIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SmoothType",
    description: "smooth typing plugin — makes the caret glide smoothly to its new position when you type or move it, with customizable speed, easing, color, and animations.",
    tags: ["Chat", "Appearance"],
    authors: [Devs.core],
    requiresRestart: true,
    settings,

    chatBarButton: {
        icon: SmoothTypeIcon,
        render: SmoothTypeChatBarButton,
    },

    start() {
        applyCSS();
        getCaret();
        startObserver();
        startListeners();
    },

    stop() {
        stopObserver();
        stopListeners();
        removeCSS();
        if (blinkTimer) clearTimeout(blinkTimer);
        blinkTimer = null;
        if (kickTimer) clearTimeout(kickTimer);
        kickTimer = null;
        if (rafScheduled) cancelAnimationFrame(rafScheduled);
        rafScheduled = 0;
        document.getElementById("vc-smoothtype-caret")?.remove();
        lastX = Number.NaN;
        lastY = Number.NaN;
    },
});
