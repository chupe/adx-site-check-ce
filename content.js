let originUrl
let cssAppended = false
let adUnitsInfo
let adUnits = $('div[id^="div-gpt-ad-"]')



// Add css to make adunits visible even when they are unfilled
let highlightAdUnits = function () {
    adUnits.css("display", "")
    adUnits.removeClass('hideAdUnits')
    adUnits.addClass('highlightAdUnits')

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

// Append custom CSS and listeners. Check before appending if it has been
// appended before
let addListeners = function () {
    highlightAdUnits()
}

let removeListeners = function () {
    unhighlightAdUnits()
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
    originUrl = new URL(document.URL)
    chrome.storage.sync.get(originUrl.hostname, (data) => {
        if (data[originUrl.hostname]) {
            adUnitsInfo = data[originUrl.hostname].adUnits
        }
    })
}