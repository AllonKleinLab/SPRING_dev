define(["require", "exports", "d3"], function (require, exports, d3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SPRITE_IMG_WIDTH = 32;
    exports.read_csv = text => {
        const dict = {};
        text.split('\n').forEach((entry, index, array) => {
            if (entry.length > 0) {
                let items = entry.split(',');
                let gene = items[0];
                const exp_array = [];
                items.forEach((e, i, a) => {
                    if (i > 0) {
                        exp_array.push(parseFloat(e));
                    }
                });
                dict[gene] = exp_array;
            }
        });
        return dict;
    };
    exports.openInNewTab = url => {
        let win = window.open(url, '_blank');
        win.focus();
    };
    exports.UrlExists = url => {
        $.get(url)
            .done(() => {
            console.log('yes');
        })
            .fail(() => {
            console.log('no');
        });
    };
    exports.makeTextFile = text => {
        let textFile = '';
        let data = new Blob([text], { type: 'text/plain' });
        // If we are replacing a previously generated file we need to
        // manually revoke the object URL to avoid memory leaks.
        window.URL.revokeObjectURL(textFile);
        textFile = window.URL.createObjectURL(data);
        return textFile;
    };
    exports.downloadFile = (text, name) => {
        if (d3
            .select('#sound_toggle')
            .select('img')
            .attr('src') === 'src/sound_effects/icon_speaker.svg') {
            let snd = new Audio('src/sound_effects/download_sound.wav');
            snd.play();
        }
        let hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:attachment/text,' + encodeURI(text);
        hiddenElement.target = '_blank';
        hiddenElement.download = name;
        document.body.appendChild(hiddenElement);
        hiddenElement.click();
    };
    exports.componentToHex = c => {
        let hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    exports.rgbToHex = (r, g, b) => {
        return '0x' + exports.componentToHex(r) + exports.componentToHex(g) + exports.componentToHex(b);
    };
    exports.postMessageToParent = message => {
        if (document.referrer.length > 0 && window.location.origin !== document.referrer) {
            window.parent.postMessage(message, document.referrer);
        }
    };
    exports.postSelectedCellUpdate = indices => {
        const currentCategory = document.getElementById('labels_menu').value;
        exports.postMessageToParent({ type: 'selected-cells-update', payload: { currentCategory, indices } });
    };
});
