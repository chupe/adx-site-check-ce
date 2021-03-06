"use strict"

function isMobile() {
    let mobileReg = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    return mobileReg.test(navigator.userAgent)
}

// Converts sizes array to a string in a readable format
let sizesAsText = (adUnit) => {
    let sizesAsText = ''
    for (let size of adUnit.sizes) {
        size = size.toString()
        sizesAsText += '[' + size + '], '
    }

    return sizesAsText.substring(0, sizesAsText.length - 2)
}

let createAdUnits = (adUnitsInfo) => {
    for (let element of adUnits) {
        let adUnitText = ''
            , name = ''
            , height
            , width

        // The adunit is susposed to contain the name and all
        // sizes as inner text
        for (let adUnit in adUnitsInfo) {
            let elementId = element.getAttribute('id')
            let currentAdUnit = adUnitsInfo[adUnit]

            // Since div contains only ID and adUnitsInfo object
            // has names as keys the adUnitsInfo object need to be
            // matched by ID and accessed by adunit name

            if (elementId == currentAdUnit.ID) {
                let sizes = sizesAsText(currentAdUnit)
                name = currentAdUnit.name
                adUnitText = `<p style="color: black; margin-bottom: 0px; line-height: 1.2;">${name}</p>
                            <p style="color: black; margin-bottom: 0px; line-height: 1.2;">${currentAdUnit.ID}</p>
                            <p style="color: black; margin-bottom: 0px; line-height: 1.2;">${sizes}</p>`
                height = currentAdUnit.sizes[0][1] + 'px'
                width = currentAdUnit.sizes[0][0] + 'px'
            }

        }
        
        // A new div is nested inside the div with gpt tag, in order to
        // have the ad unit centered
        let newDiv = document.createElement('div')
        
        newDiv.title = name
        newDiv.style.height = height
        newDiv.style.width = width
        newDiv.innerHTML = adUnitText
        newDiv.className = 'adUnits'

        let innerDiv = document.querySelector(`#${element.getAttribute('id')} div[id^="google_ads_iframe"]`)
        
        $(newDiv).on('click', changeSize)
        
        let highlights = document.querySelectorAll(`#${element.getAttribute('id')} .adUnits`)
        if (highlights.length > 0) {
            for (let adUnit of highlights) adUnit.style.display = ''
        } else {
            element.appendChild(newDiv)
        }
    }
}


// Callback to adunits.onclick,
// changes size of highlighted adunit in descending order 
// of adunit.sizes array
let changeSize = function () {
    let sizes = adUnitsInfo[$(this).attr('title')].sizes
    let width = $(this).width()
    let height = $(this).height()
    for (let size of sizes) {
        if (width * height > size[0] * size[1]) {
            $(this).width(size[0])
            $(this).height(size[1])

            break
        }
    }
}
