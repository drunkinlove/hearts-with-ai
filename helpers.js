export function shuffle(arr) {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}

export function sample_indices(n, k) {
  return shuffle([...Array(n).keys()]).slice(0, k);
}

export function remove_by_idxs(array, idxs) {
  return array.filter((_, i) => !idxs.includes(i));
}
