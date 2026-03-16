//array generator for the sort algs

const ANIMATION_MAX_SIZE = 200

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const randomNumber = Math.random()
    const scaledRandom = randomNumber * (i + 1)
    const j = Math.floor(scaledRandom)

    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }

  return arr
}


function clampSize(size) {
  return Math.max(2, Math.min(size, ANIMATION_MAX_SIZE))
}

//none = 100% unique
//low = ~75
// med = ~50
//high = ~25% unique
function uniqueCountForDensity(size, density = 'none') {
  switch (density) {
    case 'high':
      return Math.max(2, Math.ceil(size * 0.25))

    case 'medium':
      return Math.max(2, Math.ceil(size * 0.5))

    case 'low':
      return Math.max(2, Math.ceil(size * 0.75))

    default:
      return size
  }
}

function withDuplicates(size, density) {
  const uniqueCount = uniqueCountForDensity(size, density)
  const pool = shuffle(Array.from({length: size}, (_, i) => i + 1)).slice(0, uniqueCount)

  return Array.from({length: size}, () => pool[Math.floor(Math.random() * pool.length)])
}



// preset generators

//full random
export function generateRandom(size, duplicateDensity = 'none') {
  size = clampSize(size)
  if (duplicateDensity !== 'none') {
    return shuffle(withDuplicates(size, duplicateDensity))
  }

  return shuffle(Array.from({ length: size }, (_, i) => i + 1))
}


//sorted i descending
export function generateReversed(size, duplicateDensity = 'none') {
  size = clampSize(size)
  if (duplicateDensity !== 'none') {
    return withDuplicates(size, duplicateDensity).sort((a, b) => b - a)
  }

  return Array.from({ length: size }, (_, i) => size - i)
}


//almost sorted
export function generateNearlySorted(size, duplicateDensity = 'none') {
  size = clampSize(size)

  let arr
  if (duplicateDensity !== 'none') {
    arr = withDuplicates(size, duplicateDensity).sort((a, b) => a - b)

  } else {
    arr = Array.from({ length: size }, (_, i) => i + 1)
  }

  const swaps = Math.max(1, Math.floor(size * 0.1))
  for (let s = 0; s < swaps; s++) {
    const randomNumber = Math.random()
    const scaledRandom = randomNumber * (size - 1)
    const i = Math.floor(scaledRandom)

    const temp = arr[i]
    arr[i] = arr[i + 1]
    arr[i + 1] = temp
  }

  return arr
}


//many dupes
export function generateDuplicates(size) {
  size = clampSize(size)
  return withDuplicates(size, 'high')
}




const GENERATORS = {
  random: generateRandom,
  reversed: generateReversed,
  nearly_sorted: generateNearlySorted,
  duplicates: generateDuplicates,
}

export function generateFromPreset(preset, size, duplicateDensity = 'none') {
  const gen = GENERATORS[preset]
  if (!gen) {
    throw new Error(`Unknown preset "${preset}"`)
  }

  return gen(size, duplicateDensity)
}


//manual input parse
export function parseManualInput(input) {
  if (!input || !input.trim()) return { array: null, error: 'Input is empty' }

  const tokens = input.split(/[,\s]+/).filter(Boolean)
  const nums = []

  for (const tok of tokens) {
    const n = Number(tok)

    if (Number.isNaN(n) || !Number.isFinite(n)) {
      return {array: null, error: `"${tok}" is not a valid number`}
    }

    nums.push(n)
  }

  if (nums.length < 2) {
    return {array: null, error: 'Array must have at least 2 elements'}
  }
    

  if (nums.length > ANIMATION_MAX_SIZE) {
    return {array: null, error: `Array exceeds animation limit of ${ANIMATION_MAX_SIZE} elements`}
  }

  return {array: nums, error: null}
}



export const PRESETS = [
  {value: 'random', label: 'Random'},
  {value: 'reversed', label: 'Reversed'},
  {value: 'nearly_sorted', label: 'Nearly Sorted'},
  {value: 'duplicates', label: 'Duplicates'},
  {value: 'custom', label: 'Manual Input'},
]

export const DUPLICATE_DENSITIES = [
  {value: 'none', label: 'None'},
  {value: 'low', label: 'Low (~25% dupes)'},
  {value: 'medium', label: 'Medium (~50% dupes)'},
  {value: 'high', label: 'High (~75% dupes)'},
]

export {ANIMATION_MAX_SIZE}
