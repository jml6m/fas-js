export const count = names => names.reduce((a, b) => Object.assign(a, { [b]: (a[b] || 0) + 1 }), {});

export const duplicates = dict => Object.keys(dict).filter(a => dict[a] > 1);
