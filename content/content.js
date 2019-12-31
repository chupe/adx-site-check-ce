"use strict"

let originUrl = new URL(document.URL)
let cssAppended = false
let adUnitsInfo
let adUnits = []

// Add css to make adunits visible even when they are unfilled
let highlightAdUnits = function () {
    $(adUnits).css("display", "")
    $(adUnits).removeClass('hideAdUnits')
    $(adUnits).addClass('highlightAdUnits')

    // If there is not ad units information available start the process
    // for extracting the required info by calling extractScriptUrl(). Since
    // there is a delay for the process to complete and the information to get
    // stored a setTimeout is to compensate at the moment
    if (adUnitsInfo) {
        createAdUnits(adUnitsInfo)
    } else {
        chrome.runtime.sendMessage({
            command: 'checkTags',
            publisher: originUrl.hostname,
            url: originUrl.href
        })
    }
}

// Remove css that makes adunits highlighted
let unhighlightAdUnits = function () {
    $(adUnits).removeClass('highlightAdUnits')
}

// Hide all adunits
let hideAdUnits = function () {
    $(adUnits).addClass('hideAdUnits')
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
        case 'getInfo':
            getInfo()
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
            for (let adUnit in adUnitsInfo) {
                let div = document.getElementById(adUnitsInfo[adUnit].ID)
                if (div) {
                    adUnits.push(div)
                }
            }
        }
    })
}


let s = document.createElement('script')
s.src = chrome.extension.getURL('./content/gpt-access.js')
let head = document.head || document.documentElement
head.appendChild(s)
s.onload = function () {
    s.remove()
}

// Event listener
document.addEventListener('adunits', function (e) {
    chrome.runtime.sendMessage({
        command: 'store',
        update: {
            // @ts-ignore
            adUnits: e.detail,
            name: originUrl.hostname
        }
    })
})

let getInfo = (message) => {
    document.dispatchEvent(new CustomEvent('getInfo', {}))
}