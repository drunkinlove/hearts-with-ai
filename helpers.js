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

export async function input(prompt) {
  const readline = await import("readline");
  const cmd = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    cmd.question(prompt, (reply) => {
      cmd.close();
      resolve(reply);
    });
  });
}

export function capitalize_first_letter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export function margins_float_to_px(margins_float) {
  const margins = {};
  for (const [side, value] of Object.entries(margins_float)) {
    margins[side] = `${value}px`;
  }
  return margins;
}
