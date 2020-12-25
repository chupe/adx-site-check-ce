// @ts-nocheck
let gt

document.addEventListener('getInfo', (e) => {
  let adUnits = getAdUnits()
  send(adUnits)
})

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (typeof googletag !== 'undefined') {
    gt = googletag
    let adUnits = getAdUnits()
    send(adUnits)
  }
} else {
  window.onload = () => {
    if (typeof googletag !== 'undefined') {
      gt = googletag
      let adUnits = getAdUnits()
      send(adUnits)
    }
  }
}

function send(message) {
  document.dispatchEvent(new CustomEvent('adunits', {
    detail: message
  }))
}

function getAdUnits() {
  try {
    let result = {}
    let adunits = gt.pubads().getSlots()
    for (let adUnit of adunits) {
      let name = adUnit.getSlotId().getName()
      let nameArray = name.split('/')
      name = nameArray[nameArray.length - 1]
      let ID = adUnit.getSlotId().getDomId()
      let sizes = adUnit.getSizes()
      
      let arraySizes = []
      
      for (let size of sizes) {
        let array = []
        array.push(size.l, size.j)
        arraySizes.push(array)
      }
      
      arraySizes.sort((a, b) => {
        return b[0] * b[1] - a[0] * a[1]
      })
      
      result[name] = {
        name,
        ID,
        sizes: arraySizes,
        section: []
      }
    }
    
    return result
  } catch (e) {
    console.log(e)
  }
}
