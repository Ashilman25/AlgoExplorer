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

