"use strict"

let originUrl = new URL(document.URL)
let cssAppended = false
let adUnitsInfo
let adUnits = []

// Add css to make adunits visible even when they are unfilled
let highlightAdUnits = function (highlight) {
    if (highlight) {
        $(adUnits).css("display", "")
        $('div[id^="google_ads_iframe_"]').css('display', 'none')
        createAdUnits(adUnitsInfo)
    } else {
        $('.adUnits').css('display', 'none')

        $('div[id^="google_ads_iframe_"]').css('display', '')

        let iframes = document.querySelectorAll('div[id^="google_ads_iframe')
        for (let iframe of iframes) {
            if (iframe.children.length == 0)
                iframe.style.display = 'none'
        }
    }
}

let checkTags = function () {
    chrome.runtime.sendMessage({
        command: 'checkTags',
        publisher: originUrl.hostname,
        url: originUrl.href
    })
}

// Remove css that makes adunits highlighted
let unhighlightAdUnits = function () {
    $(adUnits).removeClass('highlightAdUnits')
}

// Hide all adunits
let hideAdUnits = function () {
    $(adUnits).css("display", "none")
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    switch (request.command) {
        case 'highlight':
            highlightAdUnits(request.highlight)
            break
        case 'unhighlight':
            unhighlightAdUnits()
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
        getInfo()
        if (data[originUrl.hostname]) {
            adUnitsInfo = data[originUrl.hostname].adUnits
        }
        else checkTags()
    })
})

//on init perform based on chrome storage value
if (document.readyState === 'complete')
    init()
else
    window.onload = init

function init() {
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