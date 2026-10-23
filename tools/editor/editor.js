import {Compartment, EditorSelection, EditorState} from '@codemirror/state';
import {drawSelection, EditorView, keymap, lineNumbers, placeholder} from '@codemirror/view';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {HighlightStyle, indentUnit, syntaxHighlighting} from '@codemirror/language';
import {search, searchKeymap, openSearchPanel} from '@codemirror/search';
import {yaml} from '@codemirror/lang-yaml';
import {tags} from '@lezer/highlight';

// Use the application's palette, not a second independently themed UI.
const colors = HighlightStyle.define([
    {tag: [tags.propertyName, tags.attributeName], color: 'var(--accent-hover)'},
    {tag: [tags.string, tags.special(tags.string)], color: 'var(--success)'},
    {tag: [tags.number, tags.bool, tags.null], color: 'var(--code)'},
    {tag: [tags.keyword, tags.typeName, tags.labelName], color: 'var(--accent)'},
    {tag: tags.comment, color: 'var(--muted)', fontStyle: 'italic'},
    {tag: [tags.punctuation, tags.meta], color: 'var(--control-line)'},
    {tag: tags.invalid, color: 'var(--danger)'}
]);

window.ExodusYamlEditor = {
    mount(text, {value = text.value, onChange, onEdit, label, description, phrases = {}} = {}) {
        let content = value, pending = null, timer;
        const flush = () => {
            clearTimeout(timer);
            timer = undefined;
            if (!pending) return;
            content = pending.sliceDoc();
            pending = null;
            onChange?.(content);
        };
        const editable = new Compartment(), wrapping = new Compartment();
        let disabled = text.disabled, wrap = text.wrap !== 'off', stopDrag = () => {};
        const editableExtensions = () => [EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)];
        const selection = EditorView.domEventHandlers({mousedown(event, view) {
            if (disabled || event.button !== 0 || event.detail !== 1 || event.ctrlKey || event.metaKey || event.altKey || !event.target.closest('.cm-content')) return false;
            stopDrag();
            let x = event.clientX, y = event.clientY, frame, previous = performance.now();
            const position = () => {
                const rect = view.scrollDOM.getBoundingClientRect();
                const left = Math.max(rect.left + 2, view.contentDOM.getBoundingClientRect().left + 1);
                return view.posAtCoords({x:Math.max(left, Math.min(x,rect.right-3)), y:Math.max(rect.top+2, Math.min(y,rect.bottom-3))}, false);
            };
            const start = position();
            if (start === null) return false;
            const anchor = event.shiftKey ? view.state.selection.main.anchor : start;
            view.focus();
            const select = () => {
                const end = position();
                if (end !== null) view.dispatch({selection:EditorSelection.single(anchor,end)});
            };
            const move = event => { x=event.clientX; y=event.clientY; select(); };
            const stop = () => {
                cancelAnimationFrame(frame);
                document.removeEventListener('mousemove',move);
                document.removeEventListener('mouseup',stop);
                window.removeEventListener('blur',stop);
                stopDrag = () => {};
            };
            stopDrag = stop;
            let top = view.scrollDOM.scrollTop, left = view.scrollDOM.scrollLeft;
            const tick = now => {
                if (!view.dom.isConnected || disabled) { stop(); return; }
                const rect = view.scrollDOM.getBoundingClientRect();
                const speed = 90 * Math.min(now-previous,40)/1000;
                previous=now;
                const dy=y<rect.top?-1:y>rect.bottom?1:0, dx=x<rect.left?-1:x>rect.right?1:0;
                if (dy || dx) {
                    top=Math.max(0,Math.min(top+dy*speed,view.scrollDOM.scrollHeight-view.scrollDOM.clientHeight));
                    left=Math.max(0,Math.min(left+dx*speed,view.scrollDOM.scrollWidth-view.scrollDOM.clientWidth));
                    view.scrollDOM.scrollTop=top; view.scrollDOM.scrollLeft=left;
                    select();
                } else { top=view.scrollDOM.scrollTop; left=view.scrollDOM.scrollLeft; }
                frame=requestAnimationFrame(tick);
            };
            select();
            document.addEventListener('mousemove',move);
            document.addEventListener('mouseup',stop);
            window.addEventListener('blur',stop);
            frame=requestAnimationFrame(tick);
            return true;
        }});
        const createState = value => EditorState.create({doc:value, extensions:[
            yaml(), lineNumbers(), history(), drawSelection(),
            syntaxHighlighting(colors), indentUnit.of('  '), EditorState.tabSize.of(2),
            EditorState.lineSeparator.of(value.includes('\r\n')?'\r\n':'\n'),
            EditorState.phrases.of(phrases), placeholder(text.placeholder),
            search({top:true}), keymap.of([indentWithTab,...searchKeymap,...historyKeymap,...defaultKeymap]),
            editable.of(editableExtensions()), wrapping.of(wrap?EditorView.lineWrapping:[]),
            EditorView.contentAttributes.of({'aria-label':label || 'YAML', 'aria-describedby':description || '', spellcheck:'false'}),
            selection,
            EditorView.updateListener.of(update => {
                if (!update.docChanged) return;
                pending = update.state;
                clearTimeout(timer);
                timer = setTimeout(flush, 250);
                onEdit?.();
            })
        ]});
        const view = new EditorView({state:createState(value)});
        text.after(view.dom);
        text.hidden=true;
        return {
            setValue(value) { flush(); stopDrag(); content = value; view.setState(createState(value)); },
            flush,
            setDisabled(value) {
                if (disabled===value) return;
                disabled=value;
                if (disabled) stopDrag();
                view.dispatch({effects:editable.reconfigure(editableExtensions())});
            },
            setWrap(value) {
                wrap=value;
                view.dispatch({effects:wrapping.reconfigure(wrap?EditorView.lineWrapping:[])});
            },
            search() { openSearchPanel(view); },
            destroy() { flush(); stopDrag(); view.destroy(); text.value=content; text.hidden=false; }
        };
    }
};
