let originUrl = new URL(document.URL)
let cssAppended = false
let adUnitsInfo
let adUnits = $('div[id^="div-gpt-ad-"]')

// Converts sizes array to a string in a readable format
let sizesAsText = (adUnit) => {
    let sizesAsText = ''
    for (let size of adUnit.sizes) {
        size = size.toString()
        sizesAsText += '[' + size + '], '
    }

    return sizesAsText.substring(0, sizesAsText.length - 2)
}

// Add css to make adunits visible even when they are unfilled
let highlightAdUnits = function () {
    adUnits.css("display", "")
    adUnits.removeClass('hideAdUnits')
    adUnits.addClass('highlightAdUnits')

    let createAdUnits = (adUnitsInfo) => {
        adUnits.each((_index, element) => {
            let adUnitText = ''
            let name = ''
            let height = 0
            let width = 0

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
                    adUnitText = `<p>${name}</p>
                                <p>${sizes}</p>`
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

            // First clear out all child nodes of the targeted div
            while (element.lastChild) {
                element.removeChild(element.lastChild)
            }
            $(newDiv).on('click', changeSize)

            element.appendChild(newDiv)
        })
    }

    // If there is not ad units information available start the process
    // for extracting the required info by calling extractScriptUrl(). Since
    // there is a delay for the process to complete and the information to get
    // stored a setTimeout is to compensate at the moment
    if (adUnitsInfo) {
        createAdUnits(adUnitsInfo)
    } else {
        chrome.runtime.sendMessage({
            command: 'checkTags',
            publisher: originUrl.hostname
        })
    }
}

// Remove css that makes adunits highlighted
let unhighlightAdUnits = function () {
    adUnits.removeClass('highlightAdUnits')
}

// Hide all adunits
let hideAdUnits = function () {
    adUnits.addClass('hideAdUnits')
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

// Append custom CSS and listeners. Check before appending if it has been
// appended before
let addListeners = function () {
    highlightAdUnits()
}

let removeListeners = function () {
    unhighlightAdUnits()
}

// Find adxbid script inside the script tags by iterating them
// with each and searching a string. If found sendMessage for popup.js
// to download the script, else call checkTags with '' so it skips
// looking for tags inside script
let extractScriptUrl = () => {
    let scriptUrl = ''
    $("script").each((_index, element) => {
        let src = element.getAttribute('src')
        if (src && src.search('adxbid') > -1) {
            scriptUrl = src
        }
    })

    if (scriptUrl) {
        chrome.runtime.sendMessage({
            command: 'updateStorage',
            publisher: originUrl.hostname,
            update: { scriptUrl: scriptUrl }
        })
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    switch (request.command) {
        case 'highlight':
            addListeners()
            break
        case 'unhighlight':
            removeListeners()
            break
        case 'hide':
            hideAdUnits()
            break
        default:
            sendResponse({ result: "Unrecognized request.command" })
    }

    sendResponse({ result: `Succes: ${request.command}` })
})

chrome.storage.onChanged.addListener(() => {
    chrome.storage.sync.get(originUrl.hostname, (data) => {
        if (data[originUrl.hostname])
            adUnitsInfo = data[originUrl.hostname].adUnits
        else adUnitsInfo = undefined
    })
})

//on init perform based on chrome storage value
window.onload = () => {
    chrome.storage.sync.get(originUrl.hostname, (data) => {
        if (data[originUrl.hostname]) {
            adUnitsInfo = data[originUrl.hostname].adUnits
        }
    })
    extractScriptUrl()
}