// tslint:disable:forin variable-name no-console

export const read_csv = text => {
  dict = {};
  text.split('\n').forEach((entry, index, array) => {
    if (entry.length > 0) {
      items = entry.split(',');
      gene = items[0];
      exp_array = [];
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
