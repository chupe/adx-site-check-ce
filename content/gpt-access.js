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

        for (let size of sizes) {

            Object.defineProperty(size, 'w',
                Object.getOwnPropertyDescriptor(size, 'l'))
            delete size['l']

            Object.defineProperty(size, 'h',
                Object.getOwnPropertyDescriptor(size, 'j'))
            delete size['j']
        }

        result[name] = {
            name,
            ID,
            sizes
        }
    }

    return result
}

if (typeof gt !== 'undefined') {
    console.log(getAdUnits())
}