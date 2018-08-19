export const  SPRITE_IMG_WIDTH = 32;

export const read_csv = text => {
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


export const openInNewTab = (url) => {
  let win = window.open(url, '_blank');
  win.focus();
}