// @ts-ignore
const gt = window.googletag

let send = (message) => {
    document.dispatchEvent(new CustomEvent('adunits', {
        detail: message
    }))
}

function getAdUnits() {
    let result = {}
    let adunits = gt.pubads().getSlots()
    for (let adUnit of adunits) {
        let name = adUnit.getSlotId().getName()
        name = name.split('/')[2]
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
}

if (gt)
    send(getAdUnits())

// Event listener
document.addEventListener('getInfo', (e) => {
    if (typeof gt !== 'undefined') {
        let adUnits = getAdUnits()
        send(adUnits)
    }
})